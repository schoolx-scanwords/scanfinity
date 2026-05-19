from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Any, Optional
import json
from datetime import datetime, timedelta
import re
import asyncio

from database.lobbies import delete_lobby
from database.connect import connect

router = APIRouter()


async def _increment_total_games_for_room(room: "GameRoom") -> None:
    """Best-effort: increment users.total_games for all non-guest players in the room.

    The websocket layer identifies players by arbitrary string ids. For authenticated
    users, the frontend sends either numeric user id (preferred) or username.
    """

    pool = await connect()
    async with pool.connection() as conn:
        async with conn.transaction():
            async with conn.cursor() as cur:
                for session in room.player_sessions_by_id.values():
                    is_guest = bool(session.player_data.get("isGuest", False))
                    if is_guest:
                        continue

                    identifier = str(session.player_id)
                    updated = False

                    # Preferred: numeric user id.
                    try:
                        uid = int(identifier)
                    except ValueError:
                        uid = None

                    if uid is not None:
                        await cur.execute(
                            "UPDATE users SET total_games = total_games + 1 WHERE id = %s",
                            (uid,),
                        )
                        updated = cur.rowcount > 0

                    # Fallback: username.
                    if not updated:
                        username = str(session.player_data.get("name") or identifier)
                        await cur.execute(
                            "UPDATE users SET total_games = total_games + 1 WHERE username = %s",
                            (username,),
                        )



async def lobby_exists(lobby_id: int) -> bool:
    """
    Check if a lobby exists and is still open in the database.
    """
    pool = await connect()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT 1 FROM lobbies WHERE lobby_id = %s AND status = 'open'",
                (lobby_id,)
            )
            return await cur.fetchone() is not None


async def get_host_device_id(lobby_id: int) -> Optional[str]:
    """
    Retrieve the guest_device_id of the lobby host from the database.
    Returns None if not found.
    """
    pool = await connect()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT p.guest_device_id
                FROM lobbies l
                JOIN players p ON l.host_player_id = p.id
                WHERE l.lobby_id = %s
                """,
                (lobby_id,)
            )
            row = await cur.fetchone()
            if row:
                return row[0]
    return None


class PlayerSession:
    def __init__(self, player_id: str, session_id: str, player_data: dict):
        self.player_id = player_id
        self.session_id = session_id
        self.player_data = player_data.copy()
        self.websocket: Optional[WebSocket] = None
        self.is_afk = False
        self.last_activity = datetime.now()
        self.reconnect_token = f"reconnect_{player_id}_{datetime.now().timestamp()}"
        # Store the unique browser/device identifier
        self.device_id = player_data.get("deviceId", session_id)


class GameRoom:
    def __init__(self, max_players: int, room_id: str):
        self.room_id = room_id
        # Extract numeric lobby ID from room_id like "123{4}"
        self.lobby_id = int(room_id.split('{')[0]) if '{' in room_id else int(room_id)

        self.connections: Dict[WebSocket, PlayerSession] = {}
        self.max_players = max_players
        self.players_ready = 0
        self.ready_status: Dict[str, bool] = {}
        self.session_ids: Dict[str, str] = {}  # session_id -> player_id
        self.player_sessions_by_id: Dict[str, PlayerSession] = {}  # player_id -> PlayerSession
        self.player_devices: Dict[str, str] = {}  # player_id -> device_id (to track multiple devices)
        self.join_order: Dict[str, int] = {}
        self.game_started = False
        self.game_ended = False
        self.next_join_order = 0
        self.chat_history: List[Dict[str, Any]] = []
        self.max_chat_history = 200
        self.afk_check_task: Optional[asyncio.Task] = None

    def add_chat_message(self, username: str, message: str, isGuest: bool, email: str = ""):
        message_data = {
            "username": username,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "isGuest": isGuest,
            "email": email
        }
        self.chat_history.append(message_data)

        if len(self.chat_history) > self.max_chat_history:
            self.chat_history = self.chat_history[-self.max_chat_history:]

        return message_data

    def get_chat_history(self, limit: int = 100):
        return self.chat_history[-limit:] if self.chat_history else []

    def is_player_already_connected(self, player_id: str, device_id: str = None) -> bool:
        """
        Check if a player is already connected to this room from any device.
        Returns True if the player has an active session.
        """
        if player_id not in self.player_sessions_by_id:
            return False
        
        existing_session = self.player_sessions_by_id[player_id]
        
        # If we have a device_id and it matches the existing session, it's the same device (reconnect)
        if device_id and existing_session.device_id == device_id:
            return False  # Same device, allow reconnect
        
        # Different device or no device_id provided - player is already connected elsewhere
        return True

    def add_player(self, websocket: WebSocket, player_data: dict, session_id: str, is_reconnect: bool = False):
        if self.game_ended and not is_reconnect:
            return False, None

        player_id = player_data["playerId"]
        device_id = player_data.get("deviceId", session_id)

        # Check if player is already connected from a different device
        if not is_reconnect and self.is_player_already_connected(player_id, device_id):
            return False, "already_connected"

        if is_reconnect and player_id in self.player_sessions_by_id:
            session = self.player_sessions_by_id[player_id]
            # Verify it's the same device for reconnect
            if session.device_id != device_id:
                return False, "different_device"
            
            if session.websocket and session.websocket in self.connections:
                del self.connections[session.websocket]
            session.websocket = websocket
            session.session_id = session_id
            session.is_afk = False
            session.last_activity = datetime.now()
            self.connections[websocket] = session
            self.session_ids[session_id] = player_id
            return True, "reconnect"
        elif not is_reconnect:
            if player_id in self.player_sessions_by_id:
                return False, "already_connected"

            session = PlayerSession(player_id, session_id, player_data)
            session.device_id = device_id
            session.websocket = websocket
            self.connections[websocket] = session
            self.player_sessions_by_id[player_id] = session
            self.session_ids[session_id] = player_id
            self.player_devices[player_id] = device_id
            self.ready_status[player_id] = player_data.get("isReady", False)
            if player_id not in self.join_order:
                self.join_order[player_id] = self.next_join_order
                self.next_join_order += 1
            if self.ready_status[player_id]:
                self.players_ready += 1
            return True, "new"

        return False, None

    def remove_player(self, websocket: WebSocket, mark_afk: bool = False, is_leaving: bool = False):
        if websocket in self.connections:
            session = self.connections[websocket]
            player_id = session.player_id

            if mark_afk and not is_leaving and not self.game_ended and self.game_started:
                session.is_afk = True
                session.websocket = None
                del self.connections[websocket]
                if session.session_id in self.session_ids:
                    del self.session_ids[session.session_id]
                # Keep player in player_sessions_by_id for potential reconnect
            else:
                if session.session_id in self.session_ids:
                    del self.session_ids[session.session_id]
                if player_id in self.ready_status:
                    if self.ready_status[player_id]:
                        self.players_ready -= 1
                    del self.ready_status[player_id]
                if player_id in self.join_order:
                    del self.join_order[player_id]
                if player_id in self.player_sessions_by_id:
                    del self.player_sessions_by_id[player_id]
                if player_id in self.player_devices:
                    del self.player_devices[player_id]
                del self.connections[websocket]

            # Return True if room is now empty
            return len(self.player_sessions_by_id) == 0
        return False

    async def remove_player_by_session(self, session: PlayerSession):
        """Remove a player by their session object (used for AFK kicking)."""
        player_id = session.player_id
        websocket = session.websocket
        was_game_started = self.game_started
        was_not_ended = not self.game_ended

        # Notify other players
        for conn, sess in self.connections.items():
            if sess.player_id != player_id:
                try:
                    await conn.send_json({
                        "type": "player_left",
                        "playerId": player_id
                    })
                except:
                    pass

        # Remove from all data structures
        if session.session_id in self.session_ids:
            del self.session_ids[session.session_id]
        if player_id in self.ready_status:
            if self.ready_status[player_id]:
                self.players_ready -= 1
            del self.ready_status[player_id]
        if player_id in self.join_order:
            del self.join_order[player_id]
        if player_id in self.player_sessions_by_id:
            del self.player_sessions_by_id[player_id]
        if player_id in self.player_devices:
            del self.player_devices[player_id]
        if websocket and websocket in self.connections:
            del self.connections[websocket]

        # Close the WebSocket if still open
        if websocket:
            try:
                await websocket.close(code=1000, reason="Removed for being AFK too long")
            except:
                pass

        # If the game was in progress and not already ended,
        # check if only one player remains -> declare winner.
        if was_game_started and was_not_ended and len(self.player_sessions_by_id) == 1:
            self.game_ended = True
            try:
                await _increment_total_games_for_room(self)
            except Exception as e:
                print(f"Failed to persist AFK game completion for room {self.room_id}: {e}")
            remaining_player = next(iter(self.player_sessions_by_id.values()))
            remaining_id = remaining_player.player_id
            remaining_name = remaining_player.player_data.get("name", "Unknown")
            # Send game_complete to the remaining player
            if remaining_player.websocket:
                try:
                    await remaining_player.websocket.send_json({
                        "type": "game_complete",
                        "winner_id": remaining_id,
                        "winner_name": remaining_name,
                        "player_score": 0,
                        "opponent_score": 0,
                        "is_draw": False
                    })
                except:
                    pass

        # If room becomes empty, delete lobby
        if len(self.player_sessions_by_id) == 0:
            host_device_id = await get_host_device_id(self.lobby_id)
            if host_device_id:
                try:
                    await delete_lobby(lobby_id=self.lobby_id, device_id=host_device_id)
                except Exception as db_err:
                    print(f"Failed to delete lobby {self.lobby_id}: {db_err}")
            if self.afk_check_task and not self.afk_check_task.done():
                self.afk_check_task.cancel()
            # Clean up room from global dictionary (will be done by caller)

    async def kick_afk_players(self):
        """Check all players and kick those AFK longer than 1 minute."""
        now = datetime.now()
        to_kick = []
        for session in self.player_sessions_by_id.values():
            if session.is_afk and (now - session.last_activity).total_seconds() > 60:
                to_kick.append(session)
        for session in to_kick:
            await self.remove_player_by_session(session)

    async def start_afk_checker(self):
        """Run periodic AFK checks every 30 seconds."""
        try:
            while True:
                await asyncio.sleep(30)
                await self.kick_afk_players()
        except asyncio.CancelledError:
            pass

    def reset_room_for_new_game(self):
        """Reset the room state for a new game while keeping the same room"""
        self.game_started = False
        self.game_ended = False
        self.players_ready = 0

        for player_id in self.ready_status:
            self.ready_status[player_id] = False
        for session in self.player_sessions_by_id.values():
            session.player_data["guessedIds"] = []
            session.player_data["gridState"] = []
            session.is_afk = False

        self.next_join_order = len(self.player_sessions_by_id)

    def update_ready_status(self, player_id: str, is_ready: bool):
        if player_id in self.ready_status:
            old_status = self.ready_status[player_id]
            self.ready_status[player_id] = is_ready
            if is_ready and not old_status:
                self.players_ready += 1
            elif not is_ready and old_status:
                self.players_ready -= 1
            return True
        return False

    def set_player_afk(self, player_id: str, is_afk: bool):
        if player_id in self.player_sessions_by_id:
            session = self.player_sessions_by_id[player_id]
            session.is_afk = is_afk
            session.last_activity = datetime.now()
            return True
        return False

    def session_already_connected(self, session_id: str) -> bool:
        return session_id in self.session_ids

    def is_player_in_game(self, player_id: str) -> bool:
        return player_id in self.player_sessions_by_id

    def is_room_full(self) -> bool:
        active_players = sum(1 for s in self.player_sessions_by_id.values() if not s.is_afk)
        return active_players >= self.max_players

    def can_join_new_player(self) -> bool:
        return not self.game_started and not self.is_room_full() and not self.game_ended

    def can_reconnect_player(self, player_id: str, device_id: str = None) -> tuple:
        """
        Check if a player can reconnect.
        Returns (can_reconnect, reason)
        """
        if not self.is_player_in_game(player_id):
            return False, "not_in_game"
        
        session = self.player_sessions_by_id[player_id]
        # Allow reconnect only if it's the same device
        if device_id and session.device_id == device_id:
            return True, "same_device"
        elif not device_id:
            # If no device_id provided, check if they have an active WebSocket
            if session.websocket is None:
                return True, "reconnect_allowed"
            return False, "already_connected_different_device"
        
        return False, "different_device"

    def all_players_ready(self) -> bool:
        active_players = [s for s in self.player_sessions_by_id.values() if not s.is_afk]
        if len(active_players) != self.max_players:
            return False
        active_ready = sum(1 for p in active_players if self.ready_status.get(p.player_id, False))
        return active_ready == self.max_players

    def get_all_players_with_status(self):
        players = []
        active_sessions = [(pid, s) for pid, s in self.player_sessions_by_id.items()]
        sorted_sessions = sorted(active_sessions, key=lambda x: self.join_order.get(x[0], 999))

        for idx, (player_id, session) in enumerate(sorted_sessions):
            players.append({
                "id": player_id,
                "name": session.player_data["name"],
                "guessedIds": session.player_data.get("guessedIds", []),
                "gridState": session.player_data.get("gridState", []),
                "isReady": self.ready_status.get(player_id, False),
                "isGuest": session.player_data.get("isGuest", False),
                "email": session.player_data.get("email", ""),
                "isHost": idx == 0,
                "joinOrder": self.join_order.get(player_id, 0),
                "isAfk": session.is_afk
            })
        return players

    def get_player_name(self, player_id: str) -> str:
        if player_id in self.player_sessions_by_id:
            return self.player_sessions_by_id[player_id].player_data.get("name", "Unknown")
        return "Unknown"

    def update_player_progress(self, player_id: str, guessed_ids: List[int], grid_state: List[List[str]]):
        if player_id in self.player_sessions_by_id:
            session = self.player_sessions_by_id[player_id]
            session.last_activity = datetime.now()
            session.player_data["guessedIds"] = guessed_ids
            session.player_data["gridState"] = grid_state

    async def cleanup_room(self):
        """Clean up room and close all connections"""
        if self.afk_check_task and not self.afk_check_task.done():
            self.afk_check_task.cancel()
        for conn in list(self.connections.keys()):
            try:
                await conn.close(code=1000, reason="Room cleaned up")
            except:
                pass
        self.connections.clear()
        self.player_sessions_by_id.clear()
        self.session_ids.clear()
        self.ready_status.clear()
        self.join_order.clear()
        self.player_devices.clear()


rooms: Dict[str, GameRoom] = {}
PLAYERS_PATTERN = r'\{(\d+)\}'


def get_max_players(room_id: str):
    matches = re.findall(PLAYERS_PATTERN, room_id)
    if len(matches) != 1:
        return None
    try:
        return int(matches[0])
    except ValueError:
        return None


@router.websocket("/ws/game/{room_id}")
async def game_websocket(websocket: WebSocket, room_id: str):
    await websocket.accept()

    # Extract lobby ID and max players from room_id
    max_players = get_max_players(room_id)
    if max_players is None:
        await websocket.close(code=1008, reason="Invalid room ID format")
        return

    lobby_id = int(room_id.split('{')[0]) if '{' in room_id else int(room_id)

    # Verify lobby exists in database
    if not await lobby_exists(lobby_id):
        await websocket.close(code=1008, reason="Lobby does not exist or is closed")
        return

    # If the room is not in memory, create it
    if room_id not in rooms:
        rooms[room_id] = GameRoom(max_players, room_id)
        # Start the AFK checker for this room
        rooms[room_id].afk_check_task = asyncio.create_task(rooms[room_id].start_afk_checker())

    room = rooms[room_id]
    player_id = None
    session_id = None
    is_reconnect = False

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "join":
                player_id = data["playerId"]
                session_id = data.get("sessionId", "")
                device_id = data.get("deviceId", session_id)  # Add deviceId to track devices
                request_chat_history = data.get("requestChatHistory", True)

                # Double-check lobby still exists (prevent race condition)
                if not await lobby_exists(lobby_id):
                    await websocket.send_json({"type": "error", "message": "Lobby no longer exists"})
                    await websocket.close(code=1008, reason="Lobby deleted")
                    return

                # Check if this is a reconnecting player
                if room.is_player_in_game(player_id):
                    can_reconnect, reason = room.can_reconnect_player(player_id, device_id)
                    
                    if can_reconnect:
                        success, result = room.add_player(websocket, data, session_id, is_reconnect=True)
                        if success:
                            is_reconnect = True

                            for conn, sess in room.connections.items():
                                if sess.player_id != player_id:
                                    try:
                                        await conn.send_json({
                                            "type": "player_reconnected",
                                            "playerId": player_id,
                                            "name": data.get("name", "Unknown"),
                                            "guessedIds": data.get("guessedIds", []),
                                            "gridState": data.get("gridState", []),
                                            "isGuest": data.get("isGuest", False)
                                        })
                                    except:
                                        pass

                            all_players = room.get_all_players_with_status()
                            await websocket.send_json({"type": "players_update", "players": all_players})
                            await websocket.send_json({"type": "ready_update", "ready": room.players_ready})

                            if request_chat_history:
                                chat_history = room.get_chat_history()
                                await websocket.send_json({
                                    "type": "chat_history",
                                    "messages": chat_history
                                })

                            if room.game_started:
                                await websocket.send_json({"type": "game_start"})

                            session = room.player_sessions_by_id[player_id]
                            await websocket.send_json({
                                "type": "player_update",
                                "playerId": player_id,
                                "name": session.player_data.get("name"),
                                "guessedIds": session.player_data.get("guessedIds", []),
                                "gridState": session.player_data.get("gridState", [])
                            })

                            continue
                        else:
                            # Reconnect failed
                            await websocket.send_json({
                                "type": "error", 
                                "message": "Cannot reconnect from a different device. You are already playing in another window/tab."
                            })
                            await websocket.close(code=1008, reason="Already connected from another device")
                            return
                    else:
                        # Player is already connected from a different device
                        if "different_device" in reason:
                            await websocket.send_json({
                                "type": "error", 
                                "message": "You are already playing this game from another device/browser. Please close that session first."
                            })
                        else:
                            await websocket.send_json({
                                "type": "error", 
                                "message": f"Cannot join: {reason}"
                            })
                        await websocket.close(code=1008, reason=reason)
                        return

                # For NEW players
                if room.game_started:
                    await websocket.send_json({"type": "error", "message": "Game already started. Cannot join."})
                    await websocket.close(code=1008, reason="Game already started")
                    return

                if room.is_room_full():
                    await websocket.send_json({"type": "error", "message": "Room is full"})
                    await websocket.close(code=1008, reason="Room is full")
                    return

                if room.session_already_connected(session_id):
                    await websocket.send_json({"type": "error", "message": "Already connected from another tab"})
                    await websocket.close(code=1008, reason="Session already connected")
                    return

                # Check if player is already in this room from another device
                if room.is_player_already_connected(player_id, device_id):
                    await websocket.send_json({
                        "type": "error", 
                        "message": "You are already playing this game from another device. Please close that session first."
                    })
                    await websocket.close(code=1008, reason="Already connected from another device")
                    return

                player_data = {
                    "playerId": player_id,
                    "name": data["name"],
                    "guessedIds": [],
                    "gridState": [],
                    "isGuest": data.get("isGuest", False),
                    "email": data.get("email", ""),
                    "isReady": False,
                    "deviceId": device_id,
                }

                success, result = room.add_player(websocket, player_data, session_id, is_reconnect=False)
                
                if not success:
                    if result == "already_connected":
                        await websocket.send_json({
                            "type": "error", 
                            "message": "You are already playing this game from another device. Please close that session first."
                        })
                    else:
                        await websocket.send_json({
                            "type": "error", 
                            "message": "Failed to join game"
                        })
                    await websocket.close(code=1008, reason=result)
                    return

                all_players = room.get_all_players_with_status()
                for conn in room.connections:
                    try:
                        await conn.send_json({"type": "players_update", "players": all_players})
                    except:
                        pass

                await websocket.send_json({"type": "ready_update", "ready": room.players_ready})

                if request_chat_history:
                    chat_history = room.get_chat_history()
                    await websocket.send_json({
                        "type": "chat_history",
                        "messages": chat_history
                    })

                if room.all_players_ready() and not room.game_started:
                    room.game_started = True
                    for conn in room.connections:
                        try:
                            await conn.send_json({"type": "game_start"})
                        except:
                            pass

            elif msg_type == "player_active":
                is_afk = data.get("afk", False)
                if player_id:
                    room.set_player_afk(player_id, is_afk)
                    all_players = room.get_all_players_with_status()
                    for conn in room.connections:
                        try:
                            await conn.send_json({"type": "players_update", "players": all_players})
                            await conn.send_json({
                                "type": "player_afk",
                                "playerId": player_id,
                                "afk": is_afk,
                                "name": room.get_player_name(player_id)
                            })
                        except:
                            pass

            elif msg_type == "player_afk":
                is_afk = data.get("afk", True)
                if player_id:
                    room.set_player_afk(player_id, is_afk)
                    all_players = room.get_all_players_with_status()
                    for conn in room.connections:
                        try:
                            await conn.send_json({"type": "players_update", "players": all_players})
                            await conn.send_json({
                                "type": "player_afk",
                                "playerId": player_id,
                                "afk": is_afk,
                                "name": room.get_player_name(player_id)
                            })
                        except:
                            pass

            elif msg_type == "player_update":
                if player_id:
                    room.update_player_progress(player_id, data.get("guessedIds", []), data.get("gridState", []))
                    for conn, sess in room.connections.items():
                        if sess.player_id != player_id:
                            try:
                                await conn.send_json({
                                    "type": "player_update",
                                    "playerId": player_id,
                                    "name": data.get("name", "Unknown"),
                                    "guessedIds": data.get("guessedIds", []),
                                    "gridState": data.get("gridState", []),
                                    "isAfk": room.player_sessions_by_id[player_id].is_afk if player_id in room.player_sessions_by_id else False
                                })
                            except:
                                pass

            elif msg_type == "ready_update":
                if player_id and not room.game_started:
                    is_ready = data.get("ready", False)
                    room.update_ready_status(player_id, is_ready)

                    all_players = room.get_all_players_with_status()
                    for conn in room.connections:
                        try:
                            await conn.send_json({"type": "players_update", "players": all_players})
                            await conn.send_json({"type": "ready_update", "ready": room.players_ready})
                        except:
                            pass

                    if room.all_players_ready() and not room.game_started:
                        room.game_started = True
                        for conn in room.connections:
                            try:
                                await conn.send_json({"type": "game_start"})
                            except:
                                pass

            elif msg_type == "message":
                if player_id:
                    sender_name = room.get_player_name(player_id)
                    message_text = data.get("message", "")
                    if message_text:
                        is_guest = room.player_sessions_by_id[player_id].player_data.get("isGuest", False)
                        email = room.player_sessions_by_id[player_id].player_data.get("email", "")
                        stored_message = room.add_chat_message(sender_name, message_text, is_guest, email)

                        for conn in room.connections:
                            try:
                                await conn.send_json({
                                    "type": "chat_message",
                                    "username": sender_name,
                                    "message": message_text,
                                    "timestamp": stored_message["timestamp"],
                                    "isGuest": is_guest,
                                    "email": email
                                })
                            except:
                                pass

            elif msg_type == "game_complete":
                if player_id:
                    if not room.game_ended:
                        room.game_ended = True
                        try:
                            await _increment_total_games_for_room(room)
                        except Exception as e:
                            # Don't break the websocket flow if DB write fails.
                            print(f"Failed to persist game completion for room {room.room_id}: {e}")

                    for conn in room.connections:
                        try:
                            await conn.send_json({
                                "type": "game_complete",
                                "winner_id": data.get("winner_id"),
                                "winner_name": data.get("winner_name"),
                                "player_score": data.get("player_score", 0),
                                "opponent_score": data.get("opponent_score", 0),
                                "is_draw": data.get("is_draw", False)
                            })
                        except:
                            pass

            elif msg_type == "play_again":
                if player_id:
                    room.reset_room_for_new_game()

                    for conn in room.connections:
                        try:
                            await conn.send_json({
                                "type": "game_reset_for_play_again",
                                "message": "Starting new game"
                            })
                        except:
                            pass

                    all_players = room.get_all_players_with_status()
                    for conn in room.connections:
                        try:
                            await conn.send_json({"type": "players_update", "players": all_players})
                            await conn.send_json({"type": "ready_update", "ready": 0})
                        except:
                            pass

            elif msg_type == "leave":
                if player_id and room_id in rooms:
                    for conn, sess in room.connections.items():
                        if sess.player_id != player_id:
                            try:
                                await conn.send_json({
                                    "type": "player_left",
                                    "playerId": player_id
                                })
                            except:
                                pass

                    room_empty = room.remove_player(websocket, mark_afk=False, is_leaving=True)

                    # If room is empty, delete from memory and database
                    if room_empty or len(room.player_sessions_by_id) == 0:
                        host_device_id = await get_host_device_id(room.lobby_id)
                        if host_device_id:
                            try:
                                await delete_lobby(lobby_id=room.lobby_id, device_id=host_device_id)
                            except Exception as db_err:
                                print(f"Failed to delete lobby {room.lobby_id}: {db_err}")
                        if room.afk_check_task and not room.afk_check_task.done():
                            room.afk_check_task.cancel()
                        if room_id in rooms:
                            await room.cleanup_room()
                            del rooms[room_id]

                await websocket.close(code=1000, reason="Player left")
                return

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        if room_id in rooms and player_id:
            room = rooms[room_id]

            if room.game_started and not room.game_ended:
                room_empty = room.remove_player(websocket, mark_afk=True, is_leaving=False)

                all_players = room.get_all_players_with_status()
                for conn in room.connections:
                    try:
                        await conn.send_json({"type": "players_update", "players": all_players})
                        await conn.send_json({"type": "player_afk", "playerId": player_id, "afk": True})
                    except:
                        pass
            else:
                room_empty = room.remove_player(websocket, mark_afk=False, is_leaving=False)

                all_players = room.get_all_players_with_status()
                for conn in room.connections:
                    try:
                        await conn.send_json({"type": "players_update", "players": all_players})
                        await conn.send_json({"type": "player_left", "playerId": player_id})
                    except:
                        pass

            # After removal, check if room is empty
            if room_empty or len(room.player_sessions_by_id) == 0:
                host_device_id = await get_host_device_id(room.lobby_id)
                if host_device_id:
                    try:
                        await delete_lobby(lobby_id=room.lobby_id, device_id=host_device_id)
                    except Exception as db_err:
                        print(f"Failed to delete lobby {room.lobby_id}: {db_err}")
                if room.afk_check_task and not room.afk_check_task.done():
                    room.afk_check_task.cancel()
                if room_id in rooms:
                    await room.cleanup_room()
                    del rooms[room_id]

    except Exception as e:
        print(f"⚠️ Unexpected error: {e}")
        import traceback
        traceback.print_exc()

        if room_id in rooms:
            try:
                room = rooms[room_id]
                if len(room.player_sessions_by_id) == 0:
                    host_device_id = await get_host_device_id(room.lobby_id)
                    if host_device_id:
                        await delete_lobby(lobby_id=room.lobby_id, device_id=host_device_id)
                if room.afk_check_task and not room.afk_check_task.done():
                    room.afk_check_task.cancel()
                await rooms[room_id].cleanup_room()
                del rooms[room_id]
            except:
                pass
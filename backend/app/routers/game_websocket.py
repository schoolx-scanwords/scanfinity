from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Any, Optional
import json
from datetime import datetime
import re
import asyncio

router = APIRouter()

class PlayerSession:
    def __init__(self, player_id: str, session_id: str, player_data: dict):
        self.player_id = player_id
        self.session_id = session_id
        self.player_data = player_data.copy()
        self.websocket: Optional[WebSocket] = None
        self.is_afk = False
        self.last_activity = datetime.now()
        self.reconnect_token = f"reconnect_{player_id}_{datetime.now().timestamp()}"

class GameRoom:
    def __init__(self, max_players: int):
        self.connections: Dict[WebSocket, PlayerSession] = {}
        self.max_players = max_players
        self.players_ready = 0
        self.ready_status: Dict[str, bool] = {}
        self.session_ids: Dict[str, str] = {}
        self.join_order: Dict[str, int] = {}
        self.game_started = False
        self.game_ended = False
        self.next_join_order = 0
        self.player_sessions: Dict[str, PlayerSession] = {}
        self.chat_history: List[Dict[str, Any]] = []
        self.max_chat_history = 200
        self.cleanup_task: Optional[asyncio.Task] = None
    
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
    
    def add_player(self, websocket: WebSocket, player_data: dict, session_id: str, is_reconnect: bool = False):
        if self.game_ended:
            return False
        
        player_id = player_data["playerId"]
        
        if is_reconnect and player_id in self.player_sessions:
            session = self.player_sessions[player_id]
            if session.websocket and session.websocket in self.connections:
                del self.connections[session.websocket]
            session.websocket = websocket
            session.session_id = session_id
            session.is_afk = False
            session.last_activity = datetime.now()
            self.connections[websocket] = session
            self.session_ids[session_id] = player_id
            return True
        elif not is_reconnect:
            if player_id in self.player_sessions:
                return False
            
            session = PlayerSession(player_id, session_id, player_data)
            session.websocket = websocket
            self.connections[websocket] = session
            self.player_sessions[player_id] = session
            self.session_ids[session_id] = player_id
            self.ready_status[player_id] = player_data.get("isReady", False)
            if player_id not in self.join_order:
                self.join_order[player_id] = self.next_join_order
                self.next_join_order += 1
            if self.ready_status[player_id]:
                self.players_ready += 1
            return True
        
        return False
    
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
                print(f"  - Player {player_id} marked AFK (kept in room)")
            else:
                if session.session_id in self.session_ids:
                    del self.session_ids[session.session_id]
                if player_id in self.ready_status:
                    if self.ready_status[player_id]:
                        self.players_ready -= 1
                    del self.ready_status[player_id]
                if player_id in self.join_order:
                    del self.join_order[player_id]
                if player_id in self.player_sessions:
                    del self.player_sessions[player_id]
                del self.connections[websocket]
                print(f"  - Player {player_id} completely removed from room")
            
            # Check if room is empty after removal
            if len(self.player_sessions) == 0:
                return True  # Room is empty
        return False
    
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
        if player_id in self.player_sessions:
            session = self.player_sessions[player_id]
            session.is_afk = is_afk
            session.last_activity = datetime.now()
            return True
        return False
    
    def session_already_connected(self, session_id: str) -> bool:
        return session_id in self.session_ids
    
    def is_player_in_game(self, player_id: str) -> bool:
        return player_id in self.player_sessions
    
    def is_room_full(self) -> bool:
        active_players = sum(1 for s in self.player_sessions.values() if not s.is_afk)
        return active_players >= self.max_players
    
    def can_join_new_player(self) -> bool:
        return not self.game_started and not self.is_room_full() and not self.game_ended
    
    def can_reconnect_player(self, player_id: str) -> bool:
        return self.is_player_in_game(player_id) and not self.game_ended
    
    def all_players_ready(self) -> bool:
        active_players = [s for s in self.player_sessions.values() if not s.is_afk]
        if len(active_players) != self.max_players:
            return False
        active_ready = sum(1 for p in active_players if self.ready_status.get(p.player_id, False))
        return active_ready == self.max_players
    
    def get_all_players_with_status(self):
        players = []
        active_sessions = [(pid, s) for pid, s in self.player_sessions.items()]
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
        if player_id in self.player_sessions:
            return self.player_sessions[player_id].player_data.get("name", "Unknown")
        return "Unknown"
    
    def update_player_progress(self, player_id: str, guessed_ids: List[int], grid_state: List[List[str]]):
        if player_id in self.player_sessions:
            session = self.player_sessions[player_id]
            session.last_activity = datetime.now()
            session.player_data["guessedIds"] = guessed_ids
            session.player_data["gridState"] = grid_state
    
    async def cleanup_room(self):
        """Clean up room and close all connections"""
        print(f"🧹 Cleaning up room with {len(self.connections)} connections")
        
        # Close all connections
        for conn in list(self.connections.keys()):
            try:
                await conn.close(code=1000, reason="Room cleaned up")
            except:
                pass
        
        # Clear all data
        self.connections.clear()
        self.player_sessions.clear()
        self.session_ids.clear()
        self.ready_status.clear()
        self.join_order.clear()
        self.chat_history.clear()
    
    def mark_game_ended(self):
        """Mark game as ended and prevent further joins"""
        self.game_ended = True
        self.game_started = False

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
    print(f"✅ WebSocket connection accepted for room: {room_id}")
    
    max_players = get_max_players(room_id)
    if max_players is None:
        await websocket.close(code=1008, reason="Invalid room ID format")
        return
    
    # Check if room exists and if it has ended
    if room_id in rooms and rooms[room_id].game_ended:
        print(f"❌ Room {room_id} has ended, deleting and creating new")
        del rooms[room_id]
    
    if room_id not in rooms:
        rooms[room_id] = GameRoom(max_players)
        print(f"🏠 Created new room: {room_id} (max players: {max_players})")
    
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
                request_chat_history = data.get("requestChatHistory", True)
                
                print(f"📥 Join request: player={player_id}, session={session_id}, name={data.get('name')}")
                print(f"   Room state: game_started={room.game_started}, game_ended={room.game_ended}, players={len(room.player_sessions)}/{max_players}")
                
                # Check if game has ended
                if room.game_ended:
                    print(f"❌ Game has ended, rejecting player {player_id}")
                    await websocket.send_json({"type": "error", "message": "Game has ended. Please refresh the page."})
                    await websocket.close(code=1008, reason="Game ended")
                    return
                
                # Check if this is a reconnecting player
                if room.is_player_in_game(player_id):
                    print(f"🔄 Player {player_id} is RECONNECTING")
                    success = room.add_player(websocket, data, session_id, is_reconnect=True)
                    if success:
                        is_reconnect = True
                        
                        # Broadcast reconnection to others
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
                        
                        # Send current game state
                        all_players = room.get_all_players_with_status()
                        await websocket.send_json({"type": "players_update", "players": all_players})
                        await websocket.send_json({"type": "ready_update", "ready": room.players_ready})
                        
                        # Send chat history
                        if request_chat_history:
                            chat_history = room.get_chat_history()
                            await websocket.send_json({
                                "type": "chat_history",
                                "messages": chat_history
                            })
                            print(f"📜 Sent {len(chat_history)} chat messages to reconnecting player {player_id}")
                        
                        # If game already started, tell player to start
                        if room.game_started:
                            print(f"   Game already started, sending game_start to reconnecting player {player_id}")
                            await websocket.send_json({"type": "game_start"})
                        
                        # Send current progress
                        session = room.player_sessions[player_id]
                        await websocket.send_json({
                            "type": "player_update",
                            "playerId": player_id,
                            "name": session.player_data.get("name"),
                            "guessedIds": session.player_data.get("guessedIds", []),
                            "gridState": session.player_data.get("gridState", [])
                        })
                        
                        continue
                
                # For NEW players: check if game already started
                if room.game_started:
                    print(f"❌ Game already started, rejecting NEW player {player_id}")
                    await websocket.send_json({"type": "error", "message": "Game already started. Cannot join."})
                    await websocket.close(code=1008, reason="Game already started")
                    return
                
                # Check if room is full
                if room.is_room_full():
                    print(f"❌ Room is full, rejecting NEW player {player_id}")
                    await websocket.send_json({"type": "error", "message": "Room is full"})
                    await websocket.close(code=1008, reason="Room is full")
                    return
                
                # Check for duplicate session
                if room.session_already_connected(session_id):
                    await websocket.send_json({"type": "error", "message": "Already connected from another tab"})
                    await websocket.close(code=1008, reason="Session already connected")
                    return
                
                # Add NEW player
                player_data = {
                    "playerId": player_id,
                    "name": data["name"],
                    "guessedIds": [],
                    "gridState": [],
                    "isGuest": data.get("isGuest", False),
                    "email": data.get("email", ""),
                    "isReady": False
                }
                
                room.add_player(websocket, player_data, session_id, is_reconnect=False)
                print(f"✅ NEW Player {data['name']} joined room {room_id}")
                
                # Send updated player list to everyone
                all_players = room.get_all_players_with_status()
                for conn in room.connections:
                    try:
                        await conn.send_json({"type": "players_update", "players": all_players})
                    except:
                        pass
                
                await websocket.send_json({"type": "ready_update", "ready": room.players_ready})
                
                # Send chat history
                if request_chat_history:
                    chat_history = room.get_chat_history()
                    await websocket.send_json({
                        "type": "chat_history",
                        "messages": chat_history
                    })
                    print(f"📜 Sent {len(chat_history)} chat messages to new player {player_id}")
                
                # Check if all players are ready
                if room.all_players_ready() and not room.game_started:
                    room.game_started = True
                    print(f"🎮 GAME STARTING in room {room_id}!")
                    for conn in room.connections:
                        try:
                            await conn.send_json({"type": "game_start"})
                        except:
                            pass
            
            elif msg_type == "player_active":
                is_afk = data.get("afk", False)
                if player_id and not room.game_ended:
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
                if player_id and not room.game_ended:
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
                if player_id and not room.game_ended:
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
                                    "isAfk": room.player_sessions[player_id].is_afk if player_id in room.player_sessions else False
                                })
                            except:
                                pass
            
            elif msg_type == "ready_update":
                if player_id and not room.game_started and not room.game_ended:
                    is_ready = data.get("ready", False)
                    room.update_ready_status(player_id, is_ready)
                    print(f"🟢 Player {player_id} ready: {is_ready}")
                    
                    all_players = room.get_all_players_with_status()
                    for conn in room.connections:
                        try:
                            await conn.send_json({"type": "players_update", "players": all_players})
                            await conn.send_json({"type": "ready_update", "ready": room.players_ready})
                        except:
                            pass
                    
                    # Check if all players are ready
                    if room.all_players_ready() and not room.game_started:
                        room.game_started = True
                        print(f"🎮 GAME STARTING in room {room_id}!")
                        for conn in room.connections:
                            try:
                                await conn.send_json({"type": "game_start"})
                            except:
                                pass
            
            elif msg_type == "message":
                if player_id and not room.game_ended:
                    sender_name = room.get_player_name(player_id)
                    message_text = data.get("message", "")
                    if message_text:
                        is_guest = room.player_sessions[player_id].player_data.get("isGuest", False)
                        email = room.player_sessions[player_id].player_data.get("email", "")
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
                    print(f"🎮 Game complete in room {room_id}!")
                    
                    # Broadcast game complete to all players
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
                    
                    # Mark game as ended
                    room.mark_game_ended()
                    
                    # Schedule room deletion after 3 seconds (give time for game over screen to show)
                    async def delayed_cleanup():
                        await asyncio.sleep(3)
                        if room_id in rooms:
                            room = rooms[room_id]
                            await room.cleanup_room()
                            del rooms[room_id]
                            print(f"🧹 Room {room_id} deleted after game completion")
                    
                    asyncio.create_task(delayed_cleanup())
            
            elif msg_type == "game_ended":
                if player_id:
                    print(f"🏁 Game ended in room {room_id}, cleaning up...")
                    room.mark_game_ended()
                    
                    # Notify all players
                    for conn in room.connections:
                        try:
                            await conn.send_json({
                                "type": "game_ended",
                                "reason": "Game complete"
                            })
                        except:
                            pass
                    
                    # Clean up the room
                    await room.cleanup_room()
                    
                    # Delete the room
                    if room_id in rooms:
                        del rooms[room_id]
                        print(f"🧹 Room {room_id} deleted after game ended")
                    
                    # Close the current connection
                    await websocket.close(code=1000, reason="Game ended")
                    return
            
            elif msg_type == "reset_game":
                print(f"🔄 Game reset requested for room {room_id}")
                
                # Mark game as ended
                room.mark_game_ended()
                
                # Notify all players
                for conn in room.connections:
                    try:
                        await conn.send_json({
                            "type": "game_reset",
                            "message": "Game reset, returning to lobby"
                        })
                    except:
                        pass
                
                # Clean up the room
                await room.cleanup_room()
                
                # Delete the room
                if room_id in rooms:
                    del rooms[room_id]
                    print(f"🧹 Room {room_id} deleted after game reset")
                
                await websocket.close(code=1000, reason="Game reset")
                return
            
            elif msg_type == "leave":
                print(f"👋 Player {player_id} requested to leave")
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
                    
                    # If room is empty, delete it immediately
                    if room_empty or len(room.player_sessions) == 0:
                        if room_id in rooms:
                            await room.cleanup_room()
                            del rooms[room_id]
                        print(f"🧹 Room {room_id} deleted (no players left)")
                
                await websocket.close(code=1000, reason="Player left")
                return
            
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        print(f"❌ Player {player_id} disconnected from room {room_id}")
        
        if room_id in rooms and player_id and not rooms[room_id].game_ended:
            room = rooms[room_id]
            
            if room.game_started and not room.game_ended:
                room_empty = room.remove_player(websocket, mark_afk=True, is_leaving=False)
                print(f"  - Player {player_id} marked AFK (game in progress)")
                
                all_players = room.get_all_players_with_status()
                for conn in room.connections:
                    try:
                        await conn.send_json({"type": "players_update", "players": all_players})
                        await conn.send_json({"type": "player_afk", "playerId": player_id, "afk": True})
                    except:
                        pass
            else:
                room_empty = room.remove_player(websocket, mark_afk=False, is_leaving=False)
                print(f"  - Player {player_id} completely removed (game not started)")
                
                all_players = room.get_all_players_with_status()
                for conn in room.connections:
                    try:
                        await conn.send_json({"type": "players_update", "players": all_players})
                        await conn.send_json({"type": "player_left", "playerId": player_id})
                    except:
                        pass
                
                # If room is empty, delete it immediately
                if room_empty or len(room.player_sessions) == 0:
                    if room_id in rooms:
                        await room.cleanup_room()
                        del rooms[room_id]
                    print(f"🧹 Room {room_id} deleted (no players left)")
    
    except Exception as e:
        print(f"⚠️ Unexpected error: {e}")
        import traceback
        traceback.print_exc()

        # Clean up on error
        if room_id in rooms:
            try:
                await rooms[room_id].cleanup_room()
                del rooms[room_id]
                print(f"🧹 Room {room_id} deleted due to error")
            except:
                pass
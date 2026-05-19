from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Optional, List, Any
import json
import asyncio
from datetime import datetime
import random

router = APIRouter()

# Store active matchmaking sessions
class MatchmakingSession:
    def __init__(self, player_id: str, websocket: WebSocket, player_data: dict):
        self.player_id = player_id
        self.websocket = websocket
        self.player_data = player_data
        self.joined_at = datetime.now()
        self.is_matched = False

class MatchmakingRoom:
    def __init__(self):
        self.sessions: Dict[str, MatchmakingSession] = {}
        self.matching_task: Optional[asyncio.Task] = None
    
    async def add_player(self, player_id: str, websocket: WebSocket, player_data: dict):
        if player_id not in self.sessions:
            session = MatchmakingSession(player_id, websocket, player_data)
            self.sessions[player_id] = session
            print(f"Player {player_id} added to queue. Total players: {len(self.sessions)}")
            return True
        return False
    
    async def remove_player(self, player_id: str):
        if player_id in self.sessions:
            del self.sessions[player_id]
            print(f"Player {player_id} removed from queue. Total players: {len(self.sessions)}")
            return True
        return False
    
    async def find_matches(self):
        """Find and create matches between players in queue"""
        available_players = [s for s in self.sessions.values() if not s.is_matched]
        
        if len(available_players) < 2:
            return []
        
        matches = []
        used = set()
        
        available_players.sort(key=lambda x: x.player_data.get("elo", 1200))
        
        i = 0
        while i < len(available_players) - 1:
            player1 = available_players[i]
            player2 = available_players[i + 1]
            
            if player1.player_id in used or player2.player_id in used:
                i += 1
                continue
            
            elo1 = player1.player_data.get("elo", 1200)
            elo2 = player2.player_data.get("elo", 1200)
            elo_diff = abs(elo1 - elo2)
            
            if elo_diff <= 500:
                matches.append((player1, player2))
                used.add(player1.player_id)
                used.add(player2.player_id)
                i += 2
                print(f"Match found! {player1.player_data.get('name')} (ELO: {elo1}) vs {player2.player_data.get('name')} (ELO: {elo2})")
            else:
                i += 1
        
        return matches
    
    async def get_or_create_player(self, cur, username: str, user_id: int) -> int:
        await cur.execute("""
            SELECT id FROM players WHERE user_id = %s
        """, (user_id,))
        existing = await cur.fetchone()
        
        if existing:
            return existing[0]
        
        await cur.execute("""
            INSERT INTO players (display_name, user_id, created_at)
            VALUES (%s, %s, NOW())
            RETURNING id
        """, (username, user_id))
        
        result = await cur.fetchone()
        return result[0]
    
    async def get_user_id_from_username(self, cur, username: str) -> Optional[int]:
        await cur.execute("""
            SELECT id FROM users WHERE username = %s
        """, (username,))
        result = await cur.fetchone()
        return result[0] if result else None
    
    async def create_ranked_room(self, player1: MatchmakingSession, player2: MatchmakingSession) -> Optional[tuple]:
        try:
            from database.connect import connect
            
            pool = await connect()
            
            async with pool.connection() as conn:
                async with conn.cursor() as cur:
                    await cur.execute("BEGIN")
                    
                    try:
                        player1_name = player1.player_data.get("name", "Unknown")
                        player2_name = player2.player_data.get("name", "Unknown")
                        
                        player1_user_id = await self.get_user_id_from_username(cur, player1_name)
                        player2_user_id = await self.get_user_id_from_username(cur, player2_name)
                        
                        if not player1_user_id or not player2_user_id:
                            await cur.execute("ROLLBACK")
                            return None
                        
                        player1_db_id = await self.get_or_create_player(cur, player1_name, player1_user_id)
                        player2_db_id = await self.get_or_create_player(cur, player2_name, player2_user_id)
                        
                        await cur.execute("""
                            SELECT puzzle_id FROM puzzles 
                            ORDER BY RANDOM() 
                            LIMIT 1
                        """)
                        puzzle = await cur.fetchone()
                        
                        if not puzzle:
                            await cur.execute("ROLLBACK")
                            return None
                        
                        puzzle_id = puzzle[0]
                        
                        await cur.execute("""
                            INSERT INTO lobbies (
                                host_player_id, status, game_type, max_players, 
                                is_private, difficulty, created_at
                            )
                            VALUES (%s, 'open', 'one_v_one', 2, false, 'Medium', NOW())
                            RETURNING lobby_id
                        """, (player1_db_id,))
                        
                        result = await cur.fetchone()
                        if not result:
                            await cur.execute("ROLLBACK")
                            return None
                        
                        lobby_id = result[0]
                        
                        for player_db_id in [player1_db_id, player2_db_id]:
                            await cur.execute("""
                                INSERT INTO lobby_players (lobby_id, player_id, is_ready, joined_at)
                                VALUES (%s, %s, false, NOW())
                            """, (lobby_id, player_db_id))
                        
                        await cur.execute("""
                            INSERT INTO games (
                                lobby_id, puzzle_id, game_type, is_ranked, 
                                game_status, date_time
                            )
                            VALUES (%s, %s, 'one_v_one', true, 'created', NOW())
                            RETURNING game_id
                        """, (lobby_id, puzzle_id))
                        
                        game_result = await cur.fetchone()
                        game_id = game_result[0] if game_result else None
                        
                        for player_db_id in [player1_db_id, player2_db_id]:
                            await cur.execute("""
                                INSERT INTO game_players (game_id, player_id, score, is_winner)
                                VALUES (%s, %s, 0, false)
                            """, (game_id, player_db_id))
                        
                        await cur.execute("COMMIT")
                        
                        room_id = f"{lobby_id}{{2}}"
                        print(f"Successfully created ranked room: {room_id}")
                        return (room_id, lobby_id, player1_name, player2_name, player1_db_id, player2_db_id, game_id)
                        
                    except Exception as e:
                        print(f"Error during room creation: {e}")
                        await cur.execute("ROLLBACK")
                        raise
        
        except Exception as e:
            print(f"Failed to create ranked room: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def cleanup_room_on_leave(self, lobby_id: int, game_id: int, winner_username: Optional[str] = None, loser_username: Optional[str] = None):
        """Clean up room when a player leaves - mark game as finished/canceled and close lobby"""
        try:
            from database.connect import connect
            
            pool = await connect()
            
            async with pool.connection() as conn:
                async with conn.cursor() as cur:
                    await cur.execute("BEGIN")
                    
                    try:
                        if winner_username and loser_username:
                            # Get player IDs
                            await cur.execute("""
                                SELECT id FROM players WHERE display_name = %s
                            """, (winner_username,))
                            winner_result = await cur.fetchone()
                            
                            await cur.execute("""
                                SELECT id FROM players WHERE display_name = %s
                            """, (loser_username,))
                            loser_result = await cur.fetchone()
                            
                            if winner_result and loser_result:
                                winner_db_id = winner_result[0]
                                loser_db_id = loser_result[0]
                                
                                # Mark winner in game_players
                                await cur.execute("""
                                    UPDATE game_players 
                                    SET is_winner = (player_id = %s)
                                    WHERE game_id = %s
                                """, (winner_db_id, game_id))
                                
                                # Get current ELO ratings
                                await cur.execute("""
                                    SELECT u.elo, u.id 
                                    FROM game_players gp
                                    JOIN players p ON gp.player_id = p.id
                                    JOIN users u ON p.user_id = u.id
                                    WHERE gp.game_id = %s AND p.id = %s
                                """, (game_id, winner_db_id))
                                winner_elo_data = await cur.fetchone()
                                
                                await cur.execute("""
                                    SELECT u.elo, u.id 
                                    FROM game_players gp
                                    JOIN players p ON gp.player_id = p.id
                                    JOIN users u ON p.user_id = u.id
                                    WHERE gp.game_id = %s AND p.id = %s
                                """, (game_id, loser_db_id))
                                loser_elo_data = await cur.fetchone()
                                
                                if winner_elo_data and loser_elo_data:
                                    winner_elo = winner_elo_data[0]
                                    loser_elo = loser_elo_data[0]
                                    winner_user_id = winner_elo_data[1]
                                    loser_user_id = loser_elo_data[1]
                                    
                                    # Simple ELO calculation (K=32)
                                    K = 32
                                    expected_winner = 1 / (1 + 10 ** ((loser_elo - winner_elo) / 400))
                                    expected_loser = 1 / (1 + 10 ** ((winner_elo - loser_elo) / 400))
                                    
                                    new_winner_elo = round(winner_elo + K * (1 - expected_winner))
                                    new_loser_elo = round(loser_elo + K * (0 - expected_loser))
                                    
                                    # Update ELO ratings
                                    await cur.execute("""
                                        UPDATE users SET elo = %s WHERE id = %s
                                    """, (new_winner_elo, winner_user_id))
                                    
                                    await cur.execute("""
                                        UPDATE users SET elo = %s WHERE id = %s
                                    """, (new_loser_elo, loser_user_id))
                                    
                                    # Update game_players with ELO changes
                                    await cur.execute("""
                                        UPDATE game_players 
                                        SET elo_before = %s, elo_after = %s
                                        WHERE game_id = %s AND player_id = %s
                                    """, (winner_elo, new_winner_elo, game_id, winner_db_id))
                                    
                                    await cur.execute("""
                                        UPDATE game_players 
                                        SET elo_before = %s, elo_after = %s
                                        WHERE game_id = %s AND player_id = %s
                                    """, (loser_elo, new_loser_elo, game_id, loser_db_id))
                            
                            # Update game status to finished
                            await cur.execute("""
                                UPDATE games 
                                SET game_status = 'finished', 
                                    game_duration = EXTRACT(EPOCH FROM (NOW() - date_time))::int
                                WHERE game_id = %s
                            """, (game_id,))
                            
                            print(f"Room {lobby_id} cleaned up. Winner: {winner_username}")
                            
                        else:
                            # No winner (both left or game canceled)
                            await cur.execute("""
                                UPDATE games 
                                SET game_status = 'canceled'
                                WHERE game_id = %s
                            """, (game_id,))
                            
                            print(f"Room {lobby_id} canceled (no winner)")
                        
                        # Update lobby status to closed
                        await cur.execute("""
                            UPDATE lobbies 
                            SET status = 'closed'
                            WHERE lobby_id = %s
                        """, (lobby_id,))
                        
                        await cur.execute("COMMIT")
                        
                    except Exception as e:
                        print(f"Error in cleanup_room_on_leave: {e}")
                        await cur.execute("ROLLBACK")
                        raise
                        
        except Exception as e:
            print(f"Failed to cleanup room: {e}")
            import traceback
            traceback.print_exc()
    
    async def re_add_to_queue(self, player_session: MatchmakingSession):
        """Put a player back into the queue after opponent leaves"""
        if player_session.player_id in self.sessions:
            # Player is already in queue, just reset matched status
            player_session.is_matched = False
            print(f"Player {player_session.player_id} re-added to queue")
        else:
            # Add player back to queue
            self.sessions[player_session.player_id] = player_session
            player_session.is_matched = False
            print(f"Player {player_session.player_id} added back to queue. Total players: {len(self.sessions)}")
    
    async def start_matchmaking(self):
        print("Matchmaking task started")
        while True:
            try:
                await asyncio.sleep(2)
                
                if len(self.sessions) >= 2:
                    matches = await self.find_matches()
                    
                    for player1, player2 in matches:
                        if not player1.is_matched and not player2.is_matched:
                            player1.is_matched = True
                            player2.is_matched = True
                            
                            print(f"Creating room for matched players: {player1.player_id} and {player2.player_id}")
                            
                            result = await self.create_ranked_room(player1, player2)
                            
                            if result:
                                room_id, lobby_id, p1_name, p2_name, p1_db_id, p2_db_id, game_id = result
                                
                                active_game_rooms[room_id] = {
                                    "players": [player1.player_id, player2.player_id],
                                    "player_names": [p1_name, p2_name],
                                    "player_db_ids": [p1_db_id, p2_db_id],
                                    "player_sessions": {
                                        player1.player_id: player1,
                                        player2.player_id: player2
                                    },
                                    "lobby_id": lobby_id,
                                    "game_id": game_id,
                                    "game_started": False,  # Track if game actually started
                                    "websockets": {
                                        player1.player_id: player1.websocket,
                                        player2.player_id: player2.websocket
                                    }
                                }
                                
                                try:
                                    await player1.websocket.send_json({
                                        "type": "match_found",
                                        "room_id": room_id,
                                        "opponent": {
                                            "id": player2.player_id,
                                            "name": p2_name,
                                            "elo": player2.player_data.get("elo", 1200)
                                        }
                                    })
                                    print(f"Match found sent to {player1.player_id}")
                                    
                                    await player2.websocket.send_json({
                                        "type": "match_found",
                                        "room_id": room_id,
                                        "opponent": {
                                            "id": player1.player_id,
                                            "name": p1_name,
                                            "elo": player1.player_data.get("elo", 1200)
                                        }
                                    })
                                    print(f"Match found sent to {player2.player_id}")
                                    
                                except Exception as e:
                                    print(f"Error notifying players: {e}")
                                    player1.is_matched = False
                                    player2.is_matched = False
                            else:
                                player1.is_matched = False
                                player2.is_matched = False
                                print("Failed to create room")
                
            except Exception as e:
                print(f"Matchmaking error: {e}")

# Global variables
matchmaking_rooms: Dict[str, MatchmakingRoom] = {}
active_game_rooms: Dict[str, Dict[str, Any]] = {}

@router.websocket("/ws/matchmaking/{username}")
async def matchmaking_websocket(websocket: WebSocket, username: str):
    await websocket.accept()
    
    player_name = websocket.query_params.get("name", username)
    player_elo = int(websocket.query_params.get("elo", "1200"))
    is_guest = websocket.query_params.get("is_guest", "false").lower() == "true"
    
    print(f"Player {player_name} ({username}) joining matchmaking")
    
    if is_guest:
        await websocket.send_json({
            "type": "error",
            "message": "Guests cannot play ranked matches"
        })
        await websocket.close(code=1008, reason="Guests cannot play ranked")
        return
    
    room_key = "ranked_1v1"
    if room_key not in matchmaking_rooms:
        matchmaking_rooms[room_key] = MatchmakingRoom()
        matchmaking_rooms[room_key].matching_task = asyncio.create_task(
            matchmaking_rooms[room_key].start_matchmaking()
        )
    
    matchmaking_room = matchmaking_rooms[room_key]
    
    player_data = {
        "name": player_name,
        "elo": player_elo,
        "is_guest": is_guest
    }
    
    await matchmaking_room.add_player(username, websocket, player_data)
    
    await websocket.send_json({
        "type": "queue_joined",
        "message": "Searching for opponent...",
        "player_id": username,
        "queue_size": len(matchmaking_room.sessions)
    })
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "cancel":
                await matchmaking_room.remove_player(username)
                await websocket.send_json({
                    "type": "queue_left",
                    "message": "Left matchmaking queue"
                })
                await websocket.close(code=1000, reason="Cancelled by user")
                break
            
            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            
            elif data.get("type") == "game_ended":
                room_id = data.get("room_id")
                winner_id = data.get("winner_id")
                
                if room_id and room_id in active_game_rooms:
                    lobby_id = active_game_rooms[room_id]["lobby_id"]
                    game_id = active_game_rooms[room_id]["game_id"]
                    winner_name = data.get("winner_name", winner_id)
                    loser_name = [p for p in active_game_rooms[room_id]["player_names"] if p != winner_name][0]
                    
                    await matchmaking_room.cleanup_room_on_leave(lobby_id, game_id, winner_name, loser_name)
                    del active_game_rooms[room_id]
            
            elif data.get("type") == "joined_game":
                # Player successfully joined the game, mark game as started
                room_id = data.get("room_id")
                if room_id and room_id in active_game_rooms:
                    active_game_rooms[room_id]["game_started"] = True
                await matchmaking_room.remove_player(username)
                print(f"Player {username} removed from queue after joining game")
                
    except WebSocketDisconnect:
        print(f"Player {username} disconnected")
        
        # Check if they were in an active game room (waiting room phase)
        rooms_to_remove = []
        for room_id, room_data in list(active_game_rooms.items()):
            if username in room_data.get("players", []):
                # Check if the game actually started
                if not room_data.get("game_started", False):
                    # Game hasn't started yet (still in waiting room)
                    # Put the other player back in queue
                    other_player = [p for p in room_data["players"] if p != username][0] if len(room_data["players"]) == 2 else None
                    
                    if other_player:
                        print(f"Player {username} left waiting room. Putting {other_player} back in queue")
                        
                        # Get the other player's session
                        other_session = room_data.get("player_sessions", {}).get(other_player)
                        if other_session:
                            # Notify the other player that opponent left
                            other_ws = room_data.get("websockets", {}).get(other_player)
                            if other_ws:
                                try:
                                    await other_ws.send_json({
                                        "type": "opponent_left_waiting",
                                        "message": "Your opponent left the waiting room. Searching for new opponent...",
                                        "requeue": True
                                    })
                                except:
                                    pass
                            
                            # Put the other player back in queue
                            await matchmaking_room.re_add_to_queue(other_session)
                            
                            # Notify them they're back in queue
                            if other_ws:
                                try:
                                    await other_ws.send_json({
                                        "type": "queue_joined",
                                        "message": "Searching for opponent...",
                                        "player_id": other_player,
                                        "queue_size": len(matchmaking_room.sessions)
                                    })
                                except:
                                    pass
                    
                    # Clean up the room (delete it since game never started)
                    lobby_id = room_data["lobby_id"]
                    game_id = room_data["game_id"]
                    await matchmaking_room.cleanup_room_on_leave(lobby_id, game_id, None, None)
                    rooms_to_remove.append(room_id)
                    
                else:
                    # Game already started, handle as normal win/loss
                    opponent_username = [p for p in room_data["players"] if p != username][0] if len(room_data["players"]) == 2 else None
                    
                    if opponent_username:
                        lobby_id = room_data["lobby_id"]
                        game_id = room_data["game_id"]
                        winner_name = opponent_username
                        loser_name = username
                        
                        print(f"Player {username} left during game. Declaring {winner_name} as winner!")
                        
                        # Notify opponent that they won
                        opponent_ws = room_data.get("websockets", {}).get(opponent_username)
                        if opponent_ws:
                            try:
                                await opponent_ws.send_json({
                                    "type": "opponent_left",
                                    "message": "Your opponent left the game. You win!",
                                    "winner": True,
                                    "winner_name": winner_name
                                })
                            except:
                                pass
                        
                        # Clean up the room with winner
                        await matchmaking_room.cleanup_room_on_leave(lobby_id, game_id, winner_name, loser_name)
                        rooms_to_remove.append(room_id)
                    else:
                        lobby_id = room_data["lobby_id"]
                        game_id = room_data["game_id"]
                        await matchmaking_room.cleanup_room_on_leave(lobby_id, game_id, None, None)
                        rooms_to_remove.append(room_id)
        
        # Remove rooms after iteration
        for room_id in rooms_to_remove:
            if room_id in active_game_rooms:
                del active_game_rooms[room_id]
        
        # Remove from queue if still there
        await matchmaking_room.remove_player(username)
        
    except Exception as e:
        print(f"WebSocket error: {e}")
        await matchmaking_room.remove_player(username)
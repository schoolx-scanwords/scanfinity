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
        self.player_id = player_id  # This is the username
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
        if len(self.sessions) < 2:
            return []
        
        # Get all available players (not matched yet)
        available_players = [s for s in self.sessions.values() if not s.is_matched]
        
        if len(available_players) < 2:
            return []
        
        matches = []
        used = set()
        
        # Sort by ELO for better matching
        available_players.sort(key=lambda x: x.player_data.get("elo", 1200))
        
        # Try to match players with similar ELO
        i = 0
        while i < len(available_players) - 1:
            player1 = available_players[i]
            player2 = available_players[i + 1]
            
            if player1.player_id in used or player2.player_id in used:
                i += 1
                continue
            
            # Check ELO difference
            elo1 = player1.player_data.get("elo", 1200)
            elo2 = player2.player_data.get("elo", 1200)
            elo_diff = abs(elo1 - elo2)
            
            # Allow ELO difference up to 500 points for faster matching
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
        """Get existing player or create a new one linked to user account"""
        # First, try to find player by user_id
        await cur.execute("""
            SELECT id FROM players WHERE user_id = %s
        """, (user_id,))
        existing = await cur.fetchone()
        
        if existing:
            player_id = existing[0]
            print(f"Found existing player for user {username} with ID: {player_id}")
            return player_id
        
        # Create new player linked to user account
        await cur.execute("""
            INSERT INTO players (display_name, user_id, created_at)
            VALUES (%s, %s, NOW())
            RETURNING id
        """, (username, user_id))
        
        result = await cur.fetchone()
        player_id = result[0]
        print(f"Created new player for user {username} with ID: {player_id}")
        return player_id
    
    async def get_user_id_from_username(self, cur, username: str) -> Optional[int]:
        """Get user_id from username"""
        await cur.execute("""
            SELECT id FROM users WHERE username = %s
        """, (username,))
        result = await cur.fetchone()
        return result[0] if result else None
    
    async def create_ranked_room(self, player1: MatchmakingSession, player2: MatchmakingSession) -> Optional[str]:
        """Create a game room for ranked match"""
        try:
            from database.connect import connect
            
            pool = await connect()
            
            async with pool.connection() as conn:
                async with conn.cursor() as cur:
                    # Start transaction
                    await cur.execute("BEGIN")
                    
                    try:
                        # 1. Get user IDs for both players
                        player1_name = player1.player_data.get("name", "Unknown")
                        player2_name = player2.player_data.get("name", "Unknown")
                        
                        # Get user IDs from users table
                        player1_user_id = await self.get_user_id_from_username(cur, player1_name)
                        player2_user_id = await self.get_user_id_from_username(cur, player2_name)
                        
                        if not player1_user_id or not player2_user_id:
                            print(f"User not found: {player1_name if not player1_user_id else ''} {player2_name if not player2_user_id else ''}")
                            await cur.execute("ROLLBACK")
                            return None
                        
                        # 2. Get or create player records
                        player1_db_id = await self.get_or_create_player(cur, player1_name, player1_user_id)
                        player2_db_id = await self.get_or_create_player(cur, player2_name, player2_user_id)
                        
                        print(f"Player DB IDs: {player1_name} -> {player1_db_id}, {player2_name} -> {player2_db_id}")
                        
                        # 3. Get a random puzzle for ranked game
                        await cur.execute("""
                            SELECT puzzle_id FROM puzzles 
                            WHERE difficulty = 'Medium' 
                            ORDER BY RANDOM() 
                            LIMIT 1
                        """)
                        puzzle = await cur.fetchone()
                        
                        if not puzzle:
                            # Fallback: get any puzzle
                            await cur.execute("""
                                SELECT puzzle_id FROM puzzles 
                                ORDER BY RANDOM() 
                                LIMIT 1
                            """)
                            puzzle = await cur.fetchone()
                        
                        if not puzzle:
                            print("No puzzles found in database")
                            await cur.execute("ROLLBACK")
                            return None
                        
                        puzzle_id = puzzle[0]
                        print(f"Selected puzzle_id: {puzzle_id}")
                        
                        # 4. Create lobby (host is player1)
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
                            print("Failed to create lobby")
                            await cur.execute("ROLLBACK")
                            return None
                        
                        lobby_id = result[0]
                        print(f"Created lobby with ID: {lobby_id}")
                        
                        # 5. Add both players to lobby_players
                        for player_db_id in [player1_db_id, player2_db_id]:
                            await cur.execute("""
                                INSERT INTO lobby_players (lobby_id, player_id, is_ready, joined_at)
                                VALUES (%s, %s, false, NOW())
                            """, (lobby_id, player_db_id))
                        
                        # 6. Create game record
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
                        print(f"Created game with ID: {game_id}")
                        
                        # Commit all changes
                        await cur.execute("COMMIT")
                        
                        # Return room ID in format expected by frontend
                        room_id = f"{lobby_id}{{2}}"
                        print(f"Successfully created ranked room: {room_id}")
                        return room_id
                        
                    except Exception as e:
                        print(f"Error during room creation: {e}")
                        await cur.execute("ROLLBACK")
                        raise
        
        except Exception as e:
            print(f"Failed to create ranked room: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def start_matchmaking(self):
        """Background task to continuously match players"""
        print("Matchmaking task started")
        while True:
            try:
                await asyncio.sleep(2)  # Check every 2 seconds
                
                if len(self.sessions) >= 2:
                    print(f"Checking for matches. Current queue size: {len(self.sessions)}")
                    matches = await self.find_matches()
                    
                    for player1, player2 in matches:
                        if not player1.is_matched and not player2.is_matched:
                            player1.is_matched = True
                            player2.is_matched = True
                            
                            print(f"Creating room for matched players: {player1.player_id} and {player2.player_id}")
                            
                            # Create a game room
                            room_id = await self.create_ranked_room(player1, player2)
                            
                            if room_id:
                                # Notify both players
                                try:
                                    await player1.websocket.send_json({
                                        "type": "match_found",
                                        "room_id": room_id,
                                        "opponent": {
                                            "id": player2.player_id,
                                            "name": player2.player_data.get("name", "Unknown"),
                                            "elo": player2.player_data.get("elo", 1200)
                                        }
                                    })
                                    print(f"Notified player {player1.player_id}")
                                    
                                    await player2.websocket.send_json({
                                        "type": "match_found",
                                        "room_id": room_id,
                                        "opponent": {
                                            "id": player1.player_id,
                                            "name": player1.player_data.get("name", "Unknown"),
                                            "elo": player1.player_data.get("elo", 1200)
                                        }
                                    })
                                    print(f"Notified player {player2.player_id}")
                                    
                                    # Remove matched players from queue after notification
                                    await self.remove_player(player1.player_id)
                                    await self.remove_player(player2.player_id)
                                    
                                except Exception as e:
                                    print(f"Error notifying players: {e}")
                            else:
                                # Failed to create room, reset match status
                                player1.is_matched = False
                                player2.is_matched = False
                                print("Failed to create room, resetting match status")
                
            except Exception as e:
                print(f"Matchmaking error: {e}")
                import traceback
                traceback.print_exc()

# Global matchmaking rooms
matchmaking_rooms: Dict[str, MatchmakingRoom] = {}

@router.websocket("/ws/matchmaking/{username}")
async def matchmaking_websocket(websocket: WebSocket, username: str):
    await websocket.accept()
    
    # Get player data from query params
    player_name = websocket.query_params.get("name", username)
    player_elo = int(websocket.query_params.get("elo", "1200"))
    is_guest = websocket.query_params.get("is_guest", "false").lower() == "true"
    
    print(f"Player {player_name} ({username}) joining matchmaking. ELO: {player_elo}, Guest: {is_guest}")
    
    # Check if player is guest
    if is_guest:
        await websocket.send_json({
            "type": "error",
            "message": "Guests cannot play ranked matches"
        })
        await websocket.close(code=1008, reason="Guests cannot play ranked")
        return
    
    # Get or create matchmaking room for ranked mode
    room_key = "ranked_1v1"
    if room_key not in matchmaking_rooms:
        matchmaking_rooms[room_key] = MatchmakingRoom()
        # Start matchmaking task
        matchmaking_rooms[room_key].matching_task = asyncio.create_task(
            matchmaking_rooms[room_key].start_matchmaking()
        )
        print("Created new matchmaking room and started matching task")
    
    matchmaking_room = matchmaking_rooms[room_key]
    
    # Add player to queue (use username as the key)
    player_data = {
        "name": player_name,
        "elo": player_elo,
        "is_guest": is_guest
    }
    
    await matchmaking_room.add_player(username, websocket, player_data)
    
    # Notify player they're in queue
    await websocket.send_json({
        "type": "queue_joined",
        "message": "Searching for opponent...",
        "player_id": username,
        "queue_size": len(matchmaking_room.sessions)
    })
    
    try:
        while True:
            # Keep connection alive and listen for messages
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
                
    except WebSocketDisconnect:
        print(f"Player {username} disconnected")
        await matchmaking_room.remove_player(username)
        
    except Exception as e:
        print(f"WebSocket error for player {username}: {e}")
        await matchmaking_room.remove_player(username)
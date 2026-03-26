# backend/app/routers/game_websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set, Any
import json
from datetime import datetime
import re

router = APIRouter()

class GameRoom:
    def __init__(self, players):
        self.connections: Dict[WebSocket, dict] = {}
        self.max_players = players
        self.players_ready = 0
    
    def add_player(self, websocket: WebSocket, player_data: dict):
        self.connections[websocket] = player_data
    
    def remove_player(self, websocket: WebSocket):
        if websocket in self.connections:
            del self.connections[websocket]
    
    def get_all_players(self):
        players = []
        for data in self.connections.values():
            players.append({
                "id": data["playerId"],
                "name": data["name"],
                "guessedIds": data.get("guessedIds", []),
                "gridState": data.get("gridState", [])
            })
        return players
    
    def get_player_name(self, websocket: WebSocket):
        if websocket in self.connections:
            return self.connections[websocket].get("name", "Unknown")
        return "Unknown"

# Store rooms
rooms: Dict[str, GameRoom] = {}


players = r'\{(\d+)\}'
def get_max_players(room_id):
    matches = re.findall(players, room_id)
    if len(matches) > 1 or len(matches) < 1:
        return None
    return int(matches[0])


@router.websocket("/ws/game/{room_id}")
async def game_websocket(websocket: WebSocket, room_id: str):
    await websocket.accept()
    print(f"✅ WebSocket connected to room: {room_id}")
    
    players = get_max_players(room_id)
    if players is None:
        await websocket.close(code=1008, reason="invalid room id")

    # Create room if it doesn't exist
    if room_id not in rooms:
        rooms[room_id] = GameRoom(players)
    elif len(rooms[room_id].connections) >= players:
        await websocket.close(code=1008, reason="room is full")
    
    room = rooms[room_id]
    player_data = None
    player_id = None
    
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            # Handle join message
            if msg_type == "join":
                player_id = data["playerId"]
                player_data = {
                    "playerId": player_id,
                    "name": data["name"],
                    "guessedIds": data.get("guessedIds", []),
                    "gridState": data.get("gridState", [])
                }
                
                # Add player to room
                room.add_player(websocket, player_data)
                print(f"👤 {data['name']} joined room {room_id}")
                
                # Send current players list to the new player
                await websocket.send_json({
                    "type": "players_update",
                    "players": room.get_all_players()
                })
                
                # Notify all other players about new player
                for conn in room.connections:
                    if conn != websocket:
                        try:
                            await conn.send_json({
                                "type": "player_joined",
                                "playerId": player_id,
                                "name": data["name"],
                                "guessedIds": data.get("guessedIds", []),
                                "gridState": data.get("gridState", [])
                            })
                        except:
                            pass

                await websocket.send_json({
                    "type": "ready_update",
                    "ready": room.players_ready
                })
            
            # Handle game update (guesses, grid state)
            elif msg_type == "player_update":
                # Update player data
                if websocket in room.connections:
                    room.connections[websocket]["guessedIds"] = data.get("guessedIds", [])
                    room.connections[websocket]["gridState"] = data.get("gridState", [])
                
                # Broadcast to all other players
                for conn in room.connections:
                    if conn != websocket:
                        try:
                            await conn.send_json({
                                "type": "player_update",
                                "playerId": data["playerId"],
                                "name": data.get("name", "Unknown"),
                                "guessedIds": data.get("guessedIds", []),
                                "gridState": data.get("gridState", [])
                            })
                        except:
                            pass
            elif msg_type == "get_ready_players":
                await websocket.send_json({
                    "type": "ready_update",
                    "ready": room.players_ready
                })
            
            elif msg_type == "ready_update":
                room.players_ready += 1

                for connection in room.connections:
                    if connection != websocket:
                        await connection.send_json({
                            "type": "ready_update",
                            "ready": room.players_ready
                        })
                        print('sent ready update')


            # Handle chat message
            elif msg_type == "message":
                sender_name = room.get_player_name(websocket)
                message_text = data.get("message", "")
                
                if message_text:
                    print(f"💬 {sender_name}: {message_text}")
                    
                    # Broadcast chat message to all players in room
                    for conn in room.connections:
                        try:
                            await conn.send_json({
                                "type": "chat_message",
                                "username": sender_name,
                                "message": message_text,
                                "timestamp": datetime.now().isoformat()
                            })
                        except:
                            pass
            
            # Handle game completion
            elif msg_type == "game_complete":
                winner_name = room.get_player_name(websocket)
                
                for conn in room.connections:
                    try:
                        await conn.send_json({
                            "type": "game_complete",
                            "winner": winner_name
                        })
                    except:
                        pass
    
    except WebSocketDisconnect:
        print(f"❌ Player {player_id} disconnected from room {room_id}")
        
        if room_id in rooms:
            # Remove player
            room.remove_player(websocket)
            
            # Notify others
            for conn in room.connections:
                try:
                    await conn.send_json({
                        "type": "player_left",
                        "playerId": player_id
                    })
                except:
                    pass
            
            # Remove room if empty
            if not room.connections:
                del rooms[room_id]
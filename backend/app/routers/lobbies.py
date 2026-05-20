from __future__ import annotations

from fastapi import APIRouter, HTTPException
from typing import List

from models.lobby import LobbyCreateDTO, LobbyRoomDTO
from database.lobbies import create_lobby, list_lobbies, join_lobby, leave_lobby, delete_lobby


router = APIRouter(prefix="/api")


@router.get("/lobbies", response_model=List[LobbyRoomDTO])
async def get_lobbies(limit: int = 50, offset: int = 0):
    return await list_lobbies(limit=limit, offset=offset, only_open=True)


@router.post("/lobbies", response_model=LobbyRoomDTO)
async def post_lobby(payload: LobbyCreateDTO):
    try:
        return await create_lobby(payload=payload.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/lobbies/{lobby_id}/join")
async def post_join_lobby(lobby_id: int, payload: dict):
    owner = str(payload.get("owner", "")).strip()
    device_id = str(payload.get("deviceId", "")).strip()
    if not owner or not device_id:
        raise HTTPException(status_code=422, detail="owner and deviceId are required")

    try:
        players = await join_lobby(lobby_id=lobby_id, owner=owner, device_id=device_id)
        return {"players": players}
    except ValueError as exc:
        msg = str(exc)
        if msg == "lobby_not_found":
            raise HTTPException(status_code=404, detail="Lobby not found")
        if msg == "lobby_not_open":
            raise HTTPException(status_code=409, detail="Lobby is not open")
        raise HTTPException(status_code=400, detail=msg)


@router.post("/lobbies/{lobby_id}/leave")
async def post_leave_lobby(lobby_id: int, payload: dict):
    device_id = str(payload.get("deviceId", "")).strip()
    if not device_id:
        raise HTTPException(status_code=422, detail="deviceId is required")

    players = await leave_lobby(lobby_id=lobby_id, device_id=device_id)
    return {"players": players}


@router.delete("/lobbies/{lobby_id}", status_code=204)
async def delete_lobby_route(lobby_id: int, payload: dict):
    device_id = str(payload.get("deviceId", "")).strip()
    if not device_id:
        raise HTTPException(status_code=422, detail="deviceId is required")

    try:
        await delete_lobby(lobby_id=lobby_id, device_id=device_id)
    except ValueError as exc:
        msg = str(exc)
        if msg == "lobby_not_found":
            raise HTTPException(status_code=404, detail="Lobby not found")
        if msg == "not_owner":
            raise HTTPException(status_code=403, detail="Only lobby creator can delete")
        raise HTTPException(status_code=400, detail=msg)

    return None

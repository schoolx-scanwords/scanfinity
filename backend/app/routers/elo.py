from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from database.elo import (
    EloAlreadyCalculatedError,
    GameNotFoundError,
    UnsupportedGameFormatError,
    calculate_and_apply_elo,
)


router = APIRouter(prefix="/api")


@router.post("/elo/calculate/{game_id}")
async def calculate_elo(game_id: int, k_factor: int = 32):
    """Calculate and persist Elo changes for a finished game.

    The game participants must exist in `game_players`.
    Currently supports only 1v1 (2 rows in `game_players` for the given game_id).
    """

    try:
        return await calculate_and_apply_elo(game_id=game_id, k_factor=k_factor)
    except GameNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UnsupportedGameFormatError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except EloAlreadyCalculatedError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class LobbyCreateDTO(BaseModel):
    maxPlayers: int = Field(ge=1)
    category: str = Field(min_length=1, max_length=255)

    # Optional gameplay metadata (stored as text in DB for now)
    difficulty: Optional[str] = Field(default=None, max_length=64)
    size: Optional[str] = Field(default=None, max_length=64)
    lang: Optional[str] = Field(default=None, max_length=32)

    # Identity (device-scoped)
    owner: str = Field(min_length=1, max_length=128)
    deviceId: str = Field(min_length=1, max_length=255)

    isPrivate: bool = False


class LobbyRoomDTO(BaseModel):
    id: str
    players: int
    maxPlayers: int
    category: str
    owner: str
    avatar: str = "/avatars/frog.svg"
    isPremium: bool = False
    createdAt: Optional[datetime] = None

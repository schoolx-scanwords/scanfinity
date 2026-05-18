from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator


class GameTypeEnum(str, Enum):
    single = "single"
    one_v_one = "one_v_one"
    multi = "multi"
    rating = "rating"


# ----- Запросы -----

class JoinQueueRequest(BaseModel):
    player_id: int = Field(..., ge=1)
    game_type: GameTypeEnum
    is_ranked: bool = Field(False)
    filters: dict[str, Any] = Field(default_factory=dict)

    @field_validator("is_ranked")
    @classmethod
    def check_ranked_only_one_v_one(cls, v, info):
        if v and info.data.get("game_type") != GameTypeEnum.one_v_one:
            raise ValueError("Рейтинговые игры возможны только в режиме 1 на 1 (one_v_one)")
        return v


class LeaveQueueRequest(BaseModel):
    player_id: int = Field(..., ge=1)


class FindMatchRequest(BaseModel):
    player_id: int = Field(..., ge=1)
    game_type: GameTypeEnum
    is_ranked: bool = Field(False)
    delta: int = Field(250, ge=0, le=1000)
    filters: dict[str, Any] = Field(default_factory=dict)

    @field_validator("is_ranked")
    @classmethod
    def check_ranked_only_one_v_one(cls, v, info):
        if v and info.data.get("game_type") != GameTypeEnum.one_v_one:
            raise ValueError("Рейтинговые игры возможны только в режиме 1 на 1")
        return v


# ----- Ответы -----

class MatchedPlayer(BaseModel):
    player_id: int
    display_name: str
    elo: int
    is_guest: bool


class JoinQueueResponse(BaseModel):
    status: str = "joined"
    player_id: int
    game_type: str
    is_ranked: bool
    joined_at: datetime


class LeaveQueueResponse(BaseModel):
    status: str = "left"
    player_id: int


class MatchResponse(BaseModel):
    status: str = "matched"
    game_type: str
    is_ranked: bool
    matched_players: list[MatchedPlayer]
    average_elo: float
    elo_range: tuple[int, int]
    created_at: datetime


class QueueStatusResponse(BaseModel):
    player_id: int
    in_queue: bool
    game_type: str | None = None
    is_ranked: bool | None = None
    joined_at: datetime | None = None
    queue_length: int | None = None
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class MatchmakingQueueRecord(BaseModel):
    id: int
    player_id: int
    elo: int
    game_type: str
    is_ranked: bool
    filters: dict[str, Any] = Field(default_factory=dict)
    joined_at: datetime
    last_activity_at: datetime
    status: str = "searching"
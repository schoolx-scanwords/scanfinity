from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from matchmaking import (
    FindMatchRequest,
    GameTypeEnum,
    JoinQueueRequest,
    JoinQueueResponse,
    LeaveQueueRequest,
    LeaveQueueResponse,
    MatchResponse,
    QueueStatusResponse,
)
from services.matchmaking import MatchmakingService


router = APIRouter(prefix="/api/matchmaking", tags=["matchmaking"])


def get_service() -> MatchmakingService:
    return MatchmakingService()


# ---------------------------------------------------------------------------
#  POST /join-queue
# ---------------------------------------------------------------------------
@router.post("/join-queue", response_model=JoinQueueResponse, status_code=status.HTTP_201_CREATED)
async def join_queue(request: JoinQueueRequest):
    """Встать в очередь поиска игры. Рейтинговые игры — только 1 на 1."""
    service = get_service()

    host_data = await service.get_player_with_elo(request.player_id)
    if not host_data:
        raise HTTPException(status_code=404, detail="Игрок не найден")

    if request.is_ranked and request.game_type != GameTypeEnum.one_v_one:
        raise HTTPException(status_code=422, detail="Рейтинговые игры возможны только в режиме 1 на 1")

    if request.is_ranked and host_data["is_guest"]:
        raise HTTPException(status_code=403, detail="Гости не могут участвовать в рейтинговых играх")

    entry = await service.join_queue(
        player_id=request.player_id,
        elo=host_data["elo"],
        game_type=request.game_type.value,
        is_ranked=request.is_ranked,
        filters=request.filters,
    )

    return JoinQueueResponse(
        status="joined",
        player_id=entry["player_id"],
        game_type=entry["game_type"],
        is_ranked=entry["is_ranked"],
        joined_at=entry["joined_at"],
    )


# ---------------------------------------------------------------------------
#  POST /leave-queue
# ---------------------------------------------------------------------------
@router.post("/leave-queue", response_model=LeaveQueueResponse)
async def leave_queue(request: LeaveQueueRequest):
    """Покинуть очередь поиска."""
    service = get_service()
    removed = await service.leave_queue(request.player_id)

    if not removed:
        raise HTTPException(status_code=404, detail="Игрок не в очереди")

    return LeaveQueueResponse(status="left", player_id=request.player_id)


# ---------------------------------------------------------------------------
#  GET /queue-status/{player_id}
# ---------------------------------------------------------------------------
@router.get("/queue-status/{player_id}", response_model=QueueStatusResponse)
async def queue_status(player_id: int):
    """Узнать статус игрока в очереди."""
    service = get_service()
    status_data = await service.get_queue_status(player_id)
    return QueueStatusResponse(**status_data)


# ---------------------------------------------------------------------------
#  POST /find-match
# ---------------------------------------------------------------------------
@router.post("/find-match", response_model=MatchResponse)
async def find_match(request: FindMatchRequest):
    """Найти соперников в очереди."""
    service = get_service()

    await service.cleanup_expired_entries()

    host_data = await service.get_player_with_elo(request.player_id)
    if not host_data:
        raise HTTPException(status_code=404, detail="Игрок не найден")

    if request.is_ranked and host_data["is_guest"]:
        raise HTTPException(status_code=403, detail="Гости не могут участвовать в рейтинговых играх")

    if request.game_type == GameTypeEnum.single:
        result = await service.build_match_response(
            host=host_data,
            opponents=[],
            game_type="single",
            is_ranked=False,
        )
        return MatchResponse(**result)

    limit = 1 if request.game_type == GameTypeEnum.one_v_one else 3

    min_required = 1 if request.game_type == GameTypeEnum.one_v_one else 1
    opponents = await service.matchmake(
        host_player_id=request.player_id,
        host_elo=host_data["elo"],
        game_type=request.game_type.value,
        is_ranked=request.is_ranked,
        delta=request.delta,
        filters=request.filters,
        limit=limit,
        min_required=min_required,
    )

    if len(opponents) < min_required:
        raise HTTPException(
            status_code=409,
            detail=f"Недостаточно игроков в очереди. Найдено: {len(opponents)}.",
        )

    result = await service.build_match_response(
        host=host_data,
        opponents=opponents,
        game_type=request.game_type.value,
        is_ranked=request.is_ranked,
    )

    return MatchResponse(**result)
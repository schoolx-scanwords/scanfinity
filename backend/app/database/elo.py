from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Optional

from psycopg import AsyncConnection

from .connect import connect


@dataclass(frozen=True)
class EloPlayerRow:
    game_id: int
    player_id: int
    user_id: Optional[int]
    score: int
    is_winner: Optional[bool]
    elo_before: Optional[int]
    elo_after: Optional[int]
    user_elo: Optional[int]


class EloError(Exception):
    """Base error for Elo calculation."""


class GameNotFoundError(EloError):
    pass


class UnsupportedGameFormatError(EloError):
    pass


class EloAlreadyCalculatedError(EloError):
    pass


def _expected_score(rating_a: int, rating_b: int) -> float:
    # Standard Elo expected score.
    return 1.0 / (1.0 + 10 ** ((rating_b - rating_a) / 400.0))


def _round_elo(value: float) -> int:
    # Avoid banker's rounding for .5 by doing a half-up rounding.
    if value >= 0:
        return int(math.floor(value + 0.5))
    return int(math.ceil(value - 0.5))


def _clamp_rating(value: int) -> int:
    return max(0, int(value))


def _infer_outcome(rows: list[EloPlayerRow]) -> tuple[float, float]:
    """Return (score_a, score_b) where score is 1.0 win, 0.0 loss, 0.5 draw."""

    if len(rows) != 2:
        raise UnsupportedGameFormatError("Only 1v1 games are supported for Elo calculation")

    a, b = rows[0], rows[1]
    a_win = bool(a.is_winner) if a.is_winner is not None else False
    b_win = bool(b.is_winner) if b.is_winner is not None else False

    if a_win and not b_win:
        return 1.0, 0.0
    if b_win and not a_win:
        return 0.0, 1.0

    # If winner flags are missing/ambiguous, fall back to score.
    if a.score > b.score:
        return 1.0, 0.0
    if b.score > a.score:
        return 0.0, 1.0

    return 0.5, 0.5


async def _fetch_game_players(*, conn: AsyncConnection, game_id: int) -> list[EloPlayerRow]:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT
              gp.game_id,
              gp.player_id,
              p.user_id,
              gp.score,
              gp.is_winner,
              gp.elo_before,
              gp.elo_after,
              u.elo AS user_elo
            FROM game_players gp
            JOIN players p ON p.id = gp.player_id
            LEFT JOIN users u ON u.id = p.user_id
            WHERE gp.game_id = %s
            ORDER BY gp.player_id
            FOR UPDATE
            """,
            (int(game_id),),
        )
        rows = await cur.fetchall()

    result: list[EloPlayerRow] = []
    for (
        game_id_v,
        player_id,
        user_id,
        score,
        is_winner,
        elo_before,
        elo_after,
        user_elo,
    ) in rows:
        result.append(
            EloPlayerRow(
                game_id=int(game_id_v),
                player_id=int(player_id),
                user_id=int(user_id) if user_id is not None else None,
                score=int(score or 0),
                is_winner=bool(is_winner) if is_winner is not None else None,
                elo_before=int(elo_before) if elo_before is not None else None,
                elo_after=int(elo_after) if elo_after is not None else None,
                user_elo=int(user_elo) if user_elo is not None else None,
            )
        )

    return result


async def calculate_and_apply_elo(
    *,
    game_id: int,
    k_factor: int = 32,
) -> dict[str, Any]:
    """Calculate Elo for a finished 1v1 game and persist results.

    Reads participants from `game_players` and determines outcome via `is_winner` (fallback: `score`).
    Persists to:
    - `game_players.elo_before` / `game_players.elo_after`
    - `users.elo` for registered players (`players.user_id IS NOT NULL`)
    """

    if k_factor <= 0 or k_factor > 128:
        raise ValueError("k_factor must be between 1 and 128")

    pool = await connect()

    async with pool.connection() as conn:
        async with conn.transaction():
            rows = await _fetch_game_players(conn=conn, game_id=game_id)

            if not rows:
                raise GameNotFoundError("No rows in game_players for this game_id")

            if any(r.elo_after is not None for r in rows):
                if all(r.elo_after is not None for r in rows):
                    # Idempotent response.
                    return {
                        "gameId": int(game_id),
                        "kFactor": int(k_factor),
                        "alreadyCalculated": True,
                        "players": [
                            {
                                "playerId": r.player_id,
                                "userId": r.user_id,
                                "score": r.score,
                                "isWinner": r.is_winner,
                                "eloBefore": r.elo_before,
                                "eloAfter": r.elo_after,
                                "delta": (r.elo_after - r.elo_before)
                                if (r.elo_after is not None and r.elo_before is not None)
                                else None,
                            }
                            for r in rows
                        ],
                    }
                raise EloAlreadyCalculatedError(
                    "Elo is partially calculated for this game (some players have elo_after, some do not)"
                )

            if len(rows) != 2:
                raise UnsupportedGameFormatError(
                    f"Only 1v1 games are supported (expected 2 players, got {len(rows)})"
                )

            score_a, score_b = _infer_outcome(rows)

            # Prefer stored elo_before; fall back to current user elo; then to 0.
            rating_a = rows[0].elo_before
            if rating_a is None:
                rating_a = rows[0].user_elo
            if rating_a is None:
                rating_a = 0

            rating_b = rows[1].elo_before
            if rating_b is None:
                rating_b = rows[1].user_elo
            if rating_b is None:
                rating_b = 0

            rating_a = int(rating_a)
            rating_b = int(rating_b)

            exp_a = _expected_score(rating_a, rating_b)
            exp_b = _expected_score(rating_b, rating_a)

            new_a = _clamp_rating(_round_elo(rating_a + k_factor * (score_a - exp_a)))
            new_b = _clamp_rating(_round_elo(rating_b + k_factor * (score_b - exp_b)))

            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    UPDATE game_players
                    SET elo_before = %s, elo_after = %s
                    WHERE game_id = %s AND player_id = %s
                    """,
                    (rating_a, new_a, int(game_id), rows[0].player_id),
                )
                await cur.execute(
                    """
                    UPDATE game_players
                    SET elo_before = %s, elo_after = %s
                    WHERE game_id = %s AND player_id = %s
                    """,
                    (rating_b, new_b, int(game_id), rows[1].player_id),
                )

                if rows[0].user_id is not None:
                    await cur.execute(
                        "UPDATE users SET elo = %s WHERE id = %s",
                        (new_a, rows[0].user_id),
                    )

                if rows[1].user_id is not None:
                    await cur.execute(
                        "UPDATE users SET elo = %s WHERE id = %s",
                        (new_b, rows[1].user_id),
                    )

            return {
                "gameId": int(game_id),
                "kFactor": int(k_factor),
                "alreadyCalculated": False,
                "players": [
                    {
                        "playerId": rows[0].player_id,
                        "userId": rows[0].user_id,
                        "score": rows[0].score,
                        "isWinner": rows[0].is_winner,
                        "eloBefore": rating_a,
                        "eloAfter": new_a,
                        "delta": new_a - rating_a,
                        "expected": exp_a,
                        "result": score_a,
                    },
                    {
                        "playerId": rows[1].player_id,
                        "userId": rows[1].user_id,
                        "score": rows[1].score,
                        "isWinner": rows[1].is_winner,
                        "eloBefore": rating_b,
                        "eloAfter": new_b,
                        "delta": new_b - rating_b,
                        "expected": exp_b,
                        "result": score_b,
                    },
                ],
            }

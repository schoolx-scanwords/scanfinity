from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from database.connect import connect


class MatchmakingService:
    def __init__(self):
        self.DEFAULT_ELO_DELTA = 250
        self.QUEUE_ENTRY_TTL_HOURS = 1

    @staticmethod
    def _now_utc_naive() -> datetime:
        # DB columns use TIMESTAMP (no tz), so store/compare naive UTC.
        return datetime.now(timezone.utc).replace(tzinfo=None)

    # ----------------------------------------------------------------
    #  Вспомогательные методы
    # ----------------------------------------------------------------

    async def get_player_with_elo(self, player_id: int) -> dict[str, Any] | None:
        """Return basic player info + current Elo (0 for guests/unrated)."""

        pool = await connect()
        async with pool.connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    """
                    SELECT p.id, p.display_name, p.user_id,
                           COALESCE(u.elo, 0) AS elo
                    FROM players p
                    LEFT JOIN users u ON u.id = p.user_id
                    WHERE p.id = %s
                    """,
                    (int(player_id),),
                )
                row = await cur.fetchone()

        if not row:
            return None

        return {
            "player_id": int(row["id"]),
            "display_name": row["display_name"],
            "elo": int(row["elo"] or 0),
            "is_guest": row["user_id"] is None,
        }

    # Backwards-compatible alias (router used it as "private")
    async def _get_player_with_elo(self, player_id: int) -> dict[str, Any] | None:
        return await self.get_player_with_elo(player_id)

    async def cleanup_expired_entries(self) -> None:
        """Mark stale queue entries as expired."""

        pool = await connect()
        cutoff = self._now_utc_naive() - timedelta(hours=self.QUEUE_ENTRY_TTL_HOURS)
        async with pool.connection() as conn:
            async with conn.transaction():
                async with conn.cursor() as cur:
                    await cur.execute(
                        """
                        UPDATE matchmaking_queue
                        SET status = 'expired'
                        WHERE status = 'searching' AND last_activity_at < %s
                        """,
                        (cutoff,),
                    )

    # Backwards-compatible alias
    async def _cleanup_expired_entries(self) -> None:
        await self.cleanup_expired_entries()

    # ----------------------------------------------------------------
    #  Работа с очередью
    # ----------------------------------------------------------------

    async def join_queue(
        self,
        player_id: int,
        elo: int,
        game_type: str,
        is_ranked: bool = False,
        filters: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Upsert a searching entry for a player."""

        pool = await connect()
        now = self._now_utc_naive()

        async with pool.connection() as conn:
            async with conn.transaction():
                async with conn.cursor(row_factory=dict_row) as cur:
                    await cur.execute(
                        """
                        INSERT INTO matchmaking_queue
                            (player_id, elo, game_type, is_ranked, filters, joined_at, last_activity_at, status)
                        VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, 'searching')
                        ON CONFLICT (player_id) DO UPDATE SET
                            elo = EXCLUDED.elo,
                            game_type = EXCLUDED.game_type,
                            is_ranked = EXCLUDED.is_ranked,
                            filters = EXCLUDED.filters,
                            last_activity_at = EXCLUDED.last_activity_at,
                            status = 'searching'
                        RETURNING
                          id, player_id, elo, game_type, is_ranked, filters,
                          joined_at, last_activity_at, status
                        """,
                        (
                            int(player_id),
                            int(elo),
                            str(game_type),
                            bool(is_ranked),
                            Jsonb(filters or {}),
                            now,
                            now,
                        ),
                    )
                    row = await cur.fetchone()

        return dict(row) if row else {}

    async def leave_queue(self, player_id: int) -> bool:
        """Удаляет игрока из очереди."""
        pool = await connect()
        async with pool.connection() as conn:
            async with conn.transaction():
                async with conn.cursor() as cur:
                    await cur.execute(
                        """
                        UPDATE matchmaking_queue
                        SET status = 'cancelled', last_activity_at = %s
                        WHERE player_id = %s AND status = 'searching'
                        """,
                        (self._now_utc_naive(), int(player_id)),
                    )
                    updated = cur.rowcount

        return updated > 0

    async def get_queue_status(self, player_id: int) -> dict:
        """Возвращает статус игрока в очереди."""
        pool = await connect()
        async with pool.connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    """
                    SELECT id, player_id, elo, game_type, is_ranked, filters,
                           joined_at, last_activity_at, status
                    FROM matchmaking_queue
                    WHERE player_id = %s AND status = 'searching'
                    """,
                    (int(player_id),),
                )
                entry = await cur.fetchone()

                if not entry:
                    return {"player_id": int(player_id), "in_queue": False}

                await cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM matchmaking_queue
                    WHERE game_type = %s AND status = 'searching' AND player_id != %s
                    """,
                    (entry["game_type"], int(player_id)),
                )
                cnt_row = await cur.fetchone()

        return {
            "player_id": int(player_id),
            "in_queue": True,
            "game_type": entry["game_type"],
            "is_ranked": entry["is_ranked"],
            "joined_at": entry["joined_at"],
            "queue_length": int(cnt_row[0] if cnt_row else 0),
        }

    # ----------------------------------------------------------------
    #  Поиск соперников в очереди
    # ----------------------------------------------------------------

    async def find_opponents_in_queue(
        self,
        target_elo: int,
        game_type: str,
        is_ranked: bool,
        exclude_player_id: int,
        delta: int | None = None,
        filters: dict[str, Any] | None = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """
        Ищет подходящих соперников в таблице matchmaking_queue.
        Возвращает список словарей.
        """
        if delta is None:
            delta = self.DEFAULT_ELO_DELTA

        min_elo = max(0, target_elo - delta)
        max_elo = target_elo + delta

        # Базовый запрос
        query = """
            SELECT id, player_id, elo, game_type, is_ranked, filters,
                   joined_at, last_activity_at, status
            FROM matchmaking_queue
            WHERE player_id != %(exclude)s
              AND game_type = %(game_type)s
              AND is_ranked = %(is_ranked)s
              AND status = 'searching'
        """
        params = {
            "exclude": exclude_player_id,
            "game_type": game_type,
            "is_ranked": is_ranked,
        }

        # Фильтр по Эло
        if is_ranked:
            query += " AND elo BETWEEN %(min_elo)s AND %(max_elo)s"
            params["min_elo"] = min_elo
            params["max_elo"] = max_elo
        else:
            query += " AND (elo BETWEEN %(min_elo)s AND %(max_elo)s OR elo = 0)"
            params["min_elo"] = min_elo
            params["max_elo"] = max_elo

        # Фильтры в JSONB (с параметризацией)
        if filters:
            for i, (key, value) in enumerate(filters.items()):
                if value is not None:
                    param_key = f"filter_{i}"
                    query += f" AND filters ->> %({param_key}_key)s = %({param_key}_val)s"
                    params[f"{param_key}_key"] = key
                    params[f"{param_key}_val"] = str(value)

        # Сортировка
        if is_ranked:
            query += " ORDER BY ABS(elo - %(target_elo)s) ASC, joined_at ASC"
            params["target_elo"] = target_elo
        else:
            query += " ORDER BY joined_at ASC, RANDOM()"

        query += " LIMIT %(limit)s"
        params["limit"] = limit

        pool = await connect()
        async with pool.connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, params)
                rows = await cur.fetchall()

        return [dict(r) for r in rows]

    # ----------------------------------------------------------------
    #  Формирование результата
    # ----------------------------------------------------------------

    async def build_match_response(
        self,
        host: dict[str, Any],
        opponents: list[dict[str, Any]],
        game_type: str,
        is_ranked: bool,
    ) -> dict[str, Any]:
        """Build API response with resolved player info."""

        opponent_ids = [int(e["player_id"]) for e in opponents]
        all_ids = [int(host["player_id"])] + opponent_ids

        pool = await connect()
        async with pool.connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    """
                    SELECT p.id, p.display_name, p.user_id, COALESCE(u.elo, 0) AS elo
                    FROM players p
                    LEFT JOIN users u ON u.id = p.user_id
                    WHERE p.id = ANY(%s)
                    """,
                    (all_ids,),
                )
                rows = await cur.fetchall()

        by_id: dict[int, dict[str, Any]] = {}
        for r in rows:
            by_id[int(r["id"])] = {
                "player_id": int(r["id"]),
                "display_name": r["display_name"],
                "elo": int(r["elo"] or 0),
                "is_guest": r["user_id"] is None,
            }

        matched_players: list[dict[str, Any]] = []
        for pid in all_ids:
            if pid in by_id:
                matched_players.append(by_id[pid])

        elos = [int(p["elo"]) for p in matched_players]

        return {
            "status": "matched",
            "game_type": str(game_type),
            "is_ranked": bool(is_ranked),
            "matched_players": matched_players,
            "average_elo": (sum(elos) / len(elos)) if elos else 0.0,
            "elo_range": (min(elos), max(elos)) if elos else (0, 0),
            "created_at": self._now_utc_naive(),
        }

    async def mark_players_matched(self, player_ids: list[int]) -> None:
        """Best-effort: mark specific searching entries as matched."""

        if not player_ids:
            return

        pool = await connect()
        async with pool.connection() as conn:
            async with conn.transaction():
                async with conn.cursor() as cur:
                    await cur.execute(
                        """
                        UPDATE matchmaking_queue
                        SET status = 'matched', last_activity_at = %s
                        WHERE player_id = ANY(%s) AND status = 'searching'
                        """,
                        (self._now_utc_naive(), [int(x) for x in player_ids]),
                    )

    # Backwards-compatible alias
    async def mark_opponents_matched(self, opponent_ids: list[int]) -> None:
        await self.mark_players_matched(opponent_ids)

    async def matchmake(
        self,
        *,
        host_player_id: int,
        host_elo: int,
        game_type: str,
        is_ranked: bool,
        delta: int | None = None,
        filters: dict[str, Any] | None = None,
        limit: int = 10,
        min_required: int = 1,
    ) -> list[dict[str, Any]]:
        """Atomically select opponents and mark all participants as matched.

        Uses row locks (`FOR UPDATE SKIP LOCKED`) to avoid matching the same opponent
        concurrently.
        """

        if delta is None:
            delta = self.DEFAULT_ELO_DELTA

        await self.join_queue(
            player_id=int(host_player_id),
            elo=int(host_elo),
            game_type=str(game_type),
            is_ranked=bool(is_ranked),
            filters=filters,
        )

        min_elo = max(0, int(host_elo) - int(delta))
        max_elo = int(host_elo) + int(delta)

        query = """
            SELECT id, player_id, elo, game_type, is_ranked, filters,
                   joined_at, last_activity_at, status
            FROM matchmaking_queue
            WHERE player_id != %(exclude)s
              AND game_type = %(game_type)s
              AND is_ranked = %(is_ranked)s
              AND status = 'searching'
        """
        params: dict[str, Any] = {
            "exclude": int(host_player_id),
            "game_type": str(game_type),
            "is_ranked": bool(is_ranked),
        }

        if bool(is_ranked):
            query += " AND elo BETWEEN %(min_elo)s AND %(max_elo)s"
            params["min_elo"] = min_elo
            params["max_elo"] = max_elo
        else:
            query += " AND (elo BETWEEN %(min_elo)s AND %(max_elo)s OR elo = 0)"
            params["min_elo"] = min_elo
            params["max_elo"] = max_elo

        if filters:
            for i, (key, value) in enumerate(filters.items()):
                if value is not None:
                    param_key = f"filter_{i}"
                    query += f" AND filters ->> %({param_key}_key)s = %({param_key}_val)s"
                    params[f"{param_key}_key"] = str(key)
                    params[f"{param_key}_val"] = str(value)

        if bool(is_ranked):
            query += " ORDER BY ABS(elo - %(target_elo)s) ASC, joined_at ASC"
            params["target_elo"] = int(host_elo)
        else:
            query += " ORDER BY joined_at ASC"

        query += " LIMIT %(limit)s FOR UPDATE SKIP LOCKED"
        params["limit"] = int(limit)

        pool = await connect()
        async with pool.connection() as conn:
            async with conn.transaction():
                async with conn.cursor(row_factory=dict_row) as cur:
                    # Lock host row too so it can't be matched concurrently.
                    await cur.execute(
                        """
                        SELECT player_id
                        FROM matchmaking_queue
                        WHERE player_id = %s AND status = 'searching'
                        FOR UPDATE
                        """,
                        (int(host_player_id),),
                    )
                    host_row = await cur.fetchone()
                    if not host_row:
                        return []

                    await cur.execute(query, params)
                    opponents = await cur.fetchall()

                    if len(opponents) < int(min_required):
                        # Keep host searching; caller may retry.
                        await cur.execute(
                            """
                            UPDATE matchmaking_queue
                            SET last_activity_at = %s
                            WHERE player_id = %s AND status = 'searching'
                            """,
                            (self._now_utc_naive(), int(host_player_id)),
                        )
                        return []

                    ids_to_mark = [int(host_player_id)] + [int(o["player_id"]) for o in opponents]
                    await cur.execute(
                        """
                        UPDATE matchmaking_queue
                        SET status = 'matched', last_activity_at = %s
                        WHERE player_id = ANY(%s) AND status = 'searching'
                        """,
                        (self._now_utc_naive(), ids_to_mark),
                    )

                    return [dict(o) for o in opponents]
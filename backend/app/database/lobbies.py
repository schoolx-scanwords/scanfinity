from __future__ import annotations

from typing import Any, Optional

from psycopg import AsyncConnection

from .connect import connect


async def _get_topic_id(*, conn: AsyncConnection, name: str) -> int:
    async with conn.cursor() as cur:
        await cur.execute("SELECT topic_id FROM topics WHERE name = %s", (name,))
        row = await cur.fetchone()
        if row:
            return int(row[0])

        await cur.execute(
            "INSERT INTO topics (name) VALUES (%s) RETURNING topic_id",
            (name,),
        )
        created = await cur.fetchone()
        if not created:
            raise RuntimeError("Failed to create topic")
        return int(created[0])


async def _upsert_player_id(
    *,
    conn: AsyncConnection,
    display_name: str,
    device_id: str,
) -> int:
    # We model "players" per-device, keeping display_name for UI.
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id FROM players WHERE guest_device_id = %s",
            (device_id,),
        )
        row = await cur.fetchone()
        if row:
            player_id = int(row[0])
            await cur.execute(
                "UPDATE players SET display_name = %s WHERE id = %s",
                (display_name, player_id),
            )
            return player_id

        await cur.execute(
            """
            INSERT INTO players (display_name, guest_device_id)
            VALUES (%s, %s)
            ON CONFLICT (guest_device_id)
            DO UPDATE SET display_name = EXCLUDED.display_name
            RETURNING id
            """,
            (display_name, device_id),
        )
        created = await cur.fetchone()
        if not created:
            raise RuntimeError("Failed to create player")
        return int(created[0])


def _infer_game_type(max_players: int) -> str:
    if max_players <= 1:
        return "single"
    if max_players == 2:
        return "one_v_one"
    return "multi"


async def create_lobby(*, payload: dict[str, Any]) -> dict[str, Any]:
    pool = await connect()

    max_players = int(payload["maxPlayers"])
    category = str(payload["category"]).strip()
    owner = str(payload["owner"]).strip()
    device_id = str(payload["deviceId"]).strip()
    difficulty = payload.get("difficulty")
    size = payload.get("size")
    lang = payload.get("lang")
    is_private = bool(payload.get("isPrivate", False))

    game_type = _infer_game_type(max_players)

    async with pool.connection() as conn:
        async with conn.transaction():
            player_id = await _upsert_player_id(
                conn=conn,
                display_name=owner,
                device_id=device_id,
            )

            topic_id = await _get_topic_id(conn=conn, name=category)

            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO lobbies
                      (host_player_id, status, game_type, max_players, is_private, lang, difficulty, size, topic_id)
                    VALUES
                      (%s, 'open', (%s)::game_type, %s, %s, %s, %s, %s, %s)
                    RETURNING lobby_id, created_at
                    """,
                    (
                        player_id,
                        game_type,
                        max_players,
                        is_private,
                        lang,
                        difficulty,
                        str(size) if size is not None else None,
                        topic_id,
                    ),
                )
                row = await cur.fetchone()
                if not row:
                    raise RuntimeError("Failed to create lobby")

                lobby_id, created_at = int(row[0]), row[1]

                # Host joins their own lobby
                await cur.execute(
                    """
                    INSERT INTO lobby_players (lobby_id, player_id, is_ready)
                    VALUES (%s, %s, false)
                    ON CONFLICT (lobby_id, player_id) DO NOTHING
                    """,
                    (lobby_id, player_id),
                )

    return {
        "id": str(lobby_id),
        "players": 1,
        "maxPlayers": max_players,
        "category": category,
        "owner": owner,
        "avatar": "/avatars/frog.svg",
        "isPremium": False,
        "createdAt": created_at,
    }


async def list_lobbies(*, limit: int = 50, offset: int = 0, only_open: bool = True) -> list[dict[str, Any]]:
    pool = await connect()

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            where_clause = "WHERE l.status = 'open'" if only_open else ""
            await cur.execute(
                f"""
                SELECT
                  l.lobby_id,
                  l.max_players,
                  t.name AS category,
                  p.display_name AS owner,
                  l.created_at,
                  (
                    SELECT COUNT(*)
                    FROM lobby_players lp
                    WHERE lp.lobby_id = l.lobby_id
                  ) AS players
                FROM lobbies l
                LEFT JOIN topics t ON t.topic_id = l.topic_id
                JOIN players p ON p.id = l.host_player_id
                {where_clause}
                ORDER BY l.created_at DESC
                LIMIT %s OFFSET %s
                """,
                (limit, offset),
            )

            rows = await cur.fetchall()

    result: list[dict[str, Any]] = []
    for lobby_id, max_players, category, owner, created_at, players in rows:
        result.append(
            {
                "id": str(int(lobby_id)),
                "players": int(players or 0),
                "maxPlayers": int(max_players),
                "category": category or "Unknown",
                "owner": owner or "Unknown",
                "avatar": "/avatars/frog.svg",
                "isPremium": False,
                "createdAt": created_at,
            }
        )

    return result


async def join_lobby(*, lobby_id: int, owner: str, device_id: str) -> int:
    pool = await connect()

    async with pool.connection() as conn:
        async with conn.transaction():
            player_id = await _upsert_player_id(
                conn=conn,
                display_name=owner,
                device_id=device_id,
            )

            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT status FROM lobbies WHERE lobby_id = %s",
                    (lobby_id,),
                )
                row = await cur.fetchone()
                if not row:
                    raise ValueError("lobby_not_found")
                if row[0] != "open":
                    raise ValueError("lobby_not_open")

                await cur.execute(
                    """
                    INSERT INTO lobby_players (lobby_id, player_id, is_ready)
                    VALUES (%s, %s, false)
                    ON CONFLICT (lobby_id, player_id) DO NOTHING
                    """,
                    (lobby_id, player_id),
                )

                await cur.execute(
                    "SELECT COUNT(*) FROM lobby_players WHERE lobby_id = %s",
                    (lobby_id,),
                )
                count_row = await cur.fetchone()
                return int(count_row[0] if count_row else 0)


async def leave_lobby(*, lobby_id: int, device_id: str) -> int:
    pool = await connect()

    async with pool.connection() as conn:
        async with conn.transaction():
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT id FROM players WHERE guest_device_id = %s",
                    (device_id,),
                )
                row = await cur.fetchone()
                if row:
                    player_id = int(row[0])
                    await cur.execute(
                        "DELETE FROM lobby_players WHERE lobby_id = %s AND player_id = %s",
                        (lobby_id, player_id),
                    )

                await cur.execute(
                    "SELECT COUNT(*) FROM lobby_players WHERE lobby_id = %s",
                    (lobby_id,),
                )
                count_row = await cur.fetchone()
                return int(count_row[0] if count_row else 0)


async def delete_lobby(*, lobby_id: int, device_id: str) -> None:
    pool = await connect()

    async with pool.connection() as conn:
        async with conn.transaction():
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT id FROM players WHERE guest_device_id = %s",
                    (device_id,),
                )
                player_row = await cur.fetchone()
                if not player_row:
                    raise ValueError("not_owner")

                player_id = int(player_row[0])

                await cur.execute(
                    "SELECT host_player_id FROM lobbies WHERE lobby_id = %s",
                    (lobby_id,),
                )
                lobby_row = await cur.fetchone()
                if not lobby_row:
                    raise ValueError("lobby_not_found")

                host_player_id = int(lobby_row[0])
                if host_player_id != player_id:
                    raise ValueError("not_owner")

                await cur.execute(
                    "DELETE FROM lobbies WHERE lobby_id = %s",
                    (lobby_id,),
                )

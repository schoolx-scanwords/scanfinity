"""Compatibility wrapper for the project's async Postgres pool.

The codebase mostly uses :func:`database.connect.connect` / :func:`database.connect.close_connection`.
This module keeps a small, stable API (`get_pool`, `init_pool`, `close_pool`) for callers that
expect a dedicated pool module.
"""

from psycopg_pool import AsyncConnectionPool

from .connect import connect, close_connection


async def init_pool(*_args, **_kwargs) -> AsyncConnectionPool:
    """Initialize the global pool (idempotent).

    `connect()` already reads DSN from env and opens the pool lazily, so we simply delegate.
    """

    return await connect()


async def close_pool() -> None:
    await close_connection()


async def get_pool() -> AsyncConnectionPool:
    return await connect()
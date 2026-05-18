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
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from psycopg import AsyncConnection

from dotenv import load_dotenv

load_dotenv()

EMAIL_TOKEN_TYPE = "email_verify"


def _now_utc() -> datetime:
    # DB columns use TIMESTAMP (no tz), so store/compare naive UTC.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def generate_raw_token() -> str:
    # URL-safe token suitable for links
    return secrets.token_urlsafe(32)


def hash_token(raw_token: str) -> str:
    """Hash token for DB storage.

    Uses SHA-256 over token + secret pepper.
    """

    pepper = os.getenv("EMAIL_TOKEN_SECRET", "change_me_please")
    payload = (raw_token + pepper).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def token_expiry(minutes: int = 20) -> datetime:
    return _now_utc() + timedelta(minutes=minutes)


async def create_email_verification_token(
    *, conn: AsyncConnection, user_id: int, raw_token: str, expires_at: datetime
) -> None:
    token_hash = hash_token(raw_token)

    async with conn.cursor() as cur:
        # Ensure single active token per user/type
        await cur.execute(
            "DELETE FROM verification_tokens WHERE user_id = %s AND type = %s",
            (user_id, EMAIL_TOKEN_TYPE),
        )
        await cur.execute(
            """
            INSERT INTO verification_tokens (user_id, token_hash, type, expires_at, last_sent_at)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (user_id, token_hash, EMAIL_TOKEN_TYPE, expires_at, _now_utc()),
        )


async def verify_email_token(*, conn: AsyncConnection, raw_token: str, max_attempts: int = 5) -> int:
    """Validate token and activate user.

    Returns user_id on success.
    """

    token_hash = hash_token(raw_token)

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, user_id, expires_at, attempts
            FROM verification_tokens
            WHERE token_hash = %s AND type = %s
            """,
            (token_hash, EMAIL_TOKEN_TYPE),
        )
        row = await cur.fetchone()
        if row is None:
            raise ValueError("invalid_or_expired")

        token_id, user_id, expires_at, attempts = row

        if attempts >= max_attempts:
            raise PermissionError("too_many_attempts")

        # Compare in DB timezone-agnostic way by using python now
        if expires_at is None or expires_at <= _now_utc():
            # best-effort cleanup
            await cur.execute("DELETE FROM verification_tokens WHERE id = %s", (token_id,))
            raise ValueError("invalid_or_expired")

        # Activate user
        await cur.execute(
            "UPDATE users SET is_active = true, email_verified_at = now() WHERE id = %s",
            (user_id,),
        )
        # One-time token
        await cur.execute("DELETE FROM verification_tokens WHERE id = %s", (token_id,))

        return int(user_id)


async def increment_token_attempt(*, conn: AsyncConnection, raw_token: str) -> None:
    token_hash = hash_token(raw_token)
    async with conn.cursor() as cur:
        await cur.execute(
            "UPDATE verification_tokens SET attempts = attempts + 1 WHERE token_hash = %s AND type = %s",
            (token_hash, EMAIL_TOKEN_TYPE),
        )

import os
from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from database.connect import connect
from models import ResendVerificationDTO, VerifyEmailDTO
from services.email_sender import send_email_safe
from services.email_verification import (
    create_email_verification_token,
    generate_raw_token,
    token_expiry,
    verify_email_token,
    increment_token_attempt,
)

router = APIRouter()


def _build_email_body(*, verify_url: str) -> str:
    return (
        "Подтверждение почты\n\n"
        "Чтобы завершить регистрацию, откройте ссылку:\n"
        f"{verify_url}\n\n"
        "Если вы не регистрировались — просто игнорируйте это письмо.\n"
    )


@router.get("/api/auth/verify-email")
async def verify_email_get(token: str):
    # For link-click verification
    pool = await connect()
    async with pool.connection() as conn:
        try:
            async with conn.transaction():
                user_id = await verify_email_token(conn=conn, raw_token=token)
        except PermissionError:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts")
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    return {"detail": "Email verified", "user_id": user_id}


@router.post("/api/auth/verify-email")
async def verify_email_post(payload: VerifyEmailDTO):
    pool = await connect()
    async with pool.connection() as conn:
        try:
            async with conn.transaction():
                user_id = await verify_email_token(conn=conn, raw_token=payload.token)
        except PermissionError:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts")
        except ValueError:
            # count failed attempt if token exists
            async with conn.transaction():
                await increment_token_attempt(conn=conn, raw_token=payload.token)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    return {"detail": "Email verified", "user_id": user_id}


@router.post("/api/auth/resend-verification")
async def resend_verification(payload: ResendVerificationDTO, background_tasks: BackgroundTasks):
    """Resend verification email.

    Always returns 200 to avoid account enumeration.
    """

    pool = await connect()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, is_active FROM users WHERE email = %s",
                (payload.email,),
            )
            row = await cur.fetchone()

        if not row:
            return {"detail": "If the account exists, an email was sent"}

        user_id, is_active = row
        if is_active:
            return {"detail": "If the account exists, an email was sent"}

        # Resend rate limit: at most once per minute
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT last_sent_at
                FROM verification_tokens
                WHERE user_id = %s AND type = 'email_verify'
                ORDER BY id DESC
                LIMIT 1
                """,
                (int(user_id),),
            )
            last = await cur.fetchone()
            if last and last[0] is not None:
                await cur.execute(
                    "SELECT (now() - %s) < interval '60 seconds'",
                    (last[0],),
                )
                too_soon = await cur.fetchone()
                if too_soon and too_soon[0]:
                    return {"detail": "If the account exists, an email was sent"}

        raw_token = generate_raw_token()
        expires_at = token_expiry(minutes=20)

        async with conn.transaction():
            await create_email_verification_token(
                conn=conn,
                user_id=int(user_id),
                raw_token=raw_token,
                expires_at=expires_at,
            )

    verify_base = os.getenv("EMAIL_VERIFY_BASE_URL", "http://localhost:8000").rstrip("/")
    verify_url = f"{verify_base}/verify-email/?token={raw_token}"

    background_tasks.add_task(
        send_email_safe,
        to_email=payload.email,
        subject="Подтверждение почты",
        body_text=_build_email_body(verify_url=verify_url),
    )

    return {"detail": "If the account exists, an email was sent"}

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from datetime import datetime
import hashlib
import os

from models import UserCreateDTO, UserOutWithVerifyUrlDTO
from database.connect import connect
from services.email_sender import send_email_safe
from services.email_verification import (
    create_email_verification_token,
    generate_raw_token,
    token_expiry,
)

router = APIRouter()

def hash_password(password: str) -> tuple[str, str]:
    salt = os.urandom(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        100_000,
    ).hex()
    return password_hash, salt.hex()


@router.post(
    "/api/users",
    response_model=UserOutWithVerifyUrlDTO,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
async def register_user(user_in: UserCreateDTO, background_tasks: BackgroundTasks):
    pool = await connect()
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, is_active FROM users WHERE email = %s",
                (user_in.email,),
            )
            existing_by_email = await cur.fetchone()
            if existing_by_email:
                _, is_active = existing_by_email
                if not is_active:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already registered but not verified. Check your email or use /api/auth/resend-verification.",
                    )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered",
                )

            await cur.execute(
                "SELECT 1 FROM users WHERE username = %s",
                (user_in.username,),
            )
            if await cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken",
                )

        password_hash, password_salt = hash_password(user_in.password)
        raw_token = generate_raw_token()
        expires_at = token_expiry(minutes=20)

        async with conn.transaction():
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO users
                    (username, email, created_at, password_hash, password_salt, is_active)
                    VALUES (%s, %s, %s, %s, %s, false)
                    RETURNING id, username, email, created_at, is_active
                    """,
                    (
                        user_in.username,
                        user_in.email,
                        datetime.now(),
                        password_hash,
                        password_salt,
                    ),
                )
                new_user = await cur.fetchone()

            if not new_user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user",
                )

            user_id = int(new_user[0])
            await create_email_verification_token(
                conn=conn,
                user_id=user_id,
                raw_token=raw_token,
                expires_at=expires_at,
            )

        verify_base = os.getenv("EMAIL_VERIFY_BASE_URL", "http://localhost:8000").rstrip("/")
        verify_url = f"{verify_base}/verify-email/?token={raw_token}"

        background_tasks.add_task(
            send_email_safe,
            to_email=user_in.email,
            subject="Подтверждение почты",
            body_text=(
                "Подтверждение почты\n\n"
                "Чтобы завершить регистрацию, откройте ссылку:\n"
                f"{verify_url}\n\n"
                "Если вы не регистрировались — просто игнорируйте это письмо.\n"
            ),
        )

        # Fallback/dev mode: if SMTP is not configured, return the verification
        # link so UI can show it (instead of relying on email delivery).
        smtp_host = os.getenv("SMTP_HOST", "").strip()
        smtp_from = os.getenv("SMTP_FROM", "").strip()
        smtp_user = os.getenv("SMTP_USER", "").strip()
        force_expose = os.getenv("EMAIL_EXPOSE_VERIFY_URL", "").strip().lower() in {"1", "true", "yes"}
        expose_verify_url = force_expose or (not smtp_host) or (not smtp_from and "@" not in smtp_user)

        return UserOutWithVerifyUrlDTO(
            id=int(new_user[0]),
            username=new_user[1],
            email=new_user[2],
            created_at=new_user[3],
            is_active=bool(new_user[4]),
            verify_url=(verify_url if expose_verify_url else None),
        )
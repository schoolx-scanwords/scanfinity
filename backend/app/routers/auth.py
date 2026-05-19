import os
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt as pyjwt
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from models import UserLoginDTO, TokenWithUserDTO, UserOutDTO
from database.connect import connect
from services.email_sender import send_email_safe
from services.email_verification import (
    create_email_verification_token,
    generate_raw_token,
    token_expiry,
)

router = APIRouter()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change_me_please")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


def _build_verify_email_body(*, verify_url: str) -> str:
    return (
        "Подтверждение почты\n\n"
        "Чтобы завершить регистрацию, откройте ссылку:\n"
        f"{verify_url}\n\n"
        "Если вы не регистрировались — просто игнорируйте это письмо.\n"
    )

def create_access_token(
    user_id: int, expires_delta: Optional[timedelta] = None
) -> str:
    to_encode = {"sub": str(user_id)}
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = pyjwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_password(password: str, stored_hash: str, stored_salt: str) -> bool:
    salt = bytes.fromhex(stored_salt)
    computed_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        100_000,
    ).hex()
    return secrets.compare_digest(computed_hash, stored_hash)

def build_auth_response(user: dict, access_token: str) -> TokenWithUserDTO:
    return TokenWithUserDTO(
        access_token=access_token,
        user=UserOutDTO(**user),
    )

async def get_db_connection():
    pool = await connect()
    async with pool.connection() as conn:
        yield conn

@router.post("/api/auth/login", response_model=TokenWithUserDTO)
async def login(login_data: UserLoginDTO, background_tasks: BackgroundTasks):
    pool = await connect()
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                                """
                                SELECT
                                    id,
                                    username,
                                    email,
                                    password_hash,
                                    password_salt,
                                    created_at,
                                    is_active,
                                    (product_image IS NOT NULL) AS has_avatar
                                FROM users
                                WHERE username = %s
                                """,
                (login_data.username,),
            )
            row = await cur.fetchone()
            
            if row is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid username or password",
                )
            
            user_dict = {
                "id": row[0],
                "username": row[1],
                "email": row[2],
                "password_hash": row[3],
                "password_salt": row[4],
                "created_at": row[5],
                "is_active": row[6],
                "avatar": (f"/api/users/{int(row[0])}/avatar" if bool(row[7]) else None),
            }
            
            is_password_valid = verify_password(
                login_data.password, user_dict["password_hash"], user_dict["password_salt"]
            )
            
            if not is_password_valid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid username or password",
                )

            if not user_dict.get("is_active"):
                email_sent = False

                # Re-send verification link (best-effort) when user entered correct credentials.
                # Rate limit: at most once per minute.
                async with conn.cursor() as cur:
                    await cur.execute(
                        """
                        SELECT last_sent_at
                        FROM verification_tokens
                        WHERE user_id = %s AND type = 'email_verify'
                        ORDER BY id DESC
                        LIMIT 1
                        """,
                        (int(user_dict["id"]),),
                    )
                    last = await cur.fetchone()

                    too_soon = False
                    if last and last[0] is not None:
                        await cur.execute(
                            "SELECT (now() - %s) < interval '60 seconds'",
                            (last[0],),
                        )
                        row_too_soon = await cur.fetchone()
                        too_soon = bool(row_too_soon and row_too_soon[0])

                if not too_soon:
                    raw_token = generate_raw_token()
                    expires_at = token_expiry(minutes=20)

                    async with conn.transaction():
                        await create_email_verification_token(
                            conn=conn,
                            user_id=int(user_dict["id"]),
                            raw_token=raw_token,
                            expires_at=expires_at,
                        )

                    verify_base = os.getenv("EMAIL_VERIFY_BASE_URL", "http://localhost:8000").rstrip("/")
                    verify_url = f"{verify_base}/verify-email/?token={raw_token}"
                    background_tasks.add_task(
                        send_email_safe,
                        to_email=user_dict["email"],
                        subject="Подтверждение почты",
                        body_text=_build_verify_email_body(verify_url=verify_url),
                    )
                    email_sent = True
                else:
                    verify_url = None

                detail = "Email is not verified."
                if email_sent:
                    detail += " Письмо для подтверждения отправлено на вашу почту."
                else:
                    detail += " Письмо уже отправлялось недавно — проверьте почту и попробуйте позже."

                smtp_host = os.getenv("SMTP_HOST", "").strip()
                smtp_from = os.getenv("SMTP_FROM", "").strip()
                smtp_user = os.getenv("SMTP_USER", "").strip()
                force_expose = os.getenv("EMAIL_EXPOSE_VERIFY_URL", "").strip().lower() in {"1", "true", "yes"}
                expose_verify_url = bool(verify_url) and (force_expose or (not smtp_host) or (not smtp_from and "@" not in smtp_user))

                # Keep `detail` as a string for existing frontend logic, but
                # optionally add `verify_url` for the fallback UI.
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": detail, "verify_url": (verify_url if expose_verify_url else None)},
                )
            
            del user_dict["password_hash"]
            del user_dict["password_salt"]
            
            access_token = create_access_token(user_dict["id"])
            return build_auth_response(user_dict, access_token)
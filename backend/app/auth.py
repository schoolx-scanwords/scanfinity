from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import hashlib
import secrets

from .models import User, UserOut, UserLogin
from .db import get_session

router = APIRouter()


def _verify_password(password: str, stored_hash: str, stored_salt: str) -> bool:
    salt = bytes.fromhex(stored_salt)
    computed_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        100_000,
    ).hex()
    return secrets.compare_digest(computed_hash, stored_hash)


@router.post("/api/auth/login", response_model=UserOut)
async def login(user_in: UserLogin, session: AsyncSession = Depends(get_session)):
    stmt = select(User).where(User.username == user_in.username)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None or not _verify_password(
        user_in.password, user.password_hash, user.password_salt
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return user

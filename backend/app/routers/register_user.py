from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import hashlib
import os

from app.models import User, UserCreateDTO, UserOutDTO
from app.database import get_session

router = APIRouter()


def _hash_password(password: str) -> tuple[str, str]:
    salt = os.urandom(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        100_000,
    ).hex()
    return password_hash, salt.hex()


@router.post("/api/users", response_model=UserOutDTO, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreateDTO, session: AsyncSession = Depends(get_session)):
    existing_stmt = select(User).where(User.email == user_in.email)
    result = await session.execute(existing_stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    password_hash, password_salt = _hash_password(user_in.password)

    db_user = User(
        username=user_in.username,
        email=user_in.email,
        created_at=datetime.now(),
        password_hash=password_hash,
        password_salt=password_salt,
    )

    session.add(db_user)
    await session.commit()
    await session.refresh(db_user)

    return db_user

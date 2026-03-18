import os
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import User, UserLoginDTO, TokenWithUserDTO
from app.database import get_session

router = APIRouter()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change_me_please")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def create_access_token(
    user_id: int, expires_delta: Optional[timedelta] = None
) -> str:
    to_encode = {"sub": str(user_id)}
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
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


def build_auth_response(user: User, access_token: str) -> TokenWithUserDTO:
    return TokenWithUserDTO(
        access_token=access_token,
        user=user,
    )
@router.post("/api/auth/login", response_model=TokenWithUserDTO)
async def login(login_data: UserLoginDTO, session: AsyncSession = Depends(get_session)):
    statement = select(User).where(User.username == login_data.username)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    is_password_valid = verify_password(
        login_data.password, user.password_hash, user.password_salt
    )
    if not is_password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    access_token = create_access_token(user.id)
    return build_auth_response(user, access_token)

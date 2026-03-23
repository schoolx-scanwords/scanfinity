import os
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt as pyjwt
from fastapi import APIRouter, Depends, HTTPException, status

from models import User, UserLoginDTO, TokenWithUserDTO
from database.connect import connect

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

def build_auth_response(user: dict, access_token: str) -> TokenWithUserDTO:
    return TokenWithUserDTO(
        access_token=access_token,
        user=User(**user),
    )

async def get_db_connection():
    pool = await connect()
    async with pool.connection() as conn:
        yield conn

@router.post("/api/auth/login", response_model=TokenWithUserDTO)
async def login(login_data: UserLoginDTO):
    pool = await connect()
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT id, username, email, password_hash, password_salt, created_at FROM "Users" WHERE username = %s',
                [login_data.username]
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
                "created_at": row[5]
            }
            
            is_password_valid = verify_password(
                login_data.password, user_dict["password_hash"], user_dict["password_salt"]
            )
            
            if not is_password_valid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid username or password",
                )
            
            del user_dict["password_hash"]
            del user_dict["password_salt"]
            
            access_token = create_access_token(user_dict["id"])
            return build_auth_response(user_dict, access_token)
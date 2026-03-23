from fastapi import APIRouter, HTTPException, status
from datetime import datetime
import hashlib
import os

from models import UserCreateDTO, UserOutDTO
from database.connect import connect

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


@router.post("/api/users", response_model=UserOutDTO, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreateDTO):
    pool = await connect()
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT * FROM "Users" WHERE email = %s',
                [user_in.email]
            )
            existing_user = await cur.fetchone()
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered",
                )
            
            password_hash, password_salt = hash_password(user_in.password)
            
            await cur.execute(
                """
                INSERT INTO "Users" 
                (username, email, created_at, password_hash, password_salt) 
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, username, email, created_at
                """,
                (
                    user_in.username,
                    user_in.email,
                    datetime.now(),
                    password_hash,
                    password_salt
                )
            )
            
            await conn.commit()
            new_user = await cur.fetchone()
            
            if new_user:
                columns = [desc[0] for desc in cur.description]
                user_dict = dict(zip(columns, new_user))
                return UserOutDTO(
                    id=user_dict['id'],
                    username=user_dict['username'],
                    email=user_dict['email'],
                    created_at=user_dict['created_at']
                )
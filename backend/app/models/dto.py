from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

class UserCreateDTO(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLoginDTO(BaseModel):
    username: str
    password: str

class UserOutDTO(BaseModel):
    id: int
    username: str
    email: EmailStr
<<<<<<< HEAD
    created_at: Optional[datetime] = None
=======
    avatar: Optional[str] = None
    created_at: Optional[datetime] = None
    is_active: Optional[bool] = None
>>>>>>> origin/front_game_redesign

    class Config:
        from_attributes = True

class TokenDTO(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenWithUserDTO(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOutDTO

    class Config:
        from_attributes = True
<<<<<<< HEAD
=======


class VerifyEmailDTO(BaseModel):
    token: str


class ResendVerificationDTO(BaseModel):
    email: EmailStr
>>>>>>> origin/front_game_redesign

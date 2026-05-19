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
    avatar: Optional[str] = None
    created_at: Optional[datetime] = None
    is_active: Optional[bool] = None

    class Config:
        from_attributes = True


class UserOutWithVerifyUrlDTO(UserOutDTO):
    # Dev / fallback mode: when SMTP is not configured, backend can provide the
    # verification link directly to be shown in the UI.
    verify_url: Optional[str] = None


class UserStatsDTO(BaseModel):
    elo: int
    games_played: int

class TokenDTO(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenWithUserDTO(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOutDTO

    class Config:
        from_attributes = True


class VerifyEmailDTO(BaseModel):
    token: str


class ResendVerificationDTO(BaseModel):
    email: EmailStr
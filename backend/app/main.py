from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from .models import Base
from .health import router as health_router
from .register_user import router as register_user_router
from .db import get_session

app = FastAPI()

app.include_router(health_router)
app.include_router(register_user_router)

from fastapi import FastAPI
from .health import router as health_router
from .register_user import router as register_user_router
from .auth import router as auth_router

app = FastAPI()

app.include_router(health_router)
app.include_router(register_user_router)
app.include_router(auth_router)

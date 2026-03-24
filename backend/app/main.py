from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.routers.register_user import router as register_user_router
from app.routers.auth import router as auth_router
from app.database import engine
from app.models.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
	# Ensure all ORM tables exist in the configured database
	async with engine.begin() as conn:
		await conn.run_sync(Base.metadata.create_all)
	yield


app = FastAPI(lifespan=lifespan)


app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(register_user_router)
app.include_router(auth_router)


if __name__ == "__main__":
	uvicorn.run(
		"app.main:app",
		host="0.0.0.0",
		port=8000,
		reload=True,
	)

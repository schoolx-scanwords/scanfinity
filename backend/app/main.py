from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.register_user import router as register_user_router
from app.routers.auth import router as auth_router

app = FastAPI()

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(register_user_router)
app.include_router(auth_router)

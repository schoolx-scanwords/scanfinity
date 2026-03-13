from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .health import router as health_router
from .register_user import router as register_user_router
from .auth import router as auth_router

app = FastAPI()

app.add_middleware(
	CORSMiddleware,
	allow_origins=[
		"http://localhost:3000",
		"http://127.0.0.1:3000",
	],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(register_user_router)
app.include_router(auth_router)

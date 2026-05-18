# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os
from routers import game, game_websocket
from database.connect import close_connection

from routers.register_user import router as register_user_router
from routers.auth import router as auth_router
from routers.email_verification import router as email_verification_router
from routers.game import router as game_router
from routers.game_websocket import router as game_websocket_router
from routers.elo import router as elo_router
from routers.lobbies import router as lobbies_router
from routers.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_connection()

app = FastAPI(lifespan=lifespan)

# Allow local dev frontend to call the API directly if needed.
# In production behind a reverse proxy (same-origin), this is typically not used.
cors_origins_env = os.getenv("CORS_ORIGINS", "")
cors_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
if not cors_origins:
    cors_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_HERE = os.path.dirname(os.path.abspath(__file__))
nextjs_output_path = os.path.abspath(os.path.join(_HERE, "..", "..", "frontend", "out"))

app.mount("/_next", StaticFiles(directory=os.path.join(nextjs_output_path, "_next")), name="next")

app.include_router(game_router)
app.include_router(game_websocket_router)
app.include_router(lobbies_router)
app.include_router(elo_router)
app.include_router(register_user_router)
app.include_router(auth_router)
app.include_router(email_verification_router)
app.include_router(users_router)

@app.get("/")
async def serve_root():
    return FileResponse(os.path.join(nextjs_output_path, "index.html"))

@app.get("/{full_path:path}")
async def serve_nextjs(full_path: str):

    file_path = os.path.join(nextjs_output_path, full_path)
    
    if os.path.isdir(file_path) or not os.path.exists(file_path):
        index_path = os.path.join(file_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        
        html_path = file_path + ".html"
        if os.path.exists(html_path):
            return FileResponse(html_path)
    
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    return FileResponse(os.path.join(nextjs_output_path, "404.html"), status_code=404)
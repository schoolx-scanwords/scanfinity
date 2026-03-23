# main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os
from routers import game, game_websocket
from database.connect import close_connection

from routers.register_user import router as register_user_router
from routers.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_connection()

app = FastAPI(lifespan=lifespan)

nextjs_output_path = os.path.abspath(os.path.join("..", "..", "frontend", "out"))

app.mount("/_next", StaticFiles(directory=os.path.join(nextjs_output_path, "_next")), name="next")

app.include_router(game.router)
app.include_router(game_websocket.router)
app.include_router(register_user_router)
app.include_router(auth_router)

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
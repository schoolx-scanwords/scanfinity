<<<<<<< HEAD
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.register_user import router as register_user_router
from app.routers.auth import router as auth_router
=======
# main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os
import logging
from routers import game, game_websocket
from database.connect import close_connection
>>>>>>> origin/front_game_redesign

from routers.register_user import router as register_user_router
from routers.auth import router as auth_router
from routers.email_verification import router as email_verification_router
from routers.game import router as game_router
from routers.game_websocket import router as game_websocket_router
from routers.elo import router as elo_router
from routers.lobbies import router as lobbies_router
from routers.matchmaking import router as matchmaking_router
from routers.users import router as users_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up FastAPI application...")
    yield
    # Shutdown
    logger.info("Shutting down FastAPI application...")
    await close_connection()

app = FastAPI(lifespan=lifespan)

# Trusted hosts middleware for security
allowed_hosts_env = os.getenv("ALLOWED_HOSTS", "")
allowed_hosts = [h.strip() for h in allowed_hosts_env.split(",") if h.strip()]
if not allowed_hosts:
    allowed_hosts = ["localhost", "127.0.0.1", "scanfinity.fun", "www.scscanfinity.fun"]

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=allowed_hosts
)

# CORS configuration
cors_origins_env = os.getenv("CORS_ORIGINS", "")
cors_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
if not cors_origins:
    # Default for production and development
    cors_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://scanfinity.fun",
        "https://www.scscanfinity.fun",
        "http://scanfinity.fun",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Determine the path for static files (Next.js output)
_HERE = os.path.dirname(os.path.abspath(__file__))

# Try multiple possible locations for the frontend out directory
possible_paths = [
    os.path.abspath(os.path.join(_HERE, "..", "..", "frontend", "out")),  # Original path
    os.path.abspath(os.path.join(_HERE, "..", "frontend", "out")),       # Alternative path
    "/app/frontend/out",  # Docker path
    os.path.join(os.getcwd(), "frontend", "out"),  # Current working directory
]

nextjs_output_path = None
for path in possible_paths:
    if os.path.exists(path) and os.path.isdir(path):
        nextjs_output_path = path
        logger.info(f"Found frontend output at: {nextjs_output_path}")
        break

if not nextjs_output_path:
    logger.warning("Frontend output directory not found. Static file serving may not work.")
    # Create a dummy path to avoid errors
    nextjs_output_path = "/tmp/empty_frontend"
    os.makedirs(nextjs_output_path, exist_ok=True)

# Mount static directories if they exist
_next_path = os.path.join(nextjs_output_path, "_next")
if os.path.exists(_next_path):
    app.mount("/_next", StaticFiles(directory=_next_path), name="next")
    logger.info("Mounted /_next static directory")

# Mount avatars directory if it exists
avatars_path = os.path.join(nextjs_output_path, "avatars")
if os.path.exists(avatars_path):
    app.mount("/avatars", StaticFiles(directory=avatars_path), name="avatars")

# Mount icons directory if it exists
icons_path = os.path.join(nextjs_output_path, "icons")
if os.path.exists(icons_path):
    app.mount("/icons", StaticFiles(directory=icons_path), name="icons")

# Include all routers
app.include_router(game_router)
app.include_router(game_websocket_router)
app.include_router(lobbies_router)
app.include_router(elo_router)
app.include_router(matchmaking_router)
app.include_router(register_user_router)
app.include_router(auth_router)
app.include_router(email_verification_router)
app.include_router(users_router)

# Health check endpoint for Docker
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "backend"}

<<<<<<< HEAD
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(register_user_router)
app.include_router(auth_router)
=======
@app.get("/api/health")
async def api_health_check():
    return {"status": "healthy", "service": "backend", "api": "ready"}

@app.get("/")
async def serve_root():
    index_path = os.path.join(nextjs_output_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    logger.error(f"Index file not found at {index_path}")
    return FileResponse(os.path.join(nextjs_output_path, "404.html"), status_code=404) if os.path.exists(os.path.join(nextjs_output_path, "404.html")) else {"error": "Frontend not found"}

@app.get("/{full_path:path}")
async def serve_nextjs(full_path: str):
    # Skip API routes - they're handled by routers
    if full_path.startswith("api/") or full_path.startswith("ws/"):
        raise HTTPException(status_code=404, detail="Not found")
    
    # Handle static files
    file_path = os.path.join(nextjs_output_path, full_path)
    
    # Check if it's a directory or file
    if os.path.isdir(file_path):
        index_path = os.path.join(file_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
    
    # Check if file exists
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # Check for .html extension
    html_path = file_path + ".html"
    if os.path.exists(html_path):
        return FileResponse(html_path)
    
    # For client-side routing, serve index.html
    index_path = os.path.join(nextjs_output_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    # Return 404 if nothing found
    not_found_path = os.path.join(nextjs_output_path, "404.html")
    if os.path.exists(not_found_path):
        return FileResponse(not_found_path, status_code=404)
    
    return {"error": "Not found"}, 404

# Import HTTPException for the serve_nextjs function
from fastapi import HTTPException
>>>>>>> origin/front_game_redesign

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from routers import game

app = FastAPI()

nextjs_output_path = os.path.abspath(os.path.join( "..", "..", "frontend", "out"))

# Mount only the _next directory which definitely exists
app.mount("/game/_next", StaticFiles(directory=os.path.join(nextjs_output_path, "_next")), name="next")

# Include your game router
app.include_router(game.router)
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import os
import json


app = FastAPI()

# Mount the entire Next.js output
# Get the directory where main.py is located
current_dir = os.path.dirname(__file__)  # /home/buglover/Documents/scanfinity-2/backend/app/

# Go up two levels to reach the project root, then into frontend/out
nextjs_output_path = os.path.abspath(os.path.join(current_dir, "..", "..", "frontend", "out"))

# Serve all static files
app.mount("/game", StaticFiles(directory=nextjs_output_path, html=True), name="game")

JSON_FILE_PATH =  os.path.abspath(os.path.join(current_dir, "..", "..", "puzzlegen", "puzzle.json"))
with open(JSON_FILE_PATH, 'r', encoding='utf-8') as f:
    grid_data = json.load(f)['grid']

@app.get("/api/grid")
async def get_grid():
    JSON_FILE_PATH =  os.path.abspath(os.path.join(current_dir, "..", "..", "puzzlegen", "puzzle.json"))
    with open(JSON_FILE_PATH, 'r', encoding='utf-8') as f:
        grid_data = json.load(f)['grid']
    try:
        return JSONResponse(content=grid_data)
    except FileNotFoundError:
        return JSONResponse(content={"error": "Grid file not found"}, status_code=404)
    except json.JSONDecodeError:
        return JSONResponse(content={"error": "Invalid JSON format"}, status_code=500)

@app.get("/")
async def root():
    return FileResponse(os.path.join(nextjs_output_path, "index.html"))

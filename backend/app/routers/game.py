from fastapi import APIRouter
from fastapi.responses import JSONResponse, FileResponse
import os
import json
from models.puzzle import PuzzleGuess, WordGuess
from typing import List

router = APIRouter()

current_dir = os.path.dirname(__file__)
nextjs_output_path = os.path.abspath(os.path.join( "..", "..", "frontend", "out"))
JSON_FILE_PATH = os.path.abspath(os.path.join( "..", "..", "puzzlegen", "puzzle.json"))

def check_if_solved(puzzle_data: dict, guesses: List[WordGuess]):
    correct_words = {word["id"]: word["word"] for word in puzzle_data["words"]}
    guessed_words = {word.id: word.word.lower() for word in guesses.words}
    correctly_guessed = []
    for id in guessed_words.keys():
        if guessed_words[id] == correct_words[id]:
            correctly_guessed.append(id)
    
    if len(correctly_guessed) != len(puzzle_data["words"]):
        game_state = "playing"
    else:
        game_state = "game_over"

    return correctly_guessed, game_state

@router.get("/api/game/grid")
async def get_grid():
    with open(JSON_FILE_PATH, 'r', encoding='utf-8') as f:
        grid_data = json.load(f)
        blank_words = []
        for word in grid_data["words"]:
            blank_words.append({
                "id": word["id"],
                "riddle": word["riddle"],
                "coords": word["coords"],
                "direction": word["direction"]
            })
        response = {"id": grid_data["id"], "blank": grid_data["blank"], "words": blank_words}
    return JSONResponse(content=response)

@router.post("/api/game/check_puzzle")
async def check(guesses: PuzzleGuess): 
    with open(JSON_FILE_PATH, 'r', encoding='utf-8') as f:
        puzzle_data = json.load(f)

    correctly_guessed, game_state = check_if_solved(puzzle_data, guesses)
    
    return {"guessed": correctly_guessed, "game_state": game_state}

@router.get("/")
async def root():
    return FileResponse(os.path.join(nextjs_output_path, "index.html"))
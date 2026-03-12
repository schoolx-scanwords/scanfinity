from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import os
import json
from pydantic import BaseModel
from typing import Optional, List


class Word(BaseModel):
    id: int
    word: str

class WordGuess(BaseModel):
    pzl_id: int
    word: Word

class PuzzleGuess(BaseModel):
    pzl_id: int
    words: List[Word]

app = FastAPI()

current_dir = os.path.dirname(__file__)  
nextjs_output_path = os.path.abspath(os.path.join(current_dir, "..", "..", "frontend", "out"))
app.mount("/game", StaticFiles(directory=nextjs_output_path, html=True), name="game")
JSON_FILE_PATH =  os.path.abspath(os.path.join(current_dir, "..", "..", "puzzlegen", "puzzle.json"))

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


@app.get("/api/grid")
async def get_grid():
    JSON_FILE_PATH =  os.path.abspath(os.path.join(current_dir, "..", "..", "puzzlegen", "puzzle.json"))
    with open(JSON_FILE_PATH, 'r', encoding='utf-8') as f:
        grid_data = json.load(f)
        blank_words = []
        for word in grid_data["words"]:
            blank_words.append({
                "id": word["id"],
                "riddle": word["riddle"],
                "coords": word["coords"],
                "direction": word["direction"]  # Add this line
            })
        response = {"id": grid_data["id"], "blank": grid_data["blank"], "words": blank_words}
    return JSONResponse(content=response)

class Guess(BaseModel):
    puzzle_id: int
    word_id: int
    inp_word: str


@app.post("/api/check_puzzle")
async def check(guesses: PuzzleGuess): 
    
    with open(JSON_FILE_PATH, 'r', encoding='utf-8') as f:
        puzzle_data = json.load(f)

    correctly_guessed, game_state = check_if_solved(puzzle_data, guesses)
    
    return {"guessed": correctly_guessed, "game_state": game_state}
  

@app.get("/")
async def root():
    return FileResponse(os.path.join(nextjs_output_path, "index.html"))

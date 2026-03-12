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

    correct_words = {word["id"]: word["word"] for word in puzzle_data["words"]}
    guessed_words = {word.id: word.word.lower() for word in guesses.words}
    correctly_guessed = []
    for id in guessed_words.keys():
        if guessed_words[id] == correct_words[id]:
            correctly_guessed.append(id)


    return {"guessed": correctly_guessed}

@app.post("/api/check_word")
async def check(guess: WordGuess):
    
    pzl_id = guess.pzl_id
    word_id = guess.word.id
    word = guess.word.word.lower()

    with open(JSON_FILE_PATH, 'r', encoding='utf-8') as f:
        puzzle_data = json.load(f)

    correct = puzzle_data["words"][word_id]["word"].lower() == word
    if correct:
        return {"guessed": word_id}
    else:
        return {"guessed": None}

    

@app.get("/")
async def root():
    return FileResponse(os.path.join(nextjs_output_path, "index.html"))

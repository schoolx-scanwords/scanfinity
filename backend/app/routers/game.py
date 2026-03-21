from fastapi import APIRouter
from fastapi.responses import JSONResponse
import os

from typing import List

from models.puzzle import PuzzleGuess, WordGuess
from database.game import get_puzzle_by_id

router = APIRouter(prefix="/api")

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

@router.get("/game/grid")
async def get_grid():
    pzl = get_puzzle_by_id(8706)[6]

    blank_words = []
    for word in pzl["words"]:
        blank_words.append({
            "id": word["id"],
            "riddle": word["riddle"],
            "coords": word["coords"],
            "direction": word["direction"]
        })
    response = {"id": pzl["id"], "blank": pzl["blank"], "words": blank_words}

    return JSONResponse(content=response)

@router.post("/game/check_puzzle")
async def check(guesses: PuzzleGuess): 
    pzl = get_puzzle_by_id(8706)[6]

    correctly_guessed, game_state = check_if_solved(pzl, guesses)
    
    return {"guessed": correctly_guessed, "game_state": game_state}
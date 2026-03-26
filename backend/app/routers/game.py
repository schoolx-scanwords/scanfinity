# routers/game.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import List

from models.puzzle import PuzzleGuess, WordGuess
from database.game import get_puzzle_by_id, update_times_played

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
    puzzle = await get_puzzle_by_id(4669)
    
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    
    pzl = puzzle.get('jsonb', {})
    puzzle_id = puzzle.get('puzzle_id')

    blank_words = []
    for word in pzl.get("words", []):
        blank_words.append({
            "id": word["id"],
            "riddle": word["riddle"],
            "coords": word["coords"],
            "direction": word["direction"]
        })
    response = {"id": puzzle_id, "blank": pzl.get("blank", []), "words": blank_words}

    return JSONResponse(content=response)

@router.post("/game/check_puzzle")
async def check(guesses: PuzzleGuess): 
    puzzle = await get_puzzle_by_id(4669)
    
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    
    pzl = puzzle.get('jsonb', {})
    
    correctly_guessed, game_state = check_if_solved(pzl, guesses)
    
    if game_state == "game_over":
        await update_times_played(4669)
    
    return {"guessed": correctly_guessed, "game_state": game_state}
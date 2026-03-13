from pydantic import BaseModel
from typing import List

class Word(BaseModel):
    id: int
    word: str

class WordGuess(BaseModel):
    pzl_id: int
    word: Word

class PuzzleGuess(BaseModel):
    pzl_id: int
    words: List[Word]

class Guess(BaseModel):
    puzzle_id: int
    word_id: int
    inp_word: str

# classes for objects in database
class Puzzle(BaseModel):
    puzzle_id: int
    lang: str
    topic: str
    difficulty: str
    size: int
    times_played: int = 0
    jsonb: dict
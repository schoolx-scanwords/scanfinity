from pydantic import BaseModel, ConfigDict, Field
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
    model_config = ConfigDict(populate_by_name=True)

    puzzle_id: int
    lang: str
    topic_id: int | None = None
    difficulty: str
    size: int | str
    times_played: int = 0
    json_data: dict = Field(alias="json")
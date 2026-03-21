import psycopg
from psycopg.types.json import Jsonb
import os
from dotenv import load_dotenv
from . import Puzzle
import random
import json

load_dotenv()

HOST = "localhost"
PORT = 5432
DB = os.getenv("POSTGRES_DB")
USER = os.getenv("POSTGRES_USER")
PASSWORD = os.getenv("POSTGRES_PASSWORD")

conn = psycopg.connect(
    host=HOST,
    port=PORT,
    dbname=DB,
    user=USER,
    password=PASSWORD
)
cur = conn.cursor()

# helper functions
def puzzle_obj(pzl_data, id, lang="ru", topic="мемы", difficulty="medium"):
    jsonified_data = json.loads(pzl_data)
    jsonified_data["id"] = id
    return Puzzle(
        puzzle_id=id,
        lang=lang,
        topic=topic,
        difficulty=difficulty,
        size=len(jsonified_data["grid"]),
        times_played=0,
        jsonb=jsonified_data,
    )

# db interractions
def insert_puzzle(puzzle: Puzzle):
    puzzle_dict = puzzle.model_dump()  
    
    cur.execute(
        """
        INSERT INTO "Puzzles" 
        (puzzle_id, lang, topic, difficulty, size, times_played, jsonb) 
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            puzzle_dict['puzzle_id'],
            puzzle_dict['lang'],
            puzzle_dict['topic'],
            puzzle_dict['difficulty'],
            puzzle_dict['size'],
            puzzle_dict.get('times_played', 0),
            Jsonb(puzzle_dict['jsonb']) 
        )
    )
    conn.commit()
    print(f"Inserted puzzle {puzzle.puzzle_id}")

def get_puzzle_by_id(id) -> dict:
    cur.execute(
        'SELECT * FROM "Puzzles" WHERE puzzle_id = %s',
        [id]
    )
    row = cur.fetchone()
    if row:
        return row
    else:
        return None

# def test():
#     print(get_puzzle_by_id(8706))


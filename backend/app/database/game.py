# game.py
from psycopg.types.json import Jsonb
from .connect import connect
from . import Puzzle
import json
import asyncio

# Global pool reference
_pool = None

async def get_pool():
    """Get or initialize the connection pool"""
    global _pool
    if _pool is None:
        _pool = await connect()
    return _pool

# helper functions (these stay synchronous - they just process data)
def puzzle_obj(pzl_data, id, lang="ru", topic="мемы", difficulty="medium"):
    """Convert puzzle data to Puzzle model"""
    jsonified_data = json.loads(pzl_data) if isinstance(pzl_data, str) else pzl_data
    jsonified_data["id"] = id
    return Puzzle(
        puzzle_id=id,
        lang=lang,
        topic_id=None,
        difficulty=difficulty,
        size=len(jsonified_data.get("grid", [])),
        times_played=0,
        json=jsonified_data,
    )

# Database interactions (now async)
async def insert_puzzle(puzzle: Puzzle):
    """Insert a puzzle asynchronously"""
    puzzle_dict = puzzle.model_dump(by_alias=True)
    pool = await get_pool()
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO "puzzles" 
                (puzzle_id, lang, topic_id, difficulty, size, times_played, json) 
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    puzzle_dict['puzzle_id'],
                    puzzle_dict['lang'],
                    puzzle_dict.get('topic_id'),
                    puzzle_dict['difficulty'],
                    puzzle_dict['size'],
                    puzzle_dict.get('times_played', 0),
                    Jsonb(puzzle_dict['json'])
                )
            )
            await conn.commit()
    
    print(f"Inserted puzzle {puzzle.puzzle_id}")

async def get_puzzle_by_id(puzzle_id: int) -> dict | None:
    """Get a puzzle by ID asynchronously"""
    pool = await get_pool()
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT * FROM "puzzles" WHERE puzzle_id = %s',
                [puzzle_id]
            )
            row = await cur.fetchone()
            
            if row:
                # Convert row to dictionary with column names
                columns = [desc[0] for desc in cur.description]
                row_dict = dict(zip(columns, row))
                
                # Parse json if it's stored as string
                if 'json' in row_dict and isinstance(row_dict['json'], str):
                    row_dict['json'] = json.loads(row_dict['json'])
                
                return row_dict
            return None

async def get_latest_puzzle() -> dict | None:
    """Get the latest puzzle by puzzle_id asynchronously"""
    pool = await get_pool()

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT * FROM "puzzles" ORDER BY puzzle_id DESC LIMIT 1'
            )
            row = await cur.fetchone()

            if row:
                columns = [desc[0] for desc in cur.description]
                row_dict = dict(zip(columns, row))

                if 'json' in row_dict and isinstance(row_dict['json'], str):
                    row_dict['json'] = json.loads(row_dict['json'])

                return row_dict
            return None

async def get_puzzle_jsonb(puzzle_id: int) -> dict | None:
    """Get only the JSON data of a puzzle asynchronously."""
    pool = await get_pool()
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT json FROM "puzzles" WHERE puzzle_id = %s',
                [puzzle_id]
            )
            row = await cur.fetchone()
            
            if row:
                json_data = row[0]
                if isinstance(json_data, str):
                    json_data = json.loads(json_data)
                return json_data
            return None

async def update_times_played(puzzle_id: int):
    """Update the play count for a puzzle"""
    pool = await get_pool()
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'UPDATE "puzzles" SET times_played = times_played + 1 WHERE puzzle_id = %s',
                [puzzle_id]
            )
            await conn.commit()

async def get_all_puzzles(limit: int = 100, offset: int = 0):
    """Get multiple puzzles with pagination"""
    pool = await get_pool()
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT * FROM "puzzles" LIMIT %s OFFSET %s',
                [limit, offset]
            )
            rows = await cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            
            puzzles = []
            for row in rows:
                puzzle_dict = dict(zip(columns, row))
                if 'json' in puzzle_dict and isinstance(puzzle_dict['json'], str):
                    puzzle_dict['json'] = json.loads(puzzle_dict['json'])
                puzzles.append(puzzle_dict)
            
            return puzzles

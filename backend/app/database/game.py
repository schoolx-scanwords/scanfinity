# game.py
from psycopg.types.json import Jsonb
from .connect import connect
from . import Puzzle
import json

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
        topic=topic,
        difficulty=difficulty,
        size=len(jsonified_data.get("grid", [])),
        times_played=0,
        jsonb=jsonified_data,
    )

# Database interactions (now async)
async def insert_puzzle(puzzle: Puzzle):
    """Insert a puzzle asynchronously"""
    puzzle_dict = puzzle.model_dump()
    pool = await get_pool()
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
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
            await conn.commit()
    
    print(f"Inserted puzzle {puzzle.puzzle_id}")

async def get_puzzle_by_id(puzzle_id: int) -> dict | None:
    """Get a puzzle by ID asynchronously"""
    pool = await get_pool()
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT * FROM "Puzzles" WHERE puzzle_id = %s',
                [puzzle_id]
            )
            row = await cur.fetchone()
            
            if row:
                # Convert row to dictionary with column names
                columns = [desc[0] for desc in cur.description]
                row_dict = dict(zip(columns, row))
                
                # Parse jsonb if it's stored as string
                if 'jsonb' in row_dict and isinstance(row_dict['jsonb'], str):
                    row_dict['jsonb'] = json.loads(row_dict['jsonb'])
                
                return row_dict
            return None

async def get_puzzle_jsonb(puzzle_id: int) -> dict | None:
    """Get only the JSONB data of a puzzle asynchronously"""
    pool = await get_pool()
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT jsonb FROM "Puzzles" WHERE puzzle_id = %s',
                [puzzle_id]
            )
            row = await cur.fetchone()
            
            if row:
                jsonb_data = row[0]
                if isinstance(jsonb_data, str):
                    jsonb_data = json.loads(jsonb_data)
                return jsonb_data
            return None

async def update_times_played(puzzle_id: int):
    """Update the play count for a puzzle"""
    pool = await get_pool()
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'UPDATE "Puzzles" SET times_played = times_played + 1 WHERE puzzle_id = %s',
                [puzzle_id]
            )
            await conn.commit()

async def get_all_puzzles(limit: int = 100, offset: int = 0):
    """Get multiple puzzles with pagination"""
    pool = await get_pool()
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT * FROM "Puzzles" LIMIT %s OFFSET %s',
                [limit, offset]
            )
            rows = await cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            
            puzzles = []
            for row in rows:
                puzzle_dict = dict(zip(columns, row))
                if 'jsonb' in puzzle_dict and isinstance(puzzle_dict['jsonb'], str):
                    puzzle_dict['jsonb'] = json.loads(puzzle_dict['jsonb'])
                puzzles.append(puzzle_dict)
            
            return puzzles

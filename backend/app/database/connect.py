# connect.py
from dotenv import load_dotenv
from psycopg_pool import AsyncConnectionPool
import os

load_dotenv()

# Database configuration
HOST = "localhost"
PORT = 5432
DB = os.getenv("POSTGRES_DB")
USER = os.getenv("POSTGRES_USER")
PASSWORD = os.getenv("POSTGRES_PASSWORD")

DATABASE_URL = f"postgresql://{USER}:{PASSWORD}@{HOST}:{PORT}/{DB}"

# Global connection pool
pool = None

async def connect():
    """Initialize and return the async connection pool"""
    global pool
    if pool is None:
        pool = AsyncConnectionPool(
            DATABASE_URL,
            min_size=5,      # Minimum connections in the pool
            max_size=20,     # Maximum connections in the pool
            timeout=60,      # Connection timeout in seconds
            max_waiting=100, # Maximum waiting connections
            max_lifetime=300 # Maximum lifetime of a connection in seconds
        )
        await pool.open()
        print("Database connection pool initialized")
    return pool

async def close_connection():
    """Close the connection pool"""
    global pool
    if pool:
        await pool.close()
        print("Database connection pool closed")    
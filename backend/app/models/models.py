from sqlalchemy.orm import declarative_base
from sqlalchemy import (
    text,
    Column,
    Integer,
    String,
    DateTime,
    LargeBinary,
    Boolean,
)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    created_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    is_active = Column(Boolean, nullable=False, server_default=text("false"))
    email_verified_at = Column(DateTime, nullable=True)
    elo = Column(Integer, nullable=False, server_default=text("0"))
    total_games = Column(Integer, nullable=False, server_default=text("0"))
    product_image = Column(LargeBinary, nullable=True)
    password_hash = Column(String, nullable=False)
    password_salt = Column(String, nullable=False)

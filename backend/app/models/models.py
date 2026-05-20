from sqlalchemy.orm import declarative_base
from sqlalchemy import (
    text,
    Column,
    Integer,
    String,
    DateTime,
    LargeBinary,
<<<<<<< HEAD
=======
    Boolean,
>>>>>>> origin/front_game_redesign
)
Base = declarative_base()

class User(Base):
<<<<<<< HEAD
    __tablename__ = "Users"
=======
    __tablename__ = "users"
>>>>>>> origin/front_game_redesign

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    created_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
<<<<<<< HEAD
=======
    is_active = Column(Boolean, nullable=False, server_default=text("false"))
    email_verified_at = Column(DateTime, nullable=True)
>>>>>>> origin/front_game_redesign
    elo = Column(Integer, nullable=False, server_default=text("0"))
    total_games = Column(Integer, nullable=False, server_default=text("0"))
    product_image = Column(LargeBinary, nullable=True)
    password_hash = Column(String, nullable=False)
    password_salt = Column(String, nullable=False)
<<<<<<< HEAD

=======
>>>>>>> origin/front_game_redesign

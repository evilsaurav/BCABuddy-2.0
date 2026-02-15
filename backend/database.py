from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

DATABASE_URL = "sqlite:///./bcabuddy.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    display_name = Column(String)
    gender = Column(String, nullable=True)
    mobile_number = Column(String, nullable=True)
    email = Column(String, nullable=True)
    college = Column(String, nullable=True)
    enrollment_id = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    profile_picture_url = Column(String, nullable=True)
    is_creator = Column(Integer, default=0)  # 0 = False, 1 = True (SQLite compatible)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sessions = relationship("ChatSession", back_populates="user")

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="sessions")
    messages = relationship("ChatHistory", back_populates="session", cascade="all, delete-orphan")

class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    sender = Column(String)
    text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    intent_type = Column(String, nullable=True)  # ACADEMIC | COMMAND | PERSONAL | AMBIGUOUS
    confidence_score = Column(Float, nullable=True)  # 0-1 confidence in response quality
    
    session = relationship("ChatSession", back_populates="messages")

Base.metadata.create_all(bind=engine)


def _sqlite_ensure_column(table: str, column: str, ddl: str) -> None:
    """Best-effort SQLite migration for additive columns."""
    if not str(engine.url).startswith("sqlite"):
        return
    try:
        conn = engine.raw_connection()
        try:
            cur = conn.cursor()
            cur.execute(f"PRAGMA table_info({table})")
            existing = {row[1] for row in cur.fetchall()}  # row[1] is column name
            if column not in existing:
                cur.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")
                conn.commit()
        finally:
            conn.close()
    except Exception:
        # If migration fails, app may still run on fresh DB.
        pass


# Ensure additive columns exist for older sqlite db files.
_sqlite_ensure_column("chat_history", "intent_type", "intent_type VARCHAR")
_sqlite_ensure_column("chat_history", "confidence_score", "confidence_score FLOAT")

_sqlite_ensure_column("users", "email", "email VARCHAR")
_sqlite_ensure_column("users", "college", "college VARCHAR")
_sqlite_ensure_column("users", "enrollment_id", "enrollment_id VARCHAR")
_sqlite_ensure_column("users", "bio", "bio TEXT")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
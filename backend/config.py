from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import List, Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field


class Settings(BaseModel):
    """Central application configuration loaded from environment variables."""

    # Core secrets / auth
    secret_key: str = Field(
        default="CHANGE_ME_IN_PRODUCTION",
        description="JWT signing key. MUST be overridden in production via SECRET_KEY env var.",
    )
    algorithm: str = Field(default="HS256", description="JWT signing algorithm")
    access_token_expire_minutes: int = Field(
        default=60 * 24, description="Access token expiry in minutes"
    )

    # External services
    groq_api_key: Optional[str] = Field(
        default=None, description="Groq API key for LLM calls"
    )

    # Storage paths
    upload_dir: str = Field(default="uploads", description="Directory for uploaded files")
    profile_pics_dir: str = Field(
        default="profile_pics", description="Directory for local profile pictures"
    )

    # CORS
    backend_cors_origins: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        description="Allowed CORS origins for the FastAPI backend",
    )

    # Simple in-memory rate limit defaults (per user)
    chat_requests_per_minute: int = Field(
        default=30,
        description="Max chat requests per user per minute",
    )
    quiz_requests_per_minute: int = Field(
        default=10,
        description="Max quiz generation requests per user per minute",
    )
    exam_requests_per_minute: int = Field(
        default=5,
        description="Max exam generation requests per user per minute",
    )
    grading_requests_per_minute: int = Field(
        default=15,
        description="Max subjective grading requests per user per minute",
    )
    ocr_requests_per_minute: int = Field(
        default=10,
        description="Max OCR/file-processing requests per user per minute",
    )

    class Config:
        extra = "ignore"


def _load_env() -> None:
    """Load .env before building settings (idempotent)."""
    load_dotenv(override=False)


def _parse_cors_origins(env_value: Optional[str]) -> Optional[List[str]]:
    if not env_value:
        return None
    value = env_value.strip()
    # Try JSON first: '["http://localhost:5173", "http://127.0.0.1:5173"]'
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(o).strip() for o in parsed if str(o).strip()]
    except Exception:
        pass
    # Fallback: comma-separated list
    return [o.strip() for o in value.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""
    _load_env()

    settings = Settings(
        secret_key=os.getenv("SECRET_KEY", "CHANGE_ME_IN_PRODUCTION"),
        algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        access_token_expire_minutes=int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24))
        ),
        groq_api_key=os.getenv("GROQ_API_KEY"),
        upload_dir=os.getenv("UPLOAD_DIR", "uploads"),
        profile_pics_dir=os.getenv("PROFILE_PICS_DIR", "profile_pics"),
    )

    cors_env = os.getenv("BACKEND_CORS_ORIGINS")
    cors_overrides = _parse_cors_origins(cors_env)
    if cors_overrides:
        settings.backend_cors_origins = cors_overrides

    return settings


"""
BCABuddy Backend - AI Learning Assistant for IGNOU BCA
License: MIT
Author: Saurav Kumar
Description: FastAPI application for IGNOU BCA learning with AI assistance

PHASE 1: BACKEND RESTRUCTURING - COMPLETE
- All logic preserved from original 662-line file
- Modular structure: models.py, persona.py, main.py
- Supreme Architect & Queen protocols intact
- RAG Service fully integrated
"""

import sys
import io



from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from groq import Groq
from typing import Optional, Any, cast, List
import os, shutil
import uvicorn
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from database import ChatHistory, User, ChatSession, StudyRoadmap, get_db
from rag_service import RAGService
from PIL import Image
import json
import time
import re
import difflib
import random

from config import get_settings
from auth_utils import get_current_user

# Import modular components
from models import (
    UserCreate, Token, ChatRequest, QuizRequest, QuizQuestion,
    MixedExamRequest, SubjectiveGradeRequest, SubjectiveGradeResponse,
    DashboardStats, UserProfile, UserProfileUpdate, PasswordChange, ChatResponse,
    MCQExplainRequest, ExplainQuestionRequest, StudyPlanRequest,
)
from persona import (
    get_saurav_prompt, get_jiya_prompt, get_april_19_prompt,
    get_jiya_identity_prompt, get_developer_crush_prompt, get_ai_love_prompt,
    detect_persona_trigger, detect_jiya_question_type, get_study_tool_prompt, get_response_mode_instruction,
    classify_intent, extract_subject_context, build_conversation_context,
    validate_subject_mapping, get_intent_specific_protocol,
    detect_response_style, get_persona_style_instruction, get_jiya_variant_response,
    COMPLETION_DIRECTIVE, CRITICAL_OUTPUT_RULE,
)

# --- CONFIG ---
settings = get_settings()
GROQ_API_KEY = settings.groq_api_key
SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
UPLOAD_DIR = settings.upload_dir
PROFILE_PICS_DIR = settings.profile_pics_dir
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROFILE_PICS_DIR, exist_ok=True)

# --- SUPABASE STORAGE (AVATARS) ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_AVATAR_BUCKET = os.getenv("SUPABASE_AVATAR_BUCKET", "avatars")


# --- SERVICES ---
rag_system = RAGService(groq_api_key=GROQ_API_KEY)
client = Groq(api_key=GROQ_API_KEY)
MAX_TOKENS = 8192
AUTO_CONTINUE_PROMPT = (
    "Continue exactly from where you stopped. "
    "Do not repeat previous lines. Complete any unfinished sentence, list item, or code block."
)
SINGLE_CHAT_MODEL = os.getenv("BCABUDDY_CHAT_MODEL", "llama-3.3-70b-versatile")
USER_PERFORMANCE_REPORTS: dict[int, dict[str, Any]] = {}


class StudyRoadmapAcceptRequest(BaseModel):
    subject: str = ""
    semester: str = ""
    duration_days: int = 15
    roadmap_text: str = ""


class StudyDay(BaseModel):
    day: int
    focus_subject: str
    topics_to_cover: List[str]
    allocated_hours: float


class StudyPlanResponse(BaseModel):
    study_plan: List[StudyDay]

# --- FAISS VECTOR STORE ---
# Delegated to rag_system (Lazy Loaded)

def _doc_category(doc: Any) -> str:
    metadata = getattr(doc, "metadata", {}) or {}
    return str(metadata.get("category", "")).strip().lower()

def _normalize_tool_key(active_tool: Optional[str]) -> str:
    raw = str(active_tool or "").strip().lower().replace("_", " ")
    normalized = " ".join(raw.split())
    if normalized in {"exam predictor", "exam-predictor"}:
        return "exam predictor"
    if normalized in {"viva mentor", "ai viva mentor", "ai-viva-mentor"}:
        return "viva mentor"
    if normalized in {"study roadmap", "study plan", "roadmap"}:
        return "study roadmap"
    if normalized in {"cheat mode", "cheat", "pyq cheat"}:
        return "cheat mode"
    if normalized in {"performance analytics", "performance analyzer", "performance"}:
        return "performance analytics"
    if normalized in {"quiz master", "ocr quiz", "handwriting ocr to quiz"}:
        return "quiz master"
    return normalized


def _resolve_study_tool_prompt_name(active_tool: Optional[str]) -> str:
    tool_key = _normalize_tool_key(active_tool)
    mapping = {
        "pyq": "PYQs",
        "pyqs": "PYQs",
        "previous year questions": "PYQs",
        "assignments": "Assignments",
        "assignment": "Assignments",
        "lab work": "Lab Work",
        "lab": "Lab Work",
        "notes": "Notes",
        "summary": "Summary",
        "viva": "Viva",
        "viva mentor": "AI Viva Mentor",
        "exam predictor": "Exam Predictor",
        "study roadmap": "Study Roadmap",
        "cheat mode": "Cheat Mode",
        "quiz master": "Quiz Master",
        "performance analytics": "Performance Analytics",
        "ai code architect": "AI Code Architect",
    }
    return mapping.get(tool_key, "")


def _is_chat_persistence_enabled(user: Any) -> bool:
    privacy_mode = bool(getattr(user, "privacy_mode", 0))
    auto_save_history = bool(getattr(user, "auto_save_history", 1))
    return (not privacy_mode) and auto_save_history

def _retrieve_study_material(user_query: str, active_tool: Optional[str], k: int = 5):
    rag_system._lazy_load_index()
    if not rag_system.vector_store or not str(user_query or "").strip():
        return "", [], []
    try:
        docs = rag_system.vector_store.similarity_search(user_query, k=k)
    except Exception:
        return "", [], []

    if not docs:
        return "", [], []

    pyq_docs = [d for d in docs if _doc_category(d) == "pyq"]
    book_docs = [d for d in docs if _doc_category(d) != "pyq"]

    tool_key = _normalize_tool_key(active_tool)
    selected_docs = docs
    if tool_key in {"exam predictor", "cheat mode"}:
        selected_docs = pyq_docs or docs
    elif tool_key == "viva mentor":
        selected_docs = book_docs or docs

    chunks = [
        str(getattr(d, "page_content", "")).strip()
        for d in selected_docs
        if str(getattr(d, "page_content", "")).strip()
    ]
    retrieved_context = "\n\n---\n\n".join(chunks[:5]).strip()
    return retrieved_context, pyq_docs, book_docs

def _hard_chop_next_suggestions(text: str) -> str:
    return str(text or "").split("Next suggestions:")[0].strip()

def _normalize_semester_value(value: Any) -> str:
    raw = str(value or "").strip().lower()
    if not raw:
        return ""
    m = re.search(r"([1-6])", raw)
    return m.group(1) if m else ""

def _retrieve_exam_predictor_pyq_context(
    selected_subject: str,
    selected_semester: str,
    k: int = 30,
):
    rag_system._lazy_load_index()
    if not rag_system.vector_store:
        return "", []

    subject_key = str(selected_subject or "").strip().lower()
    if not subject_key:
        return "", []

    semester_key = _normalize_semester_value(selected_semester)

    try:
        docs = rag_system.vector_store.similarity_search(
            f"Previous year questions for {selected_subject}",
            k=max(60, k * 3),
        )
    except Exception:
        return "", []

    filtered_docs = []
    for doc in docs:
        metadata = getattr(doc, "metadata", {}) or {}
        if str(metadata.get("category", "")).strip().lower() != "pyq":
            continue

        doc_subject = str(metadata.get("subject", "")).strip().lower()
        if doc_subject != subject_key:
            continue

        doc_semester = _normalize_semester_value(metadata.get("semester", ""))
        if semester_key and doc_semester and semester_key != doc_semester:
            continue

        filtered_docs.append(doc)
        if len(filtered_docs) >= k:
            break

    chunks = [
        str(getattr(d, "page_content", "")).strip()
        for d in filtered_docs
        if str(getattr(d, "page_content", "")).strip()
    ]
    return "\n\n---\n\n".join(chunks).strip(), filtered_docs

def _extract_roadmap_days(answer_text: str) -> list[dict[str, Any]]:
    text = str(answer_text or "")
    if not text.strip():
        return []

    days: list[dict[str, Any]] = []
    seen_days: set[int] = set()

    day_pattern = re.compile(r"(?im)^\s*(?:[-*•]\s*)?day\s*(\d{1,2})\s*[:\-\)]\s*(.+)$")
    for m in day_pattern.finditer(text):
        day_num = int(m.group(1))
        if day_num < 1 or day_num > 90 or day_num in seen_days:
            continue
        task = str(m.group(2) or "").strip()
        if not task:
            continue
        seen_days.add(day_num)
        days.append({
            "day": day_num,
            "label": f"Day {day_num}",
            "task": task,
            "completed": False,
        })

    if len(days) >= 5:
        return sorted(days, key=lambda x: int(x.get("day", 99)))

    numbered_pattern = re.compile(r"(?im)^\s*(\d{1,2})\s*[\).:-]\s*(.+)$")
    for m in numbered_pattern.finditer(text):
        day_num = int(m.group(1))
        if day_num < 1 or day_num > 90 or day_num in seen_days:
            continue
        task = str(m.group(2) or "").strip()
        if not task:
            continue
        seen_days.add(day_num)
        days.append({
            "day": day_num,
            "label": f"Day {day_num}",
            "task": task,
            "completed": False,
        })

    return sorted(days, key=lambda x: int(x.get("day", 99)))

def _persist_study_roadmap(
    db: Session,
    user_id: int,
    subject: Optional[str],
    semester: Optional[str],
    duration_days: int,
    answer_text: str,
) -> bool:
    days = _extract_roadmap_days(answer_text)
    duration = max(1, min(int(duration_days or 15), 90))
    if len(days) < 3:
        return False

    title = f"{duration}-Day Study Roadmap{f' • {subject}' if subject else ''}"
    trimmed_days = days[:duration]
    payload = {
        "title": title,
        "subject": str(subject or "").strip() or None,
        "semester": str(semester or "").strip() or None,
        "duration_days": duration,
        "days": trimmed_days,
        "total_days": len(trimmed_days),
        "created_at": datetime.utcnow().isoformat(),
    }

    db.add(
        StudyRoadmap(
            user_id=user_id,
            subject=payload["subject"],
            title=title,
            roadmap_json=json.dumps(payload, ensure_ascii=False),
            raw_text=str(answer_text or "")[:12000],
        )
    )
    db.commit()
    return True

# --- SESSION STATE (in-memory, best-effort) ---
SESSION_STATE: dict[str, dict] = {}

# --- SIMPLE IN-MEMORY RATE LIMITER (PER USER) ---
_RATE_BUCKETS: dict[str, dict[str, float]] = {}


class ProviderRateLimitError(Exception):
    def __init__(self, message: str, retry_after_seconds: int = 60, provider: str = "groq"):
        super().__init__(message)
        self.message = str(message)
        self.retry_after_seconds = max(1, int(retry_after_seconds or 60))
        self.provider = provider
        self.reset_at = datetime.utcnow() + timedelta(seconds=self.retry_after_seconds)

def _check_rate_limit(bucket: str, user_id: Optional[int], limit_per_minute: int) -> None:
    """Very lightweight per-user fixed-window limiter. Best-effort only."""
    global _RATE_BUCKETS
    if '_RATE_BUCKETS' not in globals():
        globals()['_RATE_BUCKETS'] = {}
        
    if not user_id or limit_per_minute <= 0:
        return
    now = time.time()
    window = 60.0
    
    # Garbage collection to prevent memory leak
    if len(globals()['_RATE_BUCKETS']) > 1000:
        stale_keys = [k for k, v in globals()['_RATE_BUCKETS'].items() if now >= v.get("reset", 0)]
        for k in stale_keys:
            globals()['_RATE_BUCKETS'].pop(k, None)
            
    key = f"{bucket}:{user_id}"
    bucket_state = globals()['_RATE_BUCKETS'].get(key)
    if not bucket_state or now >= bucket_state.get("reset", 0):
        globals()['_RATE_BUCKETS'][key] = {"count": 1.0, "reset": now + window}
        return
    count = bucket_state.get("count", 0.0) + 1.0
    if count > float(limit_per_minute):
        raise HTTPException(
            status_code=429,
            detail="Too many requests for this feature. Please wait a bit before trying again.",
        )
    bucket_state["count"] = count


def _looks_like_provider_rate_limit(error: Exception) -> bool:
    text = str(error or "").lower()
    body = str(getattr(error, "body", "") or "").lower()
    status = getattr(error, "status_code", None)
    return bool(
        status == 429
        or "rate limit" in text
        or "too many requests" in text
        or "requests per minute" in text
        or "tokens per minute" in text
        or "rate limit" in body
    )


def _extract_retry_after_seconds(error: Exception) -> int:
    text = " ".join([
        str(error or ""),
        str(getattr(error, "body", "") or ""),
        str(getattr(error, "response", "") or ""),
    ])
    patterns = [
        re.compile(r"try again in\s*(?:(\d+)\s*m(?:in(?:ute)?s?)?)?\s*(?:(\d+)\s*s(?:ec(?:ond)?s?)?)?", re.I),
        re.compile(r"retry after\s*(\d+)\s*seconds?", re.I),
        re.compile(r"wait\s*(\d+)\s*seconds?", re.I),
    ]
    for pattern in patterns:
        match = pattern.search(text)
        if not match:
            continue
        groups = match.groups()
        if len(groups) == 2:
            minutes = int(groups[0] or 0)
            seconds = int(groups[1] or 0)
            total = minutes * 60 + seconds
            if total > 0:
                return total
        elif len(groups) == 1 and groups[0]:
            return max(1, int(groups[0]))
    return 60


def _format_retry_window(seconds: int) -> str:
    total = max(1, int(seconds or 0))
    minutes, secs = divmod(total, 60)
    if minutes and secs:
        return f"{minutes}m {secs}s"
    if minutes:
        return f"{minutes}m"
    return f"{secs}s"


def _build_provider_rate_limit_message(error: Exception) -> ProviderRateLimitError:
    retry_after = _extract_retry_after_seconds(error)
    reset_time = (datetime.utcnow() + timedelta(seconds=retry_after)).strftime("%I:%M:%S %p UTC")
    message = (
        f"Wait, let me breathe. Groq free-tier limit hit. "
        f"Try again in about {_format_retry_window(retry_after)} "
        f"(around {reset_time})."
    )
    return ProviderRateLimitError(message=message, retry_after_seconds=retry_after)


def _choose_completion_budget(user_prompt: str, messages: Optional[list[dict[str, Any]]] = None) -> int:
    prompt_lower = str(user_prompt or "").lower()

    # Compact by default
    base_budget = 400

    # On-demand detail triggers
    detail_triggers = [
        "explain in detail", "detail mein", "elaborate",
        "step by step", "full explanation", "deep dive",
        "samjhao", "poora", "complete",
    ]
    if any(trigger in prompt_lower for trigger in detail_triggers):
        base_budget = 1600

    # Code needs more space
    if any(trigger in prompt_lower for trigger in ["code", "program", "implement"]):
        base_budget = max(base_budget, 1200)

    return min(MAX_TOKENS, base_budget)

# --- bcrypt/passlib compatibility shim ---
# Some bcrypt builds don't expose `__about__`, but passlib expects it.
try:
    import bcrypt as _bcrypt  # type: ignore
    if not hasattr(_bcrypt, "__about__"):
        class _BcryptAbout:
            __version__ = getattr(_bcrypt, "__version__", "unknown")
        _bcrypt.__about__ = _BcryptAbout()  # type: ignore[attr-defined]
except Exception:
    pass


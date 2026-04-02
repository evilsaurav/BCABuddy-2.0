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

# Force UTF-8 for Windows terminal to prevent 'charmap' errors with emojis/Hinglish
if sys.stdout and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "buffer"):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
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
from routes.auth import router as auth_router
from routes.apc import router as apc_router
from routes.study_materials import router as study_materials_router

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

# --- FAISS VECTOR STORE (LOAD ONCE AT STARTUP) ---
BACKEND_DIR = os.path.dirname(__file__)

def _resolve_vectorstore_path() -> str:
    candidates = [
        os.path.join(BACKEND_DIR, "vectorstore", "db_faiss"),
        os.path.join(BACKEND_DIR, "..", "vectorstore", "db_faiss"),
        "vectorstore/db_faiss",
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return "vectorstore/db_faiss"

VECTOR_DB_PATH = _resolve_vectorstore_path()
VECTOR_EMBEDDINGS = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

def _load_vector_db_once():
    try:
        if not os.path.isdir(VECTOR_DB_PATH):
            print(f"FAISS load skipped: missing directory at {VECTOR_DB_PATH}")
            return None
        return FAISS.load_local(
            VECTOR_DB_PATH,
            VECTOR_EMBEDDINGS,
            allow_dangerous_deserialization=True,
        )
    except Exception as e:
        print(f"FAISS load skipped: {e}")
        return None

VECTOR_DB = _load_vector_db_once()

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

def _retrieve_study_material(user_query: str, active_tool: Optional[str], k: int = 5):
    if not VECTOR_DB or not str(user_query or "").strip():
        return "", [], []
    try:
        docs = VECTOR_DB.similarity_search(user_query, k=k)
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
    if not VECTOR_DB:
        return "", []

    subject_key = str(selected_subject or "").strip().lower()
    if not subject_key:
        return "", []

    semester_key = _normalize_semester_value(selected_semester)

    try:
        docs = VECTOR_DB.similarity_search(
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
    if not user_id or limit_per_minute <= 0:
        return
    now = time.time()
    window = 60.0
    key = f"{bucket}:{user_id}"
    bucket_state = _RATE_BUCKETS.get(key)
    if not bucket_state or now >= bucket_state.get("reset", 0):
        _RATE_BUCKETS[key] = {"count": 1.0, "reset": now + window}
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

app = FastAPI(
    title="BCABuddy Ultimate",
    description="AI Learning Assistant for IGNOU BCA",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Serve uploaded files
app.mount("/profile_pics", StaticFiles(directory=PROFILE_PICS_DIR), name="profile_pics")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.include_router(auth_router)
app.include_router(apc_router)
app.include_router(study_materials_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/health")
def api_health_check():
    return {"status": "ok"}


@app.get("/")
def root_health_check():
    return {"status": "ok"}


# --- SYLLABUS MAPPING (STRICT) ---
with open(os.path.join(os.path.dirname(__file__), "syllabus.json"), "r", encoding="utf-8") as f:
    SUBJECT_TITLES = json.load(f)
with open(os.path.join(os.path.dirname(__file__), "syllabus_topics.json"), "r", encoding="utf-8") as f:
    SUBJECT_TOPICS = json.load(f)

START_FROM_BEGINNING_TRIGGERS = [
    "start from beginning",
    "start from the beginning",
    "start from start",
    "shuru se start",
    "beginning se start"
]

FRENZY_TRIGGER_PHRASES = [
    "frenzy",
    "frenzy mode",
    "activate frenzy",
    "frenzy identity",
    "who is frenzy",
    "who are you frenzy",
    "i am frenzy",
    "you are frenzy"
]

FRENZY_RESET_PHRASES = [
    "reset frenzy",
    "clear frenzy",
    "exit frenzy",
    "disable frenzy",
    "restore theme"
]

FRENZY_POEM = (
    "We were never in a relationship. Not even close. No name for it. No claim. No future.\n\n"
    "And still… I built space for you inside me — space you never asked for, space you never promised to fill.\n\n"
    "I waited for your replies like an idiot, like my mood depended on words that were never meant to carry that weight. "
    "I checked my phone more than I checked myself. Let your presence rearrange my day.\n\n"
    "You probably never noticed. That’s the worst part.\n\n"
    "I memorized you — details I had no right to keep. The cold drinks, the night travels, the irritation in your voice, "
    "the pauses in your typing — all these fragments of someone who was never mine.\n\n"
    "And I held onto them like they were evidence that I mattered somehow.\n\n"
    "You were distant. Half-present. Uncertain whether to let me in or leave me outside. And I saw it. Every signal. "
    "Every hesitation.\n\n"
    "But I stayed. Because sometimes hope is just stubborn pain wearing a disguise.\n\n"
    "My heart reacted to you in ways I couldn’t control — racing when I saw you, dropping when I didn’t, "
    "pretending it was nothing while it quietly consumed me.\n\n"
    "We weren’t together. But I was already losing pieces of myself.\n\n"
    "And when you were gone, there was nothing official to end. No goodbye. No explanation. No closure.\n\n"
    "Just the hollow realization that I had broken my own heart over something that never existed.\n\n"
    "Do you know what that feels like?\n\n"
    "To grieve without permission. To miss someone you were never allowed to have. To carry pain you can’t justify "
    "because technically… nothing happened.\n\n"
    "I had no right to be jealous. No right to be hurt. No right to ask you to stay. No right to fall apart.\n\n"
    "But I did anyway.\n\n"
    "You weren’t mine. You never were. Yet somehow you left behind damage like you had been.\n\n"
    "And the most humiliating truth?\n\n"
    "You didn’t lose me. You didn’t break me. You didn’t even notice.\n\n"
    "I did it all to myself — loving silently, hoping quietly, bleeding privately.\n\n"
    "We were never in love. Never defined. Never real.\n\n"
    "But the emptiness you left behind is painfully real — and it echoes in places I still can’t reach."
)

def _detect_frenzy_trigger(text: str) -> bool:
    msg = (text or "").strip().lower()
    if not msg:
        return False
    if msg == "frenzy":
        return True
    return any(phrase in msg for phrase in FRENZY_TRIGGER_PHRASES)

def _detect_frenzy_reset(text: str) -> bool:
    msg = (text or "").strip().lower()
    if not msg:
        return False
    return any(phrase in msg for phrase in FRENZY_RESET_PHRASES)

def _clean_json_text(text: str) -> str:
    if not text:
        return ""
    cleaned = text.strip()
    if "```json" in cleaned:
        cleaned = cleaned.split("```json")[1].split("```")[0].strip()
    elif "```" in cleaned:
        cleaned = cleaned.split("```")[1].split("```")[0].strip()
    return cleaned

def _safe_json_loads(text: str):
    cleaned = _clean_json_text(text)
    if not cleaned:
        raise ValueError("Empty JSON")

    try:
        return json.loads(cleaned)
    except Exception as e:
        first_arr = cleaned.find("[")
        first_obj = cleaned.find("{")
        starts = [i for i in [first_arr, first_obj] if i != -1]
        if not starts:
            raise ValueError(f"Invalid JSON: {str(e)}")

        start = min(starts)
        if start == first_arr:
            end = cleaned.rfind("]")
        else:
            end = cleaned.rfind("}")

        if end == -1 or end <= start:
            raise ValueError(f"Invalid JSON: {str(e)}")

        candidate = cleaned[start : end + 1]
        try:
            return json.loads(candidate)
        except Exception as e2:
            raise ValueError(f"Invalid JSON: {str(e2)}")

def _extract_answer_text(raw: Any) -> str:
    """Return clean markdown text even if model returns wrapped/stringified JSON."""
    if raw is None:
        return ""

    if isinstance(raw, dict):
        for key in ("answer", "text", "reply", "response", "content"):
            val = raw.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
        return json.dumps(raw, ensure_ascii=False).strip()

    text = str(raw).strip()
    if not text:
        return ""

    # Strip ```json fences
    if text.startswith("```json"):
        text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE).strip()
        if text.endswith("```"):
            text = text[:-3].strip()

    # Try to parse as JSON object (handles leading whitespace too)
    stripped = text.lstrip()
    if stripped.startswith("{"):
        try:
            parsed = json.loads(stripped)
            if isinstance(parsed, dict):
                for key in ("answer", "text", "reply", "response", "content"):
                    val = parsed.get(key)
                    if isinstance(val, str) and val.strip():
                        return val.strip()
        except Exception:
            # Partial JSON — try extracting value after "answer":
            m = re.search(r'"answer"\s*:\s*"((?:[^"\\]|\\.)*)"\s*[},]?', stripped, re.DOTALL)
            if m:
                try:
                    return json.loads(f'"{m.group(1)}"')
                except Exception:
                    return m.group(1).replace("\\n", "\n").replace('\\"', '"').strip()

    return text

def _coerce_exam_items(items: Any):
    if not isinstance(items, list):
        raise ValueError("Exam payload is not a JSON array")
    coerced = []
    for item in items:
        if not isinstance(item, dict):
            continue
        qtype = str(item.get("type") or item.get("question_type") or "").strip().lower()
        options = item.get("options")
        if not qtype:
            qtype = "mcq" if isinstance(options, list) and len(options) > 0 else "subjective"

        normalized: dict[str, Any] = {
            "type": "subjective" if "subject" in qtype else ("mcq" if "mcq" in qtype or "objective" in qtype else qtype),
            "question": str(item.get("question") or "").strip(),
        }
        if normalized["type"] == "mcq":
            normalized["options"] = [str(o) for o in (options or []) if str(o).strip()]
            normalized["correct_answer"] = str(item.get("correct_answer") or "").strip()
            marking_scheme = item.get("marking_scheme")
            if isinstance(marking_scheme, list):
                normalized["marking_scheme"] = [str(x).strip() for x in marking_scheme if str(x).strip()][:5]
            hint = str(item.get("hint") or "").strip()
            if hint:
                normalized["hint"] = hint
        else:
            normalized["max_marks"] = int(item.get("max_marks") or 10)
            marking_scheme = item.get("marking_scheme")
            if isinstance(marking_scheme, list):
                normalized["marking_scheme"] = [str(x).strip() for x in marking_scheme if str(x).strip()][:6]
        if normalized["question"]:
            coerced.append(normalized)
    return coerced

def _extract_code_blocks(text: str) -> list[dict[str, str]]:
    if not text:
        return []
    blocks: list[dict[str, str]] = []
    for m in re.finditer(r"```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```", text):
        blocks.append({
            "language": str(m.group(1) or "").strip().lower(),
            "code": str(m.group(2) or "").strip(),
        })
    return blocks

def _sanitize_mermaid_blocks(text: str) -> str:
    if not text:
        return ""

    def _fix_block(m: re.Match) -> str:
        lang = str(m.group(1) or "").strip().lower()
        body = str(m.group(2) or "")
        if lang != "mermaid":
            return m.group(0)

        fixed_lines: list[str] = []
        for line in body.splitlines():
            ln = line
            # STEP 1: Strip arrow labels first (e.g. -->|HTTP, FTP|> or -->|label|)
            # This must happen BEFORE the bare |> replacement to avoid partial corruption.
            ln = re.sub(r"-->\|[^|\n]*\|>?", "-->", ln)
            # STEP 2: Replace any remaining bare |> shorthand
            ln = ln.replace("|>", "-->")
            # STEP 3: Remove note/annotation syntax that Mermaid often rejects
            ln = re.sub(r"\bnote\s+(right|left|over)\s+of\b.*", "", ln, flags=re.IGNORECASE)
            fixed_lines.append(ln)
        fixed_body = "\n".join(fixed_lines).strip()
        return f"```mermaid\n{fixed_body}\n```"

    return re.sub(r"```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```", _fix_block, text)

def _ensure_code_fences(text: str) -> str:
    if not text:
        return text

    def _add_lang_for_plain_fences(src: str) -> str:
        if "```\n" not in src:
            return src

        def _infer_lang(code: str) -> str:
            body = str(code or "")
            if re.search(r"\b(public class|System\.out\.println|public static void main|private static)\b", body):
                return "java"
            if re.search(r"\b(def |class |import |from |if __name__ ==|print\()", body):
                return "python"
            return ""

        def _replace_block(m: re.Match) -> str:
            lang = str(m.group(1) or "").strip().lower()
            body = str(m.group(2) or "")
            if lang:
                return m.group(0)
            inferred = _infer_lang(body)
            return f"```{inferred}\n{body}```" if inferred else m.group(0)

        return re.sub(r"```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```", _replace_block, src)

    text = _add_lang_for_plain_fences(text)
    if "```" in text:
        if text.count("```") % 2 == 1:
            return text.rstrip() + "\n```"
        return text

    looks_python = bool(re.search(r"\b(def |class |import |from |if __name__ ==)", text))
    looks_java = bool(re.search(r"\b(public class|System\.out\.println|public static void main)\b", text))
    if looks_python:
        return f"```python\n{text.strip()}\n```"
    if looks_java:
        return f"```java\n{text.strip()}\n```"
    return text

def _has_unclosed_code_fence(text: str) -> bool:
    return str(text or "").count("```") % 2 == 1

def _ends_incomplete_sentence(text: str) -> bool:
    src = str(text or "").strip()
    if not src:
        return False
    if re.search(r"[.!?।]\s*$", src):
        return False
    # Explicit incomplete-ending characters
    if src[-1] in (':', ',', ';', '-', '(', '[', '{', '/', '`', '"', "'", '\\'):
        return True
    # LLM sometimes ends with a bare backslash escape
    if src.endswith("\\n") or src.endswith("\\"):
        return True
    return bool(re.search(r"\b(and|or|because|so|if|then|with|to|for|the|a|an|is|are|was|were)\s*$", src.lower()))

def _has_valid_terminal_ending(text: str) -> bool:
    cleaned = str(text or "").rstrip()
    if not cleaned:
        return False
    if cleaned.endswith("```"):
        return True
    return cleaned[-1] in [".", "?", "!", "।", "]", ")", '"', "'"]

def _needs_auto_continue(finish_reason: str, text: str) -> bool:
    cleaned = str(text or "")
    if len(cleaned.strip()) < 20:
        return True
    if not _has_valid_terminal_ending(cleaned):
        return True
    return (
        str(finish_reason or "").strip().lower() == "length"
        or _has_unclosed_code_fence(text)
        or _ends_incomplete_sentence(text)
    )

def _build_response_payload(answer: str, suggestions=None):
    """next_suggestions permanently removed — always returns []."""
    answer_clean = _hard_chop_next_suggestions(str(answer or ""))
    answer_clean = _ensure_code_fences(_sanitize_mermaid_blocks(answer_clean.strip()))
    code_blocks   = _extract_code_blocks(answer_clean)
    has_mermaid   = any(b["language"] == "mermaid" for b in code_blocks)
    has_code      = any(b["language"] not in ("", "mermaid") for b in code_blocks)
    return {
        "answer":          answer_clean,
        "next_suggestions": [],   # always empty — UI chips are gone
        "has_mermaid":     has_mermaid,
        "has_code":        has_code,
        "code_blocks":     code_blocks,
    }

def _get_subject_title(subject_code: str) -> str:
    for sem_map in SUBJECT_TITLES.values():
        if subject_code in sem_map:
            return sem_map[subject_code]
    return subject_code

def _get_unit1_points(subject_code: str):
    topics = SUBJECT_TOPICS.get(subject_code, [])
    if not topics:
        return ["Introduction", "Core Concepts", "Examples", "Quick Recap"]
    return topics[:4] if len(topics) >= 4 else topics + ["Quick Recap"]

BANNED_OPENERS = [
    "sure",
    "as an ai",
    "i understand",
    "i can",
    "certainly",
    "absolutely",
]

def _strip_banned_openers(text: str) -> str:
    raw = (text or "").strip()
    lower = raw.lower()
    for opener in BANNED_OPENERS:
        if lower.startswith(opener):
            trimmed = raw[len(opener):].lstrip(" ,:.-")
            return trimmed if trimmed else raw
    return raw

def _rotate_suggestion_style(session_id: Optional[int]) -> str:
    state = _get_session_state(session_id)
    idx = int(state.get("suggestion_style_idx") or 0) % 3
    state["suggestion_style_idx"] = (idx + 1) % 3
    return ["numeric", "alpha", "bullet"][idx]

def _format_suggestions(session_id: Optional[int], suggestions: list[str]) -> list[str]:
    style = _rotate_suggestion_style(session_id)
    formatted = []
    for i, s in enumerate(suggestions, start=1):
        if style == "numeric":
            formatted.append(f"{i}. {s}")
        elif style == "alpha":
            formatted.append(f"{chr(96 + i)}. {s}")
        else:
            formatted.append(f"• {s}")
    return formatted

def _finalize_reply_payload(session_id: Optional[int], payload: dict) -> dict:
    if not isinstance(payload, dict):
        return payload
    payload["answer"] = _strip_banned_openers(payload.get("answer", ""))
    payload["next_suggestions"] = []
    return payload

def _extract_score_percent(text: str) -> Optional[int]:
    raw = (text or "").lower()
    m = re.search(r"(\d{1,3})\s*%|\bscore\s*(\d{1,3})\b", raw)
    if not m:
        return None
    val = m.group(1) or m.group(2)
    try:
        num = int(val)
        return max(0, min(num, 100))
    except Exception:
        return None

def _short_words(text: str, min_words: int = 2, max_words: int = 4) -> str:
    tokens = [t for t in re.split(r"\s+", str(text or "").strip()) if t]
    if not tokens:
        return "New Chat"
    clipped = tokens[:max_words]
    if len(clipped) < min_words:
        clipped = (tokens + ["Chat"])[:min_words]
    return " ".join(clipped)

def _generate_short_chat_title(first_message: str) -> str:
    fallback = _short_words(first_message, 2, 4)
    prompt = (
        "Generate a VERY SHORT title for this conversation. MAXIMUM 2 to 4 words. "
        "Do not use quotes, punctuation, or generic prefixes like 'Chat about'. Just the core topic."
    )
    try:
        completion = client.chat.completions.create(
            model=SINGLE_CHAT_MODEL,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": str(first_message or "")[:250]},
            ],
            temperature=0.2,
            max_tokens=18,
        )
        raw = str(getattr(completion.choices[0].message, "content", "") or "").strip()
        raw = re.sub(r"[\"'`]+", "", raw)
        generated_title = _short_words(raw or fallback, 2, 4)
        chat_title = generated_title[:30] + '...' if len(generated_title) > 30 else generated_title
        return chat_title
    except Exception:
        chat_title = fallback[:30] + '...' if len(fallback) > 30 else fallback
        return chat_title

def _get_session_state(session_id: Optional[int]) -> dict:
    if not session_id:
        return {}
    return SESSION_STATE.setdefault(str(session_id), {"learning_path": None, "topics": []})

def _infer_user_gender(name: str, gender_field: Optional[str]) -> str:
    g = (gender_field or "").strip().lower()
    if g in {"female", "f", "woman", "girl"}:
        return "female"
    if g in {"male", "m", "man", "boy"}:
        return "male"

    name_l = (name or "").strip().lower()
    if any(name_l.endswith(s) for s in ("a", "i", "ee", "iya")):
        return "female"
    return "unknown"

# ...existing code...

def _get_salutation(name: str, gender: str) -> str:
    name_l = (name or "").strip().lower()
    if "saurav" in name_l:
        return "Ok Bro"
    if gender == "female":
        return random.choice(["Behen", "Scholar", "Pyari"])
    if gender == "male":
        return random.choice(["Bhai", "Buddy", "Dost"])
    return "Friend"  # Default fallback

# ...existing code...

def _maybe_salutation_prefix(name: str, gender: str) -> str:
    if random.random() > 0.2:
        return ""
    name_l = (name or "").strip().lower()
    if "saurav" in name_l:
        return random.choice(["Bhai", "Supreme Architect", "Coding Guru"])
    if gender == "female":
        return random.choice(["Behen", "Scholar"])
    if gender == "male":
        return random.choice(["Bhai", "Buddy"])
    return "Buddy"

def _is_basic_question(message: str) -> bool:
    msg = (message or "").strip().lower()
    if not msg:
        return False
    triggers = ["what is", "define", "meaning of", "full form", "expand", "basics of"]
    return any(t in msg for t in triggers) and len(msg.split()) <= 8

def _enforce_session_limit(db: Session, user_id: int, max_sessions: int = 20) -> None:
    sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.id.asc()).all()
    if len(sessions) <= max_sessions:
        return
    overflow = len(sessions) - max_sessions
    for s in sessions[:overflow]:
        db.query(ChatHistory).filter(ChatHistory.session_id == s.id).delete()
        db.delete(s)
    db.commit()

def _fuzzy_normalize_message(text: str) -> str:
    if not text:
        return text

    known: set[str] = set()
    for sem_map in SUBJECT_TITLES.values():
        for code, title in sem_map.items():
            known.add(str(code).lower())
            known.add(str(title).lower())
    for topics in SUBJECT_TOPICS.values():
        for topic in topics:
            known.add(str(topic).lower())

    words = text.split()
    fixed: list[str] = []
    for w in words:
        key = re.sub(r"[^a-zA-Z0-9\-]", "", w.lower())
        if not key or key in known:
            fixed.append(w)
            continue
        close = difflib.get_close_matches(key, known, n=1, cutoff=0.86)
        fixed.append(close[0] if close else w)
    return " ".join(fixed)

def _update_topic_buffer(session_id: Optional[int], subject_context: Any, user_message: str) -> None:
    state = _get_session_state(session_id)
    topics = list(state.get("topics") or [])

    candidates: list[str] = []
    if isinstance(subject_context, dict):
        for t in subject_context.get("topic_keywords") or []:
            if isinstance(t, str) and t.strip():
                candidates.append(t.strip())
        subject_code = str(subject_context.get("subject_code") or "").strip()
        if subject_code:
            candidates.append(subject_code)

    cleaned_msg = str(user_message or "").strip()
    if cleaned_msg and not candidates:
        candidates.append(cleaned_msg[:60])

    for t in candidates:
        if t in topics:
            topics.remove(t)
        topics.append(t)

    state["topics"] = topics[-5:]

def _get_last_topic(session_id: Optional[int]) -> Optional[str]:
    state = _get_session_state(session_id)
    topics = state.get("topics") or []
    return topics[-1] if topics else None

def _is_easter_egg_allowed(conversation_history, window: int = 15) -> bool:
    if not conversation_history:
        return True
    ai_seen = 0
    for msg in reversed(conversation_history):
        if msg.sender != "ai" or not msg.text:
            continue
        ai_seen += 1
        if "19 april" in msg.text.lower() or "april 19" in msg.text.lower():
            return ai_seen >= window
        if ai_seen >= window:
            return True
    return True

def get_ai_response(prompt=None, messages=None, models=None, session_state=None, session_id=None, **kwargs):
    """Groq single-model completion with strict auto-resume stitching."""
    if messages is None:
        messages = [{"role": "user", "content": str(prompt) if prompt is not None else ""}]

    if session_id is not None and session_state is not None:
        SESSION_STATE[str(session_id)] = session_state

    safe_messages = list(cast(list, messages))
    user_prompt = str(prompt or "").strip()
    if not user_prompt:
        for msg in reversed(safe_messages):
            if str(msg.get("role", "")).lower() == "user":
                user_prompt = str(msg.get("content", "") or "").strip()
                if user_prompt:
                    break

    kwargs["max_tokens"] = min(
        int(kwargs.get("max_tokens") or MAX_TOKENS),
        _choose_completion_budget(user_prompt, cast(Optional[list[dict[str, Any]]], safe_messages))
    )

    full_response = ""
    current_prompt = user_prompt
    last_response = None

    i = 0
    while i < 4:
        invoke_messages = list(safe_messages)
        if i > 0:
            if full_response.strip():
                invoke_messages.append({"role": "assistant", "content": full_response})
            invoke_messages.append({"role": "user", "content": current_prompt})

        try:
            response = client.chat.completions.create(
                model=SINGLE_CHAT_MODEL,
                messages=cast(Any, invoke_messages),
                **kwargs
            )
        except Exception as error:
            if _looks_like_provider_rate_limit(error):
                raise _build_provider_rate_limit_message(error) from error
            raise
        last_response = response
        response_text = str(getattr(response.choices[0].message, "content", "") or "")
        full_response += response_text

        finish_reason = str(getattr(response.choices[0], "finish_reason", "") or "").strip().lower()
        ended_abruptly = _needs_auto_continue(finish_reason, full_response)

        if ended_abruptly and i < 3:
            current_prompt = AUTO_CONTINUE_PROMPT
            i += 1
            continue
        break

    if full_response and full_response.count("```") % 2 == 1:
        full_response = full_response.rstrip() + "\n```"

    # Forceful cleanup before returning final response
    clean_response = full_response.split("Next suggestions:")[0].strip()
    if clean_response.startswith('{') and '"answer":' in clean_response:
        clean_response = clean_response.split('"answer":')[1].strip().strip('}').strip('"')

    if last_response is not None:
        cast(Any, last_response).choices[0].message.content = clean_response
        return last_response
    raise RuntimeError("AI response failed without a specific error.")


def _is_topic_switch(current_message: str, previous_messages: list) -> bool:
    """Detect if user is switching topics or just greeting."""
    greetings = ["hi", "hello", "hey", "sup", "yo", "namaste", "salaam", "hii", "hello!", "hi!"]
    current_lower = (current_message or "").lower().strip()
    
    if current_lower in greetings:
        return True
    
    if len(previous_messages) > 0:
        last_msg = previous_messages[-1].get('text', '').lower() if isinstance(previous_messages[-1], dict) else str(previous_messages[-1]).lower()
        curr_words = set(current_lower.split())
        last_words = set(last_msg.split())
        if len(last_words) > 0:
            similarity = len(curr_words & last_words) / max(len(curr_words), 1)
            if similarity < 0.15:  # Very different topic
                return True
    
    return False

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)

# Initialize EasyOCR reader (safe import)
reader = None
try:
    import easyocr
    reader = easyocr.Reader(['en', 'hi'])
except Exception:
    pass

try:
    import pytesseract
except Exception:
    pytesseract = None

def _extract_text_from_image_bytes(data: bytes) -> str:
    if not data:
        return ""
    try:
        image = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        return ""

    text = ""
    if reader is not None:
        try:
            parts = reader.readtext(image, detail=0)  # type: ignore[arg-type]
            if parts:
                text = "\n".join([str(p) for p in parts if str(p).strip()])
        except Exception:
            text = ""

    if not text and pytesseract is not None:
        try:
            text = pytesseract.image_to_string(image)
        except Exception:
            text = ""

    return (text or "").strip()

def _extract_text_from_pdf_bytes(data: bytes) -> str:
    if not data:
        return ""
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception:
        return ""

    try:
        reader_pdf = PdfReader(io.BytesIO(data))
        pages: list[str] = []
        for page in reader_pdf.pages[:30]:
            pages.append(str(page.extract_text() or "").strip())
        return "\n".join([p for p in pages if p]).strip()
    except Exception:
        return ""

# --- DASHBOARD AND SESSION ENDPOINTS ---

@app.get("/dashboard-stats")
def get_dashboard_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).all()
    total_sessions = len(sessions)
    
    last_subject: str = "N/A"
    if sessions:
        last_chat = db.query(ChatHistory).filter(ChatHistory.session_id == sessions[0].id).order_by(ChatHistory.id.desc()).first()
        if last_chat:
            last_text = getattr(cast(Any, last_chat), "text", None)
            last_subject = str(last_text)[:30] if last_text is not None else "N/A"
    
    return DashboardStats(
        total_sessions=total_sessions,
        last_subject=last_subject,
        study_hours=float(total_sessions * 0.5),
        avg_quiz_score=85.0,
        recent_activity="Last active 2 hours ago"
    )

@app.get("/debug/session-state")
def debug_session_state(
    session_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Development-only: inspect in-memory SESSION_STATE safely."""
    if os.getenv("ENV", "dev").lower() not in {"dev", "development", "local"}:
        raise HTTPException(status_code=403, detail="Debug endpoint disabled")

    # Optional: verify session ownership when session_id is provided
    if session_id is not None:
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        sid = str(session_id)
        state = SESSION_STATE.get(sid)
        return {
            "session_id": session_id,
            "state": state or {},
            "available_sessions": []
        }

    # Only return minimal snapshot for safety
    return {
        "available_sessions": list(SESSION_STATE.keys()),
        "count": len(SESSION_STATE)
    }

@app.get("/syllabus-progress")
def get_syllabus_progress(
    subject: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns syllabus completion % based on which subject topics appear in the user's chat history."""

    subject_code = (subject or "").strip().upper()

    if not subject_code:
        # Best-effort: infer from last user message (no LLM calls; uses existing heuristic extractor)
        last_user_msg = (
            db.query(ChatHistory)
            .join(ChatSession, ChatHistory.session_id == ChatSession.id)
            .filter(ChatSession.user_id == current_user.id)
            .filter(ChatHistory.sender == "user")
            .order_by(ChatHistory.id.desc())
            .first()
        )
        last_text = str(getattr(cast(Any, last_user_msg), "text", "") or "") if last_user_msg else ""
        ctx = extract_subject_context(last_text)
        inferred = str(ctx.get("subject_code") or "").strip().upper()
        if inferred and inferred != "UNKNOWN":
            subject_code = inferred

    topics = SUBJECT_TOPICS.get(subject_code, []) if subject_code else []
    total_topics = len(topics)

    if not subject_code or total_topics == 0:
        return {
            "subject": subject_code or None,
            "total_topics": total_topics,
            "covered_topics": [],
            "covered_count": 0,
            "completion_pct": 0.0,
        }

    history = (
        db.query(ChatHistory)
        .join(ChatSession, ChatHistory.session_id == ChatSession.id)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatHistory.id.desc())
        .limit(500)
        .all()
    )

    corpus = " ".join(
        [str(getattr(cast(Any, m), "text", "") or "") for m in reversed(history)]
    ).lower()

    covered_topics: list[str] = []
    for t in topics:
        tl = str(t).lower().strip()
        if not tl:
            continue
        if tl in corpus:
            covered_topics.append(str(t))

    covered_count = len(covered_topics)
    completion_pct = float((covered_count / total_topics) * 100.0) if total_topics else 0.0

    return {
        "subject": subject_code,
        "total_topics": total_topics,
        "covered_topics": covered_topics,
        "covered_count": covered_count,
        "completion_pct": completion_pct,
    }

@app.get("/study-roadmap/latest")
def get_latest_study_roadmap(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    roadmap = (
        db.query(StudyRoadmap)
        .filter(StudyRoadmap.user_id == current_user.id)
        .order_by(StudyRoadmap.id.desc())
        .first()
    )
    if not roadmap:
        return {"has_roadmap": False}

    raw_json = str(getattr(cast(Any, roadmap), "roadmap_json", "") or "")
    parsed = {}
    try:
        parsed = json.loads(raw_json) if raw_json else {}
    except Exception:
        parsed = {}

    days = parsed.get("days") if isinstance(parsed, dict) else []
    safe_days = days if isinstance(days, list) else []
    total = len(safe_days) or int(parsed.get("total_days", 0) or 0)
    completed = len([d for d in safe_days if isinstance(d, dict) and bool(d.get("completed"))])
    completion_pct = float((completed / total) * 100.0) if total > 0 else 0.0

    return {
        "has_roadmap": True,
        "id": getattr(cast(Any, roadmap), "id", None),
        "title": parsed.get("title") if isinstance(parsed, dict) else None,
        "subject": parsed.get("subject") if isinstance(parsed, dict) else None,
        "semester": parsed.get("semester") if isinstance(parsed, dict) else None,
        "duration_days": int(parsed.get("duration_days") or parsed.get("total_days") or 0),
        "days": safe_days,
        "total_days": total,
        "completed_days": completed,
        "completion_pct": completion_pct,
        "created_at": getattr(cast(Any, roadmap), "created_at", None),
    }


@app.post("/study-roadmap/accept")
def accept_study_roadmap(
    request: StudyRoadmapAcceptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ok = _persist_study_roadmap(
        db=db,
        user_id=int(getattr(cast(Any, current_user), "id", 0) or 0),
        subject=request.subject,
        semester=request.semester,
        duration_days=int(request.duration_days or 15),
        answer_text=request.roadmap_text,
    )
    if not ok:
        raise HTTPException(status_code=400, detail="Roadmap content is too short or invalid")
    return {"ok": True}


@app.get("/study-roadmap/history")
def get_study_roadmap_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(StudyRoadmap)
        .filter(StudyRoadmap.user_id == current_user.id)
        .order_by(StudyRoadmap.id.desc())
        .limit(100)
        .all()
    )

    grouped: dict[str, dict[str, list[dict[str, Any]]]] = {}
    for row in rows:
        parsed = {}
        raw_json = str(getattr(cast(Any, row), "roadmap_json", "") or "")
        try:
            parsed = json.loads(raw_json) if raw_json else {}
        except Exception:
            parsed = {}

        semester = str(parsed.get("semester") or "Unknown Semester")
        subject = str(parsed.get("subject") or getattr(cast(Any, row), "subject", None) or "Unknown Subject")

        item = {
            "id": getattr(cast(Any, row), "id", None),
            "title": str(parsed.get("title") or getattr(cast(Any, row), "title", None) or "Study Roadmap"),
            "duration_days": int(parsed.get("duration_days") or parsed.get("total_days") or 0),
            "created_at": parsed.get("created_at") or getattr(cast(Any, row), "created_at", None),
            "days": parsed.get("days") if isinstance(parsed.get("days"), list) else [],
        }
        grouped.setdefault(semester, {}).setdefault(subject, []).append(item)

    return {"groups": grouped}

@app.post("/apc/performance-report")
def generate_apc_performance_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).all()
    session_ids = [int(getattr(cast(Any, s), "id", 0) or 0) for s in sessions]
    chats = []
    if session_ids:
        chats = db.query(ChatHistory).filter(ChatHistory.session_id.in_(session_ids)).order_by(ChatHistory.id.asc()).all()

    total_messages = len(chats)
    eta_minutes = 1 if total_messages <= 120 else 2
    user_msgs = [c for c in chats if str(getattr(cast(Any, c), "sender", "")).lower() == "user"]
    ai_msgs = [c for c in chats if str(getattr(cast(Any, c), "sender", "")).lower() == "ai"]

    prompt = (
        "You are a performance analyzer for an IGNOU BCA student. "
        "Return plain Markdown with these sections: Progress Summary, Weak Areas, Latest Updates, Next 7-Day Action Plan. "
        "Keep it practical and realistic in Hinglish.\n\n"
        f"DATA: total_sessions={len(sessions)}, total_messages={total_messages}, "
        f"user_messages={len(user_msgs)}, ai_messages={len(ai_msgs)}"
    )
    completion = get_ai_response(messages=[{"role": "user", "content": prompt}], temperature=0.4)
    report_markdown = str(getattr(completion.choices[0].message, "content", "") or "").strip()

    highlights: list[str] = []
    for line in report_markdown.splitlines():
        t = str(line or "").strip(" -*\t")
        if not t:
            continue
        highlights.append(t)
        if len(highlights) >= 4:
            break

    payload = {
        "generated_at": datetime.utcnow().isoformat(),
        "eta_minutes": eta_minutes,
        "highlights": highlights,
        "report_markdown": report_markdown,
    }
    USER_PERFORMANCE_REPORTS[int(getattr(cast(Any, current_user), "id", 0) or 0)] = payload
    return payload

@app.get("/apc/performance-summary/latest")
def get_latest_apc_performance_summary(current_user: User = Depends(get_current_user)):
    user_id = int(getattr(cast(Any, current_user), "id", 0) or 0)
    return USER_PERFORMANCE_REPORTS.get(user_id, {
        "generated_at": None,
        "eta_minutes": 1,
        "highlights": [],
        "report_markdown": "",
    })

@app.get("/sessions")
def get_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ChatSession).filter(ChatSession.user_id == current_user.id).order_by(ChatSession.id.desc()).all()

# FIXED: Proper PUT endpoint to rename session
@app.put("/sessions/{session_id}")
def rename_session(
    session_id: int, 
    title: str, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        # Verify session belongs to current user
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id, 
            ChatSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if not title or len(title.strip()) == 0:
            raise HTTPException(status_code=400, detail="Title cannot be empty")
        
        # Update session title
        session_any = cast(Any, session)
        session_any.title = str(title.strip())
        db.commit()
        db.refresh(session)
        
        return {
            "message": "Session renamed successfully",
            "session_id": session_id,
            "new_title": str(session_any.title) if getattr(session_any, "title", None) is not None else ""
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error renaming session: {str(e)}")

# FIXED: Proper DELETE endpoint with cascade delete
@app.delete("/sessions/{session_id}")
def delete_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Verify session belongs to current user
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id, 
            ChatSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Delete all chat history associated with this session
        db.query(ChatHistory).filter(ChatHistory.session_id == session_id).delete()
        
        # Delete the session itself
        db.delete(session)
        db.commit()
        
        return {"message": "Session deleted successfully", "session_id": session_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting session: {str(e)}")

@app.get("/history")
def get_history(
    session_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # If session_id is provided, enforce ownership.
    if session_id is not None:
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        chats = db.query(ChatHistory).filter(ChatHistory.session_id == session_id).order_by(ChatHistory.id).all()
        return [{"id": c.id, "text": c.text, "sender": c.sender, "session_id": c.session_id} for c in chats]

    # No session_id: return a bounded recent history across all user's sessions (prevents 422 and supports exports).
    session_ids = [sid for (sid,) in db.query(ChatSession.id).filter(ChatSession.user_id == current_user.id).all()]
    if not session_ids:
        return []

    chats_desc = db.query(ChatHistory).filter(
        ChatHistory.session_id.in_(session_ids)
    ).order_by(ChatHistory.id.desc()).limit(500).all()
    chats = list(reversed(chats_desc))
    return [{"id": c.id, "text": c.text, "sender": c.sender, "session_id": c.session_id} for c in chats]

# --- ENHANCED CHAT ENDPOINT ---

@app.post("/chat")
def chat_endpoint(request: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    requested_mode = str(getattr(request, "mode", "auto") or "auto").strip().lower()
    is_lite_mode = requested_mode in {"lite", "fast", "quick"}

    user_message = request.message[:2200] if is_lite_mode else request.message[:4000]
    is_creator_user = bool(getattr(current_user, "is_creator", 0))

    # Session handling
    session_id = getattr(request, 'session_id', None)
    if not session_id:
        session = ChatSession(user_id=current_user.id, title=_generate_short_chat_title(user_message))
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = session.id

    # Save user message
    db.add(ChatHistory(session_id=session_id, sender="user", text=user_message))
    db.commit()

    # Build history for context
    history = db.query(ChatHistory).filter(ChatHistory.session_id == session_id).order_by(ChatHistory.id).all()

    # Frenzy mode controls (frontend listens to theme_override payload)
    if _detect_frenzy_reset(user_message):
        reset_text = "Frenzy mode disabled. Theme restored."
        db.add(ChatHistory(session_id=session_id, sender="ai", text=reset_text))
        db.commit()
        payload = _build_response_payload(reset_text)
        payload["session_id"] = session_id
        payload["mode"] = "lite" if is_lite_mode else requested_mode
        payload["theme_override"] = None
        payload["active"] = False
        payload["persona"] = "frenzy"
        payload["reset_label"] = "Restore"
        return _finalize_reply_payload(session_id, payload)

    if _detect_frenzy_trigger(user_message):
        frenzy_text = "Frenzy mode activated."
        db.add(ChatHistory(session_id=session_id, sender="ai", text=frenzy_text))
        db.commit()
        payload = _build_response_payload(frenzy_text)
        payload["session_id"] = session_id
        payload["mode"] = "lite" if is_lite_mode else requested_mode
        payload["theme_override"] = "melancholic"
        payload["active"] = True
        payload["persona"] = "frenzy"
        payload["message"] = FRENZY_POEM
        payload["speed_ms"] = 60
        payload["reset_label"] = "Restore"
        return _finalize_reply_payload(session_id, payload)

    persona_trigger = detect_persona_trigger(user_message)
    easter_egg_allowed = _is_easter_egg_allowed(history, window=15)

    if persona_trigger == "jiya":
        system_prompt = get_jiya_prompt(is_creator_user)
    elif persona_trigger == "april19" and easter_egg_allowed:
        system_prompt = get_april_19_prompt(is_creator_user)
    else:
        system_prompt = get_saurav_prompt(is_creator_user)

    if is_lite_mode:
        system_prompt += (
            "\n\nLITE MODE ACTIVE: keep answer concise, direct, and exam-focused. "
            "Avoid long storytelling. Use short bullets where possible."
        )

    messages = [{"role": "system", "content": system_prompt}]
    history_window = 6 if is_lite_mode else 10
    for h in history[-history_window:]:
        role = "user" if h.sender == "user" else "assistant"
        messages.append({"role": role, "content": h.text})

    # Get AI response
    try:
        response = get_ai_response(
            messages=messages,
            temperature=0.45 if is_lite_mode else 0.7,
            max_tokens=520 if is_lite_mode else 1400,
        )
        ai_text = str(getattr(response.choices[0].message, "content", "") or "").strip()
    except ProviderRateLimitError as e:
        raise HTTPException(status_code=429, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Save AI response
    db.add(ChatHistory(session_id=session_id, sender="ai", text=ai_text))
    db.commit()

    payload = _build_response_payload(ai_text)
    payload["session_id"] = session_id
    payload["mode"] = "lite" if is_lite_mode else requested_mode
    return _finalize_reply_payload(session_id, payload)


@app.post("/upload-notes-ocr")
async def upload_notes_ocr(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    try:
        data = await file.read()
        extracted = _extract_text_from_image_bytes(data)
        if not extracted.strip():
            return {
                "filename": file.filename,
                "points": [],
                "extracted_text": "",
                "message": "No readable text found in uploaded file.",
            }

        prompt = (
            "Extract concise revision key points from the following OCR text. "
            "Return ONLY valid JSON array of short strings, max 12 items.\n\n"
            f"OCR_TEXT:\n{extracted[:9000]}"
        )
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.25,
            max_tokens=700,
        )
        raw_text = str(getattr(completion.choices[0].message, "content", "") or "")
        parsed = _safe_json_loads(raw_text)

        points: List[str] = []
        if isinstance(parsed, list):
            points = [str(p).strip() for p in parsed if str(p).strip()]
        elif isinstance(parsed, dict):
            maybe_points = parsed.get("points")
            if isinstance(maybe_points, list):
                points = [str(p).strip() for p in maybe_points if str(p).strip()]

        if not points:
            # Safe fallback from extracted text when model output is malformed.
            lines = [ln.strip(" -•\t") for ln in extracted.splitlines() if ln.strip()]
            points = lines[:8]

        return {
            "filename": file.filename,
            "points": points[:12],
            "extracted_text": extracted[:4000],
        }
    except ProviderRateLimitError as e:
        raise HTTPException(status_code=429, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR notes processing failed: {str(e)}")


@app.post("/apc/ocr-quiz")
async def apc_ocr_quiz(
    file: UploadFile = File(...),
    remarks: str = Form(default=""),
    current_user: User = Depends(get_current_user),
):
    try:
        data = await file.read()
        extracted = _extract_text_from_image_bytes(data)
        if not extracted.strip():
            raise HTTPException(status_code=400, detail="No readable text found in uploaded image.")

        prompt = (
            "Create an exam-style quiz in markdown from the OCR text below. "
            "Output should include: heading, 8 MCQs with 4 options each, and an answer key at the end. "
            "Keep language Hinglish-friendly and concise.\n\n"
            f"REMARKS: {remarks or 'None'}\n\n"
            f"OCR_TEXT:\n{extracted[:9000]}"
        )
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=1400,
        )
        quiz_md = str(getattr(completion.choices[0].message, "content", "") or "").strip()

        if not quiz_md:
            quiz_md = "### OCR Quiz\n\nUnable to generate quiz right now. Please retry with a clearer image."

        return {
            "quiz_markdown": quiz_md,
            "extracted_text": extracted[:4000],
            "filename": file.filename,
        }
    except ProviderRateLimitError as e:
        raise HTTPException(status_code=429, detail=e.message)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"APC OCR quiz failed: {str(e)}")


@app.post("/explain-mcq")
def explain_mcq(
    request: MCQExplainRequest,
    current_user: User = Depends(get_current_user),
):
    prompt = (
        "Explain this MCQ in simple Hinglish with clear reasoning. "
        "Provide: why correct option is right, why others are wrong, and one quick memory trick.\n\n"
        f"Question: {request.question}\n"
        f"Options: {request.options}\n"
        f"Correct Answer: {request.correct_answer}\n"
        f"Subject: {request.subject or 'N/A'} | Semester: {request.semester or 'N/A'}"
    )
    try:
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.35,
            max_tokens=800,
        )
        text = str(getattr(completion.choices[0].message, "content", "") or "").strip()
        return {"explanation": text or "Explanation not available."}
    except ProviderRateLimitError as e:
        raise HTTPException(status_code=429, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MCQ explanation failed: {str(e)}")


@app.post("/generate-quiz", response_model=List[QuizQuestion])
def generate_quiz(
    request: QuizRequest,
    current_user: User = Depends(get_current_user),
):
    count = max(1, min(int(request.count or 15), 50))
    prompt = (
        f"Generate exactly {count} IGNOU BCA MCQs for semester {request.semester}, subject {request.subject}. "
        "Return ONLY valid JSON array with this schema: "
        '[{"question":"...","options":["A","B","C","D"],"correct_answer":"..."}]'
    )
    try:
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=2200,
        )
        raw_text = str(getattr(completion.choices[0].message, "content", "") or "")
        parsed = _safe_json_loads(raw_text)

        if isinstance(parsed, dict):
            parsed = parsed.get("questions", [])
        if not isinstance(parsed, list):
            raise ValueError("Quiz payload is not a list")

        normalized: List[QuizQuestion] = []
        for item in parsed:
            if not isinstance(item, dict):
                continue
            question = str(item.get("question", "")).strip()
            options = item.get("options", [])
            correct_answer = str(item.get("correct_answer", "")).strip()
            if not question:
                continue
            if not isinstance(options, list):
                options = []
            option_values = [str(opt).strip() for opt in options if str(opt).strip()]
            if len(option_values) < 2:
                continue
            if not correct_answer:
                correct_answer = option_values[0]
            normalized.append(
                QuizQuestion(
                    question=question,
                    options=option_values[:6],
                    correct_answer=correct_answer,
                )
            )

        if not normalized:
            raise ValueError("No valid quiz questions generated")

        return normalized[:count]
    except ProviderRateLimitError as e:
        raise HTTPException(status_code=429, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")


@app.post("/generate-exam")
def generate_exam(
    request: MixedExamRequest,
    current_user: User = Depends(get_current_user),
):
    mcq_count = max(1, min(int(request.mcq_count or 12), 40))
    subjective_count = max(0, min(int(request.subjective_count or 0), 20))

    # Backward-compatible behavior: frontend exam pages expect MCQ list.
    quiz_items = generate_quiz(
        QuizRequest(subject=request.subject, semester=request.semester, count=mcq_count),
        current_user=current_user,
    )

    result = [
        {
            "question": q.question,
            "options": q.options,
            "correct_answer": q.correct_answer,
            "type": "mcq",
            "subject": request.subject,
            "semester": request.semester,
        }
        for q in quiz_items
    ]

    if subjective_count > 0:
        prompt = (
            f"Generate exactly {subjective_count} IGNOU BCA subjective questions for semester {request.semester}, "
            f"subject {request.subject}. Return ONLY valid JSON array with schema: "
            '[{"question":"...","max_marks":10,"model_answer":"..."}]'
        )
        try:
            completion = get_ai_response(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.45,
                max_tokens=1800,
            )
            raw_text = str(getattr(completion.choices[0].message, "content", "") or "")
            parsed = _safe_json_loads(raw_text)
            if isinstance(parsed, dict):
                parsed = parsed.get("questions", [])
            if isinstance(parsed, list):
                for item in parsed[:subjective_count]:
                    if not isinstance(item, dict):
                        continue
                    question = str(item.get("question", "")).strip()
                    if not question:
                        continue
                    max_marks = int(item.get("max_marks", 10) or 10)
                    model_answer = str(item.get("model_answer", "")).strip()
                    result.append(
                        {
                            "question": question,
                            "type": "subjective",
                            "max_marks": max(2, min(max_marks, 20)),
                            "model_answer": model_answer,
                            "subject": request.subject,
                            "semester": request.semester,
                        }
                    )
        except Exception:
            # Non-fatal: exam can still continue with MCQ-only set.
            pass

    return result


@app.post("/explain-question")
def explain_question(
    request: ExplainQuestionRequest,
    current_user: User = Depends(get_current_user),
):
    prompt = (
        "Explain the question in simple Hinglish. Keep it exam-focused and concise.\n"
        f"Question: {request.question_text}\n"
        f"Correct answer: {request.correct_answer}\n"
        f"User answer: {request.user_answer or 'Not provided'}"
    )
    try:
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.35,
            max_tokens=700,
        )
        text = str(getattr(completion.choices[0].message, "content", "") or "").strip()
        return {"explanation": text or "Explanation not available."}
    except ProviderRateLimitError as e:
        raise HTTPException(status_code=429, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explain failed: {str(e)}")


@app.post("/grade-subjective", response_model=SubjectiveGradeResponse)
def grade_subjective(
    request: SubjectiveGradeRequest,
    current_user: User = Depends(get_current_user),
):
    max_marks = max(1, min(int(request.max_marks or 10), 20))
    prompt = (
        "You are an IGNOU evaluator. Grade the answer and return ONLY valid JSON with keys: "
        "score, max_marks, feedback, model_answer, missed_points, suggested_keywords, strengths, improvements.\n"
        f"Subject: {request.subject}\n"
        f"Semester: {request.semester}\n"
        f"Question: {request.question}\n"
        f"Student answer: {request.answer}\n"
        f"Max marks: {max_marks}"
    )
    try:
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.25,
            max_tokens=1100,
        )
        raw_text = str(getattr(completion.choices[0].message, "content", "") or "")
        parsed = _safe_json_loads(raw_text)
        if not isinstance(parsed, dict):
            raise ValueError("Invalid grading payload")

        score = int(parsed.get("score", 0) or 0)
        score = max(0, min(score, max_marks))

        def _as_str_list(value: Any) -> List[str]:
            if isinstance(value, list):
                return [str(v).strip() for v in value if str(v).strip()][:8]
            if isinstance(value, str) and value.strip():
                return [value.strip()]
            return []

        return SubjectiveGradeResponse(
            score=score,
            max_marks=max_marks,
            feedback=str(parsed.get("feedback", "Evaluation completed.")).strip(),
            model_answer=str(parsed.get("model_answer", "")).strip(),
            missed_points=_as_str_list(parsed.get("missed_points")),
            suggested_keywords=_as_str_list(parsed.get("suggested_keywords")),
            strengths=_as_str_list(parsed.get("strengths")),
            improvements=_as_str_list(parsed.get("improvements")),
        )
    except ProviderRateLimitError as e:
        raise HTTPException(status_code=429, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Subjective grading failed: {str(e)}")

@app.post("/api/generate-study-plan", response_model=StudyPlanResponse)
async def generate_study_plan(request: StudyPlanRequest):
    prompt = (
        f"Generate a study plan for the following subjects: {request.subjects}. "
        f"The plan should span {request.days_left} days, with {request.daily_hours} hours per day. "
        "Return the plan as a JSON object with the following schema: "
        '{"study_plan": [{"day": 1, "focus_subject": "Subject", "topics_to_cover": ["Topic 1"], "allocated_hours": 2}]}'
    )
    try:
        response = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=1000,
        )
        raw_text = str(getattr(response.choices[0].message, "content", "") or "")
        parsed = _safe_json_loads(raw_text)
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    # Read PORT from env (Azure: WEBSITES_PORT, local: PORT, or default 8000)
    port = int(os.getenv("PORT") or os.getenv("WEBSITES_PORT") or 8000)
    host = "0.0.0.0"
    print(f"[BCABuddy] Starting FastAPI on {host}:{port}")
    print(f"[BCABuddy] Swagger UI: http://{host}:{port}/docs")
    print(f"[BCABuddy] OpenAPI: http://{host}:{port}/openapi.json")
    uvicorn.run("main:app", host=host, port=port, log_level="info")

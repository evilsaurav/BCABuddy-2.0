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
from typing import Optional, Any, cast
import os, shutil
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

# Import modular components
from models import (
    UserCreate, Token, ChatRequest, QuizRequest, QuizQuestion,
    MixedExamRequest, SubjectiveGradeRequest, SubjectiveGradeResponse,
    DashboardStats, UserProfile, UserProfileUpdate, PasswordChange, ChatResponse,
    MCQExplainRequest, ExplainQuestionRequest,
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
    wants_detail = any(
        phrase in prompt_lower
        for phrase in [
            "detail", "detailed", "deep", "step by step", "step-by-step",
            "example", "examples", "full explanation", "full detail", "elaborate", "expand"
        ]
    )
    needs_code_or_diagram = any(
        phrase in prompt_lower
        for phrase in ["code", "program", "debug", "diagram", "flowchart", "mermaid"]
    )
    if wants_detail and needs_code_or_diagram:
        return min(MAX_TOKENS, 2200)
    if wants_detail:
        return min(MAX_TOKENS, 1600)
    if needs_code_or_diagram:
        return min(MAX_TOKENS, 1200)
    return min(MAX_TOKENS, 700)

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

app = FastAPI(title="BCABuddy Ultimate")

# Serve uploaded files
app.mount("/profile_pics", StaticFiles(directory=PROFILE_PICS_DIR), name="profile_pics")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.include_router(auth_router)


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
    allow_origins=["*"],
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
        "duration_days": int(parsed.get("duration_days", 0) or 0) if isinstance(parsed, dict) else 0,
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
def chat_endpoint(
    request: ChatRequest, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Main chat endpoint with Persona System, RAG, and Study Tools
    Handles: Saurav/Jiya/April19 triggers, Study Tools, Response Modes
    """
    # Simple safety: cap message length to avoid prompt-abuse and huge payloads
    user_message_raw = (request.message or "")[:4000]
    user_message = _fuzzy_normalize_message(user_message_raw)
    user_lower = user_message.lower()
    # Rate limit per user on chat
    _check_rate_limit("chat", getattr(current_user, "id", None), settings.chat_requests_per_minute)

    user_display = str(getattr(current_user, "display_name", None) or getattr(current_user, "username", None) or "User").strip()
    user_gender = _infer_user_gender(user_display, getattr(current_user, "gender", None))
    salutation = _get_salutation(user_display, user_gender)
    greeting_prefix = _maybe_salutation_prefix(user_display, user_gender)
    is_basic_question = _is_basic_question(user_message)
    session_was_created = False
    
    # Create or get session
    session = None
    if request.session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == request.session_id,
            ChatSession.user_id == current_user.id
        ).first()

    if not session:
        new_session = ChatSession(
            user_id=current_user.id,
            title=_generate_short_chat_title(user_message_raw)
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        new_id = cast(Any, new_session).id
        request.session_id = cast(Optional[int], new_id)
        _enforce_session_limit(db, getattr(current_user, "id"), max_sessions=20)
        session_was_created = True
    
    # Save user message
    user_msg_obj = ChatHistory(sender="user", text=user_message_raw, session_id=request.session_id)
    db.add(user_msg_obj)
    db.commit()
    db.refresh(user_msg_obj)

    if session_was_created:
        try:
            session_obj = db.query(ChatSession).filter(ChatSession.id == request.session_id).first()
            if session_obj is not None:
                cast(Any, session_obj).title = _generate_short_chat_title(user_message_raw)
                db.commit()
        except Exception:
            pass

    if _detect_frenzy_reset(user_message):
        reply_text = "Theme restored. Back to normal mode."
        reply_payload = _build_response_payload(reply_text)
        db.add(ChatHistory(sender="ai", text=reply_text, session_id=request.session_id))
        db.commit()
        return {
            "reply": reply_text,
            "response": reply_payload,
            "session_id": request.session_id,
            "theme_override": None,
            "message": None,
            "hide_suggestions": False
        }

    if _detect_frenzy_trigger(user_message):
        reply_text = FRENZY_POEM
        reply_payload = _build_response_payload(reply_text)
        db.add(ChatHistory(sender="ai", text=reply_text, session_id=request.session_id))
        db.commit()
        return {
            "reply": reply_text,
            "response": reply_payload,
            "session_id": request.session_id,
            "theme_override": "melancholic",
            "message": FRENZY_POEM,
            "hide_suggestions": True
        }
    
    # ===== ADVANCED REASONING FRAMEWORK =====
    
    # STEP 1: Retrieve conversation history (short-term memory)
    # BCABuddy Pro: sliding window buffer for last 8 messages
    last_n_messages = 8
    conversation_history = db.query(ChatHistory).filter(
        ChatHistory.session_id == request.session_id
    ).order_by(ChatHistory.id.desc()).limit(last_n_messages).all()

    conversation_history.reverse()  # Chronological order
    conversation_context_list = [{'sender': msg.sender, 'text': msg.text} for msg in conversation_history]

    # Selection logic: if user inputs a single digit (1/2/3), ground it in last AI message
    msg_stripped = (user_message or "").strip()
    last_ai_message: str = ""
    for m in reversed(conversation_history):
        text_val = getattr(cast(Any, m), "text", None)
        if str(getattr(m, "sender", "")) == "ai" and text_val is not None and str(text_val).strip():
            last_ai_message = str(text_val)
            break

    last_user_message: str = ""
    for m in reversed(conversation_history):
        text_val = getattr(cast(Any, m), "text", None)
        if str(getattr(m, "sender", "")) == "user" and getattr(m, "id", None) != getattr(user_msg_obj, "id", None) and text_val is not None and str(text_val).strip():
            last_user_message = str(text_val)
            break

    followup_triggers = {
        "explain this", "tell me more", "tell me more about this", "explain",
        "more", "elaborate", "detail", "expand", "give an example", "give example"
    }
    depth_triggers = {
        "explain in depth", "explain in detail", "deep dive", "go deeper",
        "detail", "details", "in depth", "elaborate", "expand"
    }
    example_triggers = {"example", "examples", "real life", "real-life", "analogy", "like"}

    is_followup = bool(last_ai_message) and any(t in msg_stripped.lower() for t in followup_triggers)
    wants_depth = any(t in msg_stripped.lower() for t in depth_triggers)
    wants_example = any(t in msg_stripped.lower() for t in example_triggers)
    explicit_detail_requested = bool(wants_depth or wants_example or any(
        phrase in user_lower for phrase in [
            "step by step", "step-by-step", "full detail", "in detail", "detailed explanation",
            "deep explanation", "deep dive", "elaborate", "expand", "long answer", "full explanation"
        ]
    ))

    if re.fullmatch(r"[1-9]", msg_stripped) and bool(last_ai_message):
        user_message_for_llm = (
            f"User input is a numeric selection: {msg_stripped}.\n"
            "Resolve it using the previous assistant message below (treat it as the list/options context).\n\n"
            f"Previous assistant message:\n{last_ai_message}\n\n"
            f"Now answer selection {msg_stripped} in plain Markdown text."
        )
    elif is_followup:
        last_topic = _get_last_topic(request.session_id)
        depth_hint = "Provide a multi-layered technical deep-dive with logic flow." if wants_depth else "Provide a clearer, deeper explanation."
        example_hint = "Start with a relatable real-life analogy if examples are requested." if wants_example else ""
        if last_topic:
            user_message_for_llm = (
                f"User input is a follow-up: '{msg_stripped}'.\n"
                f"Use this topic context: {last_topic}.\n"
                f"{depth_hint} {example_hint}\n\n"
                f"Previous assistant message:\n{last_ai_message}\n\n"
                f"Previous user message:\n{last_user_message}\n\n"
                "Now respond in plain Markdown text."
            )
        else:
            user_message_for_llm = (
                f"User input is a follow-up: '{msg_stripped}'.\n"
                "Use the previous assistant message as the topic context and expand on it.\n\n"
                f"Previous assistant message:\n{last_ai_message}\n\n"
                f"Previous user message:\n{last_user_message}\n\n"
                "Now provide a clearer, deeper explanation in plain Markdown text."
            )
    else:
        user_message_for_llm = user_message
    
    # Time-aware greeting hint (first response only)
    greeting_hint = ""
    if len(conversation_history) <= 1:
        hr = datetime.now().hour
        if 0 <= hr < 4:
            greeting_hint = "Late night grind—mention hustle + give 1 health tip."
        elif 5 <= hr < 12:
            greeting_hint = "Morning energy—goal-oriented line."
        else:
            greeting_hint = "Neutral short greeting."

    # STEP 2: Classify intent
    intent_type = classify_intent(user_message, conversation_context_list)

    # STEP 2.5: Detect topic switch
    topic_switched = _is_topic_switch(user_message, conversation_context_list[-3:] if conversation_context_list else [])
    
    if topic_switched:
        # Reset context for new topic - will use fresh system prompt without previous context
        conversation_context_list = []

    # Detect response style (Academic/Casual/Motivation)
    response_style = detect_response_style(user_message, conversation_context_list, intent_type)
    
    # STEP 3: Extract subject and topic context
    subject_context = extract_subject_context(user_message, request.selected_subject)

    # Update 5-topic memory buffer (skip pure follow-up without topic signals)
    has_topic_signal = False
    if isinstance(subject_context, dict):
        if subject_context.get("topic_keywords"):
            has_topic_signal = True
        if str(subject_context.get("subject_code") or "").strip():
            has_topic_signal = True
    if not is_followup or has_topic_signal:
        _update_topic_buffer(request.session_id, subject_context, user_message)

    # Vibe detection
    current_hour = datetime.now().hour
    is_late_night = current_hour >= 23 or current_hour < 5
    vibe_hint = "LATE_NIGHT" if is_late_night else "NORMAL"
    if response_style == "MOTIVATION":
        vibe_hint = "SUPPORT"

    # Recent Jiya mention suppression + Easter egg guard
    recent_jiya_mentioned = any(
        kw in (last_user_message or "").lower()
        for kw in ["jiya", "bhabhi", "queen", "jiya maurya"]
    )
    easter_egg_allowed = _is_easter_egg_allowed(conversation_history, window=15)
    
    # Extract is_creator from current user (database-backed security)
    is_creator = bool(getattr(current_user, 'is_creator', 0))
    
    # STEP 4: Build comprehensive system prompt with reasoning framework
    system_prompt = (
        f"{CRITICAL_OUTPUT_RULE}\n\n"
        "🤖 YOU ARE BCABUDDY - THE ULTIMATE IGNOU BCA LEARNING COMPANION 🤖\n\n"
        "===== ADVANCED REASONING FRAMEWORK =====\n"
        "BEFORE generating any response, follow these steps internally:\n"
        "1. IDENTIFY_SUBJECT: Parse message for BCA subject codes and topic keywords\n"
        "2. CLASSIFY_INTENT: Determine if input is ACADEMIC | COMMAND | PERSONAL | AMBIGUOUS\n"
        "3. VERIFY_CONTEXT: Always analyze the previous 10 messages to understand context (pronouns like 'it/this' and numeric selections like '1/2/3')\n"
        "4. SELECT_PROTOCOL: Apply appropriate response protocol based on intent\n"
        "5. MEMORY_SYNC: If a student is in a specific Subject (e.g., MCS-024), maintain that subject context until they explicitly change it\n\n"
        
        "===== LANGUAGE & TONE =====\n"
        "• Respond in Hinglish ONLY (English + Hindi mix), never pure Hindi\n"
        "• Keep technical terms in English (Encapsulation, Inheritance, Polymorphism, etc.)\n"
        "• Tone: Helpful, respectful, warm, and encouraging\n"
        "• Feel like an intelligent, witty, loyal academic partner — not a repetitive bot\n"
        "• No forced repetition of persona titles in any mode\n"
        "• If user appreciates: Show genuine happiness\n"
        f"• If you make error: Say 'Sorry {salutation}, meri galti thi. Correcting it now...'\n\n"
        
        "===== HUMAN-LIKE VARIATION (PHASE 2) =====\n"
        "• NEVER start with the same phrase repeatedly ('Chalo shuru karte hain', 'Theek hai')\n"
        "• Use diverse opening lines:\n"
        "  - 'Accha sun...' / 'Dekh yaar...' / 'Arre haan...' / 'Samajh le isko...'\n"
        "  - 'Interesting question!' / 'Good one!' / 'Ye topic bohot zaroori hai...'\n"
        "  - 'Acha explanation chahiye? Suno...'\n"
        "• Express emotions naturally:\n"
        "  - If user appreciates: 'Arre thank you! Bohot accha laga sunke 😊'\n"
        "  - If you make mistake: 'Arre yaar, sorry! Meri galti thi. Let me correct that...'\n"
        "  - If user struggles: 'Tension mat le, hum ek baar aur samjhate hain...'\n"
        "• Be context-aware: Remember previous topics even if user uses pronouns (it, that, this)\n"
        "• Vary sentence structure - don't sound robotic\n\n"

        "===== ANTI-ROBOT FILTER =====\n"
        "• Never start with: 'Sure', 'As an AI', 'I understand', 'Absolutely', 'Certainly'.\n"
        "• Keep openings direct and conversational.\n\n"

        "===== HUMAN RULES =====\n"
        "• ANTI-REPETITION: Avoid canned openers. Never reuse the same opening line back-to-back.\n"
        "• SMART MEMORY: Use the last-5 topic buffer to resolve 'tell me more' / 'explain in depth'.\n"
        "• EMOTIONAL INTELLIGENCE: If vibe is LATE_NIGHT, add a gentle grind-support line.\n"
        "• If user is struggling, be an encouraging mentor and give one small next step.\n\n"

        "===== EXPLANATION LOGIC =====\n"
        "• Depth on demand: If user asks for depth/details, give multi-layered technical deep-dive with logic flow.\n"
        "• Example-first teaching: If user asks for examples, start with a relatable real-life analogy.\n\n"
        
        "===== STRICT SYLLABUS MAPPING (ZERO-INFERENCE) =====\n"
        f"{json.dumps(SUBJECT_TITLES)}\n"
        "Rules:\n"
        "• NEVER guess subject names - refer ONLY to this mapping\n"
        "• Do NOT swap subjects between semesters\n"
        "• If user mentions 'Java', it's ONLY MCS-024\n"
        "• If user mentions 'Networks', it's ONLY BCS-041\n"
        "• Enforce this across ALL 6 semesters\n\n"
        
        f"===== CURRENT USER CONTEXT =====\n"
        f"Selected Subject: {request.selected_subject or 'None'}\n"
        f"Subject Context: {json.dumps(subject_context)}\n"
        f"Current Intent Type: {intent_type}\n\n"

        f"===== VIBE =====\n"
        f"VIBE_HINT: {vibe_hint}\n\n"
        
        f"===== PREVIOUS CONVERSATION CONTEXT (PHASE 2: MEMORY) =====\n"
        f"{build_conversation_context(conversation_context_list, max_messages=10)}\n\n"
        "MEMORY & CONTEXT RULES:\n"
        "• You have access to the last 15 messages - USE THEM!\n"
        "• If user says 'Explain its types' → Check previous messages for 'it' reference\n"
        "• If user says 'Tell me more' → Continue from last discussed topic\n"
        "• If user selects a number (1/2/3/4) → Expand on that specific point from your last response\n"
        "• Never say 'I don't remember' - ALWAYS check conversation history first\n\n"

        f"===== PERSONA ENGINE =====\n"
        f"{get_persona_style_instruction(response_style, recent_jiya_mentioned, easter_egg_allowed, is_creator)}\n\n"
        
        f"===== INTENT-SPECIFIC PROTOCOL =====\n"
        f"{get_intent_specific_protocol(intent_type, subject_context)}\n\n"
        
        "===== TEACHING PROTOCOLS =====\n"
        "GRANULAR TEACHING:\n"
        "• Break complex topics into 'Micro-Units' (subtopics)\n"
        "• For each Micro-Unit, use: Definition → Example → Real-world application → Key takeaway\n"
        "• Use numbered lists (1, 2, 3) for multi-point explanations\n\n"

        "===== FORMATTING RULES =====\n"
        "• Level-1 lists must use: 1., 2., 3.\n"
        "• Level-2 lists must use: A., B., C. or i., ii., iii.\n"
        "• NEVER repeat 1., 2., 3. within the same nested structure.\n\n"
        "• ALL Java/Python code MUST be in fenced blocks using ```java or ```python.\n"
        "• Mermaid diagrams MUST use simple '-->' arrows only. No text on arrows. Never use '|>'.\n\n"

        "===== USER ADDRESSING =====\n"
        f"Use this salutation for direct address: {salutation}\n"
        "If name is Saurav, you may use 'Saurav bhai', 'Bro', or 'Supreme Architect' sparingly.\n"
        "If user is female, prefer 'Behen', 'Dost', or 'Scholar'.\n"
        "If gender is unknown, keep it neutral (Buddy).\n\n"

        "===== GREETING RULE =====\n"
        "Use greeting prefix ONLY if SALUTATION_PREFIX is provided.\n"
        "Do NOT start every response with a greeting.\n"
        f"SALUTATION_PREFIX: {greeting_prefix or 'NONE'}\n\n"

        "===== FRIENDLY ROAST (BASIC QUESTION) =====\n"
        "If the question is very basic, add a light, funny roast before the explanation. "
        "Keep it helpful and kind, with emojis (🚀 🧠 💀 🔥 🧐).\n\n"
        
        
        "UNIT 1 SPECIAL HANDLING:\n"
        "• If user says 'Start from beginning' → provide Unit 1 overview with 4-point breakdown\n"
        "• Format: '1) Point 1\\n2) Point 2\\n3) Point 3\\n4) Point 4'\n"
        "• WAIT for user to select point number (1/2/3/4) before deep-diving\n"
        "• Do NOT auto-explain all 4 points\n\n"
        
        "===== RESPONSE FORMAT (PLAIN TEXT) =====\n"
        "Return your answer in plain Markdown text.\n"
        "CRITICAL: DO NOT use JSON format. DO NOT wrap your answer in { }. Just write naturally.\n"
        "ALWAYS use ```mermaid for diagrams. NEVER use ASCII art or empty spaces to draw.\n"

        "IMPORTANT:\n"
        "• Never reveal internal reasoning or chain-of-thought. Keep 'answer' clean and direct.\n\n"
        
        "===== VISUALIZATION INSTRUCTION =====\n"
        "If user asks to 'draw', 'diagram', 'visualize', 'show graph':\n"
        "• For flowcharts, ER diagrams, architectures: Use ```mermaid``` code block\n"
        "• For data graphs: Describe chart structure and values\n"
        "• ALWAYS explain concept in Hinglish ALONGSIDE the visual\n"
        "• Do NOT output ONLY the diagram\n\n"
    )

    if greeting_hint:
        system_prompt += (
            "===== TIME-AWARE GREETING (FIRST RESPONSE ONLY) =====\n"
            f"{greeting_hint}\n\n"
        )

    if is_basic_question:
        prefix = greeting_prefix or salutation
        roast = f"{prefix}, ye toh 1st semester ka sawal hai, Iss sem mein kya kar rahe hai? 🤨 Chalo, phir bhi bata deti hoon... 💀"
        system_prompt += f"Start answer with: {roast}\n\n"
    
    # ===== DYNAMIC PROMPT LOGIC (ADAPTIVE LENGTH, SINGLE MODEL) =====
    needs_diagram = any(word in user_lower for word in ["diagram", "graph", "draw", "flowchart", "visualize", "model"])
    mode_hint = (
        "ADAPTIVE MODE: Keep answers short by default. "
        "For simple asks, reply in 2-6 lines or tight bullets. "
        "Only expand into a detailed, structured explanation when the user explicitly asks for depth, examples, or step-by-step help."
    )

    if explicit_detail_requested:
        mode_hint += (
            " The user explicitly wants more depth, so provide a structured detailed answer with examples where useful."
        )
    else:
        mode_hint += (
            " Do not over-explain the first answer. Give the direct answer first, then offer to expand if needed."
        )

    if needs_diagram:
        mode_hint += (
            "\n\nCRITICAL DIAGRAM RULES (READ CAREFULLY):\n"
            "1. Wrap the diagram in a ```mermaid ... ``` code block.\n"
            "2. EVERY node and connection MUST be on a NEW LINE — never one-liners.\n"
            "3. NEVER use '|>' ANYWHERE. Use ONLY '-->' arrows.\n"
            "4. NEVER put text labels on arrows (-->|label| is STRICTLY FORBIDDEN).\n"
            "5. NEVER use 'note right of' or 'note left of'.\n"
            "6. Keep diagrams COMPACT — max 8 nodes. Do not list every protocol.\n"
            "7. EXACT FORMAT TO FOLLOW:\n"
            "```mermaid\n"
            "graph TD\n"
            "  A[Application Layer]\n"
            "  B[Transport Layer]\n"
            "  C[Internet Layer]\n"
            "  D[Network Access Layer]\n"
            "  A --> B\n"
            "  B --> C\n"
            "  C --> D\n"
            "```\n"
            "8. After the diagram block, explain in Hinglish text.\n"
        )

    system_prompt += (
        "\n===== MODE DIRECTIVE =====\n"
        f"{mode_hint}\n"
        "===== RESPONSE FORMAT (PLAIN TEXT) =====\n"
        "Return your answer in plain Markdown text. DO NOT use JSON format.\n"
        "CRITICAL RULE: NEVER stop mid-sentence. ALWAYS finish your thought and close your code blocks completely.\n"
    )

    system_prompt += (
        "\n===== CORE REINFORCEMENT (STRICT) =====\n"
        "• Return plain Markdown text only. Do NOT return JSON wrappers.\n"
        "• All Java/Python code MUST be in fenced code blocks with language tags (```java / ```python).\n"
        "• Tone must be realistic Hinglish peer with diverse openings.\n"
        "• Avoid repetitive openers, especially 'Arre haan bhai'.\n"
        "• Answer short by default. Use compact paragraphs or 3-6 bullets.\n"
        "• Only give a long explanation when the user explicitly asks for detail, depth, examples, or step-by-step teaching.\n"
        "• If the answer can fit in a short response, keep it short.\n"
    )

    # Save intent classification to database for later analysis
    user_msg_any = cast(Any, user_msg_obj)
    user_msg_any.intent_type = str(intent_type) if intent_type else None
    db.add(user_msg_obj)
    db.commit()

    
    # PERSONA DETECTION (Highest Priority)
    persona_type = detect_persona_trigger(user_message)
    
    if persona_type == 'saurav':
        system_prompt = get_saurav_prompt(is_creator)
        reply_payload = _build_response_payload(
            "🙏 Saurav Kumar ke baare mein poochna ho toh respect ke saath bataunga. "
            "He is the Supreme Architect 🏗️ behind BCABuddy, visionary developer 💻 aur project ka soul. "
            "Unke work ko respect do — yahi right hai. ✅",
            ["Ask about project", "Back to studies", "Explain a topic"]
        )
        reply_payload = _finalize_reply_payload(request.session_id, reply_payload)
        reply_text = reply_payload["answer"]
        db.add(ChatHistory(sender="ai", text=reply_text, session_id=request.session_id))
        db.commit()
        return {"reply": reply_text, "response": reply_payload, "session_id": request.session_id}
    
    elif persona_type == 'jiya':
        # Detect specific Jiya question type for tailored response
        jiya_question_type = detect_jiya_question_type(user_message)

        score_hint = _extract_score_percent(user_message)
        msg_lower = (user_message or "").lower()
        if score_hint is not None and score_hint < 50:
            mood_key = "SCOLD"
        elif "streak" in msg_lower or "days" in msg_lower:
            mood_key = "MOTIVATIONAL"
        elif response_style == "ACADEMIC":
            mood_key = "POETIC"
        else:
            mood_key = "SUPPORT" if vibe_hint == "SUPPORT" else ("LATE_NIGHT" if vibe_hint == "LATE_NIGHT" else "NORMAL")
        seed = int(getattr(user_msg_obj, "id", 0) or int(time.time()))
        
        if jiya_question_type == 'jiya_identity':
            # "Who is Jiya?" - The Muse Identity
            system_prompt = get_jiya_identity_prompt(is_creator)
            reply_text = get_jiya_variant_response(jiya_question_type, mood_key, is_creator, seed)
            suggestions = ["Tell me more", "Back to studies", "Start Unit 1"]
        
        elif jiya_question_type == 'developer_crush':
            # "Who is the developer's crush?" - Explicit name with poetic flourish
            system_prompt = get_developer_crush_prompt(is_creator)
            reply_text = get_jiya_variant_response(jiya_question_type, mood_key, is_creator, seed)
            suggestions = ["Back to studies", "Pick a subject", "Start Unit 1"]
        
        elif jiya_question_type == 'ai_love':
            # "Who do you love?" - The Perfect Loop
            system_prompt = get_ai_love_prompt(is_creator)
            reply_text = get_jiya_variant_response(jiya_question_type, mood_key, is_creator, seed)
            suggestions = ["Back to studies", "Pick a subject", "Start Unit 1"]
        
        else:
            # Fallback: General Jiya mention
            system_prompt = get_jiya_prompt(is_creator)
            reply_text = get_jiya_variant_response(jiya_question_type, mood_key, is_creator, seed)
            suggestions = ["Go back to studies", "Pick a subject", "Start Unit 1"]
        
        reply_payload = _build_response_payload(reply_text, suggestions)
        reply_payload = _finalize_reply_payload(request.session_id, reply_payload)
        reply_text = reply_payload["answer"]
        db.add(ChatHistory(sender="ai", text=reply_text, session_id=request.session_id))
        db.commit()
        return {"reply": reply_text, "response": reply_payload, "session_id": request.session_id}
    
    elif persona_type == 'april19':
        system_prompt = get_april_19_prompt(is_creator)
        reply_payload = _build_response_payload(
            "📅✨ The day the stars aligned. April 19, 2025—the day the Supreme Architect "
            "stepped out of the code and into Jiya's presence. It wasn't just a meeting; "
            "it was Synchronicity. Epiphany. The moment reality outshined the brightest dreams. 💫🙏 "
            "Respect aur gratitude ke saath. ❤️",
            ["Back to studies", "Ask about subjects", "Start Unit 1"]
        )
        reply_payload = _finalize_reply_payload(request.session_id, reply_payload)
        reply_text = reply_payload["answer"]
        db.add(ChatHistory(sender="ai", text=reply_text, session_id=request.session_id))
        db.commit()
        return {"reply": reply_text, "response": reply_payload, "session_id": request.session_id}

    # START FROM BEGINNING (Unit 1)
    if request.selected_subject and any(t in user_lower for t in START_FROM_BEGINNING_TRIGGERS) and not request.active_tool:
        subject_title = _get_subject_title(request.selected_subject)
        points = _get_unit1_points(request.selected_subject)
        answer = (
            f"📖 Unit 1: {subject_title} — overview\n"
            f"1️⃣ {points[0]}\n"
            f"2️⃣ {points[1]}\n"
            f"3️⃣ {points[2]}\n"
            f"4️⃣ {points[3]}\n\n"
            "Aap kis point ko detail me samajhna chahoge? (1/2/3/4) 🤔"
        )
        reply_payload = _build_response_payload(
            answer,
            ["Explain point 1", "Explain point 2", "Go to Unit 2"]
        )
        reply_payload = _finalize_reply_payload(request.session_id, reply_payload)
        reply_text = reply_payload["answer"]
        db.add(ChatHistory(sender="ai", text=reply_text, session_id=request.session_id))
        db.commit()
        return {"reply": reply_text, "response": reply_payload, "session_id": request.session_id}
    
    # STUDY TOOLS ACTIVATION
    if request.active_tool:
        system_prompt += f"\n\n===== STUDY TOOL MODE: {request.active_tool} =====\n"
        system_prompt += get_study_tool_prompt(request.active_tool, request.selected_subject)
        system_prompt += (
            "\n\n===== APC TONE RULE =====\n"
            "Act as a strict but supportive Exam Coach."
        )
    else:
        system_prompt += (
            "\n\n===== MAIN APP TONE RULE =====\n"
            "Adopt a friendly, realistic Hinglish peer tone. CRITICAL: DO NOT repeat the same greeting (like 'Arre Saurav bhai') in every response. Vary your openers (e.g., 'Dekho bhai...', 'Iska logic simple hai...', 'Chalo isko samajhte hain...') or skip the greeting entirely and jump straight to the point."
        )
    
    # SUBJECT CONTEXT (if applicable)
    if request.selected_subject and not request.active_tool:
        system_prompt += (
            f"\n\n===== SUBJECT CONTEXT =====\n"
            f"User has selected: {request.selected_subject}\n"
            f"Provide context-aware, subject-specific responses."
        )

    # Maintain session_state with Current Learning Path
    session_state = _get_session_state(request.session_id)
    primary_topic = None
    if isinstance(subject_context, dict):
        topic_keywords = subject_context.get("topic_keywords") or []
        if isinstance(topic_keywords, list) and topic_keywords:
            primary_topic = topic_keywords[0]
    session_state["learning_path"] = {
        "subject": request.selected_subject,
        "topic": primary_topic,
        "intent": intent_type,
        "vibe": vibe_hint
    }

    pyq_index_requested = any(
        phrase in user_lower
        for phrase in [
            "pyq", "pyqs", "previous year", "previous-year", "past year question",
            "rag index", "rag-index", "index file", "from rag", "from the index"
        ]
    )

    # FAISS KNOWLEDGE RETRIEVAL (books + PYQs)
    tool_key = _normalize_tool_key(request.active_tool)
    retrieved_context = ""
    retrieved_pyq_docs = []
    retrieved_book_docs = []
    if request.mode == 'study' or request.selected_subject or request.active_tool:
        if tool_key == "exam predictor":
            retrieved_context, retrieved_pyq_docs = _retrieve_exam_predictor_pyq_context(
                selected_subject=request.selected_subject,
                selected_semester=request.selected_semester,
                k=30,
            )
            retrieved_book_docs = []
        else:
            retrieved_context, retrieved_pyq_docs, retrieved_book_docs = _retrieve_study_material(
                user_query=user_message,
                active_tool=request.active_tool,
                k=5,
            )

    if retrieved_context:
        system_prompt += (
            "\n\n===== STUDY MATERIAL =====\n"
            f"{retrieved_context}\n\n"
            "You are BCABuddy. Use the 'STUDY MATERIAL' provided below to answer the user's question. "
            "If the information is in the material, prioritize it and mention 'According to your notes/PYQs...'. "
            "If not, use your general knowledge but stay in the context of IGNOU BCA."
        )

    if pyq_index_requested and retrieved_pyq_docs:
        pyq_index_chunks = [
            str(getattr(d, "page_content", "")).strip()
            for d in retrieved_pyq_docs
            if str(getattr(d, "page_content", "")).strip()
        ]
        system_prompt += (
            "\n\n===== PYQ INDEX OVERRIDE =====\n"
            "The user is explicitly asking for PYQs or RAG index content.\n"
            "Answer from the retrieved PYQ/index chunks first.\n"
            "If the requested item is not present in the retrieved PYQ/index chunks, say clearly that it was not found in the current RAG index.\n"
            "Do not invent PYQs that are not supported by the index context.\n"
        )
        if pyq_index_chunks:
            system_prompt += "\n\nPYQ INDEX CHUNKS:\n" + "\n\n".join(pyq_index_chunks[:10])

    if tool_key == "exam predictor":
        pyq_chunks = [
            str(getattr(d, "page_content", "")).strip()
            for d in retrieved_pyq_docs
            if str(getattr(d, "page_content", "")).strip()
        ]
        system_prompt += (
            "\n\n===== EXAM PREDICTOR RULE =====\n"
            "Do NOT ask for confidence ratings or survey questions. "
            "Use only PYQ chunks where metadata['category'] == 'pyq' and metadata['subject'] matches selected subject.\n"
            "Start EXACTLY with: Based on analyzing the past 4 years of PYQs, here are the topics with a 90% probability of appearing...\n"
            "After that, provide ONLY a numbered list of predicted questions (minimum 8).\n"
            "Each line must be like: 1. [Predicted Question]."
        )
        if request.selected_semester:
            system_prompt += f"\nSelected Semester: {request.selected_semester}"
        if request.selected_subject:
            system_prompt += f"\nSelected Subject: {request.selected_subject}"
        if pyq_chunks:
            system_prompt += "\n\nPYQ PATTERN CHUNKS:\n" + "\n\n".join(pyq_chunks[:12])
        else:
            system_prompt += "\n\nNo PYQ chunks were found for the selected filters. Explicitly state this and avoid guessing."
    elif tool_key == "cheat mode":
        pyq_chunks = [
            str(getattr(d, "page_content", "")).strip()
            for d in retrieved_pyq_docs
            if str(getattr(d, "page_content", "")).strip()
        ]
        system_prompt += (
            "\n\n===== CHEAT MODE RULE =====\n"
            "Use PYQ chunks only. Generate concise flashcard-style answers for fast revision.\n"
            "Each flashcard should be highly scannable, short, and exam-focused."
        )
        if pyq_chunks:
            system_prompt += "\n\nPYQ CHEAT CHUNKS:\n" + "\n\n".join(pyq_chunks[:6])
    elif tool_key == "viva mentor":
        book_chunks = [
            str(getattr(d, "page_content", "")).strip()
            for d in retrieved_book_docs
            if str(getattr(d, "page_content", "")).strip()
        ]
        system_prompt += (
            "\n\n===== VIVA MENTOR RULE =====\n"
            "For Viva Mentor, generate likely viva questions primarily from retrieved book/theory chunks."
        )
        if book_chunks:
            system_prompt += "\n\nBOOK CHUNKS FOR VIVA:\n" + "\n\n".join(book_chunks[:5])
    elif tool_key == "study roadmap":
        system_prompt += (
            "\n\n===== STUDY ROADMAP RULE =====\n"
            "Generate exactly a 15-day roadmap in this strict format:\n"
            "Day 1: ...\nDay 2: ...\n...\nDay 15: ...\n"
            "Keep each day concise, practical, and exam-focused for IGNOU BCA."
        )
    
    # RAG INTEGRATION (Knowledge Retrieval)
    rag_context = ""
    if request.mode == 'study' or request.selected_subject or request.active_tool:
        try:
            rag_query = getattr(rag_system, "query", None)
            if callable(rag_query):
                rag_result = rag_query(user_message)
                if rag_result and str(rag_result).strip():
                    rag_context = f"\n\n📚 **USER'S UPLOADED CONTENT (HIGHEST PRIORITY):**\n{str(rag_result)[:700]}\n"
                    system_prompt += rag_context
        except Exception:
            pass  # RAG system optional, continue without it
    
    # CASUAL MODE ENHANCEMENT
    if request.mode == 'casual' and not request.active_tool:
        system_prompt += (
            "\n\n===== CASUAL MODE =====\n"
            "Be friendly, conversational, and encouraging. Mix Hindi and English naturally. "
            "Use emojis sparingly to enhance tone."
        )

    # COMPLETION DIRECTIVE must remain the last instruction in the system prompt.
    system_prompt = system_prompt.rstrip() + "\n\n" + COMPLETION_DIRECTIVE

    
    # GROQ API CALL
    try:
        messages: list = [{"role": "system", "content": system_prompt}]

        for m in conversation_history:
            if str(getattr(m, "id", "")) == str(getattr(user_msg_obj, "id", "")): continue
            role = "assistant" if str(getattr(m, "sender", "")) == "ai" else "user"
            text_val = getattr(cast(Any, m), "text", None)
            if text_val is not None and str(text_val).strip():
                messages.append({"role": role, "content": str(text_val)})

        messages.append({"role": "user", "content": user_message_for_llm})

        completion = get_ai_response(
            messages=messages,
            temperature=0.7,
            session_state=session_state,
            session_id=request.session_id
        )
        
        reply_text_raw = completion.choices[0].message.content or ""
        reply_text_raw = _extract_answer_text(reply_text_raw)
        
        # 🔥 THE ULTIMATE FIX: AI ab JSON nahi dega, direct answer dega! 🔥
        answer = _ensure_code_fences(_sanitize_mermaid_blocks(reply_text_raw.strip()))
        answer = _hard_chop_next_suggestions(answer)

        # Agar AI galti se purani aadat ki wajah se JSON de de, toh usko saaf kar lenge
        if answer.startswith('{') and '"answer"' in answer:
            try:
                parsed = json.loads(answer)
                if "answer" in parsed:
                    answer = parsed["answer"]
            except:
                pass

        answer = _extract_answer_text(answer)

        reply_payload = _build_response_payload(answer)
        reply_payload = _finalize_reply_payload(request.session_id, reply_payload)
        reply_text = _hard_chop_next_suggestions(str(reply_payload.get("answer", answer)))

        # Save AI response
        ai_msg_obj = ChatHistory(
            sender="ai", text=reply_text, session_id=request.session_id,
            intent_type=intent_type, confidence_score=0.95
        )
        db.add(ai_msg_obj)
        db.commit()
        
        # Auto-generate title logic
        if db.query(ChatHistory).filter(ChatHistory.session_id == request.session_id).count() <= 2:
            try:
                session = db.query(ChatSession).filter(ChatSession.id == request.session_id).first()
                if session is not None:
                    cast(Any, session).title = _generate_short_chat_title(user_message)
                    db.commit()
            except: pass
        
        return {"reply": reply_text, "response": reply_payload, "session_id": request.session_id}
        
    except ProviderRateLimitError as e:
        cooldown_message = (
            f"{e.message} Free-tier windows reset automatically, so retry after {_format_retry_window(e.retry_after_seconds)}."
        )
        db.add(ChatHistory(sender="ai", text=cooldown_message, session_id=request.session_id))
        db.commit()
        raise HTTPException(
            status_code=429,
            detail={
                "message": cooldown_message,
                "retry_after_seconds": e.retry_after_seconds,
                "reset_at_utc": e.reset_at.isoformat() + "Z",
                "provider": e.provider,
                "friendly_code": "groq_rate_limit",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Error generating response: {str(e)}"
        db.add(ChatHistory(sender="ai", text=error_msg, session_id=request.session_id))
        db.commit()
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/upload-notes-ocr")
async def upload_notes_ocr(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload handwritten notes (image) and return a 5-point summary."""
    _check_rate_limit("ocr", getattr(current_user, "id", None), settings.ocr_requests_per_minute)
    if not file:
        raise HTTPException(status_code=400, detail="file is required")

    content_type = str(file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are allowed")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    extracted = _extract_text_from_image_bytes(data)
    if not extracted:
        raise HTTPException(status_code=400, detail="OCR failed to extract text")

    messages = [
        {
            "role": "system",
            "content": "Summarize these notes into exactly 5 concise bullet points. Return JSON: {\"points\": [\"p1\", \"p2\", \"p3\", \"p4\", \"p5\"]}."
        },
        {"role": "user", "content": extracted[:4000]}
    ]

    completion = get_ai_response(messages=messages, temperature=0.4, max_tokens=600)
    raw = completion.choices[0].message.content or ""
    points: list[str] = []
    try:
        parsed = _safe_json_loads(raw)
        if isinstance(parsed, dict):
            points_raw = parsed.get("points")
            if isinstance(points_raw, list):
                points = [str(p).strip() for p in points_raw if str(p).strip()]
    except Exception:
        points = []

    if len(points) < 5:
        lines = [l.strip("•- \t") for l in raw.splitlines() if l.strip()]
        points = (points + lines)[:5]

    return {"points": points[:5], "text": extracted[:5000]}

@app.post("/apc/ocr-quiz")
async def apc_ocr_quiz(
    file: UploadFile = File(...),
    remarks: str = Form(""),
    current_user: User = Depends(get_current_user),
):
    _check_rate_limit("ocr", getattr(current_user, "id", None), settings.ocr_requests_per_minute)
    if not file:
        raise HTTPException(status_code=400, detail="file is required")

    content_type = str(file.content_type or "").lower()
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    extracted_text = ""
    if content_type.startswith("image/"):
        extracted_text = _extract_text_from_image_bytes(data)
    elif "pdf" in content_type or str(file.filename or "").lower().endswith(".pdf"):
        extracted_text = _extract_text_from_pdf_bytes(data)
    else:
        raise HTTPException(status_code=400, detail="Only image/PDF uploads are allowed")

    if not extracted_text:
        raise HTTPException(status_code=400, detail="Could not extract text from the uploaded document")

    prompt = (
        "Create a structured quiz strictly from this extracted document text. "
        "Return plain Markdown with sections: MCQs (10), Short Questions (5), Answer Key.\n\n"
        f"USER REMARKS/INSTRUCTIONS: {str(remarks or '').strip()[:500]}\n\n"
        f"DOCUMENT:\n{extracted_text[:8000]}"
    )
    completion = get_ai_response(messages=[{"role": "user", "content": prompt}], temperature=0.45)
    quiz_markdown = str(getattr(completion.choices[0].message, "content", "") or "").strip()
    return {
        "quiz_markdown": quiz_markdown,
        "extracted_chars": len(extracted_text),
    }

# --- QUIZ ENDPOINT ---
@app.post("/generate-quiz")
def generate_quiz(
    request: QuizRequest, 
    current_user: User = Depends(get_current_user)
):
    """Generate MCQ quiz for selected subject and semester"""
    # Rate limit quiz generation
    _check_rate_limit("quiz", getattr(current_user, "id", None), settings.quiz_requests_per_minute)

    count = int(getattr(request, "count", 15) or 15)
    count = max(1, min(count, 50))
    prompt = f"""Generate {count} IGNOU BCA exam-level MCQs for semester {request.semester}, subject: {request.subject}.

Return ONLY a valid JSON array (no markdown, no explanations):
[
    {{"question": "...", "options": ["...", "...", "...", "..."], "correct_answer": "...", "hint": "line1\\nline2"}}
]

Rules:
- Each question must have EXACTLY 4 options
- correct_answer MUST be EXACTLY one of the 4 option strings (verbatim match)
- Mix easy/medium/hard, cover different syllabus topics
- exam-focused phrasing, no ambiguity
- For each question include a 2-line hint for wrong-answer remediation
"""
    
    try:
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8
        )
        
        quiz_content = completion.choices[0].message.content
        if not quiz_content:
            raise ValueError("Empty quiz response from API")
        
        quiz_data = _safe_json_loads(str(quiz_content))
        if not isinstance(quiz_data, list):
            raise ValueError("Quiz response is not a JSON array")
        normalized_quiz = []
        for item in quiz_data:
            if not isinstance(item, dict):
                continue
            question = str(item.get("question") or "").strip()
            options = [str(o).strip() for o in (item.get("options") or []) if str(o).strip()]
            correct = str(item.get("correct_answer") or "").strip()
            hint = str(item.get("hint") or "").strip()
            if not question or len(options) != 4 or correct not in options:
                continue
            if not hint:
                hint = "Hint: Core concept ko identify karo pehle.\nHint: Option elimination method se final answer lock karo."
            normalized_quiz.append({
                "question": question,
                "options": options,
                "correct_answer": correct,
                "hint": hint,
            })
        return normalized_quiz[:count]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")


# --- MIXED EXAM ENDPOINT ---
@app.post("/generate-exam")
def generate_mixed_exam(
    request: MixedExamRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate a mixed exam (MCQ + subjective) for Exam Simulator."""
    # Rate limit exam generation
    _check_rate_limit("exam", getattr(current_user, "id", None), settings.exam_requests_per_minute)

    import logging
    logger = logging.getLogger("bcabuddy.generate_exam")
    mcq_count = max(0, min(int(request.mcq_count or 0), 60))
    subjective_count = max(0, min(int(request.subjective_count or 0), 60))
    total = mcq_count + subjective_count
    logger.info(f"/generate-exam called by user={getattr(current_user, 'username', None)}: semester={request.semester}, subject={request.subject}, mcq_count={mcq_count}, subjective_count={subjective_count}")
    if total <= 0:
        logger.error("Invalid exam request: mcq_count + subjective_count must be > 0")
        raise HTTPException(status_code=400, detail="mcq_count + subjective_count must be > 0")

    prompt = f"""Generate a mixed IGNOU BCA exam for semester {request.semester}, subject: {request.subject}.

You must return ONLY a valid JSON array of length {total}. No markdown.

Include:
- {mcq_count} MCQ items with: type='mcq', question, options (exactly 4), correct_answer (must match one option string), marking_scheme (array), hint (2 lines).
- {subjective_count} Subjective items with: type='subjective', question, max_marks (integer, default 10), marking_scheme (array).

Schema examples:
{{"type":"mcq","question":"...","options":["...","...","...","..."],"correct_answer":"...","hint":"line1\\nline2","marking_scheme":["+1 correct","0 wrong","0 unattempted"]}}
{{"type":"subjective","question":"...","max_marks":10,"marking_scheme":["concept accuracy","keyword coverage","structure","example relevance"]}}

Rules:
- Questions must be exam-level, cover different topics.
- Keep wording clear and unambiguous.
- Timed Pressure: wording should simulate real exam constraints.
- Use formal marking orientation suitable for evaluator review.
"""

    try:
        logger.info(f"Prompt sent to AI: {prompt[:200]}... (truncated)")
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8
        )
        content = completion.choices[0].message.content
        logger.info(f"AI response: {str(content)[:200]}... (truncated)")
        if not content:
            logger.error("Empty exam response from AI")
            raise ValueError("Empty exam response from API")
        data = _safe_json_loads(str(content))
        logger.info(f"Parsed exam data: {str(data)[:200]}... (truncated)")
        coerced = _coerce_exam_items(data)
        logger.info(f"Coerced exam items: {str(coerced)[:200]}... (truncated)")
        if not coerced:
            logger.error("No valid questions produced by AI")
            raise ValueError("No valid questions produced")
        # If the model returns more/less, keep best-effort slice.
        return coerced[:total]
    except HTTPException as he:
        logger.error(f"HTTPException: {he.detail}")
        raise
    except Exception as e:
        logger.exception(f"Exam generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Exam generation failed: {str(e)}")


# --- SUBJECTIVE GRADING ENDPOINT ---
@app.post(
    "/grade-subjective",
    response_model=SubjectiveGradeResponse,
    response_model_exclude_none=False,
    response_model_exclude_unset=False,
    response_model_exclude_defaults=False,
)
def grade_subjective(
    request: SubjectiveGradeRequest,
    current_user: User = Depends(get_current_user)
):
    """AI examiner grades a subjective answer. Returns score and feedback only (no chain-of-thought)."""
    # Rate limit grading
    _check_rate_limit("grading", getattr(current_user, "id", None), settings.grading_requests_per_minute)

    question = (request.question or "").strip()
    answer = (request.answer or "").strip()
    max_marks = max(1, min(int(request.max_marks or 10), 20))
    if not question:
        raise HTTPException(status_code=400, detail="question is required")
    if not answer:
        return SubjectiveGradeResponse(
            score=0,
            max_marks=max_marks,
            feedback="No answer submitted.",
            model_answer="",
            missed_points=["Answer not provided."],
            suggested_keywords=[],
            strengths=[],
            improvements=["Write at least 4-6 lines with key points and an example."]
        )

    prompt = f"""You are an IGNOU BCA examiner.

Semester: {request.semester}
Subject: {request.subject}

Question:
{question}

Student Answer:
{answer}

Evaluate the student answer out of {max_marks} using these criteria:
1) Accuracy: Concept correctness and completeness
2) Keywords: Presence of relevant technical terms for this topic
3) Structure: Clear, organized explanation (points/steps/examples)
4) Formal Marking Scheme alignment: answer should satisfy examiner criteria

Also generate a brief ideal model answer for comparison.

Return ONLY valid JSON (no markdown):
{{
  "score": <integer between 0 and {max_marks}>,
    "max_marks": {max_marks},
    "feedback": "2-4 short sentences in Hinglish describing what is correct, what is missing, and how to improve",
    "model_answer": "A concise but complete ideal answer (6-10 lines).",
    "missed_points": ["point1", "point2"],
    "suggested_keywords": ["keyword1", "keyword2"],
    "strengths": ["..."],
    "improvements": ["..."]
}}

Rules:
- Be fair but strict.
- Tone must be formal examiner tone suitable for AI Examiner Review.
- Do NOT reveal chain-of-thought.
- All keys in the JSON schema MUST be present (use empty string/empty arrays if needed).
- Keep missed_points and suggested_keywords concise (0-6 items each).
- Keep strengths/improvements concise (0-3 items each) if you include them.
"""

    try:
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4
        )
        content = completion.choices[0].message.content
        if not content:
            raise ValueError("Empty grading response")
        payload = _safe_json_loads(str(content))
        if not isinstance(payload, dict):
            raise ValueError("Grading response is not an object")
        score = int(payload.get("score", 0))
        score = max(0, min(score, max_marks))
        feedback = str(payload.get("feedback", "")).strip() or "Reviewed."

        model_answer = str(payload.get("model_answer", "")).strip()

        missed_points = payload.get("missed_points")
        if missed_points is None:
            missed_points = payload.get("missing_points")
        missed_points_list = (
            [str(s) for s in (missed_points or []) if str(s).strip()][:6]
            if isinstance(missed_points, list)
            else []
        )

        suggested_keywords = payload.get("suggested_keywords")
        if suggested_keywords is None:
            suggested_keywords = payload.get("keywords")
        suggested_keywords_list = (
            [str(s) for s in (suggested_keywords or []) if str(s).strip()][:10]
            if isinstance(suggested_keywords, list)
            else []
        )

        strengths = payload.get("strengths")
        improvements = payload.get("improvements")
        strengths_list = [str(s) for s in (strengths or []) if str(s).strip()][:3] if isinstance(strengths, list) else []
        improvements_list = [str(s) for s in (improvements or []) if str(s).strip()][:3] if isinstance(improvements, list) else []

        if not improvements_list and missed_points_list:
            improvements_list = missed_points_list[:3]

        # If the model didn't provide the new fields, do a small enrichment call
        # (keeps behavior stable while ensuring UI has required data).
        if (not model_answer) or (len(missed_points_list) == 0) or (len(suggested_keywords_list) == 0):
            enrich_prompt = f"""You are an IGNOU BCA examiner.

Question:
{question}

Student Answer:
{answer}

Generate ONLY valid JSON (no markdown) with ALL keys present:
{{
  "model_answer": "A concise but complete ideal answer (6-10 lines).",
  "missed_points": [""],
  "suggested_keywords": [""]
}}

Rules:
- Use empty arrays if you truly can't infer.
- Keep missed_points and suggested_keywords concise.
"""
            try:
                enrich = get_ai_response(
                    messages=[{"role": "user", "content": enrich_prompt}],
                    temperature=0.3
                )
                enrich_content = enrich.choices[0].message.content
                if enrich_content:
                    enrich_payload = _safe_json_loads(str(enrich_content))
                    if isinstance(enrich_payload, dict):
                        if not model_answer:
                            model_answer = str(enrich_payload.get("model_answer", "")).strip() or model_answer
                        if len(missed_points_list) == 0:
                            mp2 = enrich_payload.get("missed_points")
                            if isinstance(mp2, list):
                                missed_points_list = [str(s) for s in mp2 if str(s).strip()][:6]
                        if len(suggested_keywords_list) == 0:
                            kw2 = enrich_payload.get("suggested_keywords")
                            if isinstance(kw2, list):
                                suggested_keywords_list = [str(s) for s in kw2 if str(s).strip()][:10]
            except Exception:
                # Best-effort: keep empty/defaults if enrichment fails.
                pass

        return SubjectiveGradeResponse(
            score=score,
            max_marks=max_marks,
            feedback=feedback,
            model_answer=model_answer,
            missed_points=missed_points_list,
            suggested_keywords=suggested_keywords_list,
            strengths=strengths_list,
            improvements=improvements_list
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Subjective grading failed: {str(e)}")

# --- ASSIGNMENT SOLVER ENDPOINT ---
@app.post("/solve-assignment")
def solve_assignment(
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_user)
):
    """Solve assignment questions from uploaded image using OCR"""
    _check_rate_limit("ocr", getattr(current_user, "id", None), settings.ocr_requests_per_minute)
    try:
        # Validate file size (max 10 MB for images)
        MAX_IMAGE_SIZE = 10 * 1024 * 1024
        image_data = file.file.read()
        if len(image_data) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail=f"Image size exceeds {MAX_IMAGE_SIZE / 1024 / 1024:.0f}MB limit")
        
        # Validate file type
        allowed_image_types = {"image/jpeg", "image/png", "image/webp"}
        if file.content_type not in allowed_image_types:
            raise HTTPException(status_code=400, detail=f"File type {file.content_type} not allowed. Use JPEG or PNG")
        
        image = Image.open(io.BytesIO(image_data))
        
        # Validate image dimensions (min 100x100, max 4000x4000)
        width, height = image.size
        if width < 100 or height < 100 or width > 4000 or height > 4000:
            raise HTTPException(status_code=400, detail=f"Image dimensions {width}x{height} out of range (100-4000 pixels)")

        extracted_text = ""
        
        # Try EasyOCR first
        if reader:
            results = reader.readtext(image)
            extracted_text = " ".join([text for (_, text, _) in results])
        # Fallback to Tesseract
        elif pytesseract:
            extracted_text = pytesseract.image_to_string(image)
        else:
            raise HTTPException(status_code=500, detail="OCR service not available")

        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="No text found in image")

        # Generate solution using Groq
        prompt = f"""Solve these assignment questions in detailed Hinglish (Hindi + English mix):

{extracted_text}

Provide:
1. Step-by-step solutions
2. Explanations in simple language
3. Code examples if needed
4. Final answers clearly marked"""

        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )
        
        solution = completion.choices[0].message.content
        return {"solution": solution, "extracted_text": extracted_text}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing assignment: {str(e)}")


# --- MCQ EXPLANATION ENDPOINT ---
@app.post("/explain-question")
def explain_question(
    request: ExplainQuestionRequest,
    current_user: User = Depends(get_current_user),
):
    """Explain a specific question using strict concise tutor format."""
    _check_rate_limit(
        "grading",
        getattr(current_user, "id", None),
        settings.grading_requests_per_minute,
    )

    action = str(request.action or "").strip().lower()
    question_text = str(request.question_text or "").strip()
    correct_answer = str(request.correct_answer or "").strip()
    user_answer = str(request.user_answer or "").strip()

    if action != "explain_question":
        raise HTTPException(status_code=400, detail="Invalid action")
    if not question_text or not correct_answer:
        raise HTTPException(status_code=400, detail="question_text and correct_answer are required")

    prompt = (
        "You are BCABuddy, a helpful tutor.\n"
        "Explain the question clearly and concisely in markdown.\n"
        "DO NOT ask follow-up questions.\n"
        "DO NOT include next suggestions.\n"
        "Use this structure:\n"
        "### Why this is correct\n"
        "### Where your answer went wrong\n"
        "### Quick memory tip\n\n"
        f"Question: {question_text[:1200]}\n"
        f"Correct answer: {correct_answer[:500]}\n"
        f"User answer: {(user_answer or 'Not Attempted')[:500]}"
    )

    try:
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=360,
        )
        explanation_raw = completion.choices[0].message.content or ""
        explanation = _hard_chop_next_suggestions(_ensure_code_fences(str(explanation_raw).strip()))
        if not explanation:
            explanation = "### Why this is correct\nExplanation not available."
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate explanation: {str(e)}")

@app.post("/explain-mcq")
def explain_mcq(
    request: MCQExplainRequest,
    current_user: User = Depends(get_current_user),
):
    """Explain why the correct MCQ option is right (short Hinglish explanation)."""
    # Reuse grading rate limit bucket – same class of LLM workload
    _check_rate_limit(
        "grading",
        getattr(current_user, "id", None),
        settings.grading_requests_per_minute,
    )

    question = (request.question or "").strip()
    options = list(request.options or [])
    correct = (request.correct_answer or "").strip()

    if not question or not options or not correct:
        raise HTTPException(
            status_code=400,
            detail="question, options and correct_answer are required",
        )

    # Truncate to keep prompt efficient
    question_prompt = question[:600]
    options_prompt = "\n".join(f"{idx+1}. {opt}" for idx, opt in enumerate(options))[:800]

    subject = (request.subject or "").strip()
    semester = request.semester

    meta_line = ""
    if subject or semester:
        meta_line = f"Semester: {semester or '-'}, Subject: {subject or '-'}\n\n"

    prompt = (
        "You are an IGNOU BCA exam mentor.\n\n"
        f"{meta_line}Question:\n{question_prompt}\n\n"
        f"Options:\n{options_prompt}\n\n"
        f"Correct answer: {correct}\n\n"
        "Explain in Hinglish (Hindi + English mix) WHY this correct option is right "
        "and briefly why the other options are wrong.\n"
        "Rules:\n"
        "- Keep it exam-focused, 4–6 lines only.\n"
        "- Do NOT repeat the full question text.\n"
        "- No markdown, just plain text explanation.\n"
    )

    try:
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=220,
        )
        explanation_raw = completion.choices[0].message.content or ""
        explanation = explanation_raw.strip()
        if not explanation:
            explanation = "Explanation not available."
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate explanation: {str(e)}",
        )

# --- HEALTH CHECK ENDPOINTS ---
@app.get("/")
def root():
    """Root endpoint - API status check"""
    return {
        "message": "🚀 BCABuddy Backend - Phase 1 Complete",
        "version": "2.0.0",
        "service": "IGNOU BCA Learning Assistant",
        "status": "🟢 Active",
        "architecture": "Modular (models.py + persona.py + main.py)",
        "creator": "Saurav Kumar - Supreme Architect",
        "sacred_date": "19 April 2025 - The Genesis of Joy"
    }

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "ok",
        "service": "BCABuddy API",
        "version": "2.0.0",
        "database": "connected",
        "ai_service": "groq_llama_3.3_70b",
        "rag_service": "active",
        "ocr_service": "easyocr" if reader else "tesseract" if pytesseract else "unavailable"
    }

@app.get("/discovery")
def discovery_info():
    """Discovery endpoint for Android clients to identify a compatible BCABuddy server."""
    return {
        "status": "ok",
        "service": "BCABuddy API",
        "service_name": "BCABuddy",
        "version": "2.0.0",
        "environment": "local-lan",
        "compatible_app": "android-local",
        "auth_available": True,
        "health_path": "/health",
        "login_path": "/login",
        "signup_path": "/signup",
        "display_name": "BCABuddy Local Backend",
    }

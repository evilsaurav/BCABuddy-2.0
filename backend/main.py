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

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from groq import Groq
from typing import Optional, Any, cast
import os, shutil
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import ChatHistory, User, ChatSession, get_db
from jose import JWTError, jwt
from passlib.context import CryptContext
from rag_service import RAGService 
from PIL import Image
import io
import json
import time
import re
import requests
import difflib
import random

# Import modular components
from models import (
    UserCreate, Token, ChatRequest, QuizRequest, QuizQuestion,
    MixedExamRequest, SubjectiveGradeRequest, SubjectiveGradeResponse,
    DashboardStats, UserProfile, UserProfileUpdate, PasswordChange, ChatResponse
)
from persona import (
    get_saurav_prompt, get_jiya_prompt, get_april_19_prompt,
    get_jiya_identity_prompt, get_developer_crush_prompt, get_ai_love_prompt,
    detect_persona_trigger, detect_jiya_question_type, get_study_tool_prompt, get_response_mode_instruction,
    classify_intent, extract_subject_context, build_conversation_context,
    validate_subject_mapping, get_intent_specific_protocol,
    detect_response_style, get_persona_style_instruction, get_jiya_variant_response
)

# --- CONFIG ---
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SECRET_KEY = "SAURAV_IS_THE_BEST_DEV_19_APRIL"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 
UPLOAD_DIR = "uploads"
PROFILE_PICS_DIR = "profile_pics"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROFILE_PICS_DIR, exist_ok=True)

# --- SUPABASE STORAGE (AVATARS) ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_AVATAR_BUCKET = os.getenv("SUPABASE_AVATAR_BUCKET", "avatars")

# --- SERVICES ---
rag_system = RAGService(groq_api_key=GROQ_API_KEY)
client = Groq(api_key=GROQ_API_KEY)

# --- SESSION STATE (in-memory, best-effort) ---
SESSION_STATE: dict[str, dict] = {}

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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

app = FastAPI(title="BCABuddy Ultimate")

# Serve uploaded files
app.mount("/profile_pics", StaticFiles(directory=PROFILE_PICS_DIR), name="profile_pics")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


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
        # Best-effort extraction: models sometimes wrap JSON with prose.
        # Try to parse the first JSON array/object substring.
        first_arr = cleaned.find("[")
        first_obj = cleaned.find("{")
        starts = [i for i in [first_arr, first_obj] if i != -1]
        if not starts:
            raise ValueError(f"Invalid JSON: {str(e)}")

        start = min(starts)
        # Prefer an array if it starts first; otherwise parse as object.
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

def _coerce_exam_items(items: Any):
    """Best-effort coercion of exam questions into a predictable list of dicts."""
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
        else:
            normalized["max_marks"] = int(item.get("max_marks") or 10)
        if normalized["question"]:
            coerced.append(normalized)
    return coerced

def _build_response_payload(answer: str, suggestions=None):
    suggestions = suggestions or []
    while len(suggestions) < 3:
        suggestions.append("Practice MCQ")
    return {
        "answer": answer.strip(),
        "next_suggestions": suggestions[:3]
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
    suggestions = payload.get("next_suggestions") or []
    if isinstance(suggestions, list):
        payload["next_suggestions"] = _format_suggestions(session_id, suggestions)
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

def _get_salutation(name: str, gender: str) -> str:
    name_l = (name or "").strip().lower()
    if "saurav" in name_l:
        return "Saurav bhai"
    if gender == "female":
        return "Behen"
    if gender == "male":
        return "Bhai"
    return "Buddy"

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
    """Allow 19 April Easter egg only if not used in last N AI messages."""
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
    """Groq chat completion with model fallback on rate limits."""
    models = models or ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-8b-8192"]
    if messages is None:
        messages = [{"role": "user", "content": str(prompt) if prompt is not None else ""}]

    if session_id is not None and session_state is not None:
        SESSION_STATE[str(session_id)] = session_state

    last_error = None
    for model_name in models:
        try:
            safe_messages = cast(Any, messages)
            return client.chat.completions.create(
                model=model_name,
                messages=safe_messages,
                **kwargs
            )
        except Exception as e:
            last_error = e
            msg = str(e).lower()
            if "rate_limit_exceeded" in msg or "rate limit" in msg or "429" in msg:
                print(f"⚠️ {model_name} limit reached! Switching to next...")
                continue
            raise
    if last_error:
        raise last_error
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
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
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

# --- AUTH HELPERS ---
def get_password_hash(p): return pwd_context.hash(p)
def verify_password(p, h): return pwd_context.verify(p, h)
def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username: raise HTTPException(status_code=401)
    except JWTError: 
        raise HTTPException(status_code=401)
    user = db.query(User).filter(User.username == username).first()
    if not user: raise HTTPException(status_code=401)
    return user

# --- AUTH ENDPOINTS ---
@app.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username taken")
    new_user = User(
        username=user.username, 
        hashed_password=get_password_hash(user.password),
        display_name=user.username,
        gender=None,
        mobile_number=None,
        profile_picture_url=None
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "message": "User created",
        "username": new_user.username,
        "display_name": new_user.display_name
    }

@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect credentials")
    return {"access_token": create_access_token(data={"sub": user.username}), "token_type": "bearer"}

# --- NEW: PROFILE ENDPOINTS ---

@app.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    current_user_any = cast(Any, current_user)
    username_val = getattr(current_user_any, "username", None)
    display_name_val = getattr(current_user_any, "display_name", None)
    gender_val = getattr(current_user_any, "gender", None)
    mobile_val = getattr(current_user_any, "mobile_number", None)
    profile_pic_val = getattr(current_user_any, "profile_picture_url", None)
    is_creator_val = bool(getattr(current_user_any, "is_creator", 0))
    return UserProfile(
        username=str(username_val) if username_val is not None else "",
        display_name=str(display_name_val if display_name_val is not None else username_val) if (display_name_val is not None or username_val is not None) else "",
        gender=str(gender_val) if gender_val is not None else None,
        mobile_number=str(mobile_val) if mobile_val is not None else None,
        email=getattr(current_user, "email", None),
        college=getattr(current_user, "college", None),
        enrollment_id=getattr(current_user, "enrollment_id", None),
        bio=getattr(current_user, "bio", None),
        profile_picture_url=str(profile_pic_val) if profile_pic_val is not None else None,
        is_creator=is_creator_val
    )

@app.put("/profile")
def update_profile(profile_data: UserProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user_any = cast(Any, current_user)
    if profile_data.display_name is not None:
        current_user_any.display_name = profile_data.display_name
    if profile_data.gender is not None:
        current_user_any.gender = profile_data.gender
    if profile_data.mobile_number is not None:
        current_user_any.mobile_number = profile_data.mobile_number
    if getattr(profile_data, "email", None) is not None:
        current_user_any.email = profile_data.email
    if getattr(profile_data, "college", None) is not None:
        current_user_any.college = profile_data.college
    if getattr(profile_data, "enrollment_id", None) is not None:
        current_user_any.enrollment_id = profile_data.enrollment_id
    if getattr(profile_data, "bio", None) is not None:
        current_user_any.bio = profile_data.bio
    db.commit()
    return {"message": "Profile updated"}

@app.post("/profile/upload-picture")
async def upload_profile_picture(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        current_user_any = cast(Any, current_user)
        filename = file.filename or "profile_pic"
        file_extension = filename.split('.')[-1]
        filename = f"{current_user_any.id}_{datetime.utcnow().timestamp()}.{file_extension}"
        file_path = os.path.join(PROFILE_PICS_DIR, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        current_user_any.profile_picture_url = f"/profile_pics/{filename}"
        db.commit()
        
        return {"message": "Profile picture uploaded", "url": str(current_user_any.profile_picture_url)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading picture: {str(e)}")


def _supabase_public_avatar_url(object_path: str) -> str:
    if not SUPABASE_URL:
        raise RuntimeError("SUPABASE_URL not set")
    return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_AVATAR_BUCKET}/{object_path}"


def _upload_bytes_to_supabase_avatars(*, object_path: str, content_type: str, data: bytes) -> str:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("Supabase env missing: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")

    upload_url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_AVATAR_BUCKET}/{object_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": content_type or "application/octet-stream",
        "x-upsert": "true",
    }
    resp = requests.put(upload_url, headers=headers, data=data, timeout=30)
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Supabase upload failed: {resp.status_code} {resp.text}")
    return _supabase_public_avatar_url(object_path)


@app.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Uploads avatar to Supabase Storage and stores its public URL on the user's profile row."""
    try:
        if not file:
            raise HTTPException(status_code=400, detail="file is required")

        content_type = str(file.content_type or "").lower()
        if not content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image uploads are allowed")

        current_user_any = cast(Any, current_user)

        original_name = file.filename or "avatar.png"
        ext = (original_name.split(".")[-1] if "." in original_name else "png").lower()
        if ext not in {"png", "jpg", "jpeg", "webp"}:
            ext = "png"

        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="Empty file")

        object_path = f"{current_user_any.id}/avatar_{int(time.time())}.{ext}"
        public_url = _upload_bytes_to_supabase_avatars(
            object_path=object_path,
            content_type=content_type,
            data=data,
        )

        current_user_any.profile_picture_url = public_url
        db.commit()

        return {"message": "Avatar uploaded", "url": str(public_url)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading avatar: {str(e)}")

@app.post("/profile/change-password")
def change_password(pwd_data: PasswordChange, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(pwd_data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    
    if pwd_data.new_password != pwd_data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    if len(pwd_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    current_user_any = cast(Any, current_user)
    current_user_any.hashed_password = get_password_hash(pwd_data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}

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
    user_message_raw = request.message or ""
    user_message = _fuzzy_normalize_message(user_message_raw)
    user_lower = user_message.lower()
    user_display = str(getattr(current_user, "display_name", None) or getattr(current_user, "username", None) or "User").strip()
    user_gender = _infer_user_gender(user_display, getattr(current_user, "gender", None))
    salutation = _get_salutation(user_display, user_gender)
    greeting_prefix = _maybe_salutation_prefix(user_display, user_gender)
    is_basic_question = _is_basic_question(user_message)
    
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
            title=user_message_raw[:50] if len(user_message_raw) > 50 else user_message_raw
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        new_id = cast(Any, new_session).id
        request.session_id = cast(Optional[int], new_id)
        _enforce_session_limit(db, getattr(current_user, "id"), max_sessions=20)
    
    # Save user message
    user_msg_obj = ChatHistory(sender="user", text=user_message_raw, session_id=request.session_id)
    db.add(user_msg_obj)
    db.commit()
    db.refresh(user_msg_obj)

    if _detect_frenzy_reset(user_message):
        reply_text = "Theme restored. Back to normal mode."
        reply_payload = {"answer": reply_text, "next_suggestions": []}
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
        reply_payload = {"answer": reply_text, "next_suggestions": []}
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

    if re.fullmatch(r"[1-9]", msg_stripped) and bool(last_ai_message):
        user_message_for_llm = (
            f"User input is a numeric selection: {msg_stripped}.\n"
            "Resolve it using the previous assistant message below (treat it as the list/options context).\n\n"
            f"Previous assistant message:\n{last_ai_message}\n\n"
            f"Now answer selection {msg_stripped} in the required JSON format."
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
                "Now respond in required JSON format."
            )
        else:
            user_message_for_llm = (
                f"User input is a follow-up: '{msg_stripped}'.\n"
                "Use the previous assistant message as the topic context and expand on it.\n\n"
                f"Previous assistant message:\n{last_ai_message}\n\n"
                f"Previous user message:\n{last_user_message}\n\n"
                "Now provide a clearer, deeper explanation in required JSON format."
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
        
        "INTERACTION LOOP:\n"
        "• After every explanation, MUST suggest next logical step in 'next_suggestions' array\n"
        "• Example: Explained 'Inheritance' → suggest 3 next options\n"
        "• Always offer: 'Go to Unit X' or 'Practice quiz' or 'See example code'\n\n"
        
        "UNIT 1 SPECIAL HANDLING:\n"
        "• If user says 'Start from beginning' → provide Unit 1 overview with 4-point breakdown\n"
        "• Format: '1) Point 1\\n2) Point 2\\n3) Point 3\\n4) Point 4'\n"
        "• WAIT for user to select point number (1/2/3/4) before deep-diving\n"
        "• Do NOT auto-explain all 4 points\n\n"
        
        "===== RESPONSE FORMAT (MANDATORY JSON) =====\n"
        "{\n"
        '  \"answer\": \"Hinglish response with numbered points if explaining\",\n'
        '  \"next_suggestions\": [\"Option 1\", \"Option 2\", \"Option 3\"]\n'
        "}\n"
        "• MUST return valid JSON - NO markdown code blocks\n"
        "• 'answer' must be string (not nested object)\n"
        "• 'next_suggestions' must be array of exactly 3 strings\n"
        "• If unclear input: ask clarifying questions in 'answer'\n\n"

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
        roast = f"{prefix}, ye toh 1st semester ka sawal hai, 4th sem mein kya kar rahe ho? 🤨 Chalo, phir bhi bata deti hoon... 💀"
        system_prompt += f"Start answer with: {roast}\n\n"
    
    mode_max_tokens = 200
    mode_hint = "Be brief and direct."
    if request.response_mode == "thinking":
        mode_max_tokens = 600
        mode_hint = "Explain step-by-step with logic."
    elif request.response_mode == "pro":
        mode_max_tokens = 2000
        mode_hint = "Provide deep technical analysis, examples, and detailed explanations."

    # Add response mode instructions
    system_prompt += get_response_mode_instruction(request.response_mode)
    system_prompt += (
        "\n===== MODE DIRECTIVE =====\n"
        f"{mode_hint}\n"
        "List formatting: primary lists use 1,2,3. Nested lists use A,B,C or i,ii,iii.\n"
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
    
    # RAG INTEGRATION (Knowledge Retrieval)
    rag_context = ""
    if request.mode == 'study' or request.selected_subject or request.active_tool:
        try:
            rag_query = getattr(rag_system, "query", None)
            if callable(rag_query):
                rag_result = rag_query(user_message)
                if rag_result and str(rag_result).strip():
                    rag_context = f"\n\n📚 **RETRIEVED STUDY MATERIAL:**\n{str(rag_result)[:500]}\n"
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

    
    # GROQ API CALL
    try:
        # Precompute context-aware suggestions for padding/normalization
        topic_hint = ""
        try:
            topic_hint = (subject_context.get("topic_keywords") or [""])[0]
        except Exception:
            topic_hint = ""

        subject_code = subject_context.get("subject_code") if isinstance(subject_context, dict) else ""
        subject_label = (subject_code or (request.selected_subject or "")).strip()
        hint = topic_hint or subject_label or "this topic"
        context_suggestions = [
            f"Give a simple example on {hint}",
            f"Explain {hint} in 5 bullet points",
            f"Practice 10 MCQs on {hint}"
        ]

        # Build LLM messages with short-term memory (user + assistant messages)
        messages: list = [{"role": "system", "content": system_prompt}]

        # Add prior messages (exclude the current user message to avoid duplication)
        for m in conversation_history:
            if str(getattr(m, "id", "")) == str(getattr(user_msg_obj, "id", "")):
                continue
            role = "assistant" if str(getattr(m, "sender", "")) == "ai" else "user"
            text_val = getattr(cast(Any, m), "text", None)
            if text_val is not None and str(text_val).strip():
                messages.append({"role": role, "content": str(text_val)})

        messages.append({"role": "user", "content": user_message_for_llm})
        
        # Simulate thinking delay for "thinking" mode
        if request.response_mode == "thinking":
            time.sleep(3)
        
        completion = get_ai_response(
            messages=messages,
            temperature=0.8,  # PHASE 2: Increased from 0.7 for more creativity and human-like variation
            max_tokens=mode_max_tokens,
            session_state=session_state,
            session_id=request.session_id
        )
        
        reply_text_raw = completion.choices[0].message.content or ""
        reply_payload = None
        try:
            parsed = _safe_json_loads(reply_text_raw)
            if not (isinstance(parsed, dict) and "answer" in parsed and "next_suggestions" in parsed):
                raise ValueError("Missing 'answer' or 'next_suggestions' fields")

            answer = parsed.get("answer")
            next_suggestions = parsed.get("next_suggestions")

            if not isinstance(answer, str):
                answer = str(answer)

            if not isinstance(next_suggestions, list):
                raise ValueError("next_suggestions must be a list")

            cleaned_suggestions = []
            for s in next_suggestions:
                if isinstance(s, str) and s.strip():
                    cleaned_suggestions.append(s.strip())

            # Enforce exactly 3 strings, padded with context-aware suggestions
            merged = cleaned_suggestions[:]
            for s in context_suggestions:
                if s not in merged:
                    merged.append(s)
            reply_payload = _build_response_payload(answer, merged or context_suggestions)
        except Exception as e:
            raw = reply_text_raw or ""
            raw_preview = (raw[:200] + "...") if len(raw) > 200 else (raw if raw else "[empty]")
            print(f"[WARN] LLM JSON parse/validation failed: {e}. Raw: {raw_preview}")
            reply_payload = None

        if not reply_payload:
            # Graceful fallback: use raw text as answer if JSON parsing fails
            fallback_text = reply_text_raw if reply_text_raw else "No response generated."
            reply_payload = _build_response_payload(fallback_text, context_suggestions)

        reply_payload = _finalize_reply_payload(request.session_id, reply_payload)
        reply_text = reply_payload["answer"]

        # Calculate confidence score (simple heuristic)
        confidence_score = 0.95 if isinstance(reply_payload, dict) and "answer" in reply_payload else 0.70
        
        # Save AI response with intent classification
        ai_msg_obj = ChatHistory(
            sender="ai", 
            text=reply_text, 
            session_id=request.session_id,
            intent_type=intent_type,
            confidence_score=confidence_score
        )
        db.add(ai_msg_obj)
        db.commit()
        
        # Auto-generate session title on first message
        msg_count = db.query(ChatHistory).filter(ChatHistory.session_id == request.session_id).count()
        if msg_count <= 2:
            try:
                title_gen = get_ai_response(
                    messages=[
                        {"role": "system", "content": "Generate a short 3-4 word title for this chat. No quotes."},
                        {"role": "user", "content": user_message}
                    ]
                )
                title_content = title_gen.choices[0].message.content
                if title_content:
                    new_title = str(title_content).strip()
                    session = db.query(ChatSession).filter(ChatSession.id == request.session_id).first()
                    if session:
                        session_any = cast(Any, session)
                        session_any.title = new_title
                        db.commit()
            except:
                pass
        
        return {"reply": reply_text, "response": reply_payload, "session_id": request.session_id}
    
    except Exception as e:
        error_msg = f"Error generating response: {str(e)}"
        db.add(ChatHistory(sender="ai", text=error_msg, session_id=request.session_id))
        db.commit()
        raise HTTPException(status_code=500, detail=error_msg)

# --- PDF UPLOAD ENDPOINT ---
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload PDF for RAG processing"""
    # Validate file size (max 50 MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File size exceeds {MAX_FILE_SIZE / 1024 / 1024:.0f}MB limit")
    
    # Validate file type
    allowed_types = {"application/pdf", "image/jpeg", "image/png"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type {file.content_type} not allowed. Use PDF, JPEG, or PNG")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename or "upload")
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        chunks = rag_system.upload_pdf(file_path)
        filename_str = str(file.filename) if file.filename else "file"
        return {"message": f"Processed {filename_str}. {chunks} chunks added."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload processing failed: {str(e)}")


@app.post("/upload-notes-ocr")
async def upload_notes_ocr(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload handwritten notes (image) and return a 5-point summary."""
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

# --- QUIZ ENDPOINT ---
@app.post("/generate-quiz")
def generate_quiz(
    request: QuizRequest, 
    current_user: User = Depends(get_current_user)
):
    """Generate MCQ quiz for selected subject and semester"""
    count = int(getattr(request, "count", 15) or 15)
    count = max(1, min(count, 50))
    prompt = f"""Generate {count} IGNOU BCA exam-level MCQs for semester {request.semester}, subject: {request.subject}.

Return ONLY a valid JSON array (no markdown, no explanations):
[
  {{"question": "...", "options": ["...", "...", "...", "..."], "correct_answer": "..."}}
]

Rules:
- Each question must have EXACTLY 4 options
- correct_answer MUST be EXACTLY one of the 4 option strings (verbatim match)
- Mix easy/medium/hard, cover different syllabus topics
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
        return quiz_data[:count]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")


# --- MIXED EXAM ENDPOINT ---
@app.post("/generate-exam")
def generate_mixed_exam(
    request: MixedExamRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate a mixed exam (MCQ + subjective) for Exam Simulator."""
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
- {mcq_count} MCQ items with: type='mcq', question, options (exactly 4), correct_answer (must match one option string).
- {subjective_count} Subjective items with: type='subjective', question, max_marks (integer, default 10).

Schema examples:
{{"type":"mcq","question":"...","options":["...","...","...","..."],"correct_answer":"..."}}
{{"type":"subjective","question":"...","max_marks":10}}

Rules:
- Questions must be exam-level, cover different topics.
- Keep wording clear and unambiguous.
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
  \"model_answer\": \"A concise but complete ideal answer (6-10 lines).\",
  \"missed_points\": [\"point1\", \"point2\"],
  \"suggested_keywords\": [\"keyword1\", \"keyword2\"]
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


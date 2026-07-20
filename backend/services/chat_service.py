from core.dependencies import *
from core.dependencies import (
    _looks_like_provider_rate_limit,
    _hard_chop_next_suggestions,
    _build_provider_rate_limit_message,
    _choose_completion_budget
)
import json_repair
# --- SYLLABUS MAPPING (STRICT) ---
with open(os.path.join(os.path.dirname(__file__), "..", "syllabus.json"), "r", encoding="utf-8") as f:
    SUBJECT_TITLES = json.load(f)
with open(os.path.join(os.path.dirname(__file__), "..", "syllabus_topics.json"), "r", encoding="utf-8") as f:
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

def _extract_json_candidate(text: str) -> str:
    if not text:
        return ""
    start = None
    for i, ch in enumerate(text):
        if ch in "[{":
            start = i
            break
    if start is None:
        return ""

    stack = []
    for j in range(start, len(text)):
        ch = text[j]
        if ch in "[{":
            stack.append(ch)
        elif ch in "]}":
            if not stack:
                continue
            last = stack.pop()
            if (last == "[" and ch != "]") or (last == "{" and ch != "}"):
                return ""
            if not stack:
                return text[start : j + 1]
    return ""

def _safe_json_loads(text: str):
    cleaned = _clean_json_text(text)
    if not cleaned:
        raise ValueError("Empty JSON")

    try:
        return json.loads(cleaned, strict=False)
    except Exception as e:
        try:
            repaired = json_repair.repair_json(cleaned, return_objects=True)
            if repaired is not None and not isinstance(repaired, str):
                return repaired
                
            candidate = _extract_json_candidate(cleaned)
            if candidate:
                repaired_candidate = json_repair.repair_json(candidate, return_objects=True)
                if repaired_candidate is not None and not isinstance(repaired_candidate, str):
                    return repaired_candidate
            
            raise ValueError(f"Repair returned invalid object. Original error: {str(e)}")
        except Exception as e2:
            raise ValueError(f"Invalid JSON: {str(e2)}")

def _repair_json_with_ai(raw_text: str, schema_hint: str, max_tokens: int = 1400):
    if not str(raw_text or "").strip():
        raise ValueError("Empty JSON")
    repair_prompt = (
        "You are a JSON repair tool. Return ONLY valid JSON. "
        "Do not add explanations, markdown, or extra keys. "
        "Do not remove items unless absolutely required to make JSON valid.\n"
        f"Schema: {schema_hint}\n"
        "Input:\n"
        f"{raw_text}"
    )
    completion = get_ai_response(
        messages=[{"role": "user", "content": repair_prompt}],
        temperature=0.0,
        max_tokens=max_tokens,
    )
    repaired_text = str(getattr(completion.choices[0].message, "content", "") or "")
    return _safe_json_loads(repaired_text)

def _normalize_quiz_items(parsed: Any, count: int) -> list[QuizQuestion]:
    if isinstance(parsed, dict):
        parsed = parsed.get("questions", parsed.get("items", []))
    if not isinstance(parsed, list):
        raise ValueError("Quiz payload is not a list")

    normalized: list[QuizQuestion] = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        question = str(item.get("question", "") or item.get("q", "")).strip()
        options = item.get("options", item.get("choices", []))
        correct_answer = str(item.get("correct_answer", "") or item.get("answer", "")).strip()
        if not question:
            continue
        if not isinstance(options, list):
            options = []
        option_values = [str(opt).strip() for opt in options if str(opt).strip()]
        if len(option_values) < 2:
            continue
        if not correct_answer or correct_answer not in option_values:
            correct_answer = option_values[0]

        normalized.append(
            QuizQuestion(
                question=question,
                options=option_values[:6],
                correct_answer=correct_answer,
            )
        )

        if len(normalized) >= count:
            break

    if not normalized:
        raise ValueError("No valid quiz questions generated")

    return normalized

def _normalize_subjective_items(parsed: Any, limit: int, subject: str, semester: str) -> list[dict[str, Any]]:
    if isinstance(parsed, dict):
        parsed = parsed.get("questions", parsed.get("items", []))
    if not isinstance(parsed, list):
        return []

    result: list[dict[str, Any]] = []
    for item in parsed[:limit]:
        if not isinstance(item, dict):
            continue
        question = str(item.get("question", "") or item.get("q", "")).strip()
        if not question:
            continue
        max_marks = int(item.get("max_marks", 10) or 10)
        model_answer = str(item.get("model_answer", "") or item.get("answer", "")).strip()
        result.append(
            {
                "question": question,
                "type": "subjective",
                "max_marks": max(2, min(max_marks, 20)),
                "model_answer": model_answer,
                "subject": subject,
                "semester": semester,
            }
        )

    return result

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
            model=LITE_MODEL,
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

# --- Cost Management: Semantic Cache ---
# In a real environment, replace this with Upstash Redis. For now, an in-memory dict saves tokens for identical queries.
_SEMANTIC_CACHE = {}
import hashlib
import json

def _get_cache_key(messages: list) -> str:
    # Hash the last 3 messages to create a deterministic cache key for the context
    context = json.dumps(messages[-3:] if len(messages) >= 3 else messages, sort_keys=True)
    return hashlib.md5(context.encode()).hexdigest()

def get_ai_response(prompt=None, messages=None, models=None, session_state=None, session_id=None, tier="pro", **kwargs):
    """Groq single-model completion with strict auto-resume stitching."""
    if messages is None:
        messages = [{"role": "user", "content": str(prompt) if prompt is not None else ""}]

    chosen_model = LITE_MODEL if tier == "lite" else PRO_MODEL

    # Semantic Cache Check
    cache_key = _get_cache_key(messages)
    if cache_key in _SEMANTIC_CACHE:
        print(f"[COST SAVER] Serving identical query from Semantic Cache! Token cost: $0")
        return _SEMANTIC_CACHE[cache_key]

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

    if "max_tokens" not in kwargs:
        kwargs["max_tokens"] = _choose_completion_budget(user_prompt, cast(Optional[list[dict[str, Any]]], safe_messages))
    else:
        kwargs["max_tokens"] = min(int(kwargs["max_tokens"]), MAX_TOKENS)

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
                model=chosen_model,
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
    
    # Removed destructive .split('"answer":') logic to prevent breaking valid JSON payloads

    if last_response is not None:
        cast(Any, last_response).choices[0].message.content = clean_response
        
        # Save to Semantic Cache to prevent token burn on identical follow-up requests
        _SEMANTIC_CACHE[_get_cache_key(messages)] = last_response
        
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


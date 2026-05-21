from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Any
from sqlalchemy.orm import Session
from database import get_db, User, ChatSession
from auth_utils import get_current_user
from core.dependencies import *
from services.chat_service import *

router = APIRouter(tags=['dashboard'])

@router.get("/dashboard-stats")
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

@router.get("/debug/session-state")
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

@router.get("/syllabus-progress")
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

@router.get("/study-roadmap/latest")
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


@router.post("/study-roadmap/accept")
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


@router.get("/study-roadmap/history")
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

@router.post("/apc/performance-report")
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

@router.get("/apc/performance-summary/latest")
def get_latest_apc_performance_summary(current_user: User = Depends(get_current_user)):
    user_id = int(getattr(cast(Any, current_user), "id", 0) or 0)
    return USER_PERFORMANCE_REPORTS.get(user_id, {
        "generated_at": None,
        "eta_minutes": 1,
        "highlights": [],
        "report_markdown": "",
    })



# --- ENHANCED CHAT ENDPOINT ---


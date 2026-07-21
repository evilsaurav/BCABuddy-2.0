from fastapi import APIRouter, Depends, HTTPException, Request
from core.limiter import limiter
from sqlalchemy.orm import Session
from typing import Optional, Any, cast

from database import get_db, ChatSession, ChatHistory, User
from auth_utils import get_current_user

router = APIRouter(tags=["chat_sessions"])

def _is_chat_persistence_enabled(user: Any) -> bool:
    privacy_mode = bool(getattr(user, "privacy_mode", 0))
    auto_save_history = bool(getattr(user, "auto_save_history", 1))
    return (not privacy_mode) and auto_save_history

@router.get("/sessions")
def get_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not _is_chat_persistence_enabled(current_user):
        return []
    return db.query(ChatSession).filter(ChatSession.user_id == current_user.id).order_by(ChatSession.id.desc()).all()

@router.put("/sessions/{session_id}")
def rename_session(
    session_id: int, 
    title: str, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id, 
            ChatSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if not title or len(title.strip()) == 0:
            raise HTTPException(status_code=400, detail="Title cannot be empty")
        
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

@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id, 
            ChatSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        db.query(ChatHistory).filter(ChatHistory.session_id == session_id).delete()
        db.delete(session)
        db.commit()
        
        return {"message": "Session deleted successfully", "session_id": session_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting session: {str(e)}")

@router.delete("/sessions")
def clear_all_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).all()
        if not sessions:
            return {"message": "No sessions to clear", "deleted_sessions": 0, "deleted_messages": 0}

        session_ids = [int(getattr(cast(Any, s), "id", 0) or 0) for s in sessions]
        deleted_messages = 0
        if session_ids:
            deleted_messages = db.query(ChatHistory).filter(ChatHistory.session_id.in_(session_ids)).delete(synchronize_session=False)

        deleted_sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).delete(synchronize_session=False)
        db.commit()

        return {
            "message": "All sessions cleared successfully",
            "deleted_sessions": int(deleted_sessions or 0),
            "deleted_messages": int(deleted_messages or 0),
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error clearing sessions: {str(e)}")

@router.get("/history")
def get_history(
    session_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not _is_chat_persistence_enabled(current_user):
        return []

    if session_id is not None:
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        chats = db.query(ChatHistory).filter(ChatHistory.session_id == session_id).order_by(ChatHistory.id).all()
        return [{"id": c.id, "text": c.text, "sender": c.sender, "session_id": c.session_id} for c in chats]

    session_ids = [sid for (sid,) in db.query(ChatSession.id).filter(ChatSession.user_id == current_user.id).all()]
    if not session_ids:
        return []

    chats_desc = db.query(ChatHistory).filter(
        ChatHistory.session_id.in_(session_ids)
    ).order_by(ChatHistory.id.desc()).limit(500).all()
    chats = list(reversed(chats_desc))
    return [{"id": c.id, "text": c.text, "sender": c.sender, "session_id": c.session_id} for c in chats]

from core.dependencies import *
from core.dependencies import (
    _normalize_tool_key, 
    _resolve_study_tool_prompt_name, 
    _retrieve_exam_predictor_pyq_context, 
    _retrieve_study_material
)
from services.chat_service import *
from services.chat_service import (
    _generate_short_chat_title, 
    _detect_frenzy_reset, 
    _build_response_payload,
    _finalize_reply_payload, 
    _detect_frenzy_trigger, 
    _is_easter_egg_allowed
)

@router.post("/chat")
@limiter.limit("20/minute")
def chat_endpoint(http_request: Request, request: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    requested_mode = str(getattr(request, "mode", "auto") or "auto").strip().lower()
    is_lite_mode = requested_mode in {"lite", "fast", "quick"}

    user_message = request.message[:2200] if is_lite_mode else request.message[:4000]
    is_creator_user = bool(getattr(current_user, "is_creator", 0))
    active_tool_raw = getattr(request, "active_tool", None)
    active_tool_key = _normalize_tool_key(active_tool_raw)
    active_tool_prompt_name = _resolve_study_tool_prompt_name(active_tool_raw)
    selected_subject = str(getattr(request, "selected_subject", "") or "").strip()
    selected_semester = str(getattr(request, "selected_semester", "") or "").strip()
    persistence_enabled = _is_chat_persistence_enabled(current_user)

    # Session handling
    session_id = getattr(request, 'session_id', None) if persistence_enabled else None
    history = []
    if persistence_enabled:
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
        if persistence_enabled and session_id is not None:
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
        if persistence_enabled and session_id is not None:
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
        jiya_question_type = detect_jiya_question_type(user_message)
        if jiya_question_type == "jiya_identity":
            system_prompt = get_jiya_identity_prompt(is_creator_user)
        elif jiya_question_type == "developer_crush":
            system_prompt = get_developer_crush_prompt(is_creator_user)
        elif jiya_question_type == "ai_love":
            system_prompt = get_ai_love_prompt(is_creator_user)
        else:
            system_prompt = get_jiya_prompt(is_creator_user)
    elif persona_trigger == "april19" and easter_egg_allowed:
        system_prompt = get_april_19_prompt(is_creator_user)
    else:
        system_prompt = get_saurav_prompt(is_creator_user)

    system_prompt += get_response_mode_instruction(
        str(getattr(request, "response_mode", "fast") or "fast")
    )

    tool_context = ""
    if persona_trigger != "jiya" and active_tool_prompt_name:
        tool_prompt = get_study_tool_prompt(active_tool_prompt_name, selected_subject)
        if tool_prompt:
            system_prompt += f"\n\n{tool_prompt}"

        if active_tool_key == "exam predictor":
            tool_context, _ = _retrieve_exam_predictor_pyq_context(
                selected_subject=selected_subject,
                selected_semester=selected_semester,
                k=20 if is_lite_mode else 30,
            )
        else:
            tool_context, _, _ = _retrieve_study_material(
                user_query=user_message,
                active_tool=active_tool_raw,
                k=4 if is_lite_mode else 7,
            )

        if tool_context:
            system_prompt += (
                "\n\nREFERENCE_CONTEXT_START\n"
                f"{tool_context[:7000]}\n"
                "REFERENCE_CONTEXT_END"
            )

    if is_lite_mode:
        system_prompt += (
            "\n\nLITE MODE ACTIVE: keep answer concise, direct, and exam-focused. "
            "Avoid long storytelling. Use short bullets where possible."
        )

    messages = [{"role": "system", "content": system_prompt}]
    history_window = 6 if is_lite_mode else 10
    try:
        user_message = request.message[:2200] if is_lite_mode else request.message[:4000]
        is_creator_user = bool(getattr(current_user, "is_creator", 0))
        active_tool_raw = getattr(request, "active_tool", None)
        active_tool_key = _normalize_tool_key(active_tool_raw)
        active_tool_prompt_name = _resolve_study_tool_prompt_name(active_tool_raw)
        selected_subject = str(getattr(request, "selected_subject", "") or "").strip()
        selected_semester = str(getattr(request, "selected_semester", "") or "").strip()
        persistence_enabled = _is_chat_persistence_enabled(current_user)

        # Session handling
        session_id = getattr(request, 'session_id', None) if persistence_enabled else None
        history = []
        if persistence_enabled:
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
            if persistence_enabled and session_id is not None:
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
            if persistence_enabled and session_id is not None:
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
            jiya_question_type = detect_jiya_question_type(user_message)
            if jiya_question_type == "jiya_identity":
                system_prompt = get_jiya_identity_prompt(is_creator_user)
            elif jiya_question_type == "developer_crush":
                system_prompt = get_developer_crush_prompt(is_creator_user)
            elif jiya_question_type == "ai_love":
                system_prompt = get_ai_love_prompt(is_creator_user)
            else:
                system_prompt = get_jiya_prompt(is_creator_user)
        elif persona_trigger == "april19" and easter_egg_allowed:
            system_prompt = get_april_19_prompt(is_creator_user)
        else:
            system_prompt = get_saurav_prompt(is_creator_user)

        system_prompt += get_response_mode_instruction(
            str(getattr(request, "response_mode", "fast") or "fast")
        )

        tool_context = ""
        if persona_trigger != "jiya" and active_tool_prompt_name:
            tool_prompt = get_study_tool_prompt(active_tool_prompt_name, selected_subject)
            if tool_prompt:
                system_prompt += f"\n\n{tool_prompt}"

            if active_tool_key == "exam predictor":
                tool_context, _ = _retrieve_exam_predictor_pyq_context(
                    selected_subject=selected_subject,
                    selected_semester=selected_semester,
                    k=20 if is_lite_mode else 30,
                )
            else:
                tool_context, _, _ = _retrieve_study_material(
                    user_query=user_message,
                    active_tool=active_tool_raw,
                    k=4 if is_lite_mode else 7,
                )

            if tool_context:
                system_prompt += (
                    "\n\nREFERENCE_CONTEXT_START\n"
                    f"{tool_context[:7000]}\n"
                    "REFERENCE_CONTEXT_END"
                )

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
            import traceback
            err_msg = traceback.format_exc()
            raise HTTPException(status_code=500, detail=f"AI Response Error: {err_msg}")

        try:
            # Save AI response
            if persistence_enabled and session_id is not None:
                db.add(ChatHistory(session_id=session_id, sender="ai", text=ai_text))
                db.commit()

            payload = _build_response_payload(ai_text)
            payload["session_id"] = session_id
            payload["mode"] = "lite" if is_lite_mode else requested_mode
            return _finalize_reply_payload(session_id, payload)
        except Exception as e:
            import traceback
            err_msg = traceback.format_exc()
            raise HTTPException(status_code=500, detail=f"Payload Build Error: {err_msg}")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Global Chat Error: {err_msg}")

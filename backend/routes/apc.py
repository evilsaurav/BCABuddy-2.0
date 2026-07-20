from datetime import datetime
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth_utils import get_current_user
from database import APCLog, User, get_db
from services.chat_service import get_ai_response, _safe_json_loads

router = APIRouter()

class ExamPredictorRequest(BaseModel):
    semester: str
    subject: str


@router.post("/apc/log")
def log_apc_activity(
    tool: str,
    subject: str,
    response: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.add(
        APCLog(
            user_id=current_user.id,
            tool_name=tool,
            subject=subject,
            response_text=response,
        )
    )
    db.commit()
    return {"ok": True}


@router.get("/apc/history")
def get_apc_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = (
        db.query(APCLog)
        .filter(APCLog.user_id == current_user.id)
        .order_by(APCLog.id.desc())
        .limit(50)
        .all()
    )
    return logs

@router.post("/apc/performance-report")
def generate_performance_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = db.query(APCLog).filter(APCLog.user_id == current_user.id).order_by(APCLog.id.desc()).limit(20).all()
    if not logs:
        return {
            "highlights": ["No data available yet"],
            "report_markdown": "### No Data\nStart using the APC tools (Quizzes, Assignments, etc.) to generate a report.",
            "generated_at": datetime.utcnow().isoformat(),
            "eta_minutes": 0,
        }
    
    # Summarize history
    summary_text = "\n".join([f"- Tool: {l.tool_name}, Subject: {l.subject}" for l in logs])
    prompt = (
        "You are an AI academic counselor. Analyze the user's recent study tool usage and generate a performance report.\n"
        f"Usage History:\n{summary_text}\n\n"
        "Return a JSON object with strictly this schema:\n"
        '{"highlights": ["bullet 1", "bullet 2"], "report_markdown": "Detailed markdown analysis..."}\n'
        "Rules:\n1. Keep it encouraging.\n2. Output ONLY JSON."
    )
    
    try:
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            tier="lite",
            temperature=0.3,
            max_tokens=1500,
            response_format={"type": "json_object"}
        )
        raw = str(getattr(completion.choices[0].message, "content", "") or "")
        parsed = _safe_json_loads(raw)
        return {
            "highlights": parsed.get("highlights", ["Keep up the good work!"]),
            "report_markdown": parsed.get("report_markdown", "### Performance Report\nKeep up the consistent effort!"),
            "generated_at": datetime.utcnow().isoformat(),
            "eta_minutes": 0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/apc/predict-exam")
def predict_exam(
    request: ExamPredictorRequest,
    current_user: User = Depends(get_current_user),
):
    prompt = (
        f"You are an IGNOU BCA examiner. Based on historical trends, predict the most important topics "
        f"for Semester {request.semester}, Subject: {request.subject}. "
        "Return a JSON object with this schema:\n"
        '{"predictions": ["Topic 1: ...", "Topic 2: ..."]}'
    )
    try:
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            tier="lite",
            temperature=0.4,
            max_tokens=800,
            response_format={"type": "json_object"}
        )
        raw = str(getattr(completion.choices[0].message, "content", "") or "")
        parsed = _safe_json_loads(raw)
        return {"predictions": parsed.get("predictions", [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

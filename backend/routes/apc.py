from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth_utils import get_current_user
from database import APCLog, User, get_db

router = APIRouter()


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

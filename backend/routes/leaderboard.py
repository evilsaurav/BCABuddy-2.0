from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Any, cast

from core.dependencies import get_current_user, get_db
from database import User
from pydantic import BaseModel

router = APIRouter()

class LeaderboardUser(BaseModel):
    username: str
    display_name: str
    profile_pic_url: str | None = None
    semester: int | None = None
    total_xp: int
    highest_exam_score: float
    current_streak: int

class LeaderboardResponse(BaseModel):
    top_xp: List[LeaderboardUser]
    top_scores: List[LeaderboardUser]
    top_streaks: List[LeaderboardUser]

@router.get("/", response_model=LeaderboardResponse)
def get_leaderboard(db: Session = Depends(get_db)):
    # Fetch top 50 users for each category
    top_xp_users = db.query(User).order_by(desc(User.total_xp)).limit(50).all()
    top_scores_users = db.query(User).order_by(desc(User.highest_exam_score)).limit(50).all()
    top_streaks_users = db.query(User).order_by(desc(User.current_streak)).limit(50).all()
    
    def _map_user(u: Any) -> LeaderboardUser:
        pic = getattr(u, "profile_picture_url", None) or getattr(u, "profile_pic_url", None)
        return LeaderboardUser(
            username=str(u.username),
            display_name=str(u.display_name or u.username),
            profile_pic_url=str(pic) if pic else None,
            total_xp=int(getattr(u, "total_xp", 0) or 0),
            highest_exam_score=float(getattr(u, "highest_exam_score", 0.0) or 0.0),
            current_streak=int(getattr(u, "current_streak", 0) or 0),
        )
        
    return LeaderboardResponse(
        top_xp=[_map_user(u) for u in top_xp_users],
        top_scores=[_map_user(u) for u in top_scores_users],
        top_streaks=[_map_user(u) for u in top_streaks_users]
    )

class ScoreSubmitRequest(BaseModel):
    activity_type: str # "quick_quiz", "full_exam", "chat"
    score_percentage: float | None = None
    
@router.post("/submit")
def submit_score(
    request: ScoreSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_any = cast(Any, current_user)
    xp_gained = 0
    
    # Base XP calculation
    if request.activity_type == "quick_quiz":
        xp_gained = 10
        if request.score_percentage is not None and request.score_percentage >= 80:
            xp_gained += 5 # Bonus
    elif request.activity_type == "full_exam":
        xp_gained = 50
        if request.score_percentage is not None and request.score_percentage >= 80:
            xp_gained += 50 # Bonus
            
        # Update highest exam score
        if request.score_percentage is not None:
            current_highest = float(getattr(user_any, "highest_exam_score", 0.0) or 0.0)
            if request.score_percentage > current_highest:
                user_any.highest_exam_score = request.score_percentage
                
    elif request.activity_type == "chat":
        xp_gained = 5
        
    # Streak logic (simple implementation: if not active today, increment streak)
    from datetime import date
    today_str = date.today().isoformat()
    last_active = getattr(user_any, "last_active_date", None)
    
    if last_active != today_str:
        user_any.last_active_date = today_str
        user_any.current_streak = int(getattr(user_any, "current_streak", 0) or 0) + 1
        xp_gained += 2 # Daily active bonus
        
    user_any.total_xp = int(getattr(user_any, "total_xp", 0) or 0) + xp_gained
    db.commit()
    
    return {
        "message": "XP awarded!",
        "xp_gained": xp_gained,
        "new_total_xp": user_any.total_xp,
        "current_streak": user_any.current_streak
    }

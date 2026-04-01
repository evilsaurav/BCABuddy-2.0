"""
BCABuddy Pydantic Models — Author: Saurav Kumar
"""
from pydantic import BaseModel, Field
from typing import Optional, List

class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ChatRequest(BaseModel):
    message: str
    mode: str = "auto"
    selected_subject: str = ""
    selected_semester: str = ""
    session_id: Optional[int] = None
    response_mode: str = "fast"
    active_tool: Optional[str] = None
    is_creator: bool = False

class ChatResponse(BaseModel):
    answer: str
    # next_suggestions permanently removed

class QuizRequest(BaseModel):
    subject: str
    semester: int
    count: int = 15

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str

class MixedExamRequest(BaseModel):
    subject: str
    semester: int
    mcq_count: int = 12
    subjective_count: int = 3

class MCQExplainRequest(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    subject: Optional[str] = None
    semester: Optional[int] = None

class ExplainQuestionRequest(BaseModel):
    action: str
    question_text: str
    correct_answer: str
    user_answer: Optional[str] = None

class SubjectiveGradeRequest(BaseModel):
    subject: str
    semester: int
    question: str
    answer: str
    max_marks: int = 10

class SubjectiveGradeResponse(BaseModel):
    score: int
    max_marks: int
    feedback: str
    model_answer: str = ""
    missed_points: List[str] = Field(default_factory=list)
    suggested_keywords: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)

class DashboardStats(BaseModel):
    total_sessions: int
    last_subject: str
    study_hours: float
    avg_quiz_score: float
    recent_activity: str

class UserProfile(BaseModel):
    username: str
    display_name: str
    gender: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[str] = None
    college: Optional[str] = None
    enrollment_id: Optional[str] = None
    bio: Optional[str] = None
    profile_pic_url: Optional[str] = None   # ← FIX #1 added
    is_creator: bool = False

class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    gender: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[str] = None
    college: Optional[str] = None
    enrollment_id: Optional[str] = None
    bio: Optional[str] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str
    confirm_password: str


class StudyPlanRequest(BaseModel):
    subjects: List[str] = Field(default_factory=list)
    days_left: int = 7
    daily_hours: float = 2.0
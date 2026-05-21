from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Any
from sqlalchemy.orm import Session
from database import get_db, User
from auth_utils import get_current_user
from core.dependencies import *
from services.chat_service import *

router = APIRouter(tags=['quiz'])

@router.post("/grade-subjective", response_model=SubjectiveGradeResponse)
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
            response_format={"type": "json_object"},
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

@router.post("/api/generate-study-plan", response_model=StudyPlanResponse)
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
            response_format={"type": "json_object"},
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

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Optional
from database import get_db, User
from auth_utils import get_current_user
from models import (
    QuizRequest, QuizQuestion, MixedExamRequest, 
    ExplainQuestionRequest, MCQExplainRequest
)

router = APIRouter(tags=["rag_features"])

@router.post("/upload-notes-ocr")
async def upload_notes_ocr(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    from services.chat_service import _extract_text_from_image_bytes, get_ai_response, _safe_json_loads, ProviderRateLimitError
    try:
        data = await file.read()
        extracted = _extract_text_from_image_bytes(data)
        if not extracted.strip():
            return {
                "filename": file.filename,
                "points": [],
                "extracted_text": "",
                "message": "No readable text found in uploaded file.",
            }

        prompt = (
            "Extract concise revision key points from the following OCR text. "
            "Return ONLY a valid JSON object with the key 'points' containing an array of short strings, max 12 items.\n"
            "Example: {\"points\": [\"point 1\"]}\n\n"
            f"OCR_TEXT:\n{extracted[:9000]}"
        )
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.25,
            max_tokens=700,
            response_format={"type": "json_object"},
        )
        raw_text = str(getattr(completion.choices[0].message, "content", "") or "")
        parsed = _safe_json_loads(raw_text)

        points: List[str] = []
        if isinstance(parsed, list):
            points = [str(p).strip() for p in parsed if str(p).strip()]
        elif isinstance(parsed, dict):
            maybe_points = parsed.get("points")
            if isinstance(maybe_points, list):
                points = [str(p).strip() for p in maybe_points if str(p).strip()]

        if not points:
            lines = [ln.strip(" -•\t") for ln in extracted.splitlines() if ln.strip()]
            points = lines[:8]

        return {
            "filename": file.filename,
            "points": points[:12],
            "extracted_text": extracted[:4000],
        }
    except ProviderRateLimitError as e:
        raise HTTPException(status_code=429, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR notes processing failed: {str(e)}")


@router.post("/apc/ocr-quiz")
async def apc_ocr_quiz(
    file: UploadFile = File(...),
    remarks: str = Form(default=""),
    current_user: User = Depends(get_current_user),
):
    from services.chat_service import _extract_text_from_image_bytes, get_ai_response, ProviderRateLimitError
    try:
        data = await file.read()
        extracted = _extract_text_from_image_bytes(data)
        if not extracted.strip():
            raise HTTPException(status_code=400, detail="No readable text found in uploaded image.")

        prompt = (
            "Create an exam-style quiz in markdown from the OCR text below. "
            "Output should include: heading, 8 MCQs with 4 options each, and an answer key at the end. "
            "Keep language Hinglish-friendly and concise.\n\n"
            f"REMARKS: {remarks or 'None'}\n\n"
            f"OCR_TEXT:\n{extracted[:9000]}"
        )
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=1400,
        )
        quiz_md = str(getattr(completion.choices[0].message, "content", "") or "").strip()

        if not quiz_md:
            quiz_md = "### OCR Quiz\n\nUnable to generate quiz right now. Please retry with a clearer image."

        return {
            "quiz_markdown": quiz_md,
            "extracted_text": extracted[:4000],
            "filename": file.filename,
        }
    except ProviderRateLimitError as e:
        raise HTTPException(status_code=429, detail=e.message)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"APC OCR quiz failed: {str(e)}")


@router.post("/explain-mcq")
def explain_mcq(
    request: MCQExplainRequest,
    current_user: User = Depends(get_current_user),
):
    from services.chat_service import get_ai_response, ProviderRateLimitError
    prompt = (
        "Explain this MCQ in simple Hinglish with clear reasoning. "
        "Provide: why correct option is right, why others are wrong, and one quick memory trick.\n\n"
        f"Question: {request.question}\n"
        f"Options: {request.options}\n"
        f"Correct Answer: {request.correct_answer}\n"
        f"Subject: {request.subject or 'N/A'} | Semester: {request.semester or 'N/A'}"
    )
    try:
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.35,
            max_tokens=800,
        )
        text = str(getattr(completion.choices[0].message, "content", "") or "").strip()
        return {"explanation": text or "Explanation not available."}
    except ProviderRateLimitError as e:
        raise HTTPException(status_code=429, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MCQ explanation failed: {str(e)}")


@router.post("/generate-quiz", response_model=List[QuizQuestion])
def generate_quiz(
    request: QuizRequest,
    current_user: User = Depends(get_current_user),
):
    from services.chat_service import get_ai_response, _safe_json_loads, _repair_json_with_ai, _normalize_quiz_items, ProviderRateLimitError
    count = max(1, min(int(request.count or 15), 50))
    prompt = (
        f"Generate exactly {count} IGNOU BCA MCQs for semester {request.semester}, subject {request.subject}. "
        "Return ONLY a valid JSON object containing a 'questions' array with this schema: "
        '{"questions": [{"question":"...","options":["A","B","C","D"],"correct_answer":"..."}]} '\
        "No markdown, no extra keys, no prose."
    )
    try:
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=2200,
            response_format={"type": "json_object"},
        )
        raw_text = str(getattr(completion.choices[0].message, "content", "") or "")
        try:
            parsed = _safe_json_loads(raw_text)
        except Exception:
            parsed = _repair_json_with_ai(
                raw_text,
                '{"questions": [{"question":"...","options":["A","B","C","D"],"correct_answer":"..."}]}',
                max_tokens=2200,
            )
        return _normalize_quiz_items(parsed, count)
    except ProviderRateLimitError as e:
        raise HTTPException(status_code=429, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")


@router.post("/generate-exam")
def generate_exam(
    request: MixedExamRequest,
    current_user: User = Depends(get_current_user),
):
    from services.chat_service import get_ai_response, _safe_json_loads, _repair_json_with_ai, _normalize_subjective_items
    mcq_count = max(1, min(int(request.mcq_count or 12), 40))
    subjective_count = max(0, min(int(request.subjective_count or 0), 20))

    quiz_items = generate_quiz(
        QuizRequest(subject=request.subject, semester=request.semester, count=mcq_count),
        current_user=current_user,
    )

    result = [
        {
            "question": q.question,
            "options": q.options,
            "correct_answer": q.correct_answer,
            "type": "mcq",
            "subject": request.subject,
            "semester": request.semester,
        }
        for q in quiz_items
    ]

    if subjective_count > 0:
        prompt = (
            f"Generate exactly {subjective_count} IGNOU BCA subjective questions for semester {request.semester}, "
            f"subject {request.subject}. Return ONLY a valid JSON object containing an 'items' array with schema: "
            '{"items": [{"question":"...","max_marks":10,"model_answer":"..."}]}'
        )
        try:
            completion = get_ai_response(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.45,
                max_tokens=1800,
                response_format={"type": "json_object"},
            )
            raw_text = str(getattr(completion.choices[0].message, "content", "") or "")
            try:
                parsed = _safe_json_loads(raw_text)
            except Exception:
                parsed = _repair_json_with_ai(
                    raw_text,
                    '{"items": [{"question":"...","max_marks":10,"model_answer":"..."}]}',
                    max_tokens=1800,
                )
            result.extend(
                _normalize_subjective_items(
                    parsed,
                    subjective_count,
                    request.subject,
                    request.semester,
                )
            )
        except Exception:
            pass

    return result


@router.post("/explain-question")
def explain_question(
    request: ExplainQuestionRequest,
    current_user: User = Depends(get_current_user),
):
    from services.chat_service import get_ai_response, ProviderRateLimitError
    prompt = (
        "Explain the question in simple Hinglish. Keep it exam-focused and concise.\n"
        f"Question: {request.question_text}\n"
        f"Correct answer: {request.correct_answer}\n"
        f"User answer: {request.user_answer or 'Not provided'}"
    )
    try:
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.35,
            max_tokens=700,
        )
        text = str(getattr(completion.choices[0].message, "content", "") or "").strip()
        return {"explanation": text or "Explanation not available."}
    except ProviderRateLimitError as e:
        raise HTTPException(status_code=429, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explain failed: {str(e)}")

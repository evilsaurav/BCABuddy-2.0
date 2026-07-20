@router.post("/generate-roadmap")
def generate_roadmap(
    request: StudyPlanRequest,
    current_user: User = Depends(get_current_user),
):
    from services.chat_service import get_ai_response, ProviderRateLimitError, _safe_json_loads
    prompt = (
        f"You are a study planner for an IGNOU BCA student. Create a day-by-day roadmap.\n"
        f"Subjects: {', '.join(request.subjects)}\n"
        f"Days left: {request.days_left}\n"
        f"Daily hours: {request.daily_hours}\n\n"
        "Return ONLY a valid JSON object with the following schema:\n"
        '{"roadmap": [{"day": 1, "focus_subject": "...", "topics_to_cover": ["..."], "estimated_hours": 2}]}\n'
        "CRITICAL RULES:\n"
        "1. Do not use unescaped quotes.\n"
        "2. Ensure the JSON is valid.\n"
        "3. Output ONLY JSON, no markdown.\n"
    )
    
    try:
        completion = get_ai_response(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=3000,
            response_format={"type": "json_object"},
        )
        raw_text = str(getattr(completion.choices[0].message, "content", "") or "")
        try:
            parsed = _safe_json_loads(raw_text)
            return parsed.get("roadmap", [])
        except Exception:
            return []
    except ProviderRateLimitError as e:
        raise HTTPException(status_code=429, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Roadmap generation failed: {str(e)}")

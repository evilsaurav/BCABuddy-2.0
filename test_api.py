"""
BCABuddy Comprehensive API Testing Script
Tests all endpoints systematically and generates detailed reports
"""

import requests
import json
import time
from datetime import datetime
from typing import Any, Dict, Optional

BASE_URL = "http://127.0.0.1:8000"
test_results = []

# Some endpoints (LLM/RAG-backed) can exceed the default requests timeout.
DEFAULT_TIMEOUT = 30
SLOW_TIMEOUT = 120

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    CYAN = '\033[96m'
    MAGENTA = '\033[95m'
    RESET = '\033[0m'

def print_colored(text, color):
    print(f"{color}{text}{Colors.RESET}")

def test_endpoint(name, test_func):
    """Wrapper to run a test and record results"""
    print(f"\n{'='*60}")
    print_colored(f"Testing: {name}", Colors.YELLOW)
    print(f"{'='*60}")
    
    try:
        result = test_func()
        print_colored(f"[PASS] {name}", Colors.GREEN)
        test_results.append({"name": name, "status": "PASSED", "result": result})
        return result
    except Exception as e:
        print_colored(f"[FAIL] {name}", Colors.RED)
        print_colored(f"Error: {str(e)}", Colors.RED)
        test_results.append({"name": name, "status": "FAILED", "error": str(e)})
        return None

# Global test context
test_context: Dict[str, Any] = {
    "username": None,
    "password": None,
    "token": None,
    "session_id": None,
    "mixed_exam": None
}

# Test 1: Health Check
def test_health():
    response = requests.get(f"{BASE_URL}/health")
    response.raise_for_status()
    data = response.json()
    print_colored(f"  Status: {data['status']}", Colors.CYAN)
    print_colored(f"  AI Service: {data['ai_service']}", Colors.CYAN)
    print_colored(f"  RAG Service: {data['rag_service']}", Colors.CYAN)
    return data

# Test 2: Signup
def test_signup():
    username = f"test_{int(time.time())}"
    password = "TestPass123!@#"
    
    data = {
        "username": username,
        "password": password,
        "display_name": "Comprehensive Test User",
        "gender": "Male"
    }
    
    response = requests.post(f"{BASE_URL}/signup", json=data)
    response.raise_for_status()
    result = response.json()
    
    print_colored(f"  Username: {result['username']}", Colors.CYAN)
    print_colored(f"  Display Name: {result.get('display_name', 'N/A')}", Colors.CYAN)
    
    # Save credentials
    test_context["username"] = username
    test_context["password"] = password
    
    return result

# Test 3: Login
def test_login():
    if not test_context["username"] or not test_context["password"]:
        raise Exception("No credentials from signup")
    
    data = {
        "username": test_context["username"],
        "password": test_context["password"]
    }
    
    response = requests.post(f"{BASE_URL}/login", data=data)
    response.raise_for_status()
    result = response.json()
    
    print_colored(f"  Token Type: {result['token_type']}", Colors.CYAN)
    print_colored(f"  Token (first 50 chars): {result['access_token'][:50]}...", Colors.CYAN)
    
    # Save token
    test_context["token"] = result["access_token"]
    
    return result

# Test 4: Get Profile
def test_get_profile():
    headers = {"Authorization": f"Bearer {test_context['token']}"}
    response = requests.get(f"{BASE_URL}/profile", headers=headers)
    response.raise_for_status()
    result = response.json()
    
    print_colored(f"  Username: {result['username']}", Colors.CYAN)
    print_colored(f"  Display Name: {result.get('display_name', 'N/A')}", Colors.CYAN)
    
    return result

# Test 5: Update Profile
def test_update_profile():
    headers = {"Authorization": f"Bearer {test_context['token']}"}
    data = {
        "display_name": "Updated Test User",
        "bio": "Comprehensive testing bio",
        "email": "test@bcabuddy.com",
        "mobile_number": "9876543210",
        "college": "Test College",
        "enrollment_id": "BCA2024TEST"
    }
    
    response = requests.put(f"{BASE_URL}/profile", json=data, headers=headers)
    response.raise_for_status()
    result = response.json()
    
    # The endpoint returns the updated profile
    display_name = result.get('display_name', 'N/A')
    email = result.get('email', 'N/A')
    
    print_colored(f"  Updated Display Name: {display_name if display_name else 'N/A'}", Colors.CYAN)
    print_colored(f"  Email: {email if email else 'N/A'}", Colors.CYAN)
    
    return result

# Test 6: Get Sessions
def test_get_sessions():
    headers = {"Authorization": f"Bearer {test_context['token']}"}
    response = requests.get(f"{BASE_URL}/sessions", headers=headers)
    response.raise_for_status()
    result = response.json()
    
    print_colored(f"  Total Sessions: {len(result) if isinstance(result, list) else 0}", Colors.CYAN)
    
    return result

# Test 7: Chat - Fast Mode
def test_chat_fast():
    headers = {"Authorization": f"Bearer {test_context['token']}"}
    data = {
        "message": "What is polymorphism in Java?",
        "mode": "normal",
        "selected_subject": "MCS-024",
        "response_mode": "fast"
    }
    
    response = requests.post(f"{BASE_URL}/chat", json=data, headers=headers, timeout=DEFAULT_TIMEOUT)
    response.raise_for_status()
    result = response.json()
    
    reply_text = result.get("reply", "")
    answer = result.get("response", {}).get("answer", "")
    suggestions = result.get("response", {}).get("next_suggestions", [])
    
    print_colored(f"  Reply Length: {len(reply_text)} chars", Colors.CYAN)
    print_colored(f"  Suggestions: {len(suggestions)}", Colors.CYAN)
    print_colored(f"  Preview: {reply_text[:100]}...", Colors.CYAN)
    
    return result

# Test 8: Chat - Thinking Mode
def test_chat_thinking():
    headers = {"Authorization": f"Bearer {test_context['token']}"}
    data = {
        "message": "Explain inheritance with example",
        "mode": "normal",
        "selected_subject": "MCS-024",
        "response_mode": "thinking"
    }
    
    print_colored("  Sending message in Thinking mode (3s delay expected)...", Colors.YELLOW)
    response = requests.post(f"{BASE_URL}/chat", json=data, headers=headers, timeout=SLOW_TIMEOUT)
    response.raise_for_status()
    result = response.json()
    
    reply_text = result.get("reply", "")
    suggestions = result.get("response", {}).get("next_suggestions", [])
    
    print_colored(f"  Reply Length: {len(reply_text)} chars", Colors.CYAN)
    print_colored(f"  Suggestions: {', '.join(suggestions[:2])}...", Colors.CYAN)
    
    return result

# Test 9: Chat History
def test_chat_history():
    headers = {"Authorization": f"Bearer {test_context['token']}"}
    response = requests.get(f"{BASE_URL}/history", headers=headers)
    response.raise_for_status()
    result = response.json()
    
    print_colored(f"  Total Messages: {len(result) if isinstance(result, list) else 0}", Colors.CYAN)
    
    return result

# Test 10: Dashboard Stats
def test_dashboard_stats():
    headers = {"Authorization": f"Bearer {test_context['token']}"}
    response = requests.get(f"{BASE_URL}/dashboard-stats", headers=headers)
    response.raise_for_status()
    result = response.json()
    
    print_colored(f"  Total Chats: {result.get('total_chats', 0)}", Colors.CYAN)
    print_colored(f"  Total Sessions: {result.get('total_sessions', 0)}", Colors.CYAN)
    
    return result

# Test 11: Quiz Generation
def test_quiz_generation():
    headers = {"Authorization": f"Bearer {test_context['token']}"}
    data = {
        "semester": 4,
        "subject": "MCS-024"
    }
    
    print_colored("  Generating quiz (may take 10-15 seconds)...", Colors.YELLOW)
    response = requests.post(f"{BASE_URL}/generate-quiz", json=data, headers=headers, timeout=45)
    response.raise_for_status()
    result = response.json()
    
    # Quiz endpoint returns a list directly
    questions = result if isinstance(result, list) else result.get('questions', [])
    print_colored(f"  Questions Generated: {len(questions)}", Colors.CYAN)
    
    if questions and len(questions) > 0:
        print_colored(f"  Sample Question: {questions[0].get('question', '')[:80]}...", Colors.CYAN)
    
    return result

# Test 12: Mixed Exam Generation (MCQ + Subjective)
def test_mixed_exam_generation():
    headers = {"Authorization": f"Bearer {test_context['token']}"}
    data = {
        "semester": 4,
        "subject": "MCS-024",
        "mcq_count": 4,
        "subjective_count": 1
    }

    print_colored("  Generating mixed exam (may take 10-20 seconds)...", Colors.YELLOW)
    response = requests.post(f"{BASE_URL}/generate-exam", json=data, headers=headers, timeout=60)
    response.raise_for_status()
    result = response.json()

    if not isinstance(result, list):
        raise Exception("/generate-exam did not return a JSON array")

    print_colored(f"  Total Items: {len(result)}", Colors.CYAN)
    types = [str(q.get('type', '')).lower() for q in result if isinstance(q, dict)]
    print_colored(f"  Types: {types}", Colors.CYAN)

    has_mcq = any(t == 'mcq' for t in types)
    has_subjective = any(t == 'subjective' for t in types)
    if not has_mcq:
        raise Exception("No MCQ items found in mixed exam")
    if not has_subjective:
        raise Exception("No subjective items found in mixed exam")

    # Basic schema validation for one MCQ
    mcq = next((q for q in result if isinstance(q, dict) and str(q.get('type', '')).lower() == 'mcq'), None)
    if mcq:
        opts = mcq.get('options', [])
        if not isinstance(opts, list) or len(opts) != 4:
            raise Exception("MCQ item does not have exactly 4 options")
        if not mcq.get('correct_answer'):
            raise Exception("MCQ item missing correct_answer")

    # Save for later subjective grading test
    test_context["mixed_exam"] = result

    return result

# Test 13: Subjective Grading
def test_subjective_grading():
    headers = {"Authorization": f"Bearer {test_context['token']}"}

    mixed = test_context.get("mixed_exam")
    subj = None
    if isinstance(mixed, list):
        subj = next((q for q in mixed if isinstance(q, dict) and str(q.get('type', '')).lower() == 'subjective'), None)

    question_text = (subj or {}).get("question") or "Explain Java inheritance with one example."
    max_marks = int((subj or {}).get("max_marks") or 10)

    data = {
        "semester": 4,
        "subject": "MCS-024",
        "question": question_text,
        "answer": "Inheritance ka matlab hota hai ek class dusri class ki properties/methods inherit kare. Java me `extends` use hota hai. Example: class A { void show(){} } class B extends A { }.",
        "max_marks": max_marks
    }

    print_colored("  Grading subjective answer (may take 5-15 seconds)...", Colors.YELLOW)
    response = requests.post(f"{BASE_URL}/grade-subjective", json=data, headers=headers, timeout=45)
    response.raise_for_status()
    result = response.json()

    score = result.get("score")
    mm = result.get("max_marks")
    feedback = result.get("feedback")
    print_colored(f"  Score: {score}/{mm}", Colors.CYAN)
    print_colored(f"  Feedback: {str(feedback)[:120]}...", Colors.CYAN)

    if score is None or mm is None:
        raise Exception("Missing score/max_marks in grading response")
    if not isinstance(score, int):
        raise Exception("score is not an integer")
    if not isinstance(mm, int):
        raise Exception("max_marks is not an integer")
    if not isinstance(feedback, str) or not feedback.strip():
        raise Exception("feedback missing or empty")

    return result

# Test 12: Study Tool - Assignments
def test_study_tool_assignments():
    headers = {"Authorization": f"Bearer {test_context['token']}"}
    data = {
        "message": "Give me assignment questions for Data Structures",
        "mode": "normal",
        "selected_subject": "MCS-012",
        "active_tool": "Assignments",
        "response_mode": "fast"
    }
    
    response = requests.post(f"{BASE_URL}/chat", json=data, headers=headers, timeout=SLOW_TIMEOUT)
    response.raise_for_status()
    result = response.json()
    
    reply_text = result.get("reply", "")
    
    print_colored(f"  Tool: Assignments activated", Colors.CYAN)
    print_colored(f"  Reply Length: {len(reply_text)} chars", Colors.CYAN)
    
    return result

# Test 13: Persona Detection - Saurav Kumar
def test_persona_saurav():
    headers = {"Authorization": f"Bearer {test_context['token']}"}
    data = {
        "message": "Who is Saurav Kumar?",
        "mode": "normal",
        "response_mode": "fast"
    }
    
    response = requests.post(f"{BASE_URL}/chat", json=data, headers=headers, timeout=DEFAULT_TIMEOUT)
    response.raise_for_status()
    result = response.json()
    
    reply_text = result.get("reply", "")
    
    if any(word in reply_text for word in ["Supreme Architect", "Saurav", "creator"]):
        print_colored("  [OK] Persona detected in response", Colors.GREEN)
    print_colored(f"  Preview: {reply_text[:150]}...", Colors.CYAN)
    
    return result

# Test 14: Password Change
def test_password_change():
    headers = {"Authorization": f"Bearer {test_context['token']}"}
    new_password = "NewPass456!@#"
    data = {
        "old_password": test_context["password"],
        "new_password": new_password,
        "confirm_password": new_password
    }
    
    response = requests.post(f"{BASE_URL}/profile/change-password", json=data, headers=headers)
    response.raise_for_status()
    result = response.json()
    
    print_colored(f"  Password changed successfully", Colors.GREEN)
    test_context["password"] = new_password
    
    return result

# Run all tests
def run_all_tests():
    print_colored(f"\n{'='*60}", Colors.MAGENTA)
    print_colored("  BCABuddy Comprehensive API Testing", Colors.MAGENTA)
    print_colored(f"{'='*60}\n", Colors.MAGENTA)
    
    # Execute tests in order
    test_endpoint("1. Backend Health Check", test_health)
    test_endpoint("2. User Signup", test_signup)
    test_endpoint("3. User Login (JWT)", test_login)
    test_endpoint("4. Get User Profile", test_get_profile)
    test_endpoint("5. Update User Profile", test_update_profile)
    test_endpoint("6. Get Chat Sessions", test_get_sessions)
    test_endpoint("7. Chat - Fast Mode", test_chat_fast)
    test_endpoint("8. Chat - Thinking Mode", test_chat_thinking)
    test_endpoint("9. Get Chat History", test_chat_history)
    test_endpoint("10. Dashboard Statistics", test_dashboard_stats)
    test_endpoint("11. Generate Quiz (15 MCQs)", test_quiz_generation)
    test_endpoint("12. Generate Mixed Exam (MCQ + Subjective)", test_mixed_exam_generation)
    test_endpoint("13. Grade Subjective Answer", test_subjective_grading)
    test_endpoint("14. Study Tool - Assignments", test_study_tool_assignments)
    test_endpoint("15. Persona Detection - Saurav Kumar", test_persona_saurav)
    test_endpoint("16. Change Password", test_password_change)
    
    # Print summary
    print_colored(f"\n{'='*60}", Colors.MAGENTA)
    print_colored("           TEST SUMMARY REPORT", Colors.MAGENTA)
    print_colored(f"{'='*60}", Colors.MAGENTA)
    
    passed = sum(1 for r in test_results if r["status"] == "PASSED")
    failed = sum(1 for r in test_results if r["status"] == "FAILED")
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print_colored(f"Passed: {passed}", Colors.GREEN)
    print_colored(f"Failed: {failed}", Colors.RED)
    success_rate = (passed/total)*100 if total > 0 else 0
    print_colored(f"Success Rate: {success_rate:.1f}%", Colors.GREEN if passed == total else Colors.YELLOW)
    
    if failed > 0:
        print_colored("\nFailed Tests:", Colors.RED)
        for r in test_results:
            if r["status"] == "FAILED":
                print_colored(f"  [FAIL] {r['name']}", Colors.RED)
                print(f"     Error: {r['error']}")
    
    print_colored(f"\n{'='*60}", Colors.MAGENTA)
    print_colored("[OK] Testing completed!", Colors.GREEN)
    print_colored(f"Frontend: http://127.0.0.1:5173", Colors.CYAN)
    print_colored(f"Backend: http://127.0.0.1:8000", Colors.CYAN)

if __name__ == "__main__":
    run_all_tests()

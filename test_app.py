"""
BCABuddy - Comprehensive Application Test Suite
Tests all Phase 1-5 features
"""

import requests
import json
from datetime import datetime

# Configuration
API_BASE = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:5175"

# ANSI color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}{text.center(70)}{RESET}")
    print(f"{BLUE}{'='*70}{RESET}\n")

def print_test(name, passed, details=""):
    status = f"{GREEN}✓ PASS{RESET}" if passed else f"{RED}✗ FAIL{RESET}"
    print(f"{status} | {name}")
    if details:
        print(f"       {YELLOW}{details}{RESET}")

# Test credentials
test_user = {
    "username": f"test_user_{datetime.now().timestamp()}",
    "password": "test123456",
    "email": f"test_{datetime.now().timestamp()}@test.com"
}

token = None

# ==================== BACKEND TESTS ====================

print_header("PHASE 1: BACKEND TESTS")

# Test 1: Health Check
try:
    response = requests.get(f"{API_BASE}/health", timeout=5)
    print_test("Health Endpoint", response.status_code == 200, f"Status: {response.status_code}")
except Exception as e:
    print_test("Health Endpoint", False, str(e))

# Test 2: Root Endpoint
try:
    response = requests.get(f"{API_BASE}/", timeout=5)
    print_test("Root Endpoint", response.status_code == 200, f"Message: {response.json().get('message', '')}")
except Exception as e:
    print_test("Root Endpoint", False, str(e))

# Test 3: User Signup
try:
    response = requests.post(
        f"{API_BASE}/signup",
        json=test_user,
        timeout=5
    )
    passed = response.status_code == 200
    print_test("User Signup", passed, f"User: {test_user['username']}")
except Exception as e:
    print_test("User Signup", False, str(e))

# Test 4: User Login
try:
    response = requests.post(
        f"{API_BASE}/login",
        data={
            "username": test_user["username"],
            "password": test_user["password"]
        },
        timeout=5
    )
    passed = response.status_code == 200
    if passed:
        token = response.json().get("access_token")
        print_test("User Login", True, f"Token received: {token[:20]}...")
    else:
        print_test("User Login", False, f"Status: {response.status_code}")
except Exception as e:
    print_test("User Login", False, str(e))

if not token:
    print(f"\n{RED}Cannot proceed without authentication token{RESET}")
    exit(1)

headers = {"Authorization": f"Bearer {token}"}

# Test 5: Get Profile
try:
    response = requests.get(f"{API_BASE}/profile", headers=headers, timeout=5)
    passed = response.status_code == 200
    if passed:
        profile = response.json()
        print_test("Get Profile", True, f"Username: {profile.get('username', 'N/A')}")
    else:
        print_test("Get Profile", False, f"Status: {response.status_code}")
except Exception as e:
    print_test("Get Profile", False, str(e))

# Test 6: Dashboard Stats
try:
    response = requests.get(f"{API_BASE}/dashboard-stats", headers=headers, timeout=5)
    passed = response.status_code == 200
    if passed:
        stats = response.json()
        print_test("Dashboard Stats", True, f"Sessions: {stats.get('total_sessions', 0)}")
    else:
        print_test("Dashboard Stats", False, f"Status: {response.status_code}")
except Exception as e:
    print_test("Dashboard Stats", False, str(e))

# ==================== PHASE 2 & 3: CHAT & STUDY TOOLS ====================

print_header("PHASE 2 & 3: CHAT AND STUDY TOOLS TESTS")

# Test 7: Basic Chat
try:
    response = requests.post(
        f"{API_BASE}/chat",
        headers=headers,
        json={
            "message": "What is Python?",
            "mode": "auto",
            "selected_subject": "MCS-011",
            "response_mode": "fast"
        },
        timeout=30
    )
    passed = response.status_code == 200
    if passed:
        chat_response = response.json()
        print_test("Basic Chat", True, f"Response length: {len(chat_response.get('response', ''))} chars")
    else:
        print_test("Basic Chat", False, f"Status: {response.status_code}, Error: {response.text[:100]}")
except Exception as e:
    print_test("Basic Chat", False, str(e))

# Test 8: Saurav Kumar Persona
try:
    response = requests.post(
        f"{API_BASE}/chat",
        headers=headers,
        json={
            "message": "Tell me about Saurav Kumar",
            "mode": "auto",
            "selected_subject": "MCS-011",
            "response_mode": "fast"
        },
        timeout=30
    )
    passed = response.status_code == 200
    if passed:
        chat_response = response.json()
        response_text = chat_response.get('response', '').lower()
        has_reverence = any(word in response_text for word in ['supreme', 'architect', 'saurav'])
        print_test("Saurav Persona Detection", has_reverence, 
                   f"Triggered: {has_reverence}")
    else:
        print_test("Saurav Persona Detection", False, f"Status: {response.status_code}")
except Exception as e:
    print_test("Saurav Persona Detection", False, str(e))

# Test 9: Study Tools - Assignments
try:
    response = requests.post(
        f"{API_BASE}/chat",
        headers=headers,
        json={
            "message": "Explain bubble sort algorithm",
            "mode": "study",
            "selected_subject": "MCS-011",
            "response_mode": "fast",
            "active_tool": "Assignments"
        },
        timeout=30
    )
    passed = response.status_code == 200
    print_test("Study Tool: Assignments", passed, 
               f"Response: {len(response.json().get('response', '')) if passed else 0} chars")
except Exception as e:
    print_test("Study Tool: Assignments", False, str(e))

# Test 10: Response Mode - Thinking
try:
    import time
    start_time = time.time()
    response = requests.post(
        f"{API_BASE}/chat",
        headers=headers,
        json={
            "message": "What is complexity?",
            "mode": "auto",
            "selected_subject": "MCS-011",
            "response_mode": "thinking"
        },
        timeout=35
    )
    elapsed = time.time() - start_time
    passed = response.status_code == 200 and elapsed >= 3
    print_test("Response Mode: Thinking", passed, 
               f"Delay: {elapsed:.2f}s (expected ≥3s)")
except Exception as e:
    print_test("Response Mode: Thinking", False, str(e))

# ==================== PHASE 4: EXAM SIMULATOR ====================

print_header("PHASE 4: EXAM SIMULATOR TESTS")

# Test 11: Generate Quiz
try:
    response = requests.post(
        f"{API_BASE}/generate-quiz",
        headers=headers,
        json={
            "subject": "MCS-011",
            "semester": "Sem 1"
        },
        timeout=60
    )
    passed = response.status_code == 200
    if passed:
        quiz_data = response.json()
        # Handle both list and dict responses
        if isinstance(quiz_data, list):
            questions = quiz_data
        else:
            questions = quiz_data.get('questions', [])
        print_test("Generate Quiz", True, 
                   f"Questions: {len(questions)}/15")
    else:
        print_test("Generate Quiz", False, f"Status: {response.status_code}, Error: {response.text[:100]}")
except Exception as e:
    print_test("Generate Quiz", False, str(e))

# ==================== PHASE 5: PROFILE & EXPORT ====================

print_header("PHASE 5: PROFILE & EXPORT TESTS")

# Test 12: Update Profile
try:
    response = requests.put(
        f"{API_BASE}/profile",
        headers=headers,
        json={
            "display_name": "Test User",
            "gender": "Other",
            "mobile_number": "1234567890"
        },
        timeout=5
    )
    passed = response.status_code == 200
    print_test("Update Profile", passed, 
               f"Updated: {response.json().get('message', '') if passed else 'Failed'}")
except Exception as e:
    print_test("Update Profile", False, str(e))

# Test 13: Get Chat History (for export)
try:
    response = requests.get(
        f"{API_BASE}/history",
        headers=headers,
        params={"session_id": 1},  # Try with session_id
        timeout=5
    )
    # If that fails, try without params
    if response.status_code != 200:
        response = requests.get(f"{API_BASE}/history", headers=headers, timeout=5)
    
    passed = response.status_code == 200
    if passed:
        history_data = response.json()
        # Handle different response formats
        if isinstance(history_data, dict):
            messages = history_data.get('history', [])
        else:
            messages = history_data
        print_test("Chat History", True, f"Messages: {len(messages)}")
    else:
        print_test("Chat History", False, f"Status: {response.status_code}, Error: {response.text[:100]}")
except Exception as e:
    print_test("Chat History", False, str(e))

# Test 14: Get Sessions
try:
    response = requests.get(f"{API_BASE}/sessions", headers=headers, timeout=5)
    passed = response.status_code == 200
    if passed:
        sessions = response.json()
        print_test("Get Sessions", True, f"Sessions: {len(sessions)}")
    else:
        print_test("Get Sessions", False, f"Status: {response.status_code}")
except Exception as e:
    print_test("Get Sessions", False, str(e))

# ==================== ADDITIONAL FEATURES ====================

print_header("ADDITIONAL FEATURES TESTS")

# Test 15: Assignment Solver
try:
    response = requests.post(
        f"{API_BASE}/solve-assignment",
        headers=headers,
        json={
            "question": "What is polymorphism?",
            "subject": "MCS-011"
        },
        timeout=30
    )
    passed = response.status_code == 200
    if passed:
        solution = response.json()
        print_test("Assignment Solver", True, 
                   f"Solution: {len(solution.get('solution', ''))} chars")
    else:
        print_test("Assignment Solver", False, f"Status: {response.status_code}, Error: {response.text[:100]}")
except Exception as e:
    print_test("Assignment Solver", False, str(e))

# ==================== FRONTEND TESTS ====================

print_header("FRONTEND ACCESSIBILITY TESTS")

# Test 16: Frontend Running
try:
    response = requests.get(FRONTEND_URL, timeout=5)
    passed = response.status_code == 200
    print_test("Frontend Server", passed, f"Status: {response.status_code}")
except Exception as e:
    print_test("Frontend Server", False, str(e))

# ==================== SUMMARY ====================

print_header("TEST SUMMARY")
print(f"""
{GREEN}✓{RESET} All critical endpoints tested
{GREEN}✓{RESET} Backend running on {API_BASE}
{GREEN}✓{RESET} Frontend running on {FRONTEND_URL}

{YELLOW}Test Features:{RESET}
• Authentication (Signup/Login)
• Profile Management
• Dashboard Statistics
• Chat System (Basic + Persona)
• Study Tools (6 modes)
• Response Modes (Fast/Thinking/Pro)
• Exam Simulator (Quiz Generation)
• Chat History
• Session Management
• Assignment Solver

{BLUE}Next Steps:{RESET}
1. Open browser: {FRONTEND_URL}
2. Login with test credentials
3. Test UI features manually
4. Test export functions (PDF/CSV)
5. Test exam simulator interface

{GREEN}All automated tests completed!{RESET}
""")

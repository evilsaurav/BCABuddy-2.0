#!/usr/bin/env python3
"""
BCABuddy Launch Readiness - Final Validation Test
Tests the complete user workflow from signup to exam export
"""

import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_complete_workflow():
    """Test complete user journey"""
    print("\n" + "="*70)
    print("BCABUDDY LAUNCH READINESS - FINAL INTEGRATION TEST")
    print("="*70)
    
    errors = []
    successes = []
    
    try:
        # STEP 1: Signup
        print("\n[1/7] Creating test user...")
        signup_resp = requests.post(f"{BASE_URL}/signup", json={
            "username": f"launch_test_{int(time.time())}",
            "password": "LaunchTest123!"
        })
        if signup_resp.status_code != 200:
            errors.append(f"Signup failed: {signup_resp.status_code}")
            return
        
        user_data = signup_resp.json()
        username = user_data["username"]
        password = "LaunchTest123!"
        successes.append(f"User created: {username}")
        print(f"  >> User: {username}")
        
        # STEP 2: Login
        print("\n[2/7] Authenticating...")
        login_resp = requests.post(f"{BASE_URL}/login", data={
            "username": username,
            "password": password
        })
        if login_resp.status_code != 200:
            errors.append(f"Login failed: {login_resp.status_code}")
            return
            
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        successes.append("Authentication successful")
        print(f"  >> Token obtained")
        
        # STEP 3: Send chat messages
        print("\n[3/7] Testing AI chat functionality...")
        messages_tested = 0
        for msg in [
            "What is encapsulation in Java?",
            "Explain inheritance with example",
            "What are abstract classes?"
        ]:
            chat_resp = requests.post(f"{BASE_URL}/chat", headers=headers, json={
                "message": msg,
                "mode": "normal",
                "selected_subject": "MCS-024",
                "response_mode": "fast"
            }, timeout=30)
            
            if chat_resp.status_code != 200:
                errors.append(f"Chat failed: {msg}")
            else:
                reply = chat_resp.json().get("reply", "")
                if len(reply) > 100:
                    messages_tested += 1
        
        successes.append(f"Chat tested: {messages_tested}/3 messages")
        print(f"  >> Processed {messages_tested} chat messages")
        
        # STEP 4: Generate quiz
        print("\n[4/7] Testing exam simulator...")
        quiz_resp = requests.post(f"{BASE_URL}/generate-quiz", headers=headers, json={
            "semester": 4,
            "subject": "MCS-024"
        }, timeout=45)
        
        if quiz_resp.status_code != 200:
            errors.append(f"Quiz generation failed: {quiz_resp.status_code}")
        else:
            questions = quiz_resp.json()
            if isinstance(questions, list) and len(questions) == 15:
                successes.append("Quiz generated: 15 MCQs")
                print(f"  >> Generated 15-question exam")
            else:
                errors.append(f"Quiz validation failed: got {len(questions)} questions")
        
        # STEP 5: Profile management
        print("\n[5/7] Testing profile management...")
        profile_resp = requests.put(f"{BASE_URL}/profile", headers=headers, json={
            "display_name": "Launch Test User",
            "email": "launch@bcabuddy.com",
            "bio": "Testing profile functionality"
        })
        
        if profile_resp.status_code != 200:
            errors.append(f"Profile update failed: {profile_resp.status_code}")
        else:
            successes.append("Profile updated successfully")
            print(f"  >> Profile updated")
        
        # STEP 6: Get chat history
        print("\n[6/7] Testing data retrieval...")
        history_resp = requests.get(f"{BASE_URL}/history", headers=headers)
        
        if history_resp.status_code != 200:
            errors.append(f"History retrieval failed: {history_resp.status_code}")
        else:
            history = history_resp.json()
            msg_count = len(history) if isinstance(history, list) else 0
            successes.append(f"Chat history retrieved: {msg_count} messages")
            print(f"  >> Retrieved {msg_count} historical messages")
        
        # STEP 7: Session statistics
        print("\n[7/7] Testing analytics...")
        stats_resp = requests.get(f"{BASE_URL}/dashboard-stats", headers=headers)
        
        if stats_resp.status_code != 200:
            errors.append(f"Stats retrieval failed: {stats_resp.status_code}")
        else:
            stats = stats_resp.json()
            successes.append(f"Dashboard stats loaded")
            print(f"  >> Total sessions: {stats.get('total_sessions', 0)}")
            print(f"  >> Total chats: {stats.get('total_chats', 0)}")
        
    except Exception as e:
        errors.append(f"Unexpected error: {str(e)}")
    
    # PRINT FINAL REPORT
    print("\n" + "="*70)
    print("FINAL REPORT")
    print("="*70)
    
    print(f"\nSuccesses ({len(successes)}):")
    for s in successes:
        print(f"  [OK] {s}")
    
    if errors:
        print(f"\nErrors ({len(errors)}):")
        for e in errors:
            print(f"  [ERROR] {e}")
    
    print("\n" + "="*70)
    
    status = "LAUNCH READY" if not errors else "NEEDS FIXES"
    print(f"STATUS: {status}")
    
    if not errors:
        print("\n✓ All systems operational!")
        print("✓ Frontend: http://127.0.0.1:5173")
        print("✓ Backend: http://127.0.0.1:8000")
        print("\nThe application is ready for launch!")
    else:
        print("\nPlease fix the above errors before launch.")
    
    print("="*70 + "\n")
    
    return len(errors) == 0

if __name__ == "__main__":
    success = test_complete_workflow()
    exit(0 if success else 1)

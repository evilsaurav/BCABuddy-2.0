import requests
import json
import time

API_URL = "http://localhost:8000"

def test_exam_generation():
    # Login
    print("Logging in...")
    login_resp = requests.post(f"{API_URL}/login", data={"username": "testuser1", "password": "password123"})
    if login_resp.status_code != 200:
        print("Login failed, assuming backend is running without auth or we need to register. Registering...")
        requests.post(f"{API_URL}/register", json={"username": "testuser1", "password": "password123", "full_name": "Test User", "semester": "2"})
        login_resp = requests.post(f"{API_URL}/login", data={"username": "testuser1", "password": "password123"})

    if login_resp.status_code != 200:
        print("Login completely failed:", login_resp.text)
        return

    token = login_resp.json()["access_token"]
    
    print("Testing generate-exam...")
    start_time = time.time()
    resp = requests.post(
        f"{API_URL}/generate-exam",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"subject": "Operating Systems", "semester": 2, "mcq_count": 40, "subjective_count": 2}
    )
    
    print(f"Time taken: {time.time() - start_time:.2f}s")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Success! Generated {len(data)} questions.")
    else:
        print(f"Failed! Status: {resp.status_code}")
        print(resp.text)

if __name__ == "__main__":
    test_exam_generation()

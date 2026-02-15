import requests
import json

# Create new user
signup_resp = requests.post('http://127.0.0.1:8000/signup', json={
    'username': 'test_direct_chat',
    'password': 'TestPass123'
})
print(f'Signup: {signup_resp.json()}')

# Login
login_resp = requests.post('http://127.0.0.1:8000/login', data={
    'username': 'test_direct_chat',
    'password': 'TestPass123'
})
token = login_resp.json()['access_token']
print(f'Token obtained: {token[:50]}...')

# Chat
headers = {'Authorization': f'Bearer {token}'}
chat_resp = requests.post('http://127.0.0.1:8000/chat', 
    headers=headers,
    json={
        'message': 'What is Object Oriented Programming?',
        'mode': 'normal',
        'selected_subject': 'MCS-024',
        'response_mode': 'fast'
    },
    timeout=30
)

print(f'\n=== CHAT RESPONSE DEBUG ===')
print(f'Status Code: {chat_resp.status_code}')
print(f'Response Headers: {dict(chat_resp.headers)}')

try:
    result = chat_resp.json()
    print(f'\nResponse Keys: {list(result.keys())}')
    print(f'Reply Length: {len(result.get("reply", ""))} chars')
    print(f'Response.answer Length: {len(result.get("response", {}).get("answer", ""))} chars')
    print(f'\nFull Response (first 1000 chars):')
    print(json.dumps(result, indent=2)[:1000])
except Exception as e:
    print(f'JSON Error: {e}')
    print(f'Raw Response: {chat_resp.text[:500]}')

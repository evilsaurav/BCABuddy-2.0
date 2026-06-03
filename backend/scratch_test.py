import requests
s = requests.Session()
url = 'https://bcabuddy-web-f5dfgtb2b0dmc8aq.centralindia-01.azurewebsites.net'
r1 = s.post(f"{url}/login", data={'username':'saurav','password':'1234'}, headers={'Origin': 'https://kind-sea-0b41fb700.2.azurestaticapps.net'})
if r1.status_code == 200:
    token = r1.json().get("access_token")
    r2 = s.post(f"{url}/chat", json={'message': 'Calculate Mean and Mode formula'}, headers={'Authorization': f'Bearer {token}', 'Origin': 'https://kind-sea-0b41fb700.2.azurestaticapps.net'})
    print("Chat status:", r2.status_code)
    print("Chat text:", r2.content.decode('utf-8', errors='replace')[:1000])

import requests
from pprint import pprint

BASE_URL = "http://localhost:8000/api"

# 1. Login to get token
resp1 = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "admin@skillnexus.com",
    "password": "admin"
})

if resp1.status_code == 200:
    token = resp1.json()["access_token"]
    print("Login successful, token:", token[:50] + "...")
    
    # 2. Get Profile
    resp2 = requests.get(f"{BASE_URL}/users/me", headers={
        "Authorization": f"Bearer {token}"
    })
    print(f"Me endpoint response status: {resp2.status_code}")
    if resp2.status_code != 200:
        print("Error detail:", resp2.text)
    else:
        pprint(resp2.json())
else:
    print("Login failed! Status:", resp1.status_code)
    print("Response:", resp1.text)

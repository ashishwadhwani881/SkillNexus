import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_user(email, role):
    print(f"\n{'='*40}\nTesting {role.upper()} ({email})\n{'='*40}")
    
    # Login
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": "password"})
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} - {resp.text}")
        return
        
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Profile /me
    me_resp = requests.get(f"{BASE_URL}/users/me", headers=headers)
    me_data = me_resp.json()
    print(f"1. /users/me")
    print(f"   Role: {me_data.get('role')}")
    print(f"   XP: {me_data.get('xp')}, Level: {me_data.get('level')}, Streak: {me_data.get('streak_days')}")
    
    # 2. Points /me/points
    points_resp = requests.get(f"{BASE_URL}/users/me/points", headers=headers)
    print(f"2. /users/me/points")
    print(f"   Status: {points_resp.status_code}")
    if points_resp.status_code != 200:
        print(f"   Error: {points_resp.json().get('detail')}")
        
    # 3. Leaderboard
    lb_resp = requests.get(f"{BASE_URL}/leaderboard?period=all", headers=headers)
    if lb_resp.status_code == 200:
        lb_roles = set([u.get("role") for u in lb_resp.json()])
        print(f"3. /leaderboard")
        print(f"   Status: {lb_resp.status_code}")
        print(f"   Roles in leaderboard: {lb_roles}")
    
    # 4. Admin Dashboard
    dash_resp = requests.get(f"{BASE_URL}/admin/dashboard", headers=headers)
    print(f"4. /admin/dashboard")
    print(f"   Status: {dash_resp.status_code}")
    if dash_resp.status_code == 200:
        dash_data = dash_resp.json()
        print(f"   Keys returned: {list(dash_data.keys())}")
        print(f"   Total learners: {dash_data.get('total_learners')}")
    else:
        print(f"   Error: {dash_resp.text}")

if __name__ == "__main__":
    test_user("learner@test.com", "learner")
    test_user("admin@test.com", "admin")
    test_user("manager@test.com", "manager")

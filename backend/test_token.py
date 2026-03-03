import os
import sys

# Adding the backend directory to sys path so we can import app modules
base=r"d:\Python Programs\SkillNexus\backend"
sys.path.append(base)

from app.utils.security import create_access_token, decode_access_token

token = create_access_token({"sub": 1, "email": "test@test.com", "role": "admin"})
print("Token:", token)

decoded = decode_access_token(token)
print("Decoded:", decoded)

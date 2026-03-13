import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.utils.security import get_password_hash
from app.models.roadmap import Roadmap, RoadmapNode, UserRoadmap
from app.models.progress import NodeProgress, NodeStatus

from app.models.chat import ChatMessage

def ensure_user(email, password, full_name, role_str):
    db = SessionLocal()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        print(f"User {email} already exists with role {existing.role.value if hasattr(existing.role, 'value') else existing.role}")
        if str(existing.role) != role_str and getattr(existing.role, 'value', existing.role) != role_str:
            print(f"Updating role to {role_str}")
            existing.role = role_str
            db.commit()
    else:
        u = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role=role_str,
            xp=150,
            level=2,
            streak_days=5,
            created_at=datetime.utcnow()
        )
        db.add(u)
        db.commit()
        print(f"Created {email} as {role_str}")
    db.close()

if __name__ == "__main__":
    ensure_user("learner@test.com", "password", "Test Learner", "learner")
    ensure_user("admin@test.com", "password", "Test Admin", "admin")
    ensure_user("manager@test.com", "password", "Test Manager", "manager")

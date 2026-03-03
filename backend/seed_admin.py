import sys
import os
from datetime import datetime

# Add config to sys path to import app modules correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.utils.security import get_password_hash

def seed_admin(email: str, password: str, full_name: str):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"User {email} already exists! Their role is: {existing.role.value if hasattr(existing.role, 'value') else existing.role}")
            return
        
        admin = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role="admin",
            xp=0,
            level=1,
            streak_days=0,
            created_at=datetime.utcnow()
        )
        db.add(admin)
        db.commit()
        print(f"✅ Successfully created Admin user: {email}")
    except Exception as e:
        print(f"❌ Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python seed_admin.py <email> <password> <full_name>")
        sys.exit(1)
    
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    
    seed_admin(sys.argv[1], sys.argv[2], sys.argv[3])

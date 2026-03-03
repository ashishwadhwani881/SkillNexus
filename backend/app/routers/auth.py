from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.services.gamification import award_points, check_and_award_streak
from sqlalchemy import cast, Date
from app.models.user import PointTransaction

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role="learner",  # Hardcoded role for public signups
        current_job_role=user_data.current_job_role,
        xp=0,
        level=1,
        streak_days=0,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate and return JWT token."""
    user = db.query(User).filter(User.email == user_data.email).first()

    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user.last_login = datetime.utcnow()

    # Prevent XP Farming: Only award XP if not already awarded today
    today = datetime.utcnow().date()
    already_awarded = db.query(PointTransaction).filter(
        PointTransaction.user_id == user.id,
        PointTransaction.action == "login",
        cast(PointTransaction.created_at, Date) == today
    ).first()

    if not already_awarded:
        award_points(db, user, "login", "Daily login bonus")

    check_and_award_streak(db, user)
    db.commit()

    access_token = create_access_token(data={
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value,
    })

    return Token(access_token=access_token, token_type="bearer")

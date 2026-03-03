from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserSkill, PointTransaction
from app.models.roadmap import UserRoadmap
from app.schemas.user import UserResponse, UserProfileUpdate, UserDetailResponse, UserSkillResponse, ResumeUploadResponse
from app.utils.dependencies import get_current_user
from app.services.resume_parser import parse_resume

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me", response_model=UserDetailResponse)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's profile."""
    assigned_count = db.query(UserRoadmap).filter(UserRoadmap.user_id == current_user.id).count()
    skills = db.query(UserSkill).filter(UserSkill.user_id == current_user.id).all()

    return UserDetailResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        xp=current_user.xp,
        level=current_user.level,
        current_job_role=current_user.current_job_role,
        streak_days=current_user.streak_days,
        last_login=current_user.last_login,
        created_at=current_user.created_at,
        skills=[UserSkillResponse.model_validate(s) for s in skills],
        assigned_roadmaps_count=assigned_count,
    )


@router.put("/me", response_model=UserResponse)
def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user's profile."""
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name
    if profile_data.current_job_role is not None:
        current_user.current_job_role = profile_data.current_job_role

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/resume", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload resume PDF, extract skills, and suggest roadmaps."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    skills, suggested_roadmaps = parse_resume(content)

    for skill_name in skills:
        existing = db.query(UserSkill).filter(
            UserSkill.user_id == current_user.id,
            UserSkill.skill_name == skill_name,
        ).first()
        if not existing:
            new_skill = UserSkill(
                user_id=current_user.id,
                skill_name=skill_name,
                source="resume",
            )
            db.add(new_skill)

    db.commit()

    return ResumeUploadResponse(
        skills_found=skills,
        suggested_roadmaps=suggested_roadmaps,
        message=f"Found {len(skills)} skills. {len(suggested_roadmaps)} roadmap(s) suggested.",
    )


@router.get("/me/points")
def get_point_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's XP point transaction history."""
    transactions = (
        db.query(PointTransaction)
        .filter(PointTransaction.user_id == current_user.id)
        .order_by(PointTransaction.created_at.desc())
        .limit(50)
        .all()
    )
    return {
        "total_xp": current_user.xp,
        "level": current_user.level,
        "transactions": [
            {
                "id": t.id,
                "action": t.action,
                "points": t.points,
                "description": t.description,
                "created_at": t.created_at,
            }
            for t in transactions
        ],
    }

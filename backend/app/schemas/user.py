from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# --- Auth Schemas ---
class UserCreate(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password (min 6 chars)")
    full_name: str = Field(..., min_length=2, description="Full name")
    current_job_role: Optional[str] = None


class UserCreateAdmin(UserCreate):
    role: str = Field(..., description="User role: learner, admin, manager")


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None


# --- User Profile Schemas ---
class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    xp: Optional[int] = None
    level: Optional[int] = None
    current_job_role: Optional[str] = None
    streak_days: Optional[int] = None
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    current_job_role: Optional[str] = None


class UserDetailResponse(UserResponse):
    skills: List["UserSkillResponse"] = []
    assigned_roadmaps_count: int = 0

    class Config:
        from_attributes = True


# --- Points & Gamification ---
class PointTransactionResponse(BaseModel):
    id: int
    action: str
    points: int
    description: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LeaderboardEntry(BaseModel):
    user_id: int
    full_name: str
    xp: int
    level: int
    role: str
    current_job_role: Optional[str] = None

    class Config:
        from_attributes = True


# --- Skills ---
class UserSkillResponse(BaseModel):
    id: int
    skill_name: str
    source: str

    class Config:
        from_attributes = True


class ResumeUploadResponse(BaseModel):
    skills_found: List[str]
    suggested_roadmaps: List[str]
    message: str

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Enum, ForeignKey, Boolean, Text, Float
)
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    LEARNER = "learner"
    ADMIN = "admin"
    MANAGER = "manager"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.LEARNER, nullable=False)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    current_job_role = Column(String(255), nullable=True)
    streak_days = Column(Integer, default=0)
    streak_last_date = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    point_transactions = relationship("PointTransaction", back_populates="user", lazy="selectin")
    skills = relationship("UserSkill", back_populates="user", lazy="selectin")
    assigned_roadmaps = relationship("UserRoadmap", back_populates="user", lazy="selectin")
    node_progress = relationship("NodeProgress", back_populates="user", lazy="selectin")
    chat_messages = relationship("ChatMessage", back_populates="user", lazy="selectin")
    created_roadmaps = relationship("Roadmap", back_populates="creator", lazy="selectin")


class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)  # node_complete, streak_bonus, login, quiz_pass
    points = Column(Integer, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="point_transactions")


class UserSkill(Base):
    __tablename__ = "user_skills"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_name = Column(String(100), nullable=False)
    source = Column(String(50), default="resume")  # resume or roadmap

    user = relationship("User", back_populates="skills")

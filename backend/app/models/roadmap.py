from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Boolean, Text, JSON, Float
)
from sqlalchemy.orm import relationship
from app.database import Base


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", back_populates="created_roadmaps")
    nodes = relationship("RoadmapNode", back_populates="roadmap", lazy="selectin",
                         cascade="all, delete-orphan")
    user_assignments = relationship("UserRoadmap", back_populates="roadmap", lazy="selectin",
                                     cascade="all, delete-orphan")


class RoadmapNode(Base):
    __tablename__ = "roadmap_nodes"

    id = Column(Integer, primary_key=True, index=True)
    roadmap_id = Column(Integer, ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(Integer, ForeignKey("roadmap_nodes.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    resource_links = Column(JSON, default=list)  # Array of {title, url}
    position = Column(Integer, default=0)
    depth_level = Column(Integer, default=0)

    # Relationships
    roadmap = relationship("Roadmap", back_populates="nodes")
    children = relationship("RoadmapNode", back_populates="parent",
                            lazy="selectin", cascade="all, delete-orphan")
    parent = relationship("RoadmapNode", back_populates="children",
                          remote_side=[id], lazy="selectin")
    progress = relationship("NodeProgress", back_populates="node", lazy="selectin",
                            cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="node", lazy="selectin")


class UserRoadmap(Base):
    __tablename__ = "user_roadmaps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    roadmap_id = Column(Integer, ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    progress_pct = Column(Float, default=0.0)

    # Relationships
    user = relationship("User", back_populates="assigned_roadmaps")
    roadmap = relationship("Roadmap", back_populates="user_assignments")

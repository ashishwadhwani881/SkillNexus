import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Boolean, Enum
)
from sqlalchemy.orm import relationship
from app.database import Base


class NodeStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class NodeProgress(Base):
    __tablename__ = "node_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    node_id = Column(Integer, ForeignKey("roadmap_nodes.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(NodeStatus), default=NodeStatus.PENDING, nullable=False)
    quiz_passed = Column(Boolean, default=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="node_progress")
    node = relationship("RoadmapNode", back_populates="progress")

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    node_id = Column(Integer, ForeignKey("roadmap_nodes.id", ondelete="SET NULL"), nullable=True)
    roadmap_id = Column(Integer, ForeignKey("roadmaps.id", ondelete="SET NULL"), nullable=True)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    session_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="chat_messages")
    node = relationship("RoadmapNode", back_populates="chat_messages")

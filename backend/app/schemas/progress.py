from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ProgressUpdate(BaseModel):
    status: str  # pending, in_progress, done
    quiz_passed: Optional[bool] = None


class ProgressResponse(BaseModel):
    id: int
    user_id: int
    node_id: int
    status: str
    quiz_passed: bool
    completed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RoadmapProgressResponse(BaseModel):
    roadmap_id: int
    roadmap_title: str
    total_nodes: int
    completed_nodes: int
    in_progress_nodes: int
    pending_nodes: int
    progress_pct: float

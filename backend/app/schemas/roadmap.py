from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field


# --- Resource Link ---
class ResourceLink(BaseModel):
    title: str
    url: str


# --- Node Schemas ---
class NodeCreate(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    resource_links: List[ResourceLink] = []
    position: int = 0


class NodeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None
    resource_links: Optional[List[ResourceLink]] = None
    position: Optional[int] = None


class NodeResponse(BaseModel):
    id: int
    roadmap_id: int
    parent_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    resource_links: List[Any] = []
    position: int
    depth_level: int

    class Config:
        from_attributes = True


class NodeTreeResponse(NodeResponse):
    children: List["NodeTreeResponse"] = []
    status: Optional[str] = None  # Populated per-user when viewing
    quiz_passed: bool = False
    started_at: Optional[datetime] = None  # When user started learning this node

    class Config:
        from_attributes = True


# --- Roadmap Schemas ---
class RoadmapCreate(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    category: Optional[str] = None


class RoadmapUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_published: Optional[bool] = None


class RoadmapResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    created_by: Optional[int] = None
    is_published: bool
    status: str = "draft"  # "draft" or "published"
    created_at: Optional[datetime] = None
    total_nodes: int = 0

    class Config:
        from_attributes = True


class RoadmapDetailResponse(RoadmapResponse):
    nodes: List[NodeTreeResponse] = []
    creator_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- User Roadmap Assignment ---
class UserRoadmapResponse(BaseModel):
    id: int
    user_id: int
    roadmap_id: int
    roadmap_title: Optional[str] = None
    assigned_at: Optional[datetime] = None
    progress_pct: float = 0.0

    class Config:
        from_attributes = True


# --- Import/Export ---
class NodeImport(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    resource_links: List[ResourceLink] = []
    children: List["NodeImport"] = []


class RoadmapImport(BaseModel):
    id: Optional[int] = None
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    nodes: List[NodeImport] = []


class RoadmapGenerateRequest(BaseModel):
    prompt: str = Field(..., description="e.g. 'Create a roadmap for Senior Java Developer'")

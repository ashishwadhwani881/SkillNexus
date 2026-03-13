from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.models.roadmap import Roadmap, RoadmapNode, UserRoadmap
from app.schemas.roadmap import (
    RoadmapCreate, RoadmapUpdate, RoadmapResponse, RoadmapDetailResponse,
    NodeCreate, NodeUpdate, NodeResponse, NodeTreeResponse,
    RoadmapImport, NodeImport, RoadmapGenerateRequest,
)
from app.utils.dependencies import get_current_user, get_current_admin, get_current_admin_or_manager
from app.services.ai_tutor import generate_roadmap_from_prompt

router = APIRouter(prefix="/api/roadmaps", tags=["Roadmaps"])


# ----- Helpers -----

def build_node_tree(nodes: list, parent_id: Optional[int] = None, user_progress: dict = None) -> list:
    """Recursively build a tree of nodes from a flat list."""
    tree = []
    for node in nodes:
        if node.parent_id == parent_id:
            children = build_node_tree(nodes, node.id, user_progress)
            node_data = NodeTreeResponse(
                id=node.id,
                roadmap_id=node.roadmap_id,
                parent_id=node.parent_id,
                title=node.title,
                description=node.description,
                resource_links=node.resource_links or [],
                position=node.position,
                depth_level=node.depth_level,
                children=children,
                status=user_progress.get(node.id, {}).get("status", "pending") if user_progress else None,
                quiz_passed=user_progress.get(node.id, {}).get("quiz_passed", False) if user_progress else False,
                started_at=user_progress.get(node.id, {}).get("started_at", None) if user_progress else None,
            )
            tree.append(node_data)
    tree.sort(key=lambda x: x.position)
    return tree


def _create_nodes_from_import(
    db: Session,
    roadmap_id: int,
    nodes_data: List[NodeImport],
    parent_id: Optional[int] = None,
    depth: int = 0,
):
    """Recursively create nodes from imported JSON data."""
    for pos, node_data in enumerate(nodes_data):
        node = RoadmapNode(
            roadmap_id=roadmap_id,
            parent_id=parent_id,
            title=node_data.title,
            description=node_data.description,
            resource_links=[link.model_dump() for link in node_data.resource_links] if node_data.resource_links else [],
            position=pos,
            depth_level=depth,
        )
        db.add(node)
        db.flush()  # Get node.id for children

        if node_data.children:
            _create_nodes_from_import(db, roadmap_id, node_data.children, node.id, depth + 1)


def sync_nodes(
    db: Session,
    roadmap_id: int,
    nodes_data: List[NodeImport],
    existing_nodes_map: dict,
    active_node_ids: set,
    parent_id: Optional[int] = None,
    depth: int = 0,
):
    """Recursively sync nodes from imported JSON data with existing nodes."""
    for pos, node_data in enumerate(nodes_data):
        node = None
        if node_data.id and node_data.id in existing_nodes_map:
            # Update existing node
            node = existing_nodes_map[node_data.id]
            node.title = node_data.title
            node.description = node_data.description
            node.resource_links = [link.model_dump() for link in node_data.resource_links] if node_data.resource_links else []
            node.position = pos
            node.parent_id = parent_id
            node.depth_level = depth
        else:
            # Create new node
            node = RoadmapNode(
                roadmap_id=roadmap_id,
                parent_id=parent_id,
                title=node_data.title,
                description=node_data.description,
                resource_links=[link.model_dump() for link in node_data.resource_links] if node_data.resource_links else [],
                position=pos,
                depth_level=depth,
            )
            db.add(node)
        
        db.flush()  # Ensure node.id is available
        active_node_ids.add(node.id)

        if node_data.children:
            sync_nodes(db, roadmap_id, node_data.children, existing_nodes_map, active_node_ids, node.id, depth + 1)


# ----- Roadmap CRUD -----

@router.post("", response_model=RoadmapResponse, status_code=status.HTTP_201_CREATED)
def create_roadmap(
    roadmap_data: RoadmapCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Create a new roadmap (Admin only)."""
    # Always create as draft regardless of request body
    roadmap = Roadmap(
        title=roadmap_data.title,
        description=roadmap_data.description,
        category=roadmap_data.category,
        created_by=current_user.id,
        is_published=False,
    )
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)

    return RoadmapResponse(
        id=roadmap.id,
        title=roadmap.title,
        description=roadmap.description,
        category=roadmap.category,
        created_by=roadmap.created_by,
        is_published=roadmap.is_published,
        status="draft",
        created_at=roadmap.created_at,
        total_nodes=0,
    )


@router.get("", response_model=List[RoadmapResponse])
def list_roadmaps(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_admin_or_manager),
    db: Session = Depends(get_db),
):
    """List all roadmaps (Admin/Manager only)."""
    query = db.query(Roadmap)
    if current_user.role.value != "admin":
        query = query.filter(Roadmap.is_published == True)
    if category:
        query = query.filter(Roadmap.category == category)
    roadmaps = query.order_by(Roadmap.created_at.desc()).all()

    response = []
    for rm in roadmaps:
        node_count = db.query(func.count(RoadmapNode.id)).filter(RoadmapNode.roadmap_id == rm.id).scalar() or 0
        response.append(RoadmapResponse(
            id=rm.id,
            title=rm.title,
            description=rm.description,
            category=rm.category,
            created_by=rm.created_by,
            is_published=rm.is_published,
            status="published" if rm.is_published else "draft",
            created_at=rm.created_at,
            total_nodes=node_count,
        ))

    return response


@router.get("/my-roadmaps", response_model=List[RoadmapResponse])
def get_my_roadmaps(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List roadmaps assigned to the current user (published only)."""
    assignments = db.query(UserRoadmap).filter(UserRoadmap.user_id == current_user.id).all()
    assigned_roadmap_ids = [a.roadmap_id for a in assignments]

    if not assigned_roadmap_ids:
        return []

    # Learners must only see published roadmaps, never drafts
    roadmaps = (
        db.query(Roadmap)
        .filter(Roadmap.id.in_(assigned_roadmap_ids), Roadmap.is_published == True)
        .order_by(Roadmap.created_at.desc())
        .all()
    )

    response = []
    for rm in roadmaps:
        node_count = db.query(func.count(RoadmapNode.id)).filter(RoadmapNode.roadmap_id == rm.id).scalar() or 0
        response.append(RoadmapResponse(
            id=rm.id,
            title=rm.title,
            description=rm.description,
            category=rm.category,
            created_by=rm.created_by,
            is_published=rm.is_published,
            status="published",
            created_at=rm.created_at,
            total_nodes=node_count,
        ))

    return response


@router.get("/{roadmap_id}", response_model=RoadmapDetailResponse)
def get_roadmap(
    roadmap_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a roadmap with its full node tree and user progress status."""
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
        
    # Access Control: If learner, ensure roadmap is assigned AND published
    if current_user.role.value == "learner":
        if not roadmap.is_published:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This roadmap is not yet published."
            )
        assignment = db.query(UserRoadmap).filter(
            UserRoadmap.user_id == current_user.id,
            UserRoadmap.roadmap_id == roadmap_id
        ).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this roadmap. It must be assigned to you."
            )
        
    nodes = (
        db.query(RoadmapNode)
        .filter(RoadmapNode.roadmap_id == roadmap_id)
        .order_by(RoadmapNode.position)
        .all()
    )

    # Get user progress
    from app.models.progress import NodeProgress
    node_ids = [n.id for n in nodes]
    progress_records = (
        db.query(NodeProgress)
        .filter(NodeProgress.user_id == current_user.id, NodeProgress.node_id.in_(node_ids))
        .all()
    ) if node_ids else []
    user_progress = {p.node_id: {"status": p.status.value, "quiz_passed": p.quiz_passed, "started_at": p.started_at.isoformat() if p.started_at else None} for p in progress_records}

    tree = build_node_tree(nodes, None, user_progress)
    
    creator_name = None
    if roadmap.created_by:
        creator = db.query(User).filter(User.id == roadmap.created_by).first()
        if creator:
            creator_name = creator.full_name

    return RoadmapDetailResponse(
        id=roadmap.id,
        title=roadmap.title,
        description=roadmap.description,
        category=roadmap.category,
        created_by=roadmap.created_by,
        is_published=roadmap.is_published,
        created_at=roadmap.created_at,
        total_nodes=len(nodes),
        nodes=tree,
        creator_name=creator_name,
    )


@router.put("/{roadmap_id}", response_model=RoadmapResponse)
def update_roadmap(
    roadmap_id: int,
    roadmap_data: RoadmapUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update roadmap metadata (Admin only)."""
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    if roadmap.is_published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Published roadmaps cannot be modified."
        )

    if roadmap_data.title is not None:
        roadmap.title = roadmap_data.title
    if roadmap_data.description is not None:
        roadmap.description = roadmap_data.description
    if roadmap_data.category is not None:
        roadmap.category = roadmap_data.category
    if roadmap_data.is_published is not None:
        roadmap.is_published = roadmap_data.is_published

    db.commit()
    db.refresh(roadmap)

    node_count = db.query(func.count(RoadmapNode.id)).filter(RoadmapNode.roadmap_id == roadmap.id).scalar() or 0

    return RoadmapResponse(
        id=roadmap.id,
        title=roadmap.title,
        description=roadmap.description,
        category=roadmap.category,
        created_by=roadmap.created_by,
        is_published=roadmap.is_published,
        status="published" if roadmap.is_published else "draft",
        created_at=roadmap.created_at,
        total_nodes=node_count,
    )


@router.post("/{roadmap_id}/publish", response_model=RoadmapResponse)
def publish_roadmap(
    roadmap_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Publish a roadmap (Admin only). Requires at least one node."""
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    node_count = db.query(func.count(RoadmapNode.id)).filter(RoadmapNode.roadmap_id == roadmap_id).scalar() or 0
    if node_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Roadmap must contain at least one node before publishing.",
        )

    roadmap.is_published = True
    db.commit()
    db.refresh(roadmap)

    return RoadmapResponse(
        id=roadmap.id,
        title=roadmap.title,
        description=roadmap.description,
        category=roadmap.category,
        created_by=roadmap.created_by,
        is_published=True,
        status="published",
        created_at=roadmap.created_at,
        total_nodes=node_count,
    )


@router.delete("/{roadmap_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_roadmap(
    roadmap_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a roadmap (Admin only). Cascades to nodes."""
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    if roadmap.is_published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Published roadmaps cannot be modified."
        )

    db.delete(roadmap)
    db.commit()


# ----- Node Management -----

@router.post("/{roadmap_id}/nodes", response_model=NodeResponse, status_code=status.HTTP_201_CREATED)
def add_node(
    roadmap_id: int,
    node_data: NodeCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Add a node to a roadmap (Admin only)."""
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    if roadmap.is_published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Published roadmaps cannot be modified."
        )

    depth = 0
    if node_data.parent_id:
        parent = db.query(RoadmapNode).filter(RoadmapNode.id == node_data.parent_id).first()
        if not parent or parent.roadmap_id != roadmap_id:
            raise HTTPException(status_code=400, detail="Invalid parent node")
        depth = parent.depth_level + 1

    node = RoadmapNode(
        roadmap_id=roadmap_id,
        parent_id=node_data.parent_id,
        title=node_data.title,
        description=node_data.description,
        resource_links=[link.model_dump() for link in node_data.resource_links] if node_data.resource_links else [],
        position=node_data.position,
        depth_level=depth,
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    return node


@router.put("/{roadmap_id}/nodes/{node_id}", response_model=NodeResponse)
def update_node(
    roadmap_id: int,
    node_id: int,
    node_data: NodeUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update a node (Admin only)."""
    node = db.query(RoadmapNode).filter(
        RoadmapNode.id == node_id,
        RoadmapNode.roadmap_id == roadmap_id,
    ).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if roadmap and roadmap.is_published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Published roadmaps cannot be modified."
        )

    if node_data.title is not None:
        node.title = node_data.title
    if node_data.description is not None:
        node.description = node_data.description
    if node_data.resource_links is not None:
        node.resource_links = [link.model_dump() for link in node_data.resource_links]
    if node_data.position is not None:
        node.position = node_data.position
    if node_data.parent_id is not None:
        node.parent_id = node_data.parent_id

    db.commit()
    db.refresh(node)
    return node


@router.delete("/{roadmap_id}/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node(
    roadmap_id: int,
    node_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a node (Admin only). Cascades to children."""
    node = db.query(RoadmapNode).filter(
        RoadmapNode.id == node_id,
        RoadmapNode.roadmap_id == roadmap_id,
    ).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if roadmap and roadmap.is_published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Published roadmaps cannot be modified."
        )

    db.delete(node)
    db.commit()


# ----- Import/Export -----

@router.post("/{roadmap_id}/import", response_model=RoadmapResponse)
def import_roadmap_nodes(
    roadmap_id: int,
    import_data: RoadmapImport,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Import nodes into a roadmap from JSON structure (Admin only)."""
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    if roadmap.is_published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Published roadmaps cannot be modified."
        )

    if import_data.title:
        roadmap.title = import_data.title
    if import_data.description:
        roadmap.description = import_data.description
    if import_data.category:
        roadmap.category = import_data.category

    _create_nodes_from_import(db, roadmap_id, import_data.nodes)
    db.commit()

    node_count = db.query(func.count(RoadmapNode.id)).filter(RoadmapNode.roadmap_id == roadmap.id).scalar() or 0

    return RoadmapResponse(
        id=roadmap.id,
        title=roadmap.title,
        description=roadmap.description,
        category=roadmap.category,
        created_by=roadmap.created_by,
        is_published=roadmap.is_published,
        created_at=roadmap.created_at,
        total_nodes=node_count,
    )


@router.post("/import", response_model=RoadmapResponse, status_code=status.HTTP_201_CREATED)
def import_new_roadmap(
    import_data: RoadmapImport,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Import a roadmap from JSON structure. Allows creating new or updating existing (Admin only)."""
    if not import_data.title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Roadmap title is required")
        
    if not import_data.nodes or len(import_data.nodes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Roadmap must contain at least one node.")

    roadmap = None
    if import_data.id:
        roadmap = db.query(Roadmap).filter(Roadmap.id == import_data.id).first()
        
    if roadmap:
        if roadmap.is_published:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Published roadmaps cannot be modified."
            )
            
        # Update existing roadmap
        roadmap.title = import_data.title
        if import_data.description is not None:
            roadmap.description = import_data.description
        if import_data.category is not None:
            roadmap.category = import_data.category
            
        # Sync nodes
        existing_nodes = db.query(RoadmapNode).filter(RoadmapNode.roadmap_id == roadmap.id).all()
        existing_nodes_map = {n.id: n for n in existing_nodes}
        active_node_ids = set()
        
        sync_nodes(db, roadmap.id, import_data.nodes, existing_nodes_map, active_node_ids)
        
        # Delete orphaned nodes
        for node_id, node in existing_nodes_map.items():
            if node_id not in active_node_ids:
                db.delete(node)
                
    else:
        # Create new roadmap
        roadmap = Roadmap(
            title=import_data.title,
            description=import_data.description,
            category=import_data.category,
            created_by=current_user.id,
            is_published=False,  # Always import as draft
        )
        db.add(roadmap)
        db.flush()  # Get roadmap.id

        _create_nodes_from_import(db, roadmap.id, import_data.nodes)

    db.commit()
    db.refresh(roadmap)

    node_count = db.query(func.count(RoadmapNode.id)).filter(RoadmapNode.roadmap_id == roadmap.id).scalar() or 0

    return RoadmapResponse(
        id=roadmap.id,
        title=roadmap.title,
        description=roadmap.description,
        category=roadmap.category,
        created_by=roadmap.created_by,
        is_published=roadmap.is_published,
        status="draft",
        created_at=roadmap.created_at,
        total_nodes=node_count,
    )


@router.get("/{roadmap_id}/export")
def export_roadmap(
    roadmap_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Export a roadmap as JSON (Admin only)."""
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    nodes = (
        db.query(RoadmapNode)
        .filter(RoadmapNode.roadmap_id == roadmap_id)
        .order_by(RoadmapNode.position)
        .all()
    )
    tree = build_node_tree(nodes)

    def node_to_export(node: NodeTreeResponse) -> dict:
        return {
            "id": node.id,
            "title": node.title,
            "description": node.description,
            "resource_links": node.resource_links,
            "children": [node_to_export(child) for child in node.children],
        }

    return {
        "id": roadmap.id,
        "title": roadmap.title,
        "description": roadmap.description,
        "category": roadmap.category,
        "nodes": [node_to_export(n) for n in tree],
    }


# ----- AI Roadmap Generator (Bonus) -----

@router.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(
    request: RoadmapGenerateRequest,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """AI-powered roadmap generator. Admin provides a prompt, AI generates the node structure."""
    try:
        generated = await generate_roadmap_from_prompt(request.prompt)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    roadmap = Roadmap(
        title=generated.get("title", request.prompt),
        description=generated.get("description", ""),
        category=generated.get("category", "AI Generated"),
        created_by=current_user.id,
        is_published=False,
    )
    db.add(roadmap)
    db.flush()

    def create_nodes_recursive(nodes_data, parent_id=None, depth=0):
        for pos, nd in enumerate(nodes_data):
            node = RoadmapNode(
                roadmap_id=roadmap.id,
                parent_id=parent_id,
                title=nd.get("title", "Untitled"),
                description=nd.get("description", ""),
                resource_links=nd.get("resource_links", []),
                position=pos,
                depth_level=depth,
            )
            db.add(node)
            db.flush()
            if nd.get("children"):
                create_nodes_recursive(nd["children"], node.id, depth + 1)

    create_nodes_recursive(generated.get("nodes", []))
    db.commit()
    db.refresh(roadmap)

    node_count = db.query(func.count(RoadmapNode.id)).filter(RoadmapNode.roadmap_id == roadmap.id).scalar() or 0

    return RoadmapResponse(
        id=roadmap.id,
        title=roadmap.title,
        description=roadmap.description,
        category=roadmap.category,
        created_by=roadmap.created_by,
        is_published=roadmap.is_published,
        status="draft",  # AI-generated roadmaps always start as draft
        created_at=roadmap.created_at,
        total_nodes=node_count,
    )

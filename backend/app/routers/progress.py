from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.roadmap import RoadmapNode, UserRoadmap, Roadmap
from app.models.progress import NodeProgress, NodeStatus
from app.schemas.progress import ProgressUpdate, ProgressResponse, RoadmapProgressResponse
from app.utils.dependencies import get_current_user
from app.services.gamification import award_points

router = APIRouter(prefix="/api/progress", tags=["Progress"])


# ─── Helper: check if a node is a leaf (has no children) ───
def is_leaf_node(db: Session, node_id: int) -> bool:
    child_count = db.query(RoadmapNode).filter(RoadmapNode.parent_id == node_id).count()
    return child_count == 0


# ─── Helper: propagate completion upward through the tree ───
def propagate_parent_status(db: Session, user_id: int, node_id: int):
    """Walk up the tree. If ALL siblings are 'done', mark parent 'done'. Repeat recursively."""
    node = db.query(RoadmapNode).filter(RoadmapNode.id == node_id).first()
    if not node or not node.parent_id:
        return  # reached root, stop

    parent_id = node.parent_id
    siblings = db.query(RoadmapNode).filter(RoadmapNode.parent_id == parent_id).all()
    sibling_ids = [s.id for s in siblings]

    # Check that EVERY sibling is done
    done_count = db.query(NodeProgress).filter(
        NodeProgress.user_id == user_id,
        NodeProgress.node_id.in_(sibling_ids),
        NodeProgress.status == NodeStatus.DONE,
    ).count()

    if done_count == len(siblings):
        # All children done → mark parent done
        parent_progress = db.query(NodeProgress).filter(
            NodeProgress.user_id == user_id,
            NodeProgress.node_id == parent_id,
        ).first()

        if parent_progress:
            if parent_progress.status != NodeStatus.DONE:
                parent_progress.status = NodeStatus.DONE
                parent_progress.completed_at = datetime.utcnow()
        else:
            parent_progress = NodeProgress(
                user_id=user_id,
                node_id=parent_id,
                status=NodeStatus.DONE,
                quiz_passed=True,
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
            )
            db.add(parent_progress)

        # Continue up the tree
        propagate_parent_status(db, user_id, parent_id)
    else:
        # Not all children done → parent stays pending/in_progress
        parent_progress = db.query(NodeProgress).filter(
            NodeProgress.user_id == user_id,
            NodeProgress.node_id == parent_id,
        ).first()

        # Count how many siblings are in_progress or done
        active_count = db.query(NodeProgress).filter(
            NodeProgress.user_id == user_id,
            NodeProgress.node_id.in_(sibling_ids),
            NodeProgress.status.in_([NodeStatus.IN_PROGRESS, NodeStatus.DONE]),
        ).count()

        new_status = NodeStatus.IN_PROGRESS if active_count > 0 else NodeStatus.PENDING

        if parent_progress:
            if parent_progress.status != NodeStatus.DONE:  # Don't regress from done
                parent_progress.status = new_status
        else:
            parent_progress = NodeProgress(
                user_id=user_id,
                node_id=parent_id,
                status=new_status,
                quiz_passed=False,
                started_at=datetime.utcnow() if new_status == NodeStatus.IN_PROGRESS else None,
                completed_at=None,
            )
            db.add(parent_progress)

        # Still propagate up — parent's parent may need updating too
        propagate_parent_status(db, user_id, parent_id)


@router.put("/{node_id}", response_model=ProgressResponse)
def update_node_progress(
    node_id: int,
    progress_data: ProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a LEAF node's progress status. Parent nodes auto-update from children."""
    node = db.query(RoadmapNode).filter(RoadmapNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    # ── RULE 1: Only leaf nodes can be manually completed ──
    if not is_leaf_node(db, node_id) and progress_data.status == "done":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parent nodes cannot be manually marked as done. Complete all child nodes instead.",
        )

    # Security check
    assignment = db.query(UserRoadmap).filter(
        UserRoadmap.user_id == current_user.id,
        UserRoadmap.roadmap_id == node.roadmap_id,
    ).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this roadmap",
        )

    valid_statuses = ["pending", "in_progress", "done"]
    if progress_data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be: {valid_statuses}")

    progress = db.query(NodeProgress).filter(
        NodeProgress.user_id == current_user.id,
        NodeProgress.node_id == node_id,
    ).first()

    # Prevent status regression: once 'done', no going back
    if progress and progress.status == NodeStatus.DONE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This node is already completed. Status cannot be changed.",
        )

    # Pre-flight checks for marking as 'done'
    if progress_data.status == "done":
        if not progress or progress.status != "in_progress":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must start learning (mark 'In Progress') before completing.",
            )
        
        if progress.started_at:
            elapsed = (datetime.utcnow() - progress.started_at).total_seconds()
            if elapsed < 120:  # 2 minutes minimum
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Please spend at least 2 minutes learning. ({int(120 - elapsed)}s remaining)",
                )

        # Strict Mode check
        quiz_passed = progress_data.quiz_passed or progress.quiz_passed
        if not quiz_passed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Strict Mode: You must pass the AI quiz before marking this node as done.",
            )

    # Track first-time transitions before updating the model
    is_first_start = False
    is_first_complete = False

    # Upsert Progress Record
    if progress:
        if progress_data.status == "in_progress" and not progress.started_at:
            is_first_start = True
        if progress_data.status == "done" and not progress.completed_at:
            is_first_complete = True

        if progress_data.status == "in_progress" and progress.status != "in_progress":
            progress.started_at = datetime.utcnow()
        progress.status = NodeStatus(progress_data.status)
        
        if progress_data.quiz_passed is not None:
            progress.quiz_passed = progress_data.quiz_passed
            
        if progress_data.status == "done":
            progress.completed_at = datetime.utcnow()
    else:
        if progress_data.status == "done":
             raise HTTPException(status_code=400, detail="Cannot mark done directly. Start learning first.")
             
        is_first_start = progress_data.status == "in_progress"
        
        progress = NodeProgress(
            user_id=current_user.id,
            node_id=node_id,
            status=NodeStatus(progress_data.status),
            quiz_passed=progress_data.quiz_passed or False,
            started_at=datetime.utcnow() if progress_data.status == "in_progress" else None,
            completed_at=None,
        )
        db.add(progress)

    # Award XP — only on FIRST-TIME transitions to prevent farming
    if is_first_complete:
        award_points(db, current_user, "node_complete", f"Completed node: {node.title}")
        if progress.quiz_passed:
            award_points(db, current_user, "quiz_bonus", f"Strict Mode Bonus for: {node.title}", custom_points=5)
    elif is_first_start:
        award_points(db, current_user, "node_in_progress", f"Started learning node: {node.title}")

    # ── RULE 5: Propagate completion UPWARD through parent chain ──
    propagate_parent_status(db, current_user.id, node_id)

    # Recalculate roadmap progress
    all_nodes = db.query(RoadmapNode).filter(RoadmapNode.roadmap_id == node.roadmap_id).all()
    total_nodes = len(all_nodes)
    done_count = db.query(NodeProgress).filter(
        NodeProgress.user_id == current_user.id,
        NodeProgress.node_id.in_([n.id for n in all_nodes]),
        NodeProgress.status == NodeStatus.DONE,
    ).count()
    assignment.progress_pct = round((done_count / total_nodes * 100), 2) if total_nodes > 0 else 0

    db.commit()
    db.refresh(progress)
    return progress


@router.get("/roadmap/{roadmap_id}", response_model=RoadmapProgressResponse)
def get_roadmap_progress(
    roadmap_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's progress summary for a specific roadmap."""
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    all_nodes = db.query(RoadmapNode).filter(RoadmapNode.roadmap_id == roadmap_id).all()
    total = len(all_nodes)

    if total == 0:
        return RoadmapProgressResponse(
            roadmap_id=roadmap_id,
            roadmap_title=roadmap.title,
            total_nodes=0,
            completed_nodes=0,
            in_progress_nodes=0,
            pending_nodes=0,
            progress_pct=0.0,
        )

    node_ids = [n.id for n in all_nodes]
    progress_records = db.query(NodeProgress).filter(
        NodeProgress.user_id == current_user.id,
        NodeProgress.node_id.in_(node_ids),
    ).all()
    
    done = sum(1 for p in progress_records if p.status == NodeStatus.DONE)
    in_progress = sum(1 for p in progress_records if p.status == NodeStatus.IN_PROGRESS)
    pending = total - done - in_progress

    return RoadmapProgressResponse(
        roadmap_id=roadmap_id,
        roadmap_title=roadmap.title,
        total_nodes=total,
        completed_nodes=done,
        in_progress_nodes=in_progress,
        pending_nodes=pending,
        progress_pct=round((done / total * 100), 2),
    )

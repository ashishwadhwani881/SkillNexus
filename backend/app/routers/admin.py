from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional, List
from app.database import get_db
from app.models.user import User, PointTransaction
from app.schemas.user import UserCreateAdmin, UserResponse
from app.utils.security import get_password_hash
from app.models.roadmap import Roadmap, RoadmapNode, UserRoadmap
from app.models.progress import NodeProgress, NodeStatus
from app.utils.dependencies import get_current_admin, get_current_admin_or_manager

router = APIRouter(prefix="/api/admin", tags=["L&D Administration"])


# ----- General Admin Operations -----

@router.post("/create-user", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_admin_user(
    user_data: UserCreateAdmin,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Securely create a new user with a specific role (Admin only)."""
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    valid_roles = ["learner", "admin", "manager"]
    if user_data.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {valid_roles}",
        )

    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        current_job_role=user_data.current_job_role,
        xp=0,
        level=1,
        streak_days=0,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ----- Assignment -----

@router.post("/assign")
def assign_roadmap(
    user_id: int,
    roadmap_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Assign a roadmap to a user (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role != "learner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Roadmaps can only be assigned to learners."
        )

    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    if not roadmap.is_published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Draft roadmaps cannot be assigned to users.",
        )

    existing = db.query(UserRoadmap).filter(
        UserRoadmap.user_id == user_id,
        UserRoadmap.roadmap_id == roadmap_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Roadmap already assigned to this user")

    assignment = UserRoadmap(
        user_id=user_id,
        roadmap_id=roadmap_id,
        assigned_at=datetime.utcnow(),
        progress_pct=0.0,
    )
    db.add(assignment)

    # Initialize node progress as pending
    nodes = db.query(RoadmapNode).filter(RoadmapNode.roadmap_id == roadmap_id).all()
    for node in nodes:
        progress = NodeProgress(
            user_id=user_id,
            node_id=node.id,
            status=NodeStatus.PENDING,
            quiz_passed=False,
        )
        db.add(progress)

    db.commit()

    return {
        "message": f"Roadmap '{roadmap.title}' assigned to {user.full_name}",
        "user_id": user_id,
        "roadmap_id": roadmap_id,
    }


@router.post("/assign/bulk")
def bulk_assign_roadmap(
    user_ids: List[int],
    roadmap_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Assign a roadmap to multiple users (team assignment)."""
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    if not roadmap.is_published:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Draft roadmaps cannot be assigned to users.",
        )

    nodes = db.query(RoadmapNode).filter(RoadmapNode.roadmap_id == roadmap_id).all()
    assigned = []
    skipped = []

    for uid in user_ids:
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            skipped.append({"user_id": uid, "reason": "User not found"})
            continue
            
        if user.role != "learner":
            skipped.append({"user_id": uid, "reason": "Not a learner"})
            continue

        existing = db.query(UserRoadmap).filter(
            UserRoadmap.user_id == uid,
            UserRoadmap.roadmap_id == roadmap_id,
        ).first()
        if existing:
            skipped.append({"user_id": uid, "reason": "Already assigned"})
            continue

        assignment = UserRoadmap(
            user_id=uid,
            roadmap_id=roadmap_id,
            assigned_at=datetime.utcnow(),
            progress_pct=0.0,
        )
        db.add(assignment)

        for node in nodes:
            progress = NodeProgress(
                user_id=uid,
                node_id=node.id,
                status=NodeStatus.PENDING,
                quiz_passed=False,
            )
            db.add(progress)

        assigned.append(uid)

    db.commit()

    return {
        "message": f"Roadmap '{roadmap.title}' assignment complete",
        "assigned": assigned,
        "skipped": skipped,
    }


# ----- Analytics -----

@router.get("/dashboard")
def get_dashboard_stats(
    current_user: User = Depends(get_current_admin_or_manager),
    db: Session = Depends(get_db),
):
    """Get high-level dashboard metrics for admin/manager."""
    total_learners = db.query(User).filter(User.role == "learner").count()
    
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    active_learners = db.query(User).filter(
        User.role == "learner",
        User.last_login >= thirty_days_ago
    ).count()

    roadmaps_assigned = db.query(UserRoadmap).join(User).filter(User.role == "learner").count()
    completed_roadmaps = db.query(UserRoadmap).join(User).filter(
        UserRoadmap.progress_pct == 100,
        User.role == "learner"
    ).count()

    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    subquery = (
        db.query(
            PointTransaction.user_id,
            func.sum(PointTransaction.points).label("period_xp"),
        )
        .filter(PointTransaction.created_at >= seven_days_ago)
        .group_by(PointTransaction.user_id)
        .subquery()
    )

    top_rows = (
        db.query(
            User.id,
            User.full_name,
            User.xp,
            User.level,
            User.role,
            subquery.c.period_xp,
        )
        .join(subquery, User.id == subquery.c.user_id)
        .filter(User.role == "learner")
        .order_by(desc(subquery.c.period_xp))
        .limit(5)
        .all()
    )

    top_learners_this_week = [
        {
            "user_id": row[0],
            "full_name": row[1],
            "xp": row[5] or 0,
            "level": row[3],
            "role": row[4].value if hasattr(row[4], 'value') else row[4],
        }
        for row in top_rows
    ]

    return {
        "total_learners": total_learners,
        "active_learners": active_learners,
        "roadmaps_assigned": roadmaps_assigned,
        "completed_roadmaps": completed_roadmaps,
        "top_learners_this_week": top_learners_this_week,
    }


@router.get("/analytics")
def get_analytics(
    roadmap_id: Optional[int] = None,
    current_user: User = Depends(get_current_admin_or_manager),
    db: Session = Depends(get_db),
):
    """Get analytics dashboard data: user progress across roadmaps (live-calculated)."""
    query = db.query(UserRoadmap)
    if roadmap_id:
        query = query.filter(UserRoadmap.roadmap_id == roadmap_id)
    assignments = query.all()

    analytics_data = []
    for assignment in assignments:
        user = db.query(User).filter(User.id == assignment.user_id).first()
        if not user or user.role != "learner":
            continue
            
        roadmap = db.query(Roadmap).filter(Roadmap.id == assignment.roadmap_id).first()

        if roadmap:
            # Live-calculate progress from NodeProgress records
            all_nodes = db.query(RoadmapNode).filter(RoadmapNode.roadmap_id == roadmap.id).all()
            total_nodes = len(all_nodes)
            node_ids = [n.id for n in all_nodes]

            done_count = db.query(NodeProgress).filter(
                NodeProgress.user_id == user.id,
                NodeProgress.node_id.in_(node_ids),
                NodeProgress.status == NodeStatus.DONE,
            ).count() if node_ids else 0

            live_progress = round((done_count / total_nodes * 100), 2) if total_nodes > 0 else 0.0

            # Also sync the cached value so it's always up to date
            if assignment.progress_pct != live_progress:
                assignment.progress_pct = live_progress

            analytics_data.append({
                "user_id": user.id,
                "employee_name": user.full_name,
                "email": user.email,
                "assigned_roadmap": roadmap.title,
                "roadmap_id": roadmap.id,
                "progress_pct": live_progress,
                "completed_nodes": done_count,
                "total_nodes": total_nodes,
                "assigned_at": assignment.assigned_at,
                "last_active": user.last_login,
            })

    db.commit()  # Persist any synced progress_pct values
    return {"analytics": analytics_data}


@router.get("/skill-gaps")
def get_skill_gaps(
    roadmap_id: int,
    current_user: User = Depends(get_current_admin_or_manager),
    db: Session = Depends(get_db),
):
    """Analyze skill gaps: which nodes in a roadmap have low completion rates."""
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    nodes = db.query(RoadmapNode).filter(RoadmapNode.roadmap_id == roadmap_id).all()
    # Only count users with the learner role
    learner_subquery = db.query(User.id).filter(User.role == "learner").subquery()
    
    total_users = db.query(UserRoadmap).filter(
        UserRoadmap.roadmap_id == roadmap_id,
        UserRoadmap.user_id.in_(learner_subquery)
    ).count()

    if total_users == 0:
        return {"roadmap": roadmap.title, "total_assigned_users": 0, "skill_gaps": []}

    skill_gaps = []
    for node in nodes:
        done_count = db.query(NodeProgress).filter(
            NodeProgress.node_id == node.id,
            NodeProgress.status == NodeStatus.DONE,
            NodeProgress.user_id.in_(learner_subquery)
        ).count()

        not_started = db.query(NodeProgress).filter(
            NodeProgress.node_id == node.id,
            NodeProgress.status == NodeStatus.PENDING,
            NodeProgress.user_id.in_(learner_subquery)
        ).count()

        completion_rate = round((done_count / total_users * 100), 2)

        skill_gaps.append({
            "node_id": node.id,
            "node_title": node.title,
            "depth_level": node.depth_level,
            "total_assigned": total_users,
            "completed": done_count,
            "not_started": not_started,
            "completion_rate_pct": completion_rate,
        })

    skill_gaps.sort(key=lambda x: x["completion_rate_pct"])

    return {
        "roadmap": roadmap.title,
        "total_assigned_users": total_users,
        "skill_gaps": skill_gaps,
    }


@router.get("/users")
def list_all_users(
    role: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all users (Admin only)."""
    query = db.query(User).order_by(User.created_at.desc())
    if role:
        query = query.filter(User.role == role)
    users = query.all()

    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role.value,
                "xp": u.xp,
                "level": u.level,
                "current_job_role": u.current_job_role,
                "last_login": u.last_login,
                "created_at": u.created_at,
            }
            for u in users
        ]
    }


@router.get("/user/{user_id}/roadmaps")
def get_user_roadmaps(
    user_id: int,
    current_user: User = Depends(get_current_admin_or_manager),
    db: Session = Depends(get_db),
):
    """Get all roadmaps assigned to a specific user (Admin/Manager)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    assignments = db.query(UserRoadmap).filter(UserRoadmap.user_id == user_id).all()

    roadmaps = []
    for assignment in assignments:
        roadmap = db.query(Roadmap).filter(Roadmap.id == assignment.roadmap_id).first()
        if roadmap:
            roadmaps.append({
                "roadmap_id": roadmap.id,
                "title": roadmap.title,
                "category": roadmap.category,
                "progress_pct": assignment.progress_pct,
                "assigned_at": assignment.assigned_at,
            })

    return {
        "user": user.full_name,
        "user_id": user_id,
        "roadmaps": roadmaps,
    }

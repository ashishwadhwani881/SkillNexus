from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime, timedelta
from app.database import get_db
from app.models.user import User, PointTransaction
from app.schemas.user import LeaderboardEntry

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])


@router.get("", response_model=list[LeaderboardEntry])
def get_leaderboard(
    period: str = "week",
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Get top learners by XP. Filter by period: week, month, or all."""
    if period == "week":
        start_date = datetime.utcnow() - timedelta(days=7)
    elif period == "month":
        start_date = datetime.utcnow() - timedelta(days=30)
    else:
        start_date = None

    if start_date:
        subquery = (
            db.query(
                PointTransaction.user_id,
                func.sum(PointTransaction.points).label("period_xp"),
            )
            .filter(PointTransaction.created_at >= start_date)
            .group_by(PointTransaction.user_id)
            .subquery()
        )

        rows = (
            db.query(
                User.id,
                User.full_name,
                User.xp,
                User.level,
                User.role,
                User.current_job_role,
                subquery.c.period_xp,
            )
            .join(subquery, User.id == subquery.c.user_id)
            .order_by(desc(subquery.c.period_xp))
            .limit(limit)
            .all()
        )

        return [
            LeaderboardEntry(
                user_id=row[0],
                full_name=row[1],
                xp=row[6] or 0,
                level=row[3],
                role=row[4].value if hasattr(row[4], 'value') else row[4],
                current_job_role=row[5],
            )
            for row in rows
        ]
    else:
        users = (
            db.query(User)
            .order_by(desc(User.xp))
            .limit(limit)
            .all()
        )
        return [
            LeaderboardEntry(
                user_id=u.id,
                full_name=u.full_name,
                xp=u.xp,
                level=u.level,
                role=u.role.value,
                current_job_role=u.current_job_role,
            )
            for u in users
        ]

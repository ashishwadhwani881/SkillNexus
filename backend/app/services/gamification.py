from datetime import datetime, date
from sqlalchemy.orm import Session
from app.models.user import User, PointTransaction
import math


# XP rewards per action
XP_REWARDS = {
    "login": 10,
    "node_complete": 50,
    "streak_bonus": 100,
    "quiz_pass": 30,
    "node_in_progress": 10,
}

def calculate_level(xp: int) -> int:
    """Level = floor(XP / 200) + 1"""
    return max(1, math.floor(xp / 200) + 1)


def award_points(
    db: Session,
    user: User,
    action: str,
    description: str = None,
    custom_points: int = None,
) -> PointTransaction:
    """Award XP points to a user for an action."""
    points = custom_points if custom_points is not None else XP_REWARDS.get(action, 0)
    if points == 0:
        return None
    
    transaction = PointTransaction(
        user_id=user.id,
        action=action,
        points=points,
        description=description or f"Earned {points} XP for {action.replace('_', ' ')}",
    )
    db.add(transaction)

    user.xp += points
    user.level = calculate_level(user.xp)

    db.flush()
    return transaction


def check_and_award_streak(db: Session, user: User) -> bool:
    """Check login streak and award bonus if 7-day streak achieved."""
    today = date.today()

    if user.streak_last_date:
        last_date = user.streak_last_date.date() if isinstance(user.streak_last_date, datetime) else user.streak_last_date
        delta = (today - last_date).days

        if delta == 1:
            user.streak_days += 1
        elif delta == 0:
            return False
        else:
            user.streak_days = 1
    else:
        user.streak_days = 1

    user.streak_last_date = datetime.utcnow()

    if user.streak_days > 0 and user.streak_days % 7 == 0:
        award_points(db, user, "streak_bonus", f"7-day streak bonus! ({user.streak_days} days)")
        return True

    return False

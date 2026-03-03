import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.models.roadmap import RoadmapNode, Roadmap
from app.models.chat import ChatMessage
from app.models.progress import NodeProgress, NodeStatus
from app.schemas.chat import (
    ChatRequest, ChatResponse, ChatHistoryResponse, ChatHistoryMessage,
    QuizRequest, QuizResponse, QuizQuestion,
    QuizAnswerSubmit, QuizVerifyResponse,
)
from app.utils.dependencies import get_current_user
from app.services.ai_tutor import chat_with_tutor, generate_quiz, verify_quiz_answers
from app.services.gamification import award_points

router = APIRouter(prefix="/api/chat", tags=["AI Tutor Chat"])

# In-memory quiz cache (session_id -> quiz data). For production, use Redis.
_quiz_cache: dict = {}


@router.post("", response_model=ChatResponse)
async def send_message(
    chat_data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message to the AI Tutor. Context-aware based on current node/roadmap."""
    node_topic = None
    roadmap_title = None

    if chat_data.node_id:
        node = db.query(RoadmapNode).filter(RoadmapNode.id == chat_data.node_id).first()
        if node:
            node_topic = node.title

    if chat_data.roadmap_id:
        roadmap = db.query(Roadmap).filter(Roadmap.id == chat_data.roadmap_id).first()
        if roadmap:
            roadmap_title = roadmap.title

    session_id = chat_data.session_id or str(uuid.uuid4())

    # Get recent chat history for context
    history_records = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == current_user.id, ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
        .all()
    )
    chat_history = [
        {"role": msg.role, "content": msg.content}
        for msg in reversed(history_records)
    ]

    # Save user message
    user_msg = ChatMessage(
        user_id=current_user.id,
        node_id=chat_data.node_id,
        roadmap_id=chat_data.roadmap_id,
        role="user",
        content=chat_data.message,
        session_id=session_id,
    )
    db.add(user_msg)

    # Get AI response
    ai_response = await chat_with_tutor(
        message=chat_data.message,
        node_topic=node_topic,
        roadmap_title=roadmap_title,
        chat_history=chat_history,
    )

    # Save AI response
    ai_msg = ChatMessage(
        user_id=current_user.id,
        node_id=chat_data.node_id,
        roadmap_id=chat_data.roadmap_id,
        role="assistant",
        content=ai_response,
        session_id=session_id,
    )
    db.add(ai_msg)
    db.commit()

    return ChatResponse(
        response=ai_response,
        session_id=session_id,
        node_id=chat_data.node_id,
        roadmap_id=chat_data.roadmap_id,
    )


@router.get("/history", response_model=ChatHistoryResponse)
def get_chat_history(
    node_id: Optional[int] = None,
    session_id: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get chat history for a specific node or session."""
    query = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id)

    if node_id:
        query = query.filter(ChatMessage.node_id == node_id)
    if session_id:
        query = query.filter(ChatMessage.session_id == session_id)

    messages = query.order_by(ChatMessage.created_at.asc()).limit(limit).all()

    return ChatHistoryResponse(
        messages=[
            ChatHistoryMessage(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at,
            )
            for msg in messages
        ],
        node_id=node_id,
        session_id=session_id,
    )


@router.post("/quiz", response_model=QuizResponse)
async def request_quiz(
    quiz_data: QuizRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a quiz for a specific node topic. Required for strict mode."""
    node = db.query(RoadmapNode).filter(RoadmapNode.id == quiz_data.node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    # Security: user must be assigned to the roadmap
    from app.models.roadmap import UserRoadmap
    assignment = db.query(UserRoadmap).filter(
        UserRoadmap.user_id == current_user.id,
        UserRoadmap.roadmap_id == node.roadmap_id,
    ).first()
    if not assignment:
        raise HTTPException(status_code=403, detail="You are not assigned to this roadmap.")

    # Security: check if already passed
    progress = db.query(NodeProgress).filter(
        NodeProgress.user_id == current_user.id,
        NodeProgress.node_id == node.id,
    ).first()
    if progress and progress.quiz_passed:
        raise HTTPException(status_code=400, detail="You have already passed the quiz for this node.")

    try:
        quiz_result = await generate_quiz(node.title, quiz_data.num_questions)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    session_id = str(uuid.uuid4())

    questions = [
        QuizQuestion(
            question=q["question"],
            options=q["options"],
            correct_index=q["correct_index"],
        )
        for q in quiz_result.get("questions", [])
    ]

    _quiz_cache[session_id] = {
        "node_id": quiz_data.node_id,
        "questions": quiz_result.get("questions", []),
        "user_id": current_user.id,
    }

    return QuizResponse(
        node_id=quiz_data.node_id,
        topic=node.title,
        questions=questions,
        session_id=session_id,
    )


@router.post("/quiz/verify", response_model=QuizVerifyResponse)
async def verify_quiz(
    submission: QuizAnswerSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify quiz answers. If passed, mark quiz_passed on the node progress."""
    cached = _quiz_cache.get(submission.session_id)
    if not cached:
        raise HTTPException(status_code=404, detail="Quiz session not found or expired")
    if cached["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized quiz session")

    node = db.query(RoadmapNode).filter(RoadmapNode.id == submission.node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    # Security: check if already passed to prevent XP farming
    progress = db.query(NodeProgress).filter(
        NodeProgress.user_id == current_user.id,
        NodeProgress.node_id == submission.node_id,
    ).first()
    if progress and progress.quiz_passed:
        del _quiz_cache[submission.session_id]
        raise HTTPException(status_code=400, detail="Quiz already passed. No multiple submissions allowed.")

    verification = await verify_quiz_answers(
        node_topic=node.title,
        questions=cached["questions"],
        user_answers=submission.answers,
    )

    node_marked_done = False

    if verification["passed"]:
        award_points(db, current_user, "quiz_pass", f"Passed quiz on: {node.title}")

        progress = db.query(NodeProgress).filter(
            NodeProgress.user_id == current_user.id,
            NodeProgress.node_id == submission.node_id,
        ).first()

        if progress:
            progress.quiz_passed = True
        else:
            progress = NodeProgress(
                user_id=current_user.id,
                node_id=submission.node_id,
                status=NodeStatus.IN_PROGRESS,
                quiz_passed=True,
            )
            db.add(progress)

    db.commit()
    del _quiz_cache[submission.session_id]

    return QuizVerifyResponse(
        score=verification["score"],
        total=verification["total"],
        passed=verification["passed"],
        correct_answers=verification["correct_answers"],
        feedback=verification["feedback"],
        node_marked_done=node_marked_done,
    )

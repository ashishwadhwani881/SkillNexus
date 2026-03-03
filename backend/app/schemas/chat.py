from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User message to the AI tutor")
    node_id: Optional[int] = None
    roadmap_id: Optional[int] = None
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    node_id: Optional[int] = None
    roadmap_id: Optional[int] = None


class ChatHistoryMessage(BaseModel):
    id: int
    role: str
    content: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    messages: List[ChatHistoryMessage]
    node_id: Optional[int] = None
    session_id: Optional[str] = None


# --- Quiz ---
class QuizRequest(BaseModel):
    node_id: int
    num_questions: int = Field(default=3, ge=1, le=5)


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_index: int


class QuizResponse(BaseModel):
    node_id: int
    topic: str
    questions: List[QuizQuestion]
    session_id: str


class QuizAnswerSubmit(BaseModel):
    node_id: int
    session_id: str
    answers: List[int]  # user's selected option indices


class QuizVerifyResponse(BaseModel):
    score: int
    total: int
    passed: bool
    correct_answers: List[int]
    feedback: str
    node_marked_done: bool = False

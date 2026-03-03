from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import get_settings
from app.database import engine, Base

# Import all models to ensure tables are registered
from app.models.user import User, PointTransaction, UserSkill
from app.models.roadmap import Roadmap, RoadmapNode, UserRoadmap
from app.models.progress import NodeProgress
from app.models.chat import ChatMessage

# Import routers
from app.routers import auth, users, leaderboard, roadmaps, progress, chat, admin

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/Shutdown events."""
    try:
        Base.metadata.create_all(bind=engine)
        print("[OK] Database tables created/verified")
    except Exception as e:
        print(f"[WARN] Database connection failed: {e}")
        print("[WARN] Server running but DB features won't work. Update DATABASE_URL in .env and restart.")
    print(f"[START] {settings.APP_NAME} API is running on http://localhost:8000")
    print(f"[DOCS] API Docs at http://localhost:8000/docs")
    yield
    engine.dispose()
    print("[STOP] SkillNexus API shutdown complete")


app = FastAPI(
    title="SkillNexus API",
    description=(
        "AI-Powered Roadmap Learning Platform. "
        "Interactive node-based learning paths with an AI Tutor, "
        "gamification, and L&D administration."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(leaderboard.router)
app.include_router(roadmaps.router)
app.include_router(progress.router)
app.include_router(chat.router)
app.include_router(admin.router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}

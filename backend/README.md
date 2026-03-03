# SkillNexus – AI-Powered Roadmap Learning Platform

## Overview
SkillNexus transforms corporate L&D from passive video watching into dynamic **"Learning Journeys."** Employees follow interactive, node-based roadmaps (e.g., "React Developer 2026"), validate knowledge via an **AI Tutor** powered by Google Gemini, and earn XP for the leaderboard.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python 3.10+) |
| ORM | SQLAlchemy 2.0 (async) |
| Database | PostgreSQL + asyncpg |
| Migrations | Alembic |
| AI | Google Gemini API (`google-generativeai`) |
| Auth | JWT (python-jose + bcrypt) |

## Tree/Graph Strategy: Adjacency List
The roadmap node structure uses the **Adjacency List** pattern:
- Each `RoadmapNode` has a `parent_id` (self-referential FK) and a `position` field.
- Root nodes have `parent_id = NULL`.
- Deep nesting is supported (5-6+ levels) via recursive queries.
- The API builds the tree in Python by recursively grouping children by `parent_id`.

```
Frontend (Root)
├── HTML (depth=1, position=0)
│   ├── Forms (depth=2)
│   └── Semantic HTML (depth=2)
├── CSS (depth=1, position=1)
│   ├── Flexbox (depth=2)
│   └── Grid (depth=2)
└── JavaScript (depth=1, position=2)
    ├── ES6+ (depth=2)
    └── React (depth=2)
        ├── Hooks (depth=3)
        └── State Management (depth=3)
```

## Prompt Strategy: AI Tutor
The system prompt dynamically injects context:
```
"You are an expert corporate trainer on SkillNexus.
The learner is following the '{roadmap_title}' roadmap.
The learner is currently studying: '{node_topic}'.
Keep answers concise and practical."
```
- **Chat History**: Last 10 messages included for context continuity.
- **Quiz**: AI generates MCQ questions; 70%+ score to pass.
- **Strict Mode**: Node cannot be marked "Done" until the quiz is passed.

## Setup

### 1. Install Dependencies
```bash
cd backend
python -m venv venv
venv\Scripts\activate    # Windows
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL URL and Gemini API key
```

### 3. Create Database
```sql
CREATE DATABASE skillnexus;
```

### 4. Run Server
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```
Tables are auto-created on first startup.

### 5. API Docs
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints Summary

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register user |
| POST | `/api/auth/login` | Login, get JWT |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Profile + skills |
| PUT | `/api/users/me` | Update profile |
| POST | `/api/users/me/resume` | Upload resume PDF |
| GET | `/api/users/me/points` | XP history |

### Leaderboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Top learners (week/month/all) |

### Roadmaps
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/roadmaps` | Create roadmap (Admin) |
| GET | `/api/roadmaps` | List roadmaps |
| GET | `/api/roadmaps/{id}` | Get with node tree |
| PUT | `/api/roadmaps/{id}` | Update (Admin) |
| DELETE | `/api/roadmaps/{id}` | Delete (Admin) |
| POST | `/api/roadmaps/{id}/nodes` | Add node (Admin) |
| PUT | `/api/roadmaps/{id}/nodes/{nid}` | Update node (Admin) |
| DELETE | `/api/roadmaps/{id}/nodes/{nid}` | Delete node (Admin) |
| POST | `/api/roadmaps/{id}/import` | Import JSON (Admin) |
| GET | `/api/roadmaps/{id}/export` | Export JSON (Admin) |
| POST | `/api/roadmaps/generate` | AI generate roadmap (Admin) |

### Progress
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/progress/{node_id}` | Update node status |
| GET | `/api/progress/roadmap/{id}` | Roadmap progress summary |

### AI Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Chat with AI tutor |
| GET | `/api/chat/history` | Chat history |
| POST | `/api/chat/quiz` | Generate quiz |
| POST | `/api/chat/quiz/verify` | Verify quiz answers |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/assign` | Assign roadmap |
| POST | `/api/admin/assign/bulk` | Bulk assign |
| GET | `/api/admin/analytics` | Analytics dashboard |
| GET | `/api/admin/skill-gaps` | Skill gap analysis |
| GET | `/api/admin/users` | List users |
| GET | `/api/admin/user/{id}/roadmaps` | User's roadmaps |

## Gamification
- Login = **10 XP**
- Node Complete = **50 XP**
- Quiz Pass = **30 XP**
- 7-Day Streak Bonus = **100 XP**
- Level = `floor(XP / 200) + 1`

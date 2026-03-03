# 🚀 SkillNexus — AI-Powered Roadmap Learning Platform

SkillNexus is a full-stack corporate training platform that combines **interactive learning roadmaps**, an **AI tutor powered by Google Gemini**, **quizzes**, **gamification**, and **L&D analytics** into a single platform.

Admins create structured learning paths, assign them to employees, and track progress. Learners follow node-based roadmaps, chat with an AI tutor, take quizzes, earn XP, and compete on leaderboards.

---

## ✨ Features

### 🎓 For Learners
- **Interactive Roadmap Trees** — Visual, hierarchical learning paths with clickable nodes
- **AI Tutor Chat** — Context-aware conversations powered by Google Gemini, scoped to the current node and roadmap
- **Dynamic Quizzes** — AI-generated multiple-choice quizzes per node with instant feedback
- **Strict Mode** — Learners must pass a quiz before marking a node complete
- **XP & Leveling** — Earn XP for starting nodes (+10), completing nodes (+50), passing quizzes (+30), daily logins (+10), and streaks (+100 every 7 days)
- **Leaderboard** — Weekly, monthly, and all-time XP rankings
- **Resume Upload** — PDF parsing to extract skills and suggest relevant roadmaps
- **Progress Tracking** — Per-node status (Pending → In Progress → Done) with overall roadmap progress percentage

### 🛠️ For Admins / L&D Managers
- **Roadmap Builder** — Create roadmaps manually or generate them with AI from a text prompt
- **Node Management** — Add, edit, delete, and reorder nodes with descriptions and resource links
- **User Management** — Create users with specific roles (learner, manager, admin)
- **Roadmap Assignment** — Assign roadmaps to individual users or in bulk
- **Analytics Dashboard** — Track learner progress, identify skill gaps and low-completion nodes
- **Import/Export** — JSON import/export for roadmap portability

### 🔒 Security
- JWT authentication with bcrypt password hashing
- Role-based access control (Learner, Manager, Admin)
- Backend validation for all XP awards, roadmap assignment checks, and status transitions
- Anti-XP-farming protections: daily login limits, first-time-only XP, status regression locks

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, React Router 7, Axios, React Icons, React Markdown |
| **Backend** | FastAPI, SQLAlchemy 2.0, Pydantic Settings, Alembic |
| **Database** | PostgreSQL 16 |
| **AI** | Google Gemini (gemini-2.5-flash-lite) |
| **Auth** | JWT (python-jose) + bcrypt (passlib) |
| **Deployment** | Docker, Docker Compose, nginx |

---

## 📁 Project Structure

```
SkillNexus/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entrypoint
│   │   ├── config.py            # Environment settings
│   │   ├── database.py          # SQLAlchemy engine & session
│   │   ├── models/              # ORM models (User, Roadmap, Progress, Chat)
│   │   ├── schemas/             # Pydantic request/response DTOs
│   │   ├── routers/             # API route handlers
│   │   ├── services/            # Business logic (AI tutor, gamification, resume parser)
│   │   └── utils/               # Auth dependencies, JWT security
│   ├── alembic/                 # Database migrations
│   ├── seed_admin.py            # Bootstrap first admin user
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Routing & auth provider
│   │   ├── main.jsx             # React entrypoint
│   │   ├── index.css            # Global design system
│   │   ├── context/             # AuthContext (JWT state management)
│   │   ├── services/            # Centralized axios API layer
│   │   └── components/          # 11 React components
│   ├── nginx.conf               # Production reverse proxy config
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml           # Full stack orchestration
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- A [Google Gemini API Key](https://aistudio.google.com/apikey) (for AI features)

### Run with Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/SkillNexus.git
cd SkillNexus

# Set your Gemini API key
echo "GEMINI_API_KEY=your-api-key-here" > .env

# Build and start all services
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

### Seed the Admin User

```bash
docker compose exec backend python seed_admin.py
```

This creates the first admin account so you can log in and start creating roadmaps.

---

### Run Locally (Development)

#### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your DATABASE_URL and GEMINI_API_KEY

uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173, backend on http://localhost:8000.

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/signup` | Public | Register a new learner |
| `POST` | `/api/auth/login` | Public | Login and receive JWT |
| `GET` | `/api/users/me` | User | Get current user profile |
| `PUT` | `/api/users/me` | User | Update profile |
| `POST` | `/api/users/me/resume` | User | Upload resume PDF |
| `GET` | `/api/users/me/points` | User | XP transaction history |
| `GET` | `/api/roadmaps` | Admin | List all roadmaps |
| `GET` | `/api/roadmaps/my-roadmaps` | User | List assigned roadmaps |
| `GET` | `/api/roadmaps/{id}` | User | Get roadmap with node tree |
| `POST` | `/api/roadmaps` | Admin | Create roadmap |
| `POST` | `/api/roadmaps/generate` | Admin | AI-generate roadmap from prompt |
| `PUT` | `/api/progress/{node_id}` | User | Update node status |
| `GET` | `/api/progress/roadmap/{id}` | User | Get roadmap progress summary |
| `POST` | `/api/chat` | User | Send message to AI tutor |
| `POST` | `/api/chat/quiz` | User | Generate quiz for a node |
| `POST` | `/api/chat/quiz/verify` | User | Submit and verify quiz answers |
| `GET` | `/api/leaderboard` | Public | XP leaderboard |
| `POST` | `/api/admin/assign` | Admin | Assign roadmap to user |
| `POST` | `/api/admin/create-user` | Admin | Create user with role |
| `GET` | `/api/admin/analytics` | Admin | Progress analytics |
| `GET` | `/api/admin/skill-gaps` | Admin | Skill gap analysis |

Full interactive docs at `/docs` (Swagger UI) and `/redoc`.

---

## 🎮 Gamification System

| Action | XP | Condition |
|--------|-----|-----------|
| Daily Login | +10 | Once per calendar day |
| Start Node | +10 | First time only |
| Complete Node | +50 | First time only, quiz must be passed |
| Pass Quiz | +30 | Once per node |
| Quiz Bonus (Strict Mode) | +5 | On node completion with quiz |
| 7-Day Streak | +100 | Every 7 consecutive login days |

**Level formula**: `Level = floor(XP / 200) + 1`

---

## 🛡️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+psycopg://postgres:ashish123@localhost:5432/skillnexus` |
| `SECRET_KEY` | JWT signing key | `skillnexus-dev-secret-key-2026` |
| `GEMINI_API_KEY` | Google Gemini API key | _(required for AI features)_ |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry | `1440` (24 hours) |
| `DEBUG` | Enable SQL echo logging | `true` |

---

## 📜 License

This project is for educational and demonstration purposes.

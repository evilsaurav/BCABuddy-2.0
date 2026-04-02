# 🚀 BCABuddy 2.0

> **AI-Powered IGNOU BCA Learning Assistant**  
> Full-stack application with intelligent tutoring, exam simulation, roadmap generation, performance analytics, and OCR-powered study tools.

![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
[![Backend Deploy](https://github.com/evilsaurav/BCABuddy-2.0/actions/workflows/deploy.yml/badge.svg)](https://github.com/evilsaurav/BCABuddy-2.0/actions/workflows/deploy.yml)
[![Frontend Deploy](https://github.com/evilsaurav/BCABuddy-2.0/actions/workflows/azure-static-web-apps-kind-sea-0b41fb700.yml/badge.svg)](https://github.com/evilsaurav/BCABuddy-2.0/actions/workflows/azure-static-web-apps-kind-sea-0b41fb700.yml)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Reference](#-api-reference)
- [Data Model](#-data-model)
- [Configuration](#-configuration)
- [Development](#-development)
- [Testing](#-testing)
- [Known Limitations](#-known-limitations)
- [Troubleshooting](#-troubleshooting)
- [Project Structure](#-project-structure)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)

---

## 📘 Overview

**BCABuddy 2.0** is a production-grade AI study companion designed specifically for **IGNOU BCA students**. It combines intelligent tutoring, retrieval-augmented generation (RAG), adaptive assessments, and performance tracking into a single unified platform.

### 🎯 Core Objectives

- **Subject-Aware Tutoring:** Deep understanding of IGNOU BCA syllabus (MCS-024, MCS-021, BCS-062, etc.)
- **Adaptive Learning:** Personalized study roadmaps, exam predictions, and flashcard-style cheat sheets
- **Assessment Suite:** Quiz generation, full exam simulation with subjective grading, and analytics
- **OCR Integration:** Extract text from handwritten/printed notes and PDFs for instant Q&A and quiz generation
- **Performance Intelligence:** Track progress, generate detailed performance reports, and export study history

---

## 🏗 Architecture

BCABuddy follows a **decoupled client-server architecture** with RESTful APIs and JWT-based authentication.

```
┌──────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)                 │
│  ┌────────────┬────────────┬────────────┬────────────────┐  │
│  │  Dashboard │  APC Tools │  Exam Sim  │  Profile/Auth  │  │
│  └────────────┴────────────┴────────────┴────────────────┘  │
│                  ↓ HTTP (JWT auth) ↓                         │
│                  /api proxy (Vite dev) or direct             │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│                     Backend (FastAPI)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Auth (JWT) │ Chat │ RAG │ Quiz │ OCR │ Roadmap │ APC│   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                      ↓                           │
│  ┌───────────────────┐  ┌──────────────────────┐            │
│  │ SQLite DB         │  │ Vector Stores        │            │
│  │ - users           │  │ - FAISS index        │            │
│  │ - sessions        │  │ - Chroma DB          │            │
│  │ - history         │  │ - HuggingFace embed  │            │
│  │ - study_roadmaps  │  └──────────────────────┘            │
│  └───────────────────┘                                       │
│           ↓                      ↓                           │
│  ┌───────────────────┐  ┌──────────────────────┐            │
│  │ Groq LLaMA 3.3    │  │ EasyOCR / Tesseract  │            │
│  │ 70B Versatile     │  │ PyPDF text extraction│            │
│  └───────────────────┘  └──────────────────────┘            │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Request** → Frontend sends message/file/request with JWT token
2. **Auth Middleware** → Backend validates token and extracts user context
3. **Intent Detection** → `persona.py` classifies request type (chat/quiz/roadmap/etc.)
4. **RAG Retrieval** (if applicable) → FAISS/Chroma query for relevant context from syllabus/uploads
5. **Prompt Engineering** → System prompt assembled with persona, tool rules, subject context
6. **LLM Completion** → Groq API call with continuation logic for long responses
7. **Post-Processing** → Parse markdown/code blocks, extract structured data (quiz JSON, roadmap days)
8. **Persistence** → Save chat history, roadmaps, analytics to SQLite
9. **Response** → JSON payload with AI message, suggestions, metadata

---

## 🛠 Tech Stack

### Backend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | FastAPI | 0.115.12 | Async REST API server |
| **Runtime** | Python | 3.9+ | Language runtime |
| **Server** | Uvicorn | 0.34.0 | ASGI server with hot reload |
| **Database** | SQLite | 3.x | User/session/history persistence |
| **ORM** | SQLAlchemy | 2.0.37 | Database abstraction layer |
| **Auth** | python-jose | 3.3.0 | JWT encoding/decoding |
| **Hashing** | bcrypt | <5.0 | Password hashing (via passlib) |
| **AI/LLM** | Groq SDK | 0.13.0 | LLaMA 3.3 70B Versatile API |
| **RAG** | LangChain Community | 0.4.1 | Text splitting, vector retrieval |
| **Embeddings** | sentence-transformers | 3.3.1 | HuggingFace embedding models |
| **Vector Store** | FAISS (CPU) | 1.13.2 | Fast similarity search |
| **OCR** | EasyOCR | (optional) | Image text extraction |
| **PDF** | pypdf / PyPDF2 | 5.1.0 / 3.0.1 | PDF text extraction |
| **ML Framework** | PyTorch | 2.10.0 | Transformer model backend |
| **Config** | python-dotenv | 1.0.1 | Environment variable management |

### Frontend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | React | 19.2.0 | Component-based UI library |
| **Build Tool** | Vite | 7.2.4 | Fast dev server + bundler |
| **Routing** | react-router-dom | 7.13.0 | Client-side routing |
| **UI Components** | Material-UI (MUI) | 7.3.7 | Pre-built React components |
| **Icons** | MUI Icons + Lucide | 7.3.7 / 0.538.0 | Icon libraries |
| **Animation** | Framer Motion | 12.34.4 | Component animations |
| **Charts** | Recharts | 3.7.0 | Performance visualizations |
| **Markdown** | react-markdown | 10.1.0 | Render AI responses |
| **Diagrams** | Mermaid | 10.9.5 | Flowchart/diagram rendering |
| **Syntax Highlight** | react-syntax-highlighter | 16.1.0 | Code block formatting |
| **PDF Export** | html2pdf.js / jsPDF | 0.14.0 / 4.0.0 | Export study history/marksheets |
| **Particles** | tsparticles | 3.9.1 | Background effects (optional) |

### DevOps & Tooling

- **Launcher:** PowerShell script (`run_app.ps1`) for Windows with health checks, port cleanup, log management
- **Linting:** ESLint (frontend)
- **Testing:** pytest (backend), manual integration scripts
- **Version Control:** Git

---

## ✨ Features

### 🔐 Authentication & Profiles

- **User Registration & Login** with bcrypt password hashing
- **JWT-based session management** (60min default token expiry)
- **Profile Management:**
  - Update display name, bio
  - Upload avatar (local static or Supabase integration)
  - Change password with validation
  - Export chat history as PDF or CSV
- **Token Lifecycle Management:**
  - Auto-refresh warning before expiry
  - Graceful logout on expiration
  - Persistent login state via localStorage

### 💬 AI Chat Interface

- **Intelligent Persona System:**
  - **Tutor Mode:** Subject-focused academic responses with Hinglish support
  - **Jiya Personality:** Friendly conversational easter egg
  - **Saurav Creator Mode:** Special identity markers for creator account
- **Context-Aware Responses:**
  - Intent classification (Academic/Command/Personal/Ambiguous)
  - Subject extraction from user message
  - 3 smart suggestions per response
- **RAG-Powered Answers:**
  - FAISS vector similarity search over syllabus corpus
  - User-uploaded PDF indexing (planned enhancement)
  - Retrieval-augmented generation for accurate answers
- **Session Management:**
  - Persistent chat sessions with auto-generated titles
  - Rename/delete sessions
  - Multi-session history view
- **Rich Response Rendering:**
  - Markdown with GFM (tables, task lists, strikethrough)
  - Mermaid diagrams (flowcharts, sequence diagrams)
  - Syntax-highlighted code blocks
  - Mathematical equations (KaTeX support planned)

### 📚 Study Tools

#### 1. **AI Code Architect**
- Interactive programming tutor
- Explains code snippets with detailed comments
- Generates working examples for data structures, algorithms, Java, Python
- Output format: clean fenced code blocks with separate explanations

#### 2. **Exam Predictor**
- Analyzes IGNOU exam patterns
- Predicts **top N** most likely questions for upcoming exams
- Requires: Subject, Semester, Number of Predictions
- Output: Numbered list of predicted questions

#### 3. **Study Roadmap Generator**
- Creates structured daily study plans
- Customizable duration (7/15/30/45/60 days)
- Day-by-day topic breakdown with time estimates
- **Accept & Save:** Save roadmap to history
- **Ask Follow-up:** Continue editing roadmap via chat
- **History View:** Grouped by semester → subject with timestamps

#### 4. **Cheat Mode** (Flashcard System)
- Generates concise, exam-focused cheat sheets
- Subject-specific key points
- Flashcard-style format for quick revision

#### 5. **Quiz Master**
- **Quick Practice Quiz:**
  - MCQ generation (5/10/15/20 questions)
  - Instant feedback with explanations
  - Per-question explain feature
  - Review with correct/incorrect highlighting
  - Export results as PDF
- **OCR Quiz from Notes:**
  - Upload handwritten/printed notes image
  - AI extracts text and generates quiz
  - Optional remarks/instructions field

#### 6. **Exam Simulator**
- **Full Exam Mode:**
  - Mixed MCQ + Subjective questions
  - Configurable question counts
  - Timed exam session
  - Subjective answer AI grading
  - Performance analytics dashboard
  - Export marksheet as PDF

#### 7. **Performance Analytics**
- Aggregates quiz/exam history
- Generates detailed performance report:
  - Subject-wise accuracy
  - Strengths & weaknesses
  - Time management insights
  - Study recommendations
- View saved reports from dashboard

#### 8. **AI Viva Mentor** *(Legacy/Planned)*
- Mock viva practice with conversational Q&A
- Subject-specific viva preparation
- Real-time feedback on answers

### 📄 OCR & Document Processing

- **Upload Notes OCR:**
  - Extract text from images (PNG, JPG, JPEG)
  - Convert to AI-readable format
  - Generate summaries or Q&A
- **Assignment Solver:**
  - Upload assignment image/PDF
  - AI provides step-by-step solutions
  - Supports handwritten content (via EasyOCR)

### 📊 Dashboard & Analytics

- **Dashboard Stats:**
  - Total sessions
  - Messages sent
  - Active session count
- **Syllabus Progress Card:**
  - Subject completion tracking
  - Visual progress bars
- **Study Roadmap Card:**
  - Display latest roadmap
  - Quick access to roadmap history
- **Performance Summary:**
  - Latest analytics report link
  - Generate new report button

---

## 📦 Installation

### Prerequisites

- **Python 3.9 or higher** (tested on 3.14)
- **Node.js 18+** and **npm**
- **Git**
- **(Optional) Tesseract OCR binary** for pytesseract fallback

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/bcabuddy.git
cd bcabuddy
```

### 2. Backend Setup

#### 2.1 Create Virtual Environment

```bash
cd backend
python -m venv .venv
```
> [!IMPORTANT]
> **Windows Users:** Agar `.venv` activate karte waqt `UnauthorizedAccess` error aaye, toh Admin PowerShell mein ye command chalayein:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Force`

#### 2.2 Activate Virtual Environment

**Windows (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
.venv\Scripts\activate.bat
```

**macOS/Linux:**
```bash
source .venv/bin/activate
```

#### 2.3 Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### 2.4 Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Required: Groq API Key (get from https://console.groq.com)
GROQ_API_KEY=gsk_your_groq_api_key_here

# Optional: JWT Secret (auto-generated if missing, but set in production)
SECRET_KEY=your-secret-key-min-32-chars

# Optional: Ports (default: 8000 backend, 5173 frontend)
BACKEND_PORT=8000

# Optional: CORS origins (comma-separated)
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Optional: Rate limits (requests per minute)
CHAT_REQUESTS_PER_MINUTE=30
QUIZ_REQUESTS_PER_MINUTE=10
EXAM_REQUESTS_PER_MINUTE=5
```

#### 2.5 Initialize Database

```bash
# Database and tables are auto-created on first run
# Optionally run migration scripts if needed:
python migrate_add_is_creator.py
```

#### 2.6 Start Backend Server

```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be available at: **http://127.0.0.1:8000**

API documentation (Swagger UI): **http://127.0.0.1:8000/docs**

### 3. Frontend Setup

#### 3.1 Install Dependencies

```bash
cd frontend
npm install
```

#### 3.2 Configure Environment (Optional)

Create `.env` in `frontend/` if you want to customize API base URL:

```env
VITE_API_BASE=http://127.0.0.1:8000
```

*(Vite dev server already proxies `/api` to backend, so this is optional for local dev)*

#### 3.3 Start Frontend Dev Server

```bash
npm run dev
```

Frontend will be available at: **http://localhost:5173**

---

## 🚀 Usage

### Option 1: Manual Start (Two Terminals)

**Terminal 1 (Backend):**
```bash
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

### Option 2: Automated Start (Windows PowerShell)

Use the unified launcher script:

```powershell
# Basic start (auto-restart if ports occupied)
.\run_app.ps1

# Install dependencies first time
.\run_app.ps1 -InstallDeps

# Custom ports
.\run_app.ps1 -BackendPort 9000 -FrontendPort 3000

# Extended startup timeout (if slow machine)
.\run_app.ps1 -StartupTimeoutSec 120

# Verbose health check diagnostics
.\run_app.ps1 -VerboseHealth

# Combined flags
.\run_app.ps1 -InstallDeps -VerboseHealth -StartupTimeoutSec 180
```

**Script Features:**
- Auto-creates Python venv if missing
- Kills processes occupying ports 8000/5173 before start
- Validates backend `/health` and frontend root
- Opens browser automatically
- Logs to `logs/backend.out.log`, `logs/backend.err.log`, etc.
- Stores process IDs in `logs/run_app.pids.json`

### Testing the Setup

1. Navigate to **http://localhost:5173**
2. **Sign Up:** Create a new account
3. **Login:** Authenticate with credentials
4. **Dashboard:** Start a chat session or explore APC tools
5. **Chat Test:** Ask "Explain binary search tree in Java"
6. **Quiz Test:** Generate a 10-question quiz for MCS-024
7. **Roadmap Test:** Create a 15-day roadmap for BCS-062

---

## ?? API Reference

### Base URL

**Development:** `http://127.0.0.1:8000`  
**Production:** (Configure via environment)

### Authentication

All protected endpoints require JWT token in `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

Obtain token via `/login` endpoint.

---

### Endpoints Reference

See complete API catalog and interactive docs at **http://127.0.0.1:8000/docs** (Swagger UI) when backend is running.

#### Key Endpoint Groups:

- **/signup, /login** - Authentication
- **/profile** - User profile management
- **/chat** - AI chat interface
- **/sessions** - Chat session CRUD
- **/generate-quiz, /generate-exam** - Assessment generation
- **/study-roadmap/{latest|accept|history}** - Roadmap workflows
- **/apc/performance-report** - Analytics generation
- **/upload-notes-ocr, /solve-assignment** - OCR processing

For detailed request/response schemas see [backend/models.py](backend/models.py).

---

## ?? Data Model

### SQLite Database Tables

#### **users**
- `id` (PRIMARY KEY), `username`, `email`, `hashed_password`
- `display_name`, `bio`, `profile_picture_url`
- `created_at`, `is_creator`

#### **chat_sessions**
- `id` (UUID), `user_id` (FK), `title`
- `created_at`, `last_message_at`

#### **chat_history**
- `id`, `session_id` (FK), `user_id` (FK)
- `role` (user/assistant), `content`, `timestamp`

#### **study_roadmaps**
- `id`, `user_id` (FK), `subject`, `semester`
- `duration_days`, `content` (markdown), `created_at`

### Vector Stores

- **FAISS Index:** 384-dim embeddings from `sentence-transformers/all-MiniLM-L6-v2`
- **Chroma DB:** Persistent vector storage for user documents (planned)

See [backend/database.py](backend/database.py) for full schema.

---

## ? Configuration

### Backend (.env)

```env
# Required
GROQ_API_KEY=your_key

# Security
SECRET_KEY=your_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Storage
UPLOAD_DIR=uploads
PROFILE_PICS_DIR=profile_pics

# CORS
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Rate Limits
CHAT_REQUESTS_PER_MINUTE=30
QUIZ_REQUESTS_PER_MINUTE=10
```

### Frontend (.env)

```env
VITE_API_BASE=http://127.0.0.1:8000
```

### Launcher Flags (run_app.ps1)

- `-BackendPort`, `-FrontendPort`, `-BindHost`
- `-InstallDeps`, `-Reload`, `-VerboseHealth`
- `-StartupTimeoutSec`, `-LogDir`

---

## ?? Development

### Project Structure

```
BCABuddy/
+-- backend/
�   +-- main.py                      # FastAPI app + all endpoints
�   +-- auth_utils.py                # JWT + bcrypt utilities
�   +-- config.py                    # Settings + env loader
�   +-- database.py                  # SQLAlchemy models
�   +-- models.py                    # Pydantic schemas
�   +-- persona.py                   # Persona/intent logic
�   +-- rag_service.py               # RAG pipeline
�   +-- requirements.txt
�   +-- routes/
�   �   +-- auth.py
�   +-- .venv/
�   +-- chroma_db/, faiss_index/, profile_pics/, uploads/
+-- frontend/
�   +-- src/
�   �   +-- App.jsx, Dashboard.jsx, Login.jsx, Signup.jsx
�   �   +-- ExamSimulator.jsx, QuizSection.jsx
�   �   +-- pages/AdvancedTools.jsx
�   �   +-- utils/tokenManager.js, pdfExport.js
�   +-- vite.config.js, package.json
+-- logs/
+-- run_app.ps1
+-- test_api.py, test_final_integration.py
+-- README.md (this file)
```

### Running Tests

```bash
# Backend
cd backend
pytest -v

# Integration
python test_api.py
python test_final_integration.py

# PowerShell suite
.\test_comprehensive.ps1
```

### Dev Workflow

1. Start backend: `uvicorn main:app --reload`
2. Start frontend: `npm run dev`
3. Make changes (hot reload active)
4. Test via browser + API docs
5. Run integration tests
6. Commit changes

---

## ? Known Limitations

1. **Missing /upload endpoint** - Frontend references exist but backend route removed
2. **Mixed API base URLs** - Some pages hardcode 127.0.0.1:8000 vs /api proxy
3. **Incomplete RAG user upload** - User PDFs not auto-indexed to vector store
4. **Response mode handling** - Fast/Thinking/Pro modes partially implemented
5. **Token auto-refresh** - Manual re-login required after expiry

See [Known Limitations](#known-limitations) for details and workarounds.

---

## ?? Troubleshooting

### Common Issues

#### Backend won't start
- **Check:** Python 3.9+ installed, venv activated, GROQ_API_KEY set
- **Fix:** `pip install -r requirements.txt`

#### Frontend blank page
- **Check:** Backend running at http://127.0.0.1:8000/health
- **Fix:** Clear localStorage, logout/login

#### Port conflicts
- **Fix:** `.\run_app.ps1` (auto-kills), or change ports manually

#### OCR failures
- **Fix:** Install Tesseract or use EasyOCR fallback

#### PowerShell execution policy
- **Fix:** `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

See full [Troubleshooting](#troubleshooting) section for detailed resolutions.

---

## :roller_coaster: Roadmap

###  Phase 1-2 (Completed)
- Core auth, chat, quiz, exam simulator
- APC tools, roadmap, performance analytics
- OCR integration, PDF/CSV export

###  Phase 3 (In Progress)
- Fix /upload endpoint, centralize API URLs
- Restore response modes, token auto-refresh
- KaTeX math rendering

###  Phase 4-5 (Planned)
- Per-course knowledge bases
- Collaborative study groups
- Mobile app (React Native)
- Voice chat, live viva practice
- Gamification, offline mode

---

##  Contributing

1. Fork repo
2. Create feature branch: `git checkout -b feature/your-feature`
3. Make changes, test thoroughly
4. Commit: `git commit -m 'feat: add feature'`
5. Push and open PR

**Guidelines:**
- Follow PEP 8 (backend) and ESLint (frontend)
- Add docstrings and tests
- Update README if adding features

---

##  License

MIT License - See LICENSE file for details.

---

## Acknowledgments

- **IGNOU** for BCA curriculum
- **Groq** for fast LLaMA 3.3 70B API
- **HuggingFace, FastAPI, React communities**

---

## Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/bcabuddy/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/bcabuddy/discussions)

---

## Related Documentation

- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)
- [SETUP_GUIDE.md](SETUP_GUIDE.md)
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- [USER_GUIDE_PHASE5.md](USER_GUIDE_PHASE5.md)

---

**Built with :heart: for IGNOU BCA Students**

*Last Updated: March 3, 2026*

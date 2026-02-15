# BCABuddy Project Overview

## Summary
BCABuddy is an AI-powered IGNOU BCA learning assistant with a React frontend and a FastAPI backend. It provides chat-based study support, RAG-based answers from uploaded PDFs, quiz generation, exam simulation, OCR-assisted assignment help, and profile/export tools. The system uses Groq-hosted LLMs, FAISS/Chroma for retrieval, and SQLite for persistence.

## Tech Stack
- Frontend: React, Vite, Material UI, Framer Motion, Recharts
- Backend: FastAPI, SQLAlchemy, Groq API, LangChain Community
- Storage: SQLite (local), FAISS index, Chroma DB
- OCR: EasyOCR, Pytesseract (optional Tesseract binary)

## Key Features
- AI chat with persona handling and system instruction protocols
- RAG pipeline with PDF ingestion and vector search
- Quiz generation and exam simulator with analytics
- Profile management with export (PDF/CSV)
- Token lifecycle management to prevent expired JWT usage

## Project Structure
- backend/
  - main.py: FastAPI app and API endpoints
  - persona.py: persona/system instruction logic
  - database.py: SQLAlchemy models and DB session
  - rag_service.py: RAG pipeline and retrieval
  - models.py: Pydantic schemas
  - chroma_db/, faiss_index/: vector stores
- frontend/
  - src/
    - App.jsx, Dashboard.jsx: primary UI
    - ExamSimulator.jsx, QuizSection.jsx: assessment modules
    - utils/: shared utilities (tokenManager.js, pdfExport.js, answerNormalization.js)
- logs/: runtime logs and PID tracking
- run_app.ps1: unified startup for backend and frontend

## Setup
### Backend
1. Create venv and install deps:
   - cd backend
   - pip install -r requirements.txt
2. Configure .env with GROQ_API_KEY
3. Start server:
   - uvicorn main:app --reload
   - default: http://127.0.0.1:8000

### Frontend
1. Install deps:
   - cd frontend
   - npm install
2. Start dev server:
   - npm run dev
   - default: http://localhost:5173

### One-command (Windows)
- .\run_app.ps1

## Configuration
- Backend environment: .env (see .env.example)
- OCR (optional): Tesseract binary must be installed and on PATH for Pytesseract
- Ports: backend 8000, frontend 5173 (configurable in run_app.ps1)

## Data and Storage
- SQLite DB file: backend/bcabuddy.db (auto-created if missing)
- FAISS index: backend/faiss_index/index.faiss
- Chroma DB: backend/chroma_db/
- Uploads: backend/uploads/
- Profile pictures: backend/profile_pics/

## Testing
- Backend tests include simple integration checks:
  - backend/test_personality_simple.py
- Additional test scripts:
  - test_api.py, test_app.py, test_final_integration.py

## Recent Enhancements
- Core identity and persona protocol updates
- ExamSimulator premium results dashboard with analytics
- Shared PDF export utility via html2pdf.js
- Answer normalization helper for consistent correctness checks
- Token lifecycle management in frontend

## Troubleshooting
- If frontend fails to start: run npm install in frontend/
- If backend fails: confirm GROQ_API_KEY and python venv
- If OCR fails: install Tesseract and ensure PATH
- If tokens expire: tokenManager handles auto-logout and warning

## Related Docs
- SETUP_GUIDE.md
- QUICK_REFERENCE.md
- USER_GUIDE_PHASE5.md
- STATUS.md

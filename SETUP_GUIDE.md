# BCABuddy Setup Guide

## Quick Start

### Backend Setup

1. **Install Python Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your GROQ_API_KEY
   ```

3. **Run Backend Server**
   ```bash
   uvicorn main:app --reload
   ```
   Server will run at: http://127.0.0.1:8000

### Frontend Setup

1. **Install Node Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Run Frontend Development Server**
   ```bash
   npm run dev
   ```
   Frontend will run at: http://localhost:5173

## OCR Feature (Optional)

The OCR packages (EasyOCR and Pytesseract) are now installed.

### Pytesseract Additional Requirement
For Pytesseract to work fully, you need to install Tesseract-OCR binary:

**Windows:**
1. Download from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install and add to PATH
3. Or set in code: `pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'`

**EasyOCR** works out of the box without additional system dependencies.

## Installed Packages

### Backend (Python 3.14.2)
- ✅ FastAPI 0.115.12
- ✅ Groq 0.13.0
- ✅ LangChain Community 0.4.1
- ✅ FAISS-CPU 1.13.2
- ✅ EasyOCR 1.7.2 (NEW)
- ✅ Pytesseract 0.3.13 (NEW)
- ✅ SQLAlchemy 2.0.37
- ✅ All dependencies installed

### Frontend
- React 19.2.0
- Material-UI 7.3.7
- Vite 7.2.4
- React Router 7.13.0

## Features

- 🤖 AI-powered learning assistant (Groq LLaMA 3.3)
- 📚 RAG (Retrieval Augmented Generation) with PDF support
- 🎯 Quiz generation
- 📝 Assignment solver with OCR
- 👤 User authentication (JWT)
- 💾 SQLite database
- 🎨 Modern glassmorphism UI

## Troubleshooting

**Import Errors:** Make sure you're using the virtual environment:
```bash
# Windows
.venv\Scripts\activate
# Or use full path
D:/ignou/BCABuddy/.venv/Scripts/python.exe
```

**Database Issues:** Delete `bcabuddy.db` and it will be recreated on next run.

**API Errors:** Check that your GROQ_API_KEY is valid in `.env` file.

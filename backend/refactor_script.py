import os

with open("main_new.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

# 1-840 -> services/chat_service.py
# 841-1117 -> routes/dashboard.py
# 1118-1267 -> routes/chat.py (append)
# 1268-1350 -> routes/quiz.py

chat_service_lines = lines[:840]
dashboard_lines = lines[840:1117]
chat_endpoint_lines = lines[1117:1267]
quiz_lines = lines[1267:]

# Write services/chat_service.py
with open("services/chat_service.py", "w", encoding="utf-8") as f:
    f.writelines(chat_service_lines)

# Write routes/dashboard.py
with open("routes/dashboard.py", "w", encoding="utf-8") as f:
    f.write("from fastapi import APIRouter, Depends, HTTPException\n")
    f.write("from typing import Optional, Any\n")
    f.write("from sqlalchemy.orm import Session\n")
    f.write("from database import get_db, User, ChatSession\n")
    f.write("from auth_utils import get_current_user\n")
    f.write("from core.dependencies import *\n")
    f.write("from services.chat_service import *\n\n")
    f.write("router = APIRouter(tags=['dashboard'])\n\n")
    # Replace @app. with @router.
    dashboard_content = "".join(dashboard_lines).replace("@app.", "@router.")
    f.write(dashboard_content)

# Append chat endpoint to routes/chat.py
with open("routes/chat.py", "a", encoding="utf-8") as f:
    f.write("\n\n")
    f.write("from core.dependencies import *\n")
    f.write("from services.chat_service import *\n\n")
    chat_content = "".join(chat_endpoint_lines).replace("@app.", "@router.")
    f.write(chat_content)

# Write routes/quiz.py
with open("routes/quiz.py", "w", encoding="utf-8") as f:
    f.write("from fastapi import APIRouter, Depends, HTTPException\n")
    f.write("from typing import Optional, Any\n")
    f.write("from sqlalchemy.orm import Session\n")
    f.write("from database import get_db, User\n")
    f.write("from auth_utils import get_current_user\n")
    f.write("from core.dependencies import *\n")
    f.write("from services.chat_service import *\n\n")
    f.write("router = APIRouter(tags=['quiz'])\n\n")
    quiz_content = "".join(quiz_lines).replace("@app.", "@router.")
    f.write(quiz_content)

# Create new minimal main.py
new_main = """
import sys
import io

# Force UTF-8
if sys.stdout and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "buffer"):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from core.dependencies import PROFILE_PICS_DIR, UPLOAD_DIR
from config import get_settings

from routes.auth import router as auth_router
from routes.apc import router as apc_router
from routes.chat import router as chat_sessions_router
from routes.rag import router as rag_router
from routes.dashboard import router as dashboard_router
from routes.quiz import router as quiz_router

settings = get_settings()

app = FastAPI(
    title="BCABuddy Ultimate",
    description="AI Learning Assistant for IGNOU BCA",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
app.mount("/profile_pics", StaticFiles(directory=PROFILE_PICS_DIR), name="profile_pics")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth_router)
app.include_router(apc_router)
app.include_router(chat_sessions_router)
app.include_router(rag_router)
app.include_router(dashboard_router)
app.include_router(quiz_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/")
def read_root():
    return {"message": "Welcome to BCABuddy Ultimate API"}
"""

with open("main.py", "w", encoding="utf-8") as f:
    f.write(new_main.strip())

print("Massive refactoring completed!")

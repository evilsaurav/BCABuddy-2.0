import sys
import io



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
from routes.leaderboard import router as leaderboard_router

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
app.include_router(leaderboard_router, prefix="/api/leaderboard", tags=["leaderboard"])

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/")
def read_root():
    return {"message": "Welcome to BCABuddy Ultimate API"}
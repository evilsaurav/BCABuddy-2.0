import sys
import io



from fastapi import FastAPI, Request
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import logging
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
from routes.multiplayer import router as multiplayer_router
import redis

from core.limiter import limiter

settings = get_settings()

app = FastAPI(
    title="BCABuddy Ultimate",
    description="AI Learning Assistant for IGNOU BCA",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
app.include_router(multiplayer_router, tags=["multiplayer"])

from fastapi.responses import JSONResponse
from fastapi import Request
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Global Unhandled Error: {str(exc)}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/")
def read_root():
    return {"message": "Welcome to BCABuddy Ultimate API"}

# Setup Redis Client
redis_client = None
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True, socket_connect_timeout=1, socket_timeout=1)
    redis_client.ping()
    print("[SUCCESS] Successfully connected to Redis for Rate Limiting")
except Exception as e:
    print(f"[WARNING] Redis not found or error ({type(e).__name__}). Please start Redis server for full performance hardening.")
    redis_client = None

if __name__ == "__main__":
    # Read PORT from env (Azure: WEBSITES_PORT, local: PORT, or default 8000)
    port = int(os.getenv("PORT") or os.getenv("WEBSITES_PORT") or 8000)
    host = "0.0.0.0"
    print(f"[BCABuddy] Starting FastAPI on {host}:{port}")
    print(f"[BCABuddy] Swagger UI: http://{host}:{port}/docs")
    print(f"[BCABuddy] OpenAPI: http://{host}:{port}/openapi.json")
    uvicorn.run("main:app", host=host, port=port, log_level="info")
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from app.core.database import connect_db, close_db
from app.api.auth import router as auth_router
from app.api.detect import router as detect_router
from app.api.settings import router as settings_router

app = FastAPI(
    title="AlertDrive — Drowsiness Detection",
    version="1.0.0",
    description="AI-powered drowsiness detection for drivers using MediaPipe Face Mesh",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await connect_db()


@app.on_event("shutdown")
async def shutdown():
    await close_db()


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "alertdrive-drowsiness-detection"}


app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(detect_router, prefix="/api/detect", tags=["detection"])
app.include_router(settings_router, prefix="/api/settings", tags=["settings"])

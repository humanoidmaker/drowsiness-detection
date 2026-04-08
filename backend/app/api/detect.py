from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from datetime import datetime, timezone
from bson import ObjectId

from app.core.database import get_db
from app.core.security import get_current_user
from app.ml.drowsiness_detector import get_drowsiness_detector

router = APIRouter()


@router.post("/frame")
async def detect_frame(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    """Analyze a single frame for drowsiness detection."""
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB)")

    detector = get_drowsiness_detector()
    result = detector.analyze(contents)
    return result


@router.get("/session")
async def get_session(user=Depends(get_current_user)):
    """Get current driving session stats."""
    detector = get_drowsiness_detector()
    return detector.get_session_info()


@router.post("/session/start")
async def start_session(user=Depends(get_current_user)):
    """Start a new driving session."""
    db = get_db()
    detector = get_drowsiness_detector()

    # End any existing session
    if detector.session_start:
        detector.end_session()

    detector.start_session()

    session = {
        "user_id": user["_id"],
        "started_at": datetime.now(timezone.utc),
        "active": True,
    }
    result = await db.sessions.insert_one(session)

    return {
        "message": "Session started",
        "session_id": str(result.inserted_id),
    }


@router.post("/session/end")
async def end_session(user=Depends(get_current_user)):
    """End the current driving session with summary."""
    db = get_db()
    detector = get_drowsiness_detector()

    if not detector.session_start:
        raise HTTPException(400, "No active session")

    summary = detector.end_session()

    # Update the latest active session in DB
    await db.sessions.update_one(
        {"user_id": user["_id"], "active": True},
        {
            "$set": {
                "active": False,
                "ended_at": datetime.now(timezone.utc),
                "duration_seconds": summary["duration_seconds"],
                "alert_count": summary["alert_count"],
                "drowsy_episodes": summary["drowsy_episodes"],
                "safety_score": summary["safety_score"],
            }
        },
        upsert=False,
    )

    return {"message": "Session ended", "summary": summary}


@router.get("/history")
async def get_history(
    skip: int = 0,
    limit: int = 20,
    user=Depends(get_current_user),
):
    """Get past driving sessions."""
    db = get_db()
    cursor = db.sessions.find(
        {"user_id": user["_id"], "active": False}
    ).sort("started_at", -1).skip(skip).limit(limit)

    sessions = []
    async for s in cursor:
        s["_id"] = str(s["_id"])
        sessions.append(s)

    total = await db.sessions.count_documents({"user_id": user["_id"], "active": False})
    return {"sessions": sessions, "total": total}


@router.get("/stats")
async def get_stats(user=Depends(get_current_user)):
    """Get overall driving stats."""
    db = get_db()

    total_sessions = await db.sessions.count_documents({"user_id": user["_id"], "active": False})

    pipeline = [
        {"$match": {"user_id": user["_id"], "active": False}},
        {
            "$group": {
                "_id": None,
                "total_duration": {"$sum": "$duration_seconds"},
                "total_alerts": {"$sum": "$alert_count"},
                "total_drowsy": {"$sum": "$drowsy_episodes"},
                "avg_safety": {"$avg": "$safety_score"},
            }
        },
    ]
    agg = await db.sessions.aggregate(pipeline).to_list(1)

    if agg:
        data = agg[0]
        total_hours = round(data["total_duration"] / 3600, 1)
        return {
            "total_sessions": total_sessions,
            "total_driving_hours": total_hours,
            "total_alerts": data["total_alerts"],
            "total_drowsy_episodes": data["total_drowsy"],
            "avg_safety_score": round(data["avg_safety"] or 0, 1),
        }

    return {
        "total_sessions": 0,
        "total_driving_hours": 0,
        "total_alerts": 0,
        "total_drowsy_episodes": 0,
        "avg_safety_score": 100,
    }

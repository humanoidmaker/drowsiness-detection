from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user

router = APIRouter()


class SettingsBody(BaseModel):
    ear_threshold: Optional[float] = 0.25
    ear_sleeping_threshold: Optional[float] = 0.20
    alert_delay_seconds: Optional[float] = 2.0
    sleeping_delay_seconds: Optional[float] = 5.0
    mar_yawn_threshold: Optional[float] = 0.6
    audio_alert: Optional[bool] = True
    camera_resolution: Optional[str] = "640x480"


@router.get("/")
async def get_settings(user=Depends(get_current_user)):
    db = get_db()
    settings = await db.settings.find_one({"user_id": user["_id"]})
    if not settings:
        settings = {
            "ear_threshold": 0.25,
            "ear_sleeping_threshold": 0.20,
            "alert_delay_seconds": 2.0,
            "sleeping_delay_seconds": 5.0,
            "mar_yawn_threshold": 0.6,
            "audio_alert": True,
            "camera_resolution": "640x480",
        }
    else:
        settings["_id"] = str(settings["_id"])
    return settings


@router.put("/")
async def update_settings(body: SettingsBody, user=Depends(get_current_user)):
    db = get_db()
    data = body.model_dump(exclude_none=True)
    data["user_id"] = user["_id"]
    data["updated_at"] = datetime.now(timezone.utc)

    await db.settings.update_one(
        {"user_id": user["_id"]},
        {"$set": data},
        upsert=True,
    )
    return {"message": "Settings updated"}

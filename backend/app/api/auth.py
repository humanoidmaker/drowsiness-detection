from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
from bson import ObjectId

from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_token,
    decode_token,
    get_current_user,
)
from app.services.email_service import send_verification_email, send_reset_email

router = APIRouter()


class RegisterBody(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ForgotBody(BaseModel):
    email: EmailStr


class ResetBody(BaseModel):
    token: str
    password: str


class VerifyBody(BaseModel):
    token: str


@router.post("/register")
async def register(body: RegisterBody):
    db = get_db()
    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(400, "Email already registered")

    user = {
        "name": body.name,
        "email": body.email,
        "password": hash_password(body.password),
        "email_verified": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user)
    uid = str(result.inserted_id)
    token = create_token(uid, purpose="verify")
    await send_verification_email(body.email, body.name, token)
    return {"message": "Account created. Please check your email to verify."}


@router.post("/login")
async def login(body: LoginBody):
    db = get_db()
    user = await db.users.find_one({"email": body.email})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    if not user.get("email_verified", False):
        raise HTTPException(403, "Please verify your email first")
    token = create_token(str(user["_id"]))
    return {
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
        },
    }


@router.post("/verify-email")
async def verify_email(body: VerifyBody):
    payload = decode_token(body.token)
    if payload.get("purpose") != "verify":
        raise HTTPException(400, "Invalid verification token")
    db = get_db()
    result = await db.users.update_one(
        {"_id": ObjectId(payload["sub"])},
        {"$set": {"email_verified": True, "updated_at": datetime.now(timezone.utc)}},
    )
    if result.modified_count == 0:
        raise HTTPException(400, "Verification failed")
    return {"message": "Email verified successfully"}


@router.post("/forgot-password")
async def forgot_password(body: ForgotBody):
    db = get_db()
    user = await db.users.find_one({"email": body.email})
    if user:
        token = create_token(str(user["_id"]), purpose="reset")
        await send_reset_email(body.email, user["name"], token)
    return {"message": "If an account exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetBody):
    payload = decode_token(body.token)
    if payload.get("purpose") != "reset":
        raise HTTPException(400, "Invalid reset token")
    db = get_db()
    result = await db.users.update_one(
        {"_id": ObjectId(payload["sub"])},
        {
            "$set": {
                "password": hash_password(body.password),
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    if result.modified_count == 0:
        raise HTTPException(400, "Reset failed")
    return {"message": "Password has been reset successfully"}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return {
        "id": user["_id"],
        "name": user["name"],
        "email": user["email"],
    }

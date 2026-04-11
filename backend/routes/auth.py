from __future__ import annotations

import os
import shutil
import time
from datetime import date, datetime
from typing import Any, cast

import requests
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from auth_utils import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
    create_reset_token,
    verify_reset_token,
)
from config import get_settings
from database import User, get_db
from models import PasswordChange, Token, UserCreate, UserProfile, UserProfileUpdate
from password_reset import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordResponse,
)

settings = get_settings()

PROFILE_PICS_DIR = settings.profile_pics_dir
os.makedirs(PROFILE_PICS_DIR, exist_ok=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_AVATAR_BUCKET = os.getenv("SUPABASE_AVATAR_BUCKET", "avatars")

router = APIRouter()


def _validate_password_strength(password: str) -> None:
    pwd = password or ""
    if len(pwd) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long.",
        )
    if not any(c.isalpha() for c in pwd) or not any(c.isdigit() for c in pwd):
        raise HTTPException(
            status_code=400,
            detail="Password must include at least one letter and one digit.",
        )


def _normalize_exam_preferences(
    exam_date_raw: str | None,
    exam_session_raw: str | None,
) -> tuple[str | None, str | None]:
    date_text = str(exam_date_raw or "").strip()
    session_text = str(exam_session_raw or "").strip()

    if not date_text and not session_text:
        return None, None

    if date_text:
        try:
            parsed_date = datetime.strptime(date_text, "%Y-%m-%d").date()
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail="exam_date must be in YYYY-MM-DD format.",
            ) from exc

        if parsed_date < date.today():
            raise HTTPException(
                status_code=400,
                detail="exam_date cannot be in the past.",
            )
    else:
        parsed_date = None

    normalized_session = session_text.title() if session_text else None
    if normalized_session and normalized_session not in {"June", "December"}:
        raise HTTPException(
            status_code=400,
            detail="exam_session must be either 'June' or 'December'.",
        )

    if parsed_date and not normalized_session:
        normalized_session = "June" if parsed_date.month <= 6 else "December"

    return date_text or None, normalized_session


@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username taken")
    _validate_password_strength(user.password)
    new_user = User(
        username=user.username,
        hashed_password=get_password_hash(user.password),
        display_name=user.username,
        gender=None,
        mobile_number=None,
        profile_picture_url=None,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "message": "User created",
        "username": new_user.username,
        "display_name": new_user.display_name,
    }


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect credentials")
    return {
        "access_token": create_access_token(data={"sub": user.username}),
        "token_type": "bearer",
    }


@router.get("/profile", response_model=UserProfile)
def get_profile(current_user: User = Depends(get_current_user)):
    current_user_any = cast(Any, current_user)
    username_val = getattr(current_user_any, "username", None)
    display_name_val = getattr(current_user_any, "display_name", None)
    gender_val = getattr(current_user_any, "gender", None)
    mobile_val = getattr(current_user_any, "mobile_number", None)
    profile_pic_val = (
        getattr(current_user_any, "profile_picture_url", None)
        or getattr(current_user_any, "profile_pic_url", None)
    )
    is_creator_val = bool(getattr(current_user_any, "is_creator", 0))
    return UserProfile(
        username=str(username_val) if username_val is not None else "",
        display_name=str(
            display_name_val if display_name_val is not None else username_val
        )
        if (display_name_val is not None or username_val is not None)
        else "",
        gender=str(gender_val) if gender_val is not None else None,
        mobile_number=str(mobile_val) if mobile_val is not None else None,
        email=getattr(current_user, "email", None),
        college=getattr(current_user, "college", None),
        enrollment_id=getattr(current_user, "enrollment_id", None),
        bio=getattr(current_user, "bio", None),
        exam_date=getattr(current_user, "exam_date", None),
        exam_session=getattr(current_user, "exam_session", None),
        profile_pic_url=str(profile_pic_val)
        if profile_pic_val is not None
        else None,
        is_creator=is_creator_val,
    )


@router.put("/profile")
def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user_any = cast(Any, current_user)
    if profile_data.display_name is not None:
        current_user_any.display_name = profile_data.display_name
    if profile_data.gender is not None:
        current_user_any.gender = profile_data.gender
    if profile_data.mobile_number is not None:
        current_user_any.mobile_number = profile_data.mobile_number
    if getattr(profile_data, "email", None) is not None:
        current_user_any.email = profile_data.email
    if getattr(profile_data, "college", None) is not None:
        current_user_any.college = profile_data.college
    if getattr(profile_data, "enrollment_id", None) is not None:
        current_user_any.enrollment_id = profile_data.enrollment_id
    if getattr(profile_data, "bio", None) is not None:
        current_user_any.bio = profile_data.bio
    exam_date_update = getattr(profile_data, "exam_date", None)
    exam_session_update = getattr(profile_data, "exam_session", None)
    if exam_date_update is not None or exam_session_update is not None:
        exam_date_value, exam_session_value = _normalize_exam_preferences(
            exam_date_update
            if exam_date_update is not None
            else getattr(current_user_any, "exam_date", None),
            exam_session_update
            if exam_session_update is not None
            else getattr(current_user_any, "exam_session", None),
        )
        current_user_any.exam_date = exam_date_value
        current_user_any.exam_session = exam_session_value
    db.commit()
    return {"message": "Profile updated"}


@router.put("/profile/exam-date")
def update_exam_date(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user_any = cast(Any, current_user)
    exam_date = str(payload.get("exam_date") or "").strip()
    exam_session = str(payload.get("exam_session") or "").strip()

    exam_date_value, exam_session_value = _normalize_exam_preferences(
        exam_date,
        exam_session,
    )
    current_user_any.exam_date = exam_date_value
    current_user_any.exam_session = exam_session_value
    db.commit()

    return {
        "message": "Exam date updated",
        "exam_date": current_user_any.exam_date,
        "exam_session": current_user_any.exam_session,
    }


@router.post("/profile/upload-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        current_user_any = cast(Any, current_user)
        filename = file.filename or "profile_pic"
        file_extension = filename.split(".")[-1]
        filename = (
            f"{current_user_any.id}_{datetime.utcnow().timestamp()}.{file_extension}"
        )
        file_path = os.path.join(PROFILE_PICS_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        current_user_any.profile_picture_url = f"/profile_pics/{filename}"
        db.commit()

        return {
            "message": "Profile picture uploaded",
            "url": str(current_user_any.profile_picture_url),
            "profile_pic_url": str(current_user_any.profile_picture_url),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error uploading picture: {str(e)}"
        )


def _supabase_public_avatar_url(object_path: str) -> str:
    if not SUPABASE_URL:
        raise RuntimeError("SUPABASE_URL not set")
    return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_AVATAR_BUCKET}/{object_path}"


def _upload_bytes_to_supabase_avatars(
    *, object_path: str, content_type: str, data: bytes
) -> str:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError(
            "Supabase env missing: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
        )

    upload_url = (
        f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_AVATAR_BUCKET}/{object_path}"
    )
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": content_type or "application/octet-stream",
        "x-upsert": "true",
    }
    resp = requests.put(upload_url, headers=headers, data=data, timeout=30)
    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Supabase upload failed: {resp.status_code} {resp.text}"
        )
    return _supabase_public_avatar_url(object_path)


@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Uploads avatar to Supabase Storage and stores its public URL on the user's profile row."""
    try:
        if not file:
            raise HTTPException(status_code=400, detail="file is required")

        content_type = str(file.content_type or "").lower()
        if not content_type.startswith("image/"):
            raise HTTPException(
                status_code=400, detail="Only image uploads are allowed"
            )

        current_user_any = cast(Any, current_user)

        original_name = file.filename or "avatar.png"
        ext = (
            (original_name.split(".")[-1] if "." in original_name else "png")
            .lower()
        )
        if ext not in {"png", "jpg", "jpeg", "webp"}:
            ext = "png"

        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="Empty file")

        object_path = f"{current_user_any.id}/avatar_{int(time.time())}.{ext}"
        public_url = _upload_bytes_to_supabase_avatars(
            object_path=object_path,
            content_type=content_type,
            data=data,
        )

        current_user_any.profile_picture_url = public_url
        db.commit()

        return {
            "message": "Avatar uploaded",
            "url": str(public_url),
            "profile_pic_url": str(public_url),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error uploading avatar: {str(e)}"
        )


@router.post("/profile/change-password")
def change_password(
    pwd_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(pwd_data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=400, detail="Old password is incorrect"
        )

    if pwd_data.new_password != pwd_data.confirm_password:
        raise HTTPException(
            status_code=400, detail="Passwords do not match"
        )

    _validate_password_strength(pwd_data.new_password)

    current_user_any = cast(Any, current_user)
    current_user_any.hashed_password = get_password_hash(pwd_data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}



@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    req: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """Initiate password reset by username - generates JWT reset token (valid 15 mins)"""
    username = str(req.username or "").strip()
    if not username:
        raise HTTPException(
            status_code=400,
            detail="Username is required",
        )

    # Check if user exists
    user = db.query(User).filter(User.username == username).first()
    if not user:
        # Security best practice: don't reveal if user exists
        raise HTTPException(
            status_code=400,
            detail="Username not found. Please check and retry.",
        )

    # Create reset token with 15-minute expiry
    reset_token = create_reset_token(username, expires_in_minutes=15)

    return ForgotPasswordResponse(
        message=f"Password reset token generated. Token valid for 15 minutes.",
        reset_token=reset_token,
        expires_in_minutes=15,
    )


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(
    req: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Reset password using valid reset token"""
    # Verify reset token
    username = verify_reset_token(req.reset_token)
    if not username:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token. Request a new password reset.",
        )

    # Validate passwords match
    if req.new_password != req.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match",
        )

    # Validate password strength
    _validate_password_strength(req.new_password)

    # Find user and update password
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=400,
            detail="User not found. This reset token may be expired.",
        )

    # Update password
    user_any = cast(Any, user)
    user_any.hashed_password = get_password_hash(req.new_password)
    db.commit()

    return ResetPasswordResponse(
        message="Password reset successfully! You can now login with your new password.",
        success=True,
    )


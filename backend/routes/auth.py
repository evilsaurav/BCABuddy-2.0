from __future__ import annotations

import os
import shutil
import time
from datetime import datetime
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
)
from config import get_settings
from database import User, get_db
from models import PasswordChange, Token, UserCreate, UserProfile, UserProfileUpdate

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
    profile_pic_val = getattr(current_user_any, "profile_picture_url", None)
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
        profile_picture_url=str(profile_pic_val)
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
    db.commit()
    return {"message": "Profile updated"}


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

        return {"message": "Avatar uploaded", "url": str(public_url)}
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


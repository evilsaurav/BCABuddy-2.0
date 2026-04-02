from fastapi import APIRouter, UploadFile, HTTPException, Depends
from datetime import datetime, timedelta
import os
from pathlib import Path

from auth_utils import get_current_user
from database import User

router = APIRouter()

# Azure Blob Storage Configuration
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
BLOB_CONTAINER_NAME = "user-materials"
LOCAL_LOCKER_DIR = Path(os.getenv("LOCAL_LOCKER_DIR", "uploads/locker")).resolve()

blob_service_client = None
container_client = None
generate_blob_sas = None
BlobSasPermissions = None

if AZURE_STORAGE_CONNECTION_STRING:
    try:
        from azure.storage.blob import BlobServiceClient, generate_blob_sas as _generate_blob_sas, BlobSasPermissions as _BlobSasPermissions

        blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
        container_client = blob_service_client.get_container_client(BLOB_CONTAINER_NAME)
        if not container_client.exists():
            container_client.create_container()
        generate_blob_sas = _generate_blob_sas
        BlobSasPermissions = _BlobSasPermissions
    except Exception:
        blob_service_client = None
        container_client = None

LOCAL_LOCKER_DIR.mkdir(parents=True, exist_ok=True)


def _safe_username(user: User) -> str:
    base = str(getattr(user, "username", "user") or "user")
    return "".join(ch for ch in base if ch.isalnum() or ch in ("-", "_", ".")) or "user"

@router.post("/api/upload-material")
async def upload_material(file: UploadFile, current_user: User = Depends(get_current_user)):
    """
    Upload a file to Azure Blob Storage securely.
    """
    try:
        username = _safe_username(current_user)
        safe_name = Path(file.filename or "upload.bin").name

        if container_client is not None:
            blob_name = f"{username}/{safe_name}"
            blob_client = container_client.get_blob_client(blob_name)
            blob_client.upload_blob(file.file, overwrite=True)
            return {"message": "File uploaded successfully", "file_name": safe_name}

        user_dir = (LOCAL_LOCKER_DIR / username).resolve()
        user_dir.mkdir(parents=True, exist_ok=True)
        destination = (user_dir / safe_name).resolve()
        if not str(destination).startswith(str(user_dir)):
            raise HTTPException(status_code=400, detail="Invalid file path")

        content = await file.read()
        destination.write_bytes(content)
        return {"message": "File uploaded successfully", "file_name": safe_name}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.get("/api/list-materials")
async def list_materials(current_user: User = Depends(get_current_user)):
    """
    List all files uploaded by the user with SAS token URLs.
    """
    try:
        username = _safe_username(current_user)

        if container_client is not None and blob_service_client is not None and generate_blob_sas is not None and BlobSasPermissions is not None:
            blobs = container_client.list_blobs(name_starts_with=f"{username}/")
            file_list = []

            for blob in blobs:
                sas_token = generate_blob_sas(
                    account_name=blob_service_client.account_name,
                    container_name=BLOB_CONTAINER_NAME,
                    blob_name=blob.name,
                    account_key=blob_service_client.credential.account_key,
                    permission=BlobSasPermissions(read=True),
                    expiry=datetime.utcnow() + timedelta(hours=1),
                )
                file_list.append(
                    {
                        "file_name": blob.name.split("/")[-1],
                        "download_url": f"{blob_service_client.primary_endpoint}/{BLOB_CONTAINER_NAME}/{blob.name}?{sas_token}",
                    }
                )
            return file_list

        user_dir = (LOCAL_LOCKER_DIR / username).resolve()
        if not user_dir.exists():
            return []

        return [
            {
                "file_name": p.name,
                "download_url": f"/uploads/locker/{username}/{p.name}",
            }
            for p in sorted(user_dir.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True)
            if p.is_file()
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")
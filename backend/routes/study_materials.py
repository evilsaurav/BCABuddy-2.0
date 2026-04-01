from fastapi import APIRouter, UploadFile, HTTPException, Depends
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta
import os

router = APIRouter()

# Azure Blob Storage Configuration
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
BLOB_CONTAINER_NAME = "user-materials"

if not AZURE_STORAGE_CONNECTION_STRING:
    raise RuntimeError("AZURE_STORAGE_CONNECTION_STRING environment variable is not set.")

# Ensure azure-storage-blob is installed
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions

blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
container_client = blob_service_client.get_container_client(BLOB_CONTAINER_NAME)

# Ensure the container exists
if not container_client.exists():
    container_client.create_container()

@router.post("/api/upload-material")
async def upload_material(file: UploadFile, current_user: str = Depends()):
    """
    Upload a file to Azure Blob Storage securely.
    """
    try:
        blob_name = f"{current_user}/{file.filename}"
        blob_client = container_client.get_blob_client(blob_name)

        # Upload the file
        blob_client.upload_blob(file.file, overwrite=True)
        return {"message": "File uploaded successfully", "file_name": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.get("/api/list-materials")
async def list_materials(current_user: str = Depends()):
    """
    List all files uploaded by the user with SAS token URLs.
    """
    try:
        blobs = container_client.list_blobs(name_starts_with=f"{current_user}/")
        file_list = []

        for blob in blobs:
            sas_token = generate_blob_sas(
                account_name=blob_service_client.account_name,
                container_name=BLOB_CONTAINER_NAME,
                blob_name=blob.name,
                account_key=blob_service_client.credential.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.utcnow() + timedelta(hours=1)
            )
            file_list.append({
                "file_name": blob.name.split("/")[-1],
                "download_url": f"{blob_service_client.primary_endpoint}/{BLOB_CONTAINER_NAME}/{blob.name}?{sas_token}"
            })

        return file_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")
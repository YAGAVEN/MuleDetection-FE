"""Data ingestion endpoints for MDE."""
from __future__ import annotations
from typing import Dict, List

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from ..services.ingestion_service import ingestion_service
from ..utils.response_utils import ingestion_error_response, ingestion_success_response


router = APIRouter(prefix="/api/ingestion", tags=["Ingestion"])

EXPECTED_FILES = {"master.csv", "transactions_full.csv"}


def _validate_upload_files(files: List[UploadFile]) -> Dict[str, UploadFile]:
    if len(files) != 2:
        raise HTTPException(
            status_code=400,
            detail=ingestion_error_response(
                [
                    {
                        "file": "__request__",
                        "column": "__files__",
                        "issue": "Exactly two files are required: master.csv and transactions_full.csv",
                    }
                ]
            ),
        )

    file_map: Dict[str, UploadFile] = {}
    for f in files:
        if not f.filename:
            raise HTTPException(
                status_code=400,
                detail=ingestion_error_response(
                    [{"file": "__request__", "column": "__filename__", "issue": "Uploaded file missing filename"}]
                ),
            )
        if not f.filename.endswith(".csv"):
            raise HTTPException(
                status_code=400,
                detail=ingestion_error_response(
                    [{"file": f.filename, "column": "__extension__", "issue": "Only .csv files are accepted"}]
                ),
            )
        file_map[f.filename] = f

    if set(file_map.keys()) != EXPECTED_FILES:
        raise HTTPException(
            status_code=400,
            detail=ingestion_error_response(
                [
                    {
                        "file": "__request__",
                        "column": "__files__",
                        "issue": "Required filenames are exactly: master.csv and transactions_full.csv",
                    }
                ]
            ),
        )

    return file_map


@router.post("/upload")
async def upload_ingestion(files: List[UploadFile] = File(...)):
    try:
        file_map = _validate_upload_files(files)
    except HTTPException as exc:
        if isinstance(exc.detail, dict):
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        raise

    master_content = await file_map["master.csv"].read()
    tx_content = await file_map["transactions_full.csv"].read()

    result = ingestion_service.process_upload(master_content, tx_content)
    if result["status"] == "error":
        return JSONResponse(
            status_code=422,
            content=ingestion_error_response(result["errors"]),
        )

    return ingestion_success_response(
        files=result["files_summary"],
        storage_location="backend/temp-data/",
        feature_pipeline_ready=True,
        summary=result["metadata"],
    )


@router.get("/status")
async def ingestion_status():
    return ingestion_service.get_status()


@router.get("/summary")
async def ingestion_summary():
    return ingestion_service.get_summary()


@router.delete("/clear")
async def ingestion_clear():
    return ingestion_service.clear()

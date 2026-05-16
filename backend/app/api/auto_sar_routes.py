"""Minimal Auto-SAR API endpoints."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from auto_sar.report_generator import report_generator


router = APIRouter(tags=["Auto-SAR"])


@router.get("/api/cases")
async def get_cases(limit: int = 100) -> Dict[str, Any]:
    try:
        return {"status": "success", "cases": report_generator.list_cases(limit=limit)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/report/generate/account/{account_id}")
async def generate_account_report(
    account_id: str,
    investigator_name: str = "Auto-SAR Intelligence Engine",
    classification_level: str = "Confidential",
) -> Dict[str, Any]:
    try:
        return {
            "status": "success",
            **report_generator.generate(
                {
                    "report_type": "individual_account",
                    "account_id": account_id,
                    "investigator_name": investigator_name,
                    "classification_level": classification_level,
                }
            ),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/report/generate/full-investigation")
async def generate_full_investigation_report(
    investigator_name: str = "Auto-SAR Intelligence Engine",
    classification_level: str = "Confidential",
) -> Dict[str, Any]:
    try:
        return {
            "status": "success",
            **report_generator.generate(
                {
                    "report_type": "full_investigation",
                    "investigator_name": investigator_name,
                    "classification_level": classification_level,
                }
            ),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/report/generate/hydra")
async def generate_hydra_report(
    investigator_name: str = "Auto-SAR Intelligence Engine",
    classification_level: str = "Confidential",
) -> Dict[str, Any]:
    try:
        return {
            "status": "success",
            **report_generator.generate(
                {
                    "report_type": "hydra_training",
                    "investigator_name": investigator_name,
                    "classification_level": classification_level,
                }
            ),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/api/report/download/{report_id}")
async def download_report(report_id: str):
    try:
        pdf_path = report_generator.get_pdf_path(report_id)
        if not pdf_path.exists():
            raise FileNotFoundError(str(pdf_path))
        return FileResponse(str(pdf_path), media_type="application/pdf", filename=pdf_path.name)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))

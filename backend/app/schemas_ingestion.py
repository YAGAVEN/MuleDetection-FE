"""Pydantic schemas for ingestion APIs."""
from __future__ import annotations

from typing import Dict, List

from pydantic import BaseModel


class IngestionErrorItem(BaseModel):
    file: str
    column: str
    issue: str


class IngestionFileSummary(BaseModel):
    rows: int
    columns: int
    status: str


class IngestionUploadSuccess(BaseModel):
    status: str
    message: str
    files: Dict[str, IngestionFileSummary]
    storage_location: str
    feature_pipeline_ready: bool


class IngestionUploadError(BaseModel):
    status: str
    message: str
    errors: List[IngestionErrorItem]

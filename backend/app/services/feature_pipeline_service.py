"""Feature extraction stage service."""
from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import pandas as pd

from .storage_service import storage_service


class FeaturePipelineService:
    def __init__(self) -> None:
        self.project_root = Path(__file__).resolve().parents[3]
        self.script_path = self.project_root / "Mule-data" / "feature_extraction_pipeline.py"

    def _run_subprocess(self, script_path: str, cwd: str, env: dict) -> str:
        """Run feature extraction script synchronously (for Windows compatibility)."""
        result = subprocess.run(
            [sys.executable, script_path],
            cwd=cwd,
            env=env,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"Feature pipeline failed (exit={result.returncode}): {result.stderr}"
            )
        return result.stdout

    async def run(self) -> Dict[str, Any]:
        if not self.script_path.exists():
            raise FileNotFoundError(f"Feature extraction script not found: {self.script_path}")

        env = dict(os.environ)
        env["PYTHONIOENCODING"] = "utf-8"  # Handle Unicode output on Windows
        env["FEATURE_PIPELINE_DATA_PATH"] = str(storage_service.temp_data_dir)
        env["FEATURE_PIPELINE_OUTPUT_PATH"] = str(storage_service.temp_data_dir)

        # Use executor to run subprocess on Windows (avoid asyncio subprocess issues)
        loop = asyncio.get_event_loop()
        try:
            stdout = await loop.run_in_executor(
                None,
                self._run_subprocess,
                str(self.script_path),
                str(self.project_root),
                env
            )
        except Exception as e:
            raise RuntimeError(f"Feature pipeline failed: {str(e)}")

        source = storage_service.temp_data_dir / "features_combined.csv"
        if not source.exists():
            raise FileNotFoundError("Feature pipeline completed but features_combined.csv not found in temp-data")

        engineered_csv = storage_service.temp_data_dir / "engineered_features.csv"
        shutil.copy2(source, engineered_csv)

        dataframe = pd.read_csv(engineered_csv)

        parquet_written = False
        parquet_path = storage_service.temp_data_dir / "engineered_features.parquet"
        try:
            dataframe.to_parquet(parquet_path, index=False)
            parquet_written = True
        except ImportError:
            parquet_written = False

        metadata = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "rows": int(len(dataframe)),
            "columns": int(len(dataframe.columns)),
            "source_csv": str(source),
            "engineered_csv": str(engineered_csv),
            "engineered_parquet": str(parquet_path) if parquet_written else "",
            "parquet_written": parquet_written,
            "stdout_tail": stdout[-2000:] if stdout else "",
        }
        storage_service.save_json("feature_metadata.json", metadata)
        return metadata


feature_pipeline_service = FeaturePipelineService()

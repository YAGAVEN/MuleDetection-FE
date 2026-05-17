"""Prediction and case generation stage service."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

import numpy as np
import pandas as pd

from .ml_models import get_model_manager
from .risk_thresholds import (
    RISK_THRESHOLD_BANDS,
)
from .storage_service import storage_service


class PredictionPipelineService:
    def __init__(self) -> None:
        self.temp_dir = storage_service.temp_data_dir
        self.model_manager = get_model_manager()

    async def run(self) -> Dict[str, Any]:
        features_csv = self.temp_dir / "engineered_features.csv"
        if not features_csv.exists():
            raise FileNotFoundError("engineered_features.csv not found in temp-data")

        dataframe = pd.read_csv(features_csv)
        if dataframe.empty:
            raise ValueError("engineered_features.csv is empty")

        if "account_id" not in dataframe.columns:
            dataframe["account_id"] = dataframe.index.astype(str)

        feature_columns = [column for column in dataframe.columns if column != "account_id"]
        if not feature_columns:
            raise ValueError("No features available for prediction")

        predictions_rows: list[Dict[str, Any]] = []
        for _, row in dataframe.iterrows():
            account_id = str(row["account_id"])

            features: Dict[str, float] = {}
            for column in feature_columns:
                value = row[column]
                if pd.isna(value):
                    features[column] = 0.0
                    continue
                if isinstance(value, bool):
                    features[column] = float(value)
                    continue
                try:
                    features[column] = float(value)
                except (TypeError, ValueError):
                    continue

            scores = self.model_manager.predict_mule_score(account_id, features)
            lgbm_raw = float(scores["lgbm_score"])
            gnn_raw = float(scores["gnn_score"])
            ensemble_raw = float(scores["ensemble_score"])

            # Pipeline outputs are kept in 0-1 scale for downstream UI/report compatibility.
            predictions_rows.append(
                {
                    "account_id": account_id,
                    "lightgbm_score": round(max(0.0, min(1.0, lgbm_raw / 100.0)), 6),
                    "gnn_score": round(max(0.0, min(1.0, gnn_raw / 100.0)), 6),
                    "ensemble_score": round(max(0.0, min(1.0, ensemble_raw / 100.0)), 6),
                    "lightgbm_score_raw": round(lgbm_raw, 6),
                    "gnn_score_raw": round(gnn_raw, 6),
                    "ensemble_score_raw": round(ensemble_raw, 6),
                }
            )

        predictions = pd.DataFrame(predictions_rows)
        raw_scores = predictions["ensemble_score_raw"].astype(float)
        q25 = float(raw_scores.quantile(0.25))
        q50 = float(raw_scores.quantile(0.50))
        q75 = float(raw_scores.quantile(0.75))
        q90 = float(raw_scores.quantile(0.90))
        q95 = float(raw_scores.quantile(0.95))

        iqr = max(q75 - q25, 1e-6)
        center = q50
        calibrated_score = 1.0 / (1.0 + np.exp(-(raw_scores - center) / (iqr * 0.7413)))
        predictions["ensemble_score"] = calibrated_score.clip(0.0, 1.0).round(6)

        predictions["risk_percentile"] = predictions["ensemble_score"].rank(pct=True, method="average")
        predictions["risk_level"] = np.select(
            [
                raw_scores >= q90,
                raw_scores >= q75,
                raw_scores >= q50,
            ],
            ["CRITICAL", "HIGH", "MEDIUM"],
            default="LOW",
        )
        predictions["is_suspicious"] = (raw_scores >= q75).astype(int)
        predictions["is_critical"] = (raw_scores >= q90).astype(int)

        dynamic_thresholds = {
            "medium_above_raw_score": round(q50, 6),
            "high_above_raw_score": round(q75, 6),
            "critical_above_raw_score": round(q90, 6),
            "top_watchlist_above_raw_score": round(q95, 6),
            "suspicious_above_raw_score": round(q75, 6),
        }

        predictions_csv = self.temp_dir / "predictions.csv"
        predictions.to_csv(predictions_csv, index=False)

        parquet_written = False
        predictions_parquet = self.temp_dir / "predictions.parquet"
        try:
            predictions.to_parquet(predictions_parquet, index=False)
            parquet_written = True
        except ImportError:
            parquet_written = False

        suspicious = predictions[predictions["is_suspicious"] == 1].copy()
        suspicious_accounts = suspicious.to_dict(orient="records")

        risk_scores = predictions[
            ["account_id", "ensemble_score", "risk_percentile", "risk_level", "is_suspicious"]
        ].to_dict(orient="records")
        alerts = self._build_alerts(suspicious)
        investigation_cases = self._build_investigation_cases(suspicious)
        summary = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_accounts_scored": int(len(predictions)),
            "suspicious_accounts_count": int(len(suspicious)),
            "critical_count": int(predictions["is_critical"].sum()),
            "high_count": int((predictions["risk_level"] == "HIGH").sum()),
            "medium_count": int((predictions["risk_level"] == "MEDIUM").sum()),
            "low_count": int((predictions["risk_level"] == "LOW").sum()),
            "risk_bucket_strategy": "dynamic_raw_score_quantiles",
            "risk_thresholds": dynamic_thresholds,
            "fallback_risk_threshold_bands": dict(RISK_THRESHOLD_BANDS),
            "parquet_written": parquet_written,
            "cases_ready": True,
            "prediction_source": "model_manager_with_runtime_artifacts",
            "model_stats": self.model_manager.get_model_stats(),
        }

        storage_service.save_json("prediction_summary.json", summary)
        storage_service.save_json("suspicious_accounts.json", {"accounts": suspicious_accounts})
        storage_service.save_json("risk_scores.json", {"scores": risk_scores})
        storage_service.save_json("investigation_cases.json", {"cases": investigation_cases})
        storage_service.save_json("ingestion_alerts.json", {"alerts": alerts})

        return summary

    def _build_investigation_cases(self, suspicious: pd.DataFrame) -> list[Dict[str, Any]]:
        if suspicious.empty:
            return []

        ranked = suspicious.sort_values("ensemble_score", ascending=False).head(20).reset_index(drop=True)
        cases: list[Dict[str, Any]] = []
        for index, row in ranked.iterrows():
            risk_level = str(row.get("risk_level", "LOW")).upper().title()
            score = float(row.get("ensemble_score", 0.0))
            cases.append(
                {
                    "id": f"MDE-{24000 + index + 1}",
                    "riskScore": int(round(score * 100)),
                    "riskLevel": risk_level,
                    "pattern": "Anomalous transfer behavior",
                    "accounts": 1,
                    "amount": "N/A",
                    "timeline": "1d",
                    "status": "Open",
                    "investigator": "Auto-assigned",
                    "alerts": 1,
                    "entities": [str(row.get("account_id", f"ACC_{index + 1}"))],
                }
            )
        return cases

    def _build_alerts(self, suspicious: pd.DataFrame) -> list[Dict[str, str]]:
        if suspicious.empty:
            return []

        top = suspicious.sort_values("ensemble_score", ascending=False).head(10).reset_index(drop=True)
        alerts: list[Dict[str, str]] = []
        for index, row in top.iterrows():
            score = float(row.get("ensemble_score", 0.0))
            risk_level = str(row.get("risk_level", "MEDIUM")).upper()
            severity = "critical" if risk_level == "CRITICAL" else "high" if risk_level == "HIGH" else "medium"
            alerts.append(
                {
                    "id": f"AL-{9000 + index + 1}",
                    "text": f"Account {row.get('account_id', 'unknown')} flagged with risk score {score:.2f}.",
                    "severity": severity,
                    "time": "Just now",
                }
            )
        return alerts


prediction_pipeline_service = PredictionPipelineService()

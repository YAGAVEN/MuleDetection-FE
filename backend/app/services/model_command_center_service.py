"""Model Commander Center state persistence and update helpers."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from typing import Any, Dict


class ModelCommandCenterService:
    """Stores and updates model commander center details as JSON."""

    def __init__(self) -> None:
        self._lock = RLock()
        backend_root = Path(__file__).resolve().parents[2]
        self._target_dir = backend_root / "model-center"
        self._target_dir.mkdir(parents=True, exist_ok=True)
        self._file_path = self._target_dir / "model_commander_center.json"

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _default_payload(self) -> Dict[str, Any]:
        timestamp = self._now()
        return {
            "current_model_version": "v1.0.0",
            "training_status": "idle",
            "attacker_score": 0,
            "defender_score": 0,
            "resilience_score": 0,
            "active_attack_type": "none",
            "gnn_status": "stable",
            "ensemble_status": "stable",
            "synthetic_patterns_generated": 0,
            "detected_patterns": 0,
            "version": 1,
            "generated_at": timestamp,
            "updated_at": timestamp,
            "model_versions": {
                "gan": "gan_v1.0",
                "ensemble": "ensemble_v1.0-runtime",
                "lgbm": "lgbm_v1.0-trained",
                "gnn": "gnn_v1.0-runtime",
                "shap": "shap_v1.0",
            },
            "training": {
                "last_gan_training_id": None,
                "status": "initialized",
                "last_trained_at": None,
                "epochs": None,
                "batch_size": None,
                "synthetic_ratio": None,
            },
            "metrics": {
                "accuracy": 0.0,
                "precision": 0.0,
                "recall": 0.0,
                "f1_score": 0.0,
                "auc": 0.0,
                "latency_ms": 8.0,
                "inception_score": 0.0,
                "mean_diff": 0.0,
                "std_diff": 0.0,
                "pairwise_dist_real": 0.0,
                "pairwise_dist_fake": 0.0,
                "samples_generated": 0,
            },
            "history": [],
            "prediction_summary": {},
        }

    def _read(self) -> Dict[str, Any] | None:
        if not self._file_path.exists():
            return None
        return json.loads(self._file_path.read_text(encoding="utf-8"))

    def _write(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        payload["updated_at"] = self._now()
        self._file_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return payload

    def ensure_initialized(self) -> Dict[str, Any]:
        with self._lock:
            payload = self._read()
            if payload:
                return payload
            payload = self._default_payload()
            return self._write(payload)

    def load_details(self) -> Dict[str, Any]:
        return self.ensure_initialized()

    def update_model_versions(self, model_info: Dict[str, Any] | None) -> Dict[str, Any]:
        with self._lock:
            payload = self.ensure_initialized()
            if not model_info:
                return payload

            versions = payload.setdefault("model_versions", {})
            versions["ensemble"] = model_info.get("ensemble_model", versions.get("ensemble"))
            versions["lgbm"] = model_info.get("lgbm_model", versions.get("lgbm"))
            versions["gnn"] = model_info.get("gnn_model", versions.get("gnn"))
            versions["shap"] = model_info.get("shap_model", versions.get("shap"))
            payload["current_model_version"] = str(versions.get("ensemble") or payload["current_model_version"])
            payload["generated_at"] = self._now()
            return self._write(payload)

    def update_from_prediction_summary(
        self,
        prediction_summary: Dict[str, Any] | None,
        accuracy_value: float | None = None,
        latency_ms: float | None = None,
    ) -> Dict[str, Any]:
        with self._lock:
            payload = self.ensure_initialized()
            if not prediction_summary:
                return payload

            metrics = payload.setdefault("metrics", {})
            total = max(0, int(prediction_summary.get("total_accounts_scored") or 0))
            suspicious = max(0, int(prediction_summary.get("suspicious_accounts_count") or 0))
            high = max(0, int(prediction_summary.get("high_count") or 0))
            critical = max(0, int(prediction_summary.get("critical_count") or 0))
            low = max(0, int(prediction_summary.get("low_count") or 0))
            medium = max(0, int(prediction_summary.get("medium_count") or 0))

            predicted_positive = high + critical
            true_positive_proxy = min(suspicious, predicted_positive)
            precision = (true_positive_proxy / predicted_positive) if predicted_positive > 0 else 0.0
            recall = (true_positive_proxy / suspicious) if suspicious > 0 else 0.0
            f1_score = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
            accuracy_proxy = ((low + medium) / total) if total > 0 else 0.0
            auc_proxy = min(0.99, (precision + recall + accuracy_proxy) / 3.0) if total > 0 else 0.0

            metrics["accuracy"] = round(
                (accuracy_value / 100.0 if accuracy_value and accuracy_value > 1.0 else accuracy_value)
                if accuracy_value is not None
                else accuracy_proxy,
                6,
            )
            metrics["precision"] = round(precision, 6)
            metrics["recall"] = round(recall, 6)
            metrics["f1_score"] = round(f1_score, 6)
            metrics["auc"] = round(auc_proxy, 6)
            metrics["latency_ms"] = round(float(latency_ms), 3) if latency_ms is not None else 8.0

            payload["prediction_summary"] = prediction_summary
            payload["synthetic_patterns_generated"] = max(
                int(payload.get("synthetic_patterns_generated", 0)),
                int(metrics.get("samples_generated", 0)),
            )
            payload["detected_patterns"] = max(
                int(payload.get("detected_patterns", 0)),
                int(total * metrics["recall"]),
            )
            payload["generated_at"] = self._now()
            return self._write(payload)

    def mark_gan_training_completed(
        self,
        training_id: str,
        config: Dict[str, Any],
        gan_metrics: Dict[str, Any],
    ) -> Dict[str, Any]:
        with self._lock:
            payload = self.ensure_initialized()
            next_version = int(payload.get("version", 1)) + 1
            payload["version"] = next_version

            versions = payload.setdefault("model_versions", {})
            versions["gan"] = f"gan_v{next_version}.0"
            payload["current_model_version"] = str(versions.get("ensemble", payload["current_model_version"]))

            training = payload.setdefault("training", {})
            training["last_gan_training_id"] = training_id
            training["status"] = "completed"
            training["last_trained_at"] = self._now()
            training["epochs"] = config.get("gan_epochs")
            training["batch_size"] = config.get("gan_batch_size")
            training["synthetic_ratio"] = config.get("synthetic_ratio")

            metrics = payload.setdefault("metrics", {})
            metrics["inception_score"] = gan_metrics.get("inception_score", 0.0)
            metrics["mean_diff"] = gan_metrics.get("mean_diff", 0.0)
            metrics["std_diff"] = gan_metrics.get("std_diff", 0.0)
            metrics["pairwise_dist_real"] = gan_metrics.get("pairwise_dist_real", 0.0)
            metrics["pairwise_dist_fake"] = gan_metrics.get("pairwise_dist_fake", 0.0)
            metrics["samples_generated"] = int(gan_metrics.get("samples_generated", 0) or 0)

            history = payload.setdefault("history", [])
            history.append(
                {
                    "version": next_version,
                    "training_id": training_id,
                    "trained_at": training["last_trained_at"],
                    "gan_version": versions["gan"],
                    "metrics": {
                        "inception_score": gan_metrics.get("inception_score"),
                        "samples_generated": gan_metrics.get("samples_generated"),
                    },
                }
            )
            payload["history"] = history[-25:]
            payload["generated_at"] = self._now()
            return self._write(payload)

    def update_hydra_status(self, hydra_status: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            payload = self.ensure_initialized()
            if hydra_status.get("current_model_version"):
                payload["current_model_version"] = str(hydra_status["current_model_version"])
            payload["training_status"] = hydra_status.get("training_status", payload.get("training_status"))
            payload["attacker_score"] = round(float(hydra_status.get("attacker_score", payload.get("attacker_score", 0))), 2)
            payload["defender_score"] = round(float(hydra_status.get("defender_score", payload.get("defender_score", 0))), 2)
            payload["resilience_score"] = round(float(hydra_status.get("resilience_score", payload.get("resilience_score", 0))), 2)
            payload["active_attack_type"] = hydra_status.get("active_attack_type", payload.get("active_attack_type", "none"))
            payload["gnn_status"] = hydra_status.get("gnn_status", payload.get("gnn_status", "stable"))
            payload["ensemble_status"] = hydra_status.get("ensemble_status", payload.get("ensemble_status", "stable"))
            payload["synthetic_patterns_generated"] = int(
                hydra_status.get("synthetic_patterns_generated", payload.get("synthetic_patterns_generated", 0))
            )
            payload["detected_patterns"] = int(hydra_status.get("detected_patterns", payload.get("detected_patterns", 0)))
            versions = payload.setdefault("model_versions", {})
            if hydra_status.get("current_model_version"):
                versions["ensemble"] = str(hydra_status["current_model_version"])
            if hydra_status.get("gnn_model_version"):
                versions["gnn"] = str(hydra_status["gnn_model_version"])
            metrics = payload.setdefault("metrics", {})
            model_accuracy = hydra_status.get("model_accuracy")
            if model_accuracy is not None:
                metrics["accuracy"] = round(float(model_accuracy), 6)
            detection_rate = hydra_status.get("detection_rate")
            if detection_rate is not None:
                metrics["recall"] = round(float(detection_rate), 6)
            attack_success_rate = hydra_status.get("attack_success_rate")
            if attack_success_rate is not None:
                metrics["attack_success_rate"] = round(float(attack_success_rate), 6)
            adversarial_accuracy = hydra_status.get("adversarial_accuracy")
            if adversarial_accuracy is not None:
                metrics["adversarial_accuracy"] = round(float(adversarial_accuracy), 6)
            metrics["samples_generated"] = max(
                int(metrics.get("samples_generated", 0) or 0),
                int(payload.get("synthetic_patterns_generated", 0) or 0),
            )
            payload["generated_at"] = self._now()
            return self._write(payload)


model_command_center_service = ModelCommandCenterService()

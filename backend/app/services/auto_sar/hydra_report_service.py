"""HYDRA adversarial training reports."""

from __future__ import annotations

from typing import Any, Dict

import matplotlib.pyplot as plt
import json
from collections import Counter
from pathlib import Path

from app.services.model_command_center_service import model_command_center_service
from .export_service import ASSETS_DIR

try:
    from app.hydra.hydra_orchestrator import get_hydra_orchestrator
except Exception:  # pragma: no cover - best effort live integration
    get_hydra_orchestrator = None


class HydraReportService:
    def __init__(self, analyzer) -> None:
        self.analyzer = analyzer
        self.log_path = Path(__file__).resolve().parents[1] / "logs" / "auto_sar_hydra.log"

    def _load_logs(self) -> list[dict[str, Any]]:
        if not self.log_path.exists():
            return []
        entries: list[dict[str, Any]] = []
        for line in self.log_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
                if isinstance(payload, dict):
                    entries.append(payload)
            except json.JSONDecodeError:
                continue
        return entries

    def _hydra_status(self) -> Dict[str, Any]:
        persisted = model_command_center_service.load_details()
        live = {}
        if get_hydra_orchestrator is not None:
            try:
                live = get_hydra_orchestrator().status()
            except Exception:
                live = {}
        return {**persisted, **live}

    def _current_snapshot(self) -> Dict[str, Any]:
        logs = self._load_logs()
        status_entries = [entry.get("status", {}) for entry in logs if entry.get("type") == "status" and isinstance(entry.get("status"), dict)]
        if status_entries:
            return dict(status_entries[-1])
        snapshot = self._hydra_status()
        if snapshot:
            self.log_path.parent.mkdir(parents=True, exist_ok=True)
            with self.log_path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps({"type": "status", "status": snapshot, "timestamp": snapshot.get("updated_at")}) + "\n")
        return snapshot

    def _chart_assets(self, status: Dict[str, Any]) -> Dict[str, str]:
        ASSETS_DIR.mkdir(parents=True, exist_ok=True)
        chart_path = ASSETS_DIR / "hydra_attack_defense.png"
        fig, ax = plt.subplots(figsize=(7.5, 4.2))
        labels = ["Attacker", "Defender", "Resilience"]
        values = [
            float(status.get("attacker_score", 0)),
            float(status.get("defender_score", 0)),
            float(status.get("resilience_score", 0)),
        ]
        ax.bar(labels, values, color=["#fb7185", "#34d399", "#67e8f9"])
        ax.set_ylim(0, 100)
        ax.set_title("HYDRA Attack vs Defense", color="white")
        ax.set_facecolor("#0f172a")
        fig.patch.set_facecolor("#0f172a")
        ax.tick_params(colors="white")
        for spine in ax.spines.values():
            spine.set_color("#334155")
        fig.tight_layout()
        fig.savefig(chart_path, dpi=180, facecolor=fig.get_facecolor())
        plt.close(fig)
        return {"attack_vs_defense": str(chart_path)}

    def build_report(self, investigator_name: str | None, classification_level: str | None) -> Dict[str, Any]:
        logs = self._load_logs()
        status = self._current_snapshot()
        metrics = status.get("metrics", {})
        attacker_events = [entry for entry in logs if entry.get("type") == "event" and entry.get("actor") == "attacker"]
        defender_events = [entry for entry in logs if entry.get("type") == "event" and entry.get("actor") == "defender"]
        system_events = [entry for entry in logs if entry.get("type") == "event" and entry.get("actor") == "system"]
        status_entries = [entry.get("status", {}) for entry in logs if entry.get("type") == "status" and isinstance(entry.get("status"), dict)]
        resilience_series = [
            {
                "round": entry.get("round", index + 1),
                "resilience_score": float(entry.get("resilience_score", 0) or 0),
                "attack_success_rate": float(entry.get("attack_success_rate", 0) or 0),
                "attacker_score": float(entry.get("attacker_score", 0) or 0),
                "defender_score": float(entry.get("defender_score", 0) or 0),
            }
            for index, entry in enumerate(status_entries)
        ]
        attack_types = Counter(
            str(entry.get("message", "")).split("Generated synthetic ")[-1].split(" attack")[0]
            for entry in attacker_events
            if entry.get("message")
        )
        chart_paths = self._chart_assets(status)
        resilience_start = resilience_series[0]["resilience_score"] if resilience_series else status.get("resilience_score", 0)
        resilience_end = resilience_series[-1]["resilience_score"] if resilience_series else status.get("resilience_score", 0)
        report = {
            "title": "HYDRA_TRAINING_REPORT",
            "subtitle": "Log-Driven Adversarial Defense Intelligence",
            "risk_level": "INFO",
            "account_id": None,
            "case_id": None,
            "investigator_name": investigator_name or "Auto-SAR Intelligence Engine",
            "classification_level": classification_level or "Confidential",
            "summary": {
                "log_entries": len(logs),
                "attacker_events": len(attacker_events),
                "defender_events": len(defender_events),
                "system_events": len(system_events),
                "attacker_score": status.get("attacker_score", 0),
                "defender_score": status.get("defender_score", 0),
                "resilience_score": status.get("resilience_score", 0),
                "synthetic_patterns_generated": status.get("synthetic_patterns_generated", 0),
                "detected_patterns": status.get("detected_patterns", 0),
                "attack_success_rate": metrics.get("attack_success_rate", status.get("attack_success_rate", 0)),
                "adversarial_accuracy": metrics.get("adversarial_accuracy", status.get("adversarial_accuracy", 0)),
            },
            "attacker_vs_defender": {
                "attacker_score": status.get("attacker_score", 0),
                "defender_score": status.get("defender_score", 0),
                "resilience_score": status.get("resilience_score", 0),
                "resilience_start": resilience_start,
                "resilience_end": resilience_end,
            },
            "defense_adaptation_metrics": {
                "current_model_version": status.get("current_model_version"),
                "gnn_model_version": status.get("gnn_model_version"),
                "updated_weights": status.get("updated_weights", {}),
                "attack_source": status.get("attack_source"),
                "attack_types_observed": dict(attack_types),
            },
            "adversarial_graph_insights": {
                "active_attack_type": status.get("active_attack_type"),
                "detection_threshold": status.get("detection_threshold"),
                "confusion_matrix": status.get("confusion_matrix", {}),
            },
            "hydra_logs": [
                f"{entry.get('timestamp', '')} | {entry.get('actor', 'system')}: {entry.get('message', '')}"
                for entry in logs[-25:]
                if entry.get("type") == "event"
            ],
            "model_evolution_timeline": [
                f"Round {entry.get('round', 0)} · Resilience {entry.get('resilience_score', 0):.2f}"
                for entry in resilience_series[-10:]
            ],
            "resilience_improvement": round(float(resilience_end) - float(resilience_start), 2) if resilience_series else status.get("resilience_score", 0),
            "retraining_iterations": status.get("round", 0),
            "sections": [
                {
                    "title": "Training Overview",
                    "body": [
                        f"Log entries captured: {len(logs)}",
                        f"Recent system events: {len(system_events)}",
                    ],
                    "charts": chart_paths,
                },
                {
                    "title": "Attacker vs Defender Summary",
                    "table": [
                        {"metric": "attacker_score", "value": status.get("attacker_score", 0)},
                        {"metric": "defender_score", "value": status.get("defender_score", 0)},
                        {"metric": "resilience_score", "value": status.get("resilience_score", 0)},
                        {"metric": "attack_success_rate", "value": metrics.get("attack_success_rate", status.get("attack_success_rate", 0))},
                    ],
                },
                {
                    "title": "Synthetic Attacks Generated",
                    "body": [entry.get("message", "") for entry in attacker_events[-10:]] or ["No attacker log events captured."],
                },
                {
                    "title": "Model Adaptation Metrics",
                    "table": [{"metric": k, "value": v} for k, v in status.get("updated_weights", {}).items()] or [{"metric": "updated_weights", "value": "N/A"}],
                },
                {
                    "title": "Resilience Improvements",
                    "body": [f"Resilience changed from {resilience_start:.2f} to {resilience_end:.2f}."],
                },
                {
                    "title": "Final Training Summary",
                    "body": [
                        f"Training status: {status.get('training_status', 'idle')}",
                        f"Latest attack source: {status.get('attack_source', 'n/a')}",
                    ],
                },
                {
                    "title": "Hydra Log Trace",
                    "body": self.hydra_logs_tail(logs),
                },
            ],
            "chart_paths": chart_paths,
            "log_file": str(self.log_path),
        }
        return report

    def hydra_logs_tail(self, logs: list[dict[str, Any]]) -> list[str]:
        trace = []
        for entry in logs[-10:]:
            if entry.get("type") == "event":
                trace.append(f"{entry.get('timestamp', '')} | {entry.get('actor', 'system')}: {entry.get('message', '')}")
            elif entry.get("type") == "status":
                status = entry.get("status", {})
                trace.append(
                    f"{entry.get('timestamp', '')} | round {entry.get('round', status.get('round', 0))} · "
                    f"resilience {status.get('resilience_score', 0)}"
                )
        return trace or ["No Hydra log entries available."]

"""HYDRA orchestration for attacker-vs-defender AML simulation."""
from __future__ import annotations

import json
import threading
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Deque, Dict, List, Optional

from ..services.model_command_center_service import model_command_center_service
from .adversarial_loop import run_adversarial_loop


class HydraOrchestrator:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._events: Deque[Dict] = deque(maxlen=800)
        self._event_seq = 0
        self._status: Dict = {
            "training_status": "idle",
            "round": 0,
            "rounds_target": 0,
            "interval_seconds": 2.0,
            "attacker_score": 0.0,
            "defender_score": 0.0,
            "resilience_score": 0.0,
            "active_attack_type": "none",
            "gnn_status": "stable",
            "ensemble_status": "stable",
            "synthetic_patterns_generated": 0,
            "detected_patterns": 0,
            "attacks_evaluated": 0,
            "attack_success_rate": 0.0,
            "detection_rate": 0.0,
            "adversarial_accuracy": 0.0,
            "baseline_detection_rate": 0.0,
            "model_accuracy": None,
            "baseline_samples": 0,
            "attack_source": "mock",
            "detection_threshold": 15.0,
            "current_model_version": "ensemble_v1.0-runtime",
            "gnn_model_version": "gnn_v1.0-runtime",
            "updated_weights": {},
            "confusion_matrix": {},
            "rollback": {},
            "started_at": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        self._log_path = Path(__file__).resolve().parents[2] / "logs" / "auto_sar_hydra.log"
        self._log_path.parent.mkdir(parents=True, exist_ok=True)

    def _append_log(self, entry: Dict) -> None:
        entry = {**entry, "timestamp": entry.get("timestamp") or datetime.now(timezone.utc).isoformat()}
        with self._log_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, default=str) + "\n")

    def _publish_event(self, actor: str, message: str) -> None:
        with self._lock:
            self._event_seq += 1
            payload = {
                "id": self._event_seq,
                "actor": actor,
                "message": message,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            self._events.append(payload)
            self._append_log({"type": "event", **payload})

    def _update_status(self, payload: Dict) -> None:
        result = payload.get("result", {})
        resilience = payload.get("resilience", {})
        model_sync = payload.get("model_sync", {})
        model_stats = model_sync.get("model_stats", {})
        post_update_accuracy = model_sync.get("post_update_accuracy", {})
        with self._lock:
            self._status.update(
                {
                    "training_status": payload.get("training_status", "running"),
                    "round": payload.get("round", self._status["round"]),
                    "attacker_score": result.get("attacker_score", self._status["attacker_score"]),
                    "defender_score": result.get("defender_score", self._status["defender_score"]),
                    "resilience_score": resilience.get("resilience_score", self._status["resilience_score"]),
                    "active_attack_type": result.get("active_attack_type", self._status["active_attack_type"]),
                    "gnn_status": payload.get("gnn_status", "retraining"),
                    "ensemble_status": payload.get("ensemble_status", "adapting"),
                    "attacks_evaluated": result.get("attacks_evaluated", self._status["attacks_evaluated"]),
                    "attack_success_rate": result.get("attack_success_rate", self._status["attack_success_rate"]),
                    "detection_rate": result.get("detection_rate", self._status["detection_rate"]),
                    "adversarial_accuracy": result.get("adversarial_accuracy", self._status["adversarial_accuracy"]),
                    "baseline_detection_rate": result.get(
                        "baseline_detection_rate",
                        self._status["baseline_detection_rate"],
                    ),
                    "model_accuracy": post_update_accuracy.get(
                        "model_accuracy",
                        result.get("model_accuracy", self._status["model_accuracy"]),
                    ),
                    "baseline_samples": post_update_accuracy.get(
                        "baseline_samples",
                        result.get("baseline_samples", self._status["baseline_samples"]),
                    ),
                    "attack_source": result.get("attack_source", self._status["attack_source"]),
                    "detection_threshold": result.get("detection_threshold", self._status["detection_threshold"]),
                    "updated_weights": model_sync.get("updated_weights", self._status["updated_weights"]),
                    "confusion_matrix": post_update_accuracy.get(
                        "confusion_matrix",
                        result.get("confusion_matrix", self._status["confusion_matrix"]),
                    ),
                    "rollback": model_sync.get("rollback", self._status["rollback"]),
                    "synthetic_patterns_generated": resilience.get(
                        "synthetic_patterns_generated",
                        self._status["synthetic_patterns_generated"],
                    ),
                    "detected_patterns": resilience.get("detected_patterns", self._status["detected_patterns"]),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            self._append_log({"type": "status", "status": dict(self._status), "round": payload.get("round")})
            if model_stats.get("ensemble_model"):
                self._status["current_model_version"] = model_stats["ensemble_model"]
            if model_stats.get("gnn_model"):
                self._status["gnn_model_version"] = model_stats["gnn_model"]
            model_command_center_service.update_hydra_status(self._status)

    def _preflight(self) -> None:
        """Warm up attacker components before starting."""
        from ..services.gan_training import get_gan_service

        try:
            gan_service = get_gan_service()
            # Best-effort warmup: if a trained GAN exists, validate it quickly.
            gan_service.generate_synthetic_data(1)
        except Exception as exc:
            # Allow HYDRA battle loop to run in simulation mode when GAN is unavailable.
            self._publish_event(
                "system",
                f"GAN preflight unavailable ({exc}); continuing with simulation mode",
            )

    def _run_loop(self, rounds: Optional[int], interval_seconds: float) -> None:
        try:
            run_adversarial_loop(
                stop_event=self._stop_event,
                publish_event=self._publish_event,
                update_status=self._update_status,
                max_rounds=rounds,
                interval_seconds=interval_seconds,
            )
            with self._lock:
                if self._status.get("training_status") != "stopped":
                    self._status["training_status"] = "completed"
                    self._status["gnn_status"] = "stable"
                    self._status["ensemble_status"] = "updated"
                    self._status["updated_at"] = datetime.now(timezone.utc).isoformat()
                    model_command_center_service.update_hydra_status(self._status)
                    self._publish_event("system", "HYDRA adversarial loop completed")
        except Exception as exc:
            with self._lock:
                self._status["training_status"] = "failed"
                self._status["gnn_status"] = "stable"
                self._status["ensemble_status"] = "stable"
                self._status["updated_at"] = datetime.now(timezone.utc).isoformat()
                self._publish_event("system", f"HYDRA battle failed: {exc}")
                model_command_center_service.update_hydra_status(self._status)

    def start(self, rounds: Optional[int] = None, interval_seconds: float = 2.0) -> Dict:
        with self._lock:
            if self._thread and self._thread.is_alive():
                return self.status()
            self._preflight()
            self._stop_event.clear()
            self._status["training_status"] = "running"
            self._status["round"] = 0
            self._status["rounds_target"] = rounds or 0
            self._status["interval_seconds"] = interval_seconds
            self._status["attacks_evaluated"] = 0
            self._status["attack_success_rate"] = 0.0
            self._status["detection_rate"] = 0.0
            self._status["adversarial_accuracy"] = 0.0
            self._status["synthetic_patterns_generated"] = 0
            self._status["detected_patterns"] = 0
            self._status["started_at"] = datetime.now(timezone.utc).isoformat()
            self._status["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._publish_event("system", "HYDRA adversarial loop started")
            model_command_center_service.update_hydra_status(self._status)

            self._thread = threading.Thread(
                target=self._run_loop,
                args=(rounds, interval_seconds),
                daemon=True,
            )
            self._thread.start()
            return self.status()

    def stop(self) -> Dict:
        with self._lock:
            self._stop_event.set()
            self._status["training_status"] = "stopped"
            self._status["gnn_status"] = "stable"
            self._status["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._publish_event("system", "HYDRA adversarial loop stopped")
            model_command_center_service.update_hydra_status(self._status)
            return self.status()

    def status(self) -> Dict:
        with self._lock:
            alive = bool(self._thread and self._thread.is_alive())
            status = dict(self._status)
            status["is_running"] = alive and not self._stop_event.is_set()
            return status

    def events_since(self, last_event_id: int) -> List[Dict]:
        with self._lock:
            return [event for event in self._events if event["id"] > last_event_id]

    def sse_payload(self, last_event_id: int) -> str:
        events = self.events_since(last_event_id)
        if not events:
            heartbeat = {"type": "heartbeat", "status": self.status()}
            return f"event: heartbeat\ndata: {json.dumps(heartbeat)}\n\n"
        chunks = []
        for event in events:
            chunks.append(f"id: {event['id']}\nevent: hydra\ndata: {json.dumps(event)}\n\n")
        return "".join(chunks)


_hydra_orchestrator: Optional[HydraOrchestrator] = None


def get_hydra_orchestrator() -> HydraOrchestrator:
    global _hydra_orchestrator
    if _hydra_orchestrator is None:
        _hydra_orchestrator = HydraOrchestrator()
    return _hydra_orchestrator

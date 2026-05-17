"""Model sync and incremental update for existing ensemble artifacts."""
from __future__ import annotations

import copy
import pickle
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

from ..services.ml_models import ENSEMBLE_RUNTIME_PKL, GNN_RUNTIME_PKL, get_model_manager
from ..services.model_command_center_service import model_command_center_service


def _clamp_weight(value: float) -> float:
    return max(0.1, min(0.9, value))


def _backup_artifact(path: Path, label: str) -> str | None:
    if not path.exists():
        return None
    rollback_dir = path.parent / "rollback"
    rollback_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    destination = rollback_dir / f"{label}_{timestamp}.pkl"
    shutil.copy2(path, destination)
    return str(destination)


def _harden_gnn_config(config: Dict, attack_success_rate: float) -> Dict:
    """Incrementally harden existing GNN heuristics against evasive synthetic attacks."""
    updated = copy.deepcopy(config)
    pressure = max(0.0, min(1.0, attack_success_rate))

    # Lower thresholds under pressure so suspicious activity is flagged sooner.
    thresholds = updated.get("counterparty_thresholds", [])
    if isinstance(thresholds, list) and thresholds:
        adjusted = []
        for threshold, weight in thresholds:
            threshold_val = max(3.0, float(threshold) * (1.0 - 0.25 * pressure))
            weight_val = min(35.0, float(weight) * (1.0 + 0.15 * pressure))
            adjusted.append((round(threshold_val, 3), round(weight_val, 3)))
        updated["counterparty_thresholds"] = adjusted

    sender_thresholds = updated.get("sender_concentration_thresholds", [])
    if isinstance(sender_thresholds, list) and sender_thresholds:
        adjusted_sender = []
        for threshold, weight in sender_thresholds:
            threshold_val = max(0.05, float(threshold) * (1.0 - 0.2 * pressure))
            weight_val = min(30.0, float(weight) * (1.0 + 0.12 * pressure))
            adjusted_sender.append((round(threshold_val, 4), round(weight_val, 3)))
        updated["sender_concentration_thresholds"] = adjusted_sender

    # Increase fan-in sensitivity for graph mutation attacks.
    fan_in_multiplier = float(updated.get("fan_in_multiplier", 30.0))
    updated["fan_in_multiplier"] = round(min(55.0, fan_in_multiplier * (1.0 + 0.2 * pressure)), 4)

    fan_in_cap = float(updated.get("fan_in_cap", 25.0))
    updated["fan_in_cap"] = round(min(40.0, fan_in_cap * (1.0 + 0.12 * pressure)), 4)
    return updated


def apply_incremental_defender_update(attack_success_rate: float) -> Dict:
    """Adapt existing ensemble + GNN runtime artifacts and preserve rollback checkpoints."""
    model_manager = get_model_manager()
    weights = dict(model_manager.ensemble.weights)

    # If attacks evade detection, tilt toward GNN for structural robustness.
    shift = (attack_success_rate - 0.2) * 0.08
    gnn_weight = _clamp_weight(weights.get("gnn", 0.4) + shift)
    lgbm_weight = _clamp_weight(1.0 - gnn_weight)
    updated_weights = {"lgbm": round(lgbm_weight, 4), "gnn": round(gnn_weight, 4)}
    model_manager.ensemble.weights = updated_weights

    model_tag = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    ensemble_version = f"ensemble_adapted_{model_tag}"
    gnn_version = f"gnn_adapted_{model_tag}"

    ensemble_backup = _backup_artifact(ENSEMBLE_RUNTIME_PKL, "ensemble")
    gnn_backup = _backup_artifact(GNN_RUNTIME_PKL, "gnn")

    ensemble_payload = {
        "model_version": ensemble_version,
        "weights": updated_weights,
    }
    ENSEMBLE_RUNTIME_PKL.parent.mkdir(parents=True, exist_ok=True)
    with open(ENSEMBLE_RUNTIME_PKL, "wb") as artifact_file:
        pickle.dump(ensemble_payload, artifact_file)

    # Incremental defender hardening for existing GNN runtime config.
    current_gnn_payload = {"model_version": model_manager.ensemble.gnn.model_version, **model_manager.ensemble.gnn.config}
    if GNN_RUNTIME_PKL.exists():
        try:
            with open(GNN_RUNTIME_PKL, "rb") as gnn_file:
                loaded_payload = pickle.load(gnn_file)
            if isinstance(loaded_payload, dict):
                current_gnn_payload.update(loaded_payload)
        except (OSError, pickle.UnpicklingError, AttributeError, TypeError):
            pass

    gnn_updated = _harden_gnn_config(current_gnn_payload, attack_success_rate)
    gnn_updated["model_version"] = gnn_version
    with open(GNN_RUNTIME_PKL, "wb") as gnn_file:
        pickle.dump(gnn_updated, gnn_file)

    # Hot-update in-memory runtime objects.
    model_manager.ensemble.model_version = ensemble_version
    model_manager.ensemble.gnn.model_version = gnn_version
    model_manager.ensemble.gnn.config = {
        key: value for key, value in gnn_updated.items() if key != "model_version"
    }

    model_stats = model_manager.get_model_stats()
    model_command_center_service.update_model_versions(model_stats)
    return {
        "updated_weights": updated_weights,
        "model_stats": model_stats,
        "ensemble_version": ensemble_version,
        "gnn_version": gnn_version,
        "rollback": {
            "ensemble": ensemble_backup,
            "gnn": gnn_backup,
        },
    }

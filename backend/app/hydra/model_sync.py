"""Model sync and incremental update for existing ensemble artifacts."""
from __future__ import annotations

import pickle
from datetime import datetime, timezone
from typing import Dict

from ..services.ml_models import ENSEMBLE_RUNTIME_PKL, get_model_manager
from ..services.model_command_center_service import model_command_center_service


def _clamp_weight(value: float) -> float:
    return max(0.1, min(0.9, value))


def apply_incremental_defender_update(attack_success_rate: float) -> Dict:
    """Adjust existing ensemble weights as incremental defender adaptation."""
    model_manager = get_model_manager()
    weights = dict(model_manager.ensemble.weights)

    # If attacks evade detection, tilt toward GNN for structural robustness.
    shift = (attack_success_rate - 0.2) * 0.08
    gnn_weight = _clamp_weight(weights.get("gnn", 0.4) + shift)
    lgbm_weight = _clamp_weight(1.0 - gnn_weight)
    updated_weights = {"lgbm": round(lgbm_weight, 4), "gnn": round(gnn_weight, 4)}
    model_manager.ensemble.weights = updated_weights

    payload = {
        "model_version": f"ensemble_adapted_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
        "weights": updated_weights,
    }
    ENSEMBLE_RUNTIME_PKL.parent.mkdir(parents=True, exist_ok=True)
    with open(ENSEMBLE_RUNTIME_PKL, "wb") as artifact_file:
        pickle.dump(payload, artifact_file)

    model_stats = model_manager.get_model_stats()
    model_command_center_service.update_model_versions(model_stats)
    return {"updated_weights": updated_weights, "model_stats": model_stats}


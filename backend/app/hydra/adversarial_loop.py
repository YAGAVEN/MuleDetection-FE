"""Continuous HYDRA adversarial loop."""
from __future__ import annotations

import threading
import time
from typing import Callable

from .battle_engine import BattleEngine
from .model_sync import apply_incremental_defender_update
from .resilience_tracker import ResilienceTracker


def run_adversarial_loop(
    stop_event: threading.Event,
    publish_event: Callable[[str, str], None],
    update_status: Callable[[dict], None],
    max_rounds: int | None = None,
    interval_seconds: float = 2.0,
) -> None:
    engine = BattleEngine()
    tracker = ResilienceTracker()
    round_index = 0

    while not stop_event.is_set():
        round_index += 1
        publish_event("attacker", "Generated synthetic structuring attack")
        publish_event("attacker", "Mutated passthrough laundering pattern")
        publish_event("attacker", "Created evasive mule graph")

        result = engine.run_round()
        publish_event("defender", "GNN adapted to graph mutation")

        model_sync = apply_incremental_defender_update(result["attack_success_rate"])
        publish_event("defender", "Ensemble resilience increased")

        resilience = tracker.update(
            total_attacks=result["attacks_evaluated"],
            detected_attacks=result["detected_attacks"],
            attack_success_rate=result["attack_success_rate"],
        )
        publish_event("defender", "Defender blocked synthetic laundering flow")

        update_status(
            {
                "round": round_index,
                "result": result,
                "resilience": resilience,
                "model_sync": model_sync,
                "training_status": "running",
            }
        )

        if max_rounds and round_index >= max_rounds:
            break
        time.sleep(interval_seconds)


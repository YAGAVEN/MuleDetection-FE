"""Resilience scoring utilities for HYDRA battle loop."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ResilienceState:
    previous_resilience: float = 50.0
    cycles: int = 0
    synthetic_patterns_generated: int = 0
    detected_patterns: int = 0


class ResilienceTracker:
    def __init__(self) -> None:
        self.state = ResilienceState()

    def update(
        self,
        total_attacks: int,
        detected_attacks: int,
        attack_success_rate: float,
    ) -> dict:
        self.state.cycles += 1
        self.state.synthetic_patterns_generated += int(total_attacks)
        self.state.detected_patterns += int(detected_attacks)

        detection_rate = (detected_attacks / total_attacks) if total_attacks > 0 else 0.0
        resilience_score = max(0.0, min(100.0, (detection_rate * 100.0) - (attack_success_rate * 25.0)))
        improvement = resilience_score - self.state.previous_resilience
        self.state.previous_resilience = resilience_score

        return {
            "battle_cycles": self.state.cycles,
            "resilience_score": round(resilience_score, 2),
            "resilience_delta": round(improvement, 2),
            "synthetic_patterns_generated": self.state.synthetic_patterns_generated,
            "detected_patterns": self.state.detected_patterns,
        }

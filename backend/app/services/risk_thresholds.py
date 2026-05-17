"""Shared risk thresholds for scoring and reporting."""
from __future__ import annotations

from typing import Final

LOW_UPTO_PCT_RANK: Final[float] = 0.2
MEDIUM_UPTO_PCT_RANK: Final[float] = 0.4
HIGH_UPTO_PCT_RANK: Final[float] = 0.6
CRITICAL_ABOVE_PCT_RANK: Final[float] = 0.8
SUSPICIOUS_ABOVE_PCT_RANK: Final[float] = 0.5

RISK_THRESHOLD_BANDS: Final[dict[str, float]] = {
    "low_upto_pct_rank": LOW_UPTO_PCT_RANK,
    "medium_upto_pct_rank": MEDIUM_UPTO_PCT_RANK,
    "high_upto_pct_rank": HIGH_UPTO_PCT_RANK,
    "critical_above_pct_rank": CRITICAL_ABOVE_PCT_RANK,
    "suspicious_above_pct_rank": SUSPICIOUS_ABOVE_PCT_RANK,
}


def risk_level_for_percentile(percentile: float) -> str:
    if percentile >= CRITICAL_ABOVE_PCT_RANK:
        return "CRITICAL"
    if percentile >= HIGH_UPTO_PCT_RANK:
        return "HIGH"
    if percentile >= MEDIUM_UPTO_PCT_RANK:
        return "MEDIUM"
    return "LOW"


def is_suspicious_percentile(percentile: float) -> bool:
    return percentile >= SUSPICIOUS_ABOVE_PCT_RANK


def is_critical_percentile(percentile: float) -> bool:
    return percentile >= CRITICAL_ABOVE_PCT_RANK

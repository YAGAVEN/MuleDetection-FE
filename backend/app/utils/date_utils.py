"""Date parsing and validation helpers for ingestion."""
from __future__ import annotations

from typing import Dict, List, Tuple

import pandas as pd


def _blank_like(series: pd.Series) -> pd.Series:
    as_str = series.astype(str).str.strip().str.lower()
    return series.isna() | as_str.isin({"", "nan", "none", "nat"})


def validate_date_column(
    dataframe: pd.DataFrame,
    column: str,
    date_format: str,
    allow_null: bool = False,
    sample_size: int = 10,
) -> Tuple[int, List[int]]:
    """Validate strict date format for a column.

    Returns:
        (invalid_count, sample_invalid_row_indexes)
    """
    if column not in dataframe.columns:
        return 0, []

    series = dataframe[column]
    parsed = pd.to_datetime(series, format=date_format, errors="coerce")
    null_mask = _blank_like(series)
    valid_mask = parsed.notna() | (allow_null & null_mask)
    invalid_mask = ~valid_mask

    invalid_count = int(invalid_mask.sum())
    invalid_rows = dataframe.index[invalid_mask].tolist()[:sample_size]
    return invalid_count, invalid_rows


def date_range_from_column(dataframe: pd.DataFrame, column: str) -> Dict[str, str]:
    """Build ISO date range summary from a datetime-like column."""
    if column not in dataframe.columns or dataframe.empty:
        return {"start": "", "end": ""}

    parsed = pd.to_datetime(dataframe[column], errors="coerce")
    parsed = parsed.dropna()
    if parsed.empty:
        return {"start": "", "end": ""}
    return {
        "start": parsed.min().isoformat(),
        "end": parsed.max().isoformat(),
    }

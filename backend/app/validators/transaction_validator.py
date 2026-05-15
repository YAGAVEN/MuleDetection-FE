"""Validation logic for transactions_full.csv."""
from __future__ import annotations

from typing import Any, Dict, List

import pandas as pd

from ..utils.date_utils import validate_date_column


TRANSACTION_REQUIRED_COLUMNS = [
    "transaction_id",
    "account_id",
    "transaction_timestamp",
    "counterparty_id",
    "amount",
    "channel",
]

TRANSACTION_CRITICAL_COLUMNS = [
    "transaction_id",
    "account_id",
    "transaction_timestamp",
    "amount",
    "channel",
]


def _err(column: str, issue: str) -> Dict[str, str]:
    return {"file": "transactions_full.csv", "column": column, "issue": issue}


def validate_transaction_dataframe(dataframe: pd.DataFrame) -> Dict[str, Any]:
    errors: List[Dict[str, str]] = []

    if dataframe.empty:
        errors.append(_err("__file__", "File is empty"))
        return {"errors": errors}

    missing = [col for col in TRANSACTION_REQUIRED_COLUMNS if col not in dataframe.columns]
    for col in missing:
        errors.append(_err(col, "Missing required column"))

    if missing:
        return {"errors": errors}

    duplicate_transaction_ids = int(dataframe["transaction_id"].duplicated().sum())
    if duplicate_transaction_ids > 0:
        errors.append(
            _err(
                "transaction_id",
                f"Duplicate transaction_id values found: {duplicate_transaction_ids}",
            )
        )

    duplicate_rows = int(dataframe.duplicated().sum())
    if duplicate_rows > 0:
        errors.append(_err("__row__", f"Duplicate rows found: {duplicate_rows}"))

    empty_rows = int(dataframe.isna().all(axis=1).sum())
    if empty_rows > 0:
        errors.append(_err("__row__", f"Empty rows found: {empty_rows}"))

    for col in TRANSACTION_CRITICAL_COLUMNS:
        nulls = int(dataframe[col].isna().sum())
        if nulls > 0:
            errors.append(_err(col, f"Null critical field count: {nulls}"))

    amount_series = pd.to_numeric(dataframe["amount"], errors="coerce")
    invalid_numeric = int((amount_series.isna() & dataframe["amount"].notna()).sum())
    if invalid_numeric > 0:
        errors.append(_err("amount", f"Invalid numeric values: {invalid_numeric}"))

    invalid_ts_count, _ = validate_date_column(
        dataframe,
        "transaction_timestamp",
        "%Y-%m-%d %H:%M:%S",
        allow_null=False,
    )
    if invalid_ts_count > 0:
        errors.append(
            _err(
                "transaction_timestamp",
                f"Invalid timestamp format. Expected YYYY-MM-DD HH:MM:SS ({invalid_ts_count})",
            )
        )

    return {
        "errors": errors,
        "rows": int(len(dataframe)),
        "columns": int(len(dataframe.columns)),
    }

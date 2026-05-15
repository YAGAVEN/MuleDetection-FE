"""Validation logic for master.csv."""
from __future__ import annotations

from typing import Any, Dict, List

import pandas as pd

from ..utils.date_utils import validate_date_column


MASTER_REQUIRED_COLUMNS = [
    "customer_id",
    "account_id",
    "is_mule",
    "account_status",
    "avg_balance",
    "monthly_avg_balance",
    "daily_avg_balance",
    "quarterly_avg_balance",
    "pan_available",
    "aadhaar_available",
    "passport_available",
    "mobile_banking_flag",
    "internet_banking_flag",
    "atm_card_flag",
    "demat_flag",
    "credit_card_flag",
    "fastag_flag",
    "kyc_compliant",
    "last_kyc_date",
    "account_opening_date",
    "date_of_birth",
    "relationship_start_date",
    "last_mobile_update_date",
    "customer_pin",
    "permanent_pin",
    "rural_branch",
    "product_family",
    "nomination_flag",
    "cheque_availed",
    "freeze_date",
    "unfreeze_date",
    "mule_flag_date",
]

MASTER_DATE_COLUMNS = [
    ("last_kyc_date", "%Y-%m-%d", True),
    ("account_opening_date", "%Y-%m-%d", False),
    ("date_of_birth", "%Y-%m-%d", False),
    ("relationship_start_date", "%Y-%m-%d", False),
    ("last_mobile_update_date", "%Y-%m-%d", True),
    ("freeze_date", "%Y-%m-%d", True),
    ("unfreeze_date", "%Y-%m-%d", True),
    ("mule_flag_date", "%Y-%m-%d", True),
]

MASTER_NUMERIC_COLUMNS = [
    "avg_balance",
    "monthly_avg_balance",
    "daily_avg_balance",
    "quarterly_avg_balance",
]

MASTER_CRITICAL_COLUMNS = ["customer_id", "account_id", "is_mule", "account_status"]


def _err(column: str, issue: str) -> Dict[str, str]:
    return {"file": "master.csv", "column": column, "issue": issue}


def validate_master_dataframe(dataframe: pd.DataFrame) -> Dict[str, Any]:
    errors: List[Dict[str, str]] = []

    if dataframe.empty:
        errors.append(_err("__file__", "File is empty"))
        return {"errors": errors}

    missing = [col for col in MASTER_REQUIRED_COLUMNS if col not in dataframe.columns]
    for col in missing:
        errors.append(_err(col, "Missing required column"))

    if missing:
        return {"errors": errors}

    duplicate_account_ids = int(dataframe["account_id"].duplicated().sum())
    if duplicate_account_ids > 0:
        errors.append(
            _err("account_id", f"Duplicate account_id values found: {duplicate_account_ids}")
        )

    duplicate_rows = int(dataframe.duplicated().sum())
    if duplicate_rows > 0:
        errors.append(_err("__row__", f"Duplicate rows found: {duplicate_rows}"))

    empty_rows = int(dataframe.isna().all(axis=1).sum())
    if empty_rows > 0:
        errors.append(_err("__row__", f"Empty rows found: {empty_rows}"))

    for col in MASTER_CRITICAL_COLUMNS:
        nulls = int(dataframe[col].isna().sum())
        if nulls > 0:
            errors.append(_err(col, f"Null critical field count: {nulls}"))

    for col in MASTER_NUMERIC_COLUMNS:
        coerced = pd.to_numeric(dataframe[col], errors="coerce")
        invalid_count = int((coerced.isna() & dataframe[col].notna()).sum())
        if invalid_count > 0:
            errors.append(_err(col, f"Invalid numeric values: {invalid_count}"))

    for col, fmt, allow_null in MASTER_DATE_COLUMNS:
        invalid_count, _ = validate_date_column(dataframe, col, fmt, allow_null=allow_null)
        if invalid_count > 0:
            errors.append(_err(col, f"Invalid date format. Expected YYYY-MM-DD ({invalid_count})"))

    return {
        "errors": errors,
        "rows": int(len(dataframe)),
        "columns": int(len(dataframe.columns)),
    }

"""Validation orchestration for ingestion uploads."""
from __future__ import annotations

from io import BytesIO
from typing import Any, Dict, List, Tuple

import pandas as pd
from pandas.errors import EmptyDataError, ParserError

from ..utils.date_utils import date_range_from_column
from ..validators.master_validator import validate_master_dataframe
from ..validators.transaction_validator import validate_transaction_dataframe


class ValidationService:
    @staticmethod
    def read_csv(content: bytes, filename: str) -> Tuple[pd.DataFrame, List[Dict[str, str]]]:
        try:
            dataframe = pd.read_csv(BytesIO(content))
            return dataframe, []
        except EmptyDataError:
            return pd.DataFrame(), [{"file": filename, "column": "__file__", "issue": "File is empty"}]
        except ParserError:
            return pd.DataFrame(), [{"file": filename, "column": "__file__", "issue": "Malformed CSV"}]
        except UnicodeDecodeError:
            return pd.DataFrame(), [{"file": filename, "column": "__file__", "issue": "Invalid file encoding"}]

    def validate(
        self,
        master_content: bytes,
        transaction_content: bytes,
    ) -> Dict[str, Any]:
        errors: List[Dict[str, str]] = []

        master_df, master_read_errors = self.read_csv(master_content, "master.csv")
        tx_df, tx_read_errors = self.read_csv(transaction_content, "transactions_full.csv")
        errors.extend(master_read_errors)
        errors.extend(tx_read_errors)

        if errors:
            return {"status": "error", "errors": errors}

        master_result = validate_master_dataframe(master_df)
        tx_result = validate_transaction_dataframe(tx_df)
        errors.extend(master_result.get("errors", []))
        errors.extend(tx_result.get("errors", []))

        if "account_id" in master_df.columns and "account_id" in tx_df.columns:
            master_ids = set(master_df["account_id"].dropna().astype(str).unique())
            tx_ids = set(tx_df["account_id"].dropna().astype(str).unique())
            unknown_ids = tx_ids - master_ids
            if unknown_ids:
                errors.append(
                    {
                        "file": "transactions_full.csv",
                        "column": "account_id",
                        "issue": f"Schema mismatch: {len(unknown_ids)} account_id values not found in master.csv",
                    }
                )

        files_summary = {
            "master.csv": {
                "rows": int(len(master_df)),
                "columns": int(len(master_df.columns)),
                "status": "validated" if not errors else "rejected",
            },
            "transactions_full.csv": {
                "rows": int(len(tx_df)),
                "columns": int(len(tx_df.columns)),
                "status": "validated" if not errors else "rejected",
            },
        }

        return {
            "status": "success" if not errors else "error",
            "errors": errors,
            "files_summary": files_summary,
            "master_df": master_df,
            "transactions_df": tx_df,
            "report": {
                "validation_status": "success" if not errors else "error",
                "errors": errors,
                "master_rows": int(len(master_df)),
                "transaction_rows": int(len(tx_df)),
                "date_range": date_range_from_column(tx_df, "transaction_timestamp"),
            },
        }


validation_service = ValidationService()

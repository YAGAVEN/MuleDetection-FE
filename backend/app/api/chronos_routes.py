"""Chronos timeline analysis routes for transaction layering detection"""
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import List, Dict, Any, Optional
import pandas as pd
import logging
from pydantic import BaseModel, Field

from ..data import get_transactions, get_account_features

router = APIRouter(prefix="/api/chronos", tags=["Chronos Timeline"])
logger = logging.getLogger(__name__)


class SearchRequest(BaseModel):
    """Request model for transaction search"""
    term: str = Field(..., description="Search term (case-insensitive)")
    type: str = Field(
        default="all",
        description="Search type: 'all', 'id', 'from_account', 'to_account', 'transaction_type', 'channel'"
    )


def compute_layering_summary(df: pd.DataFrame, features_df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    """
    Compute layering risk summary from transactions.
    
    Args:
        df: Transactions DataFrame
        features_df: Optional account features DataFrame for risk scoring
        
    Returns:
        Dictionary with risk counts and statistics
    """
    summary = {
        "total_transactions": len(df),
        "high_risk_count": 0,
        "medium_risk_count": 0,
        "low_risk_count": 0,
        "risky_accounts": 0,
        "unique_accounts": 0,
        "unique_channels": 0,
        "total_amount": 0.0,
        "avg_transaction_amount": 0.0,
    }
    
    if df.empty:
        return summary
    
    # Count unique accounts
    if "account_id" in df.columns:
        summary["unique_accounts"] = df["account_id"].nunique()
    
    # Count unique channels
    if "channel" in df.columns:
        summary["unique_channels"] = df["channel"].nunique()
    
    # Calculate total and average transaction amounts
    if "amount" in df.columns:
        summary["total_amount"] = float(df["amount"].sum())
        summary["avg_transaction_amount"] = float(df["amount"].mean())
    
    # Risk scoring based on transaction patterns
    if features_df is not None and not features_df.empty:
        # Count accounts marked as mule in features
        if "is_mule" in features_df.columns:
            mule_accounts = set(features_df[features_df["is_mule"] == 1]["account_id"].unique())
            if "account_id" in df.columns:
                risky_txns = df[df["account_id"].isin(mule_accounts)]
                summary["high_risk_count"] = len(risky_txns)
                summary["risky_accounts"] = len(mule_accounts & set(df["account_id"].unique()))
        
        # Count frozen accounts
        if "is_frozen" in features_df.columns:
            frozen_count = (features_df["is_frozen"] == 1).sum()
            summary["medium_risk_count"] = frozen_count
    
    # Alternative risk detection based on transaction patterns
    if "txn_type" in df.columns and summary["high_risk_count"] == 0:
        # High velocity transactions
        if "account_id" in df.columns and "transaction_timestamp" in df.columns:
            # Group by account and day
            if pd.api.types.is_datetime64_any_dtype(df["transaction_timestamp"]):
                daily_txns = df.groupby([df["account_id"], df["transaction_timestamp"].dt.date]).size()
                high_velocity = (daily_txns > 100).sum()
                summary["high_risk_count"] = high_velocity
    
    return summary


def parse_timestamp_column(df: pd.DataFrame) -> pd.DataFrame:
    """
    Parse and standardize timestamp column to datetime.
    
    Args:
        df: DataFrame with timestamp column
        
    Returns:
        DataFrame with parsed timestamp
    """
    # Create a copy to avoid modifying original
    df = df.copy()
    
    # Try common timestamp column names (transaction_timestamp is primary)
    timestamp_cols = ["transaction_timestamp", "timestamp", "time", "date", "transaction_date", "created_at"]
    timestamp_col = None
    
    for col in timestamp_cols:
        if col in df.columns:
            timestamp_col = col
            break
    
    if timestamp_col is None:
        logger.warning("No timestamp column found. Using first column as index.")
        return df
    
    try:
        df[timestamp_col] = pd.to_datetime(df[timestamp_col])
        return df
    except Exception as e:
        logger.warning(f"Failed to parse timestamp column '{timestamp_col}': {e}")
        return df


@router.get("/timeline")
async def get_timeline(
    account_id: Optional[str] = Query(None, description="Filter by specific account_id"),
    channel: Optional[str] = Query(None, description="Filter by channel (ATW, NTD, CHQ, FTD, UPI_CREDIT, etc)"),
    time_quantum: str = Query("1m", description="Time quantum for aggregation (1m, 5m, 1h, 1d)"),
) -> Dict[str, Any]:
    """
    Get timeline of transactions with layering analysis.
    
    Args:
        account_id: Filter transactions by account_id (optional)
        channel: Filter transactions by channel (optional)
        time_quantum: Time quantum for analysis (1m, 5m, 1h, 1d)
        
    Returns:
        JSON response with transaction timeline and layering summary
        
    Raises:
        HTTPException: If CSV loading fails
    """
    try:
        # Load transactions
        df = get_transactions()
        
        if df.empty:
            return {
                "status": "success",
                "data": [],
                "total_transactions": 0,
                "date_range": {"start": None, "end": None},
                "layering_summary": compute_layering_summary(df),
                "time_quantum": time_quantum,
                "message": "No transactions found",
            }
        
        # Filter by account_id if provided
        if account_id:
            df = df[df["account_id"] == account_id]
            if df.empty:
                return {
                    "status": "success",
                    "data": [],
                    "total_transactions": 0,
                    "date_range": {"start": None, "end": None},
                    "layering_summary": compute_layering_summary(df),
                    "time_quantum": time_quantum,
                    "message": f"No transactions found for account: {account_id}",
                }
        
        # Filter by channel if provided
        if channel:
            if "channel" in df.columns:
                df = df[df["channel"] == channel]
                if df.empty:
                    return {
                        "status": "success",
                        "data": [],
                        "total_transactions": 0,
                        "date_range": {"start": None, "end": None},
                        "layering_summary": compute_layering_summary(df),
                        "time_quantum": time_quantum,
                        "message": f"No transactions found for channel: {channel}",
                    }
        
        # Parse timestamp column to datetime
        df = parse_timestamp_column(df)
        
        # Find timestamp column name for sorting
        timestamp_cols = ["transaction_timestamp", "timestamp", "time", "date", "transaction_date", "created_at"]
        timestamp_col = None
        for col in timestamp_cols:
            if col in df.columns:
                timestamp_col = col
                break
        
        # Sort ascending by timestamp if available
        if timestamp_col and pd.api.types.is_datetime64_any_dtype(df[timestamp_col]):
            df = df.sort_values(by=timestamp_col, ascending=True)
        
        # Compute date range
        date_range = {"start": None, "end": None}
        if timestamp_col and len(df) > 0:
            try:
                date_range["start"] = df[timestamp_col].min().isoformat() if pd.notna(df[timestamp_col].min()) else None
                date_range["end"] = df[timestamp_col].max().isoformat() if pd.notna(df[timestamp_col].max()) else None
            except Exception as e:
                logger.warning(f"Failed to compute date range: {e}")
        
        # Load account features for risk scoring (optional)
        features_df = None
        try:
            features_df = get_account_features()
        except Exception as e:
            logger.warning(f"Could not load account features: {e}")
        
        # Compute layering summary
        layering_summary = compute_layering_summary(df, features_df)
        
        # Convert DataFrame to records
        records = df.to_dict("records")
        
        # Format timestamps in records for JSON serialization
        for record in records:
            for key, value in record.items():
                if isinstance(value, pd.Timestamp):
                    record[key] = value.isoformat()
        
        filters_applied = []
        if account_id:
            filters_applied.append(f"account_id={account_id}")
        if channel:
            filters_applied.append(f"channel={channel}")
        
        filter_msg = f" (filtered by: {', '.join(filters_applied)})" if filters_applied else ""
        
        return {
            "status": "success",
            "data": records,
            "total_transactions": len(df),
            "date_range": date_range,
            "layering_summary": layering_summary,
            "time_quantum": time_quantum,
            "message": f"Successfully loaded {len(df)} transactions{filter_msg}",
        }
        
    except FileNotFoundError as e:
        logger.error(f"Transaction file not found: {e}")
        raise HTTPException(
            status_code=404,
            detail=f"Transaction data not found: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error in timeline endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving timeline data: {str(e)}"
        )


@router.get("/timeline/accounts")
async def get_available_accounts() -> Dict[str, Any]:
    """
    Get available accounts in the transaction data.
    
    Returns:
        List of available accounts and their transaction counts
    """
    try:
        df = get_transactions()
        
        if df.empty or "account_id" not in df.columns:
            return {
                "status": "success",
                "accounts": [],
                "message": "No accounts found",
            }
        
        account_counts = df["account_id"].value_counts().head(100).to_dict()
        accounts = [
            {"account_id": account, "transaction_count": count}
            for account, count in account_counts.items()
        ]
        
        return {
            "status": "success",
            "accounts": sorted(accounts, key=lambda x: x["transaction_count"], reverse=True),
            "total_unique_accounts": df["account_id"].nunique(),
            "message": f"Found {len(accounts)} accounts (showing top 100)",
        }
        
    except FileNotFoundError as e:
        logger.error(f"Transaction file not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching accounts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/timeline/channels")
async def get_available_channels() -> Dict[str, Any]:
    """
    Get available channels in the transaction data.
    
    Returns:
        List of available channels and their transaction counts
    """
    try:
        df = get_transactions()
        
        if df.empty or "channel" not in df.columns:
            return {
                "status": "success",
                "channels": [],
                "message": "No channels found",
            }
        
        channel_counts = df["channel"].value_counts().to_dict()
        channels = [
            {"channel": channel, "count": count}
            for channel, count in channel_counts.items()
        ]
        
        return {
            "status": "success",
            "channels": sorted(channels, key=lambda x: x["count"], reverse=True),
            "total_channels": len(channels),
            "message": f"Found {len(channels)} unique channels",
        }
        
    except FileNotFoundError as e:
        logger.error(f"Transaction file not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching channels: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mule-accounts")
async def get_mule_accounts() -> Dict[str, Any]:
    """
    Get accounts flagged as mule accounts with their risk metrics.
    
    Returns:
        List of mule accounts with risk scores and details
    """
    try:
        features_df = get_account_features()
        
        if features_df.empty or "is_mule" not in features_df.columns:
            return {
                "status": "success",
                "mule_accounts": [],
                "total_mule_count": 0,
                "message": "No mule accounts found",
            }
        
        # Get mule accounts
        mule_df = features_df[features_df["is_mule"] == 1].copy()
        
        if mule_df.empty:
            return {
                "status": "success",
                "mule_accounts": [],
                "total_mule_count": 0,
                "message": "No accounts flagged as mule",
            }
        
        # Select key risk features
        mule_df = mule_df[[
            "account_id", "is_mule", "is_frozen",
            "txn_count", "avg_txn_amount", "max_txn_amount",
            "unique_counterparties", "structuring_40k_50k_count",
            "structuring_90k_1L_count", "pct_within_24h"
        ]].head(100)
        
        mule_accounts = mule_df.to_dict("records")
        
        return {
            "status": "success",
            "mule_accounts": mule_accounts,
            "total_mule_count": (features_df["is_mule"] == 1).sum(),
            "showing_count": len(mule_accounts),
            "message": f"Found {(features_df['is_mule'] == 1).sum()} mule accounts (showing top 100)",
        }
        
    except FileNotFoundError as e:
        logger.error(f"Features file not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching mule accounts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_transactions(request: SearchRequest) -> Dict[str, Any]:
    """
    Search transactions by term and type.
    
    Args:
        request: SearchRequest with term and type
        
    Returns:
        JSON response with search results
        
    Raises:
        HTTPException: If search fails or data not found
    """
    try:
        # Validate search term
        if not request.term or len(request.term.strip()) == 0:
            raise HTTPException(
                status_code=400,
                detail="Search term cannot be empty"
            )
        
        search_term = request.term.strip()
        search_type = request.type.lower()
        
        # Load transactions
        df = get_transactions()
        
        if df.empty:
            return {
                "status": "success",
                "results": [],
                "total_matches": 0,
                "search_term": search_term,
                "search_type": search_type,
                "message": "No transactions to search",
            }
        
        # Map search types to dataframe columns
        column_mapping = {
            "id": "transaction_id",
            "from_account": "account_id",
            "to_account": "counterparty_id",
            "transaction_type": "txn_type",
            "channel": "channel",
        }
        
        # Perform search based on type
        mask = None
        
        if search_type == "all":
            # Search across all mapped columns with OR logic
            for col in column_mapping.values():
                if col in df.columns:
                    col_mask = df[col].astype(str).str.contains(
                        search_term, case=False, na=False, regex=False
                    )
                    mask = col_mask if mask is None else (mask | col_mask)
        
        elif search_type in column_mapping:
            # Search specific column
            col_name = column_mapping[search_type]
            if col_name not in df.columns:
                raise HTTPException(
                    status_code=400,
                    detail=f"Column type '{search_type}' not found in data"
                )
            mask = df[col_name].astype(str).str.contains(
                search_term, case=False, na=False, regex=False
            )
        
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid search type '{search_type}'. Allowed: all, {', '.join(column_mapping.keys())}"
            )
        
        # Apply mask if no results yet
        if mask is None or not mask.any():
            return {
                "status": "success",
                "results": [],
                "total_matches": 0,
                "search_term": search_term,
                "search_type": search_type,
                "message": f"No matches found for '{search_term}' in {search_type}",
            }
        
        # Filter and get results
        results_df = df[mask].copy()
        
        # Format for JSON response
        results = results_df.to_dict("records")
        for record in results:
            for key, value in record.items():
                if isinstance(value, pd.Timestamp):
                    record[key] = value.isoformat()
        
        # Limit results to 1000 for performance
        if len(results) > 1000:
            results = results[:1000]
            message = f"Found {len(results_df)} matches (showing first 1000)"
        else:
            message = f"Found {len(results)} matches"
        
        return {
            "status": "success",
            "results": results,
            "total_matches": len(results_df),
            "search_term": search_term,
            "search_type": search_type,
            "message": message,
        }
        
    except HTTPException:
        raise
    except FileNotFoundError as e:
        logger.error(f"Transaction file not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in search endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

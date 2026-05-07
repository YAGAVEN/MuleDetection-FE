"""Mule detection routes for money mule identification and risk scoring"""
from fastapi import APIRouter, HTTPException, Path
from datetime import datetime
from typing import Dict, Any, Optional, List
import pandas as pd
import logging
import numpy as np

from ..data import get_account_features, get_transactions

router = APIRouter(prefix="/api/mule", tags=["Mule Detection"])
logger = logging.getLogger(__name__)


class MLEnsemblePredictor:
    """ML Ensemble predictor for mule risk scoring using feature-based rules"""
    
    @staticmethod
    def predict_risk_score(row: pd.Series) -> Dict[str, Any]:
        """
        Predict mule risk using ensemble of behavioral indicators.
        
        Args:
            row: Account features row
            
        Returns:
            Dictionary with risk scores and level
        """
        scores = {
            "behavioral_score": 0.0,
            "network_score": 0.0,
            "layering_score": 0.0,
            "velocity_score": 0.0,
            "risk_score": 0.0,
        }
        
        # 1. BEHAVIORAL SCORE (0-100)
        behavioral = 0.0
        
        # KYC compliance indicator
        if "kyc_non_compliant" in row.index and row["kyc_non_compliant"] == 1:
            behavioral += 15
        
        # Mobile banking behavior
        if "has_mobile_spike" in row.index and row["has_mobile_spike"] == 1:
            behavioral += 10
        
        # Pin mismatch indicator
        if "pin_mismatch" in row.index and row["pin_mismatch"] == 1:
            behavioral += 12
        
        # Night transaction activity (indicator of suspicious timing)
        if "night_txn_pct" in row.index and pd.notna(row["night_txn_pct"]):
            night_pct = float(row["night_txn_pct"])
            if night_pct > 0.3:  # >30% night transactions
                behavioral += 15
        
        # Weekend activity (unusual pattern)
        if "weekend_txn_pct" in row.index and pd.notna(row["weekend_txn_pct"]):
            weekend_pct = float(row["weekend_txn_pct"])
            if weekend_pct > 0.4:  # >40% weekend transactions
                behavioral += 12
        
        scores["behavioral_score"] = min(behavioral, 100.0)
        
        # 2. NETWORK SCORE (0-100)
        network = 0.0
        
        # Fan-in ratio (multiple money sources)
        if "fan_in_ratio" in row.index and pd.notna(row["fan_in_ratio"]):
            fan_in = float(row["fan_in_ratio"])
            if fan_in > 10:  # High incoming concentration
                network += 20
            elif fan_in > 5:
                network += 10
        
        # Fan-out ratio (multiple destinations)
        if "fan_out_ratio" in row.index and pd.notna(row["fan_out_ratio"]):
            fan_out = float(row["fan_out_ratio"])
            if fan_out > 10:  # High outgoing dispersion
                network += 20
            elif fan_out > 5:
                network += 10
        
        # Sender concentration (funds from few sources)
        if "sender_concentration" in row.index and pd.notna(row["sender_concentration"]):
            concentration = float(row["sender_concentration"])
            if concentration > 0.8:  # >80% from single sender
                network += 20
            elif concentration > 0.5:
                network += 10
        
        # Unique counterparties (low = suspicious)
        if "unique_counterparties" in row.index and pd.notna(row["unique_counterparties"]):
            counterparties = float(row["unique_counterparties"])
            if counterparties < 5:  # Very few counterparties
                network += 15
        
        scores["network_score"] = min(network, 100.0)
        
        # 3. LAYERING SCORE (0-100)
        layering = 0.0
        
        # Structuring detection (multiple suspicious amounts)
        if "structuring_40k_50k_count" in row.index and pd.notna(row["structuring_40k_50k_count"]):
            struct_40_50 = float(row["structuring_40k_50k_count"])
            if struct_40_50 > 50:
                layering += 25
            elif struct_40_50 > 20:
                layering += 15
        
        if "structuring_90k_1L_count" in row.index and pd.notna(row["structuring_90k_1L_count"]):
            struct_90_1l = float(row["structuring_90k_1L_count"])
            if struct_90_1l > 30:
                layering += 20
            elif struct_90_1l > 10:
                layering += 10
        
        # Round amount patterns
        if "round_1k_count" in row.index and pd.notna(row["round_1k_count"]):
            round_1k = float(row["round_1k_count"])
            if round_1k > 100:
                layering += 15
        
        # Passthrough indicators (quick in-out cycles)
        if "mean_passthrough_hours" in row.index and pd.notna(row["mean_passthrough_hours"]):
            passthrough_hrs = float(row["mean_passthrough_hours"])
            if passthrough_hrs < 6:  # Money passes through very quickly
                layering += 25
            elif passthrough_hrs < 24:
                layering += 15
        
        if "pct_within_24h" in row.index and pd.notna(row["pct_within_24h"]):
            within_24h = float(row["pct_within_24h"])
            if within_24h > 0.7:  # >70% transactions within 24h
                layering += 20
        
        scores["layering_score"] = min(layering, 100.0)
        
        # 4. VELOCITY SCORE (0-100)
        velocity = 0.0
        
        # Transaction velocity
        if "txn_velocity" in row.index and pd.notna(row["txn_velocity"]):
            txn_vel = float(row["txn_velocity"])
            if txn_vel > 50:  # Very high velocity
                velocity += 30
            elif txn_vel > 20:
                velocity += 20
            elif txn_vel > 10:
                velocity += 10
        
        # Transaction count (volume indicator)
        if "txn_count" in row.index and pd.notna(row["txn_count"]):
            txn_count = float(row["txn_count"])
            if txn_count > 1000:
                velocity += 20
            elif txn_count > 500:
                velocity += 10
        
        # Active days (how often account is used)
        if "active_days" in row.index and pd.notna(row["active_days"]):
            active_days = float(row["active_days"])
            if active_days > 300:  # Active almost every day
                velocity += 15
        
        scores["velocity_score"] = min(velocity, 100.0)
        
        # 5. ENSEMBLE RISK SCORE (weighted average)
        weights = {
            "behavioral_score": 0.15,
            "network_score": 0.25,
            "layering_score": 0.40,
            "velocity_score": 0.20,
        }
        
        risk_score = sum(scores[key] * weights[key] for key in weights.keys())
        scores["risk_score"] = round(risk_score, 2)
        
        return scores


def get_risk_level(risk_score: float) -> str:
    """
    Determine risk level from risk score.
    
    Args:
        risk_score: Risk score (0-100)
        
    Returns:
        Risk level string
    """
    if risk_score >= 75:
        return "CRITICAL"
    elif risk_score >= 60:
        return "HIGH"
    elif risk_score >= 40:
        return "MEDIUM"
    elif risk_score >= 20:
        return "LOW"
    else:
        return "MINIMAL"


@router.get("/mule-risk/{account_id}")
async def get_mule_risk(
    account_id: str = Path(..., description="Account ID to analyze")
) -> Dict[str, Any]:
    """
    Get mule risk score and analysis for an account.
    
    Args:
        account_id: Account ID to analyze
        
    Returns:
        JSON response with risk scores
        
    Raises:
        HTTPException: If account not found or data loading fails
    """
    try:
        # Load account features
        df = get_account_features()
        
        # Filter by account_id
        account_data = df[df["account_id"] == account_id]
        
        if account_data.empty:
            raise HTTPException(
                status_code=404,
                detail=f"Account not found: {account_id}"
            )
        
        row = account_data.iloc[0]
        
        # Get ML ensemble prediction
        scores = MLEnsemblePredictor.predict_risk_score(row)
        
        # Determine risk level
        risk_level = get_risk_level(scores["risk_score"])
        
        # Check if account is already flagged
        is_flagged = bool(row.get("is_mule", 0))
        is_frozen = bool(row.get("is_frozen", 0))
        
        return {
            "status": "success",
            "account_id": account_id,
            "risk_score": scores["risk_score"],
            "risk_level": risk_level,
            "behavioral_score": round(scores["behavioral_score"], 2),
            "network_score": round(scores["network_score"], 2),
            "layering_score": round(scores["layering_score"], 2),
            "velocity_score": round(scores["velocity_score"], 2),
            "is_mule_flagged": is_flagged,
            "is_frozen": is_frozen,
            "timestamp": datetime.now().isoformat(),
        }
        
    except HTTPException:
        raise
    except FileNotFoundError as e:
        logger.error(f"Features file not found: {e}")
        raise HTTPException(status_code=404, detail="Account features data not found")
    except Exception as e:
        logger.error(f"Error in mule-risk endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing account: {str(e)}")


@router.get("/network-metrics/{account_id}")
async def get_network_metrics(
    account_id: str = Path(..., description="Account ID to analyze")
) -> Dict[str, Any]:
    """
    Get network-based metrics for an account.
    
    Args:
        account_id: Account ID to analyze
        
    Returns:
        JSON response with network metrics
        
    Raises:
        HTTPException: If account not found or data loading fails
    """
    try:
        # Load account features
        df = get_account_features()
        
        # Filter by account_id
        account_data = df[df["account_id"] == account_id]
        
        if account_data.empty:
            raise HTTPException(
                status_code=404,
                detail=f"Account not found: {account_id}"
            )
        
        row = account_data.iloc[0]
        
        # Extract network metrics
        metrics = {
            "account_id": account_id,
            "connected_accounts": int(row.get("unique_counterparties", 0)),
            "fan_in_ratio": float(row.get("fan_in_ratio", 0.0)) if pd.notna(row.get("fan_in_ratio")) else 0.0,
            "fan_out_ratio": float(row.get("fan_out_ratio", 0.0)) if pd.notna(row.get("fan_out_ratio")) else 0.0,
            "sender_concentration": float(row.get("sender_concentration", 0.0)) if pd.notna(row.get("sender_concentration")) else 0.0,
            "credit_counterparties": int(row.get("credit_counterparties", 0)) if pd.notna(row.get("credit_counterparties")) else 0,
            "debit_counterparties": int(row.get("debit_counterparties", 0)) if pd.notna(row.get("debit_counterparties")) else 0,
        }
        
        # Compute network hub score (0-100)
        hub_score = 0.0
        if metrics["fan_in_ratio"] > 0:
            hub_score += min(metrics["fan_in_ratio"] * 5, 50)  # Max 50 points
        if metrics["fan_out_ratio"] > 0:
            hub_score += min(metrics["fan_out_ratio"] * 5, 50)  # Max 50 points
        
        metrics["hub_score"] = round(min(hub_score, 100.0), 2)
        
        # Compute funnel score (0-100) - how money flows through account
        funnel_score = 0.0
        if metrics["sender_concentration"] > 0.7:  # Concentrated sources
            funnel_score += 40
        if metrics["fan_out_ratio"] > metrics["fan_in_ratio"]:  # Money dispersed
            funnel_score += 30
        if metrics["connected_accounts"] < 5 and metrics["connected_accounts"] > 0:  # Few connections
            funnel_score += 30
        
        metrics["funnel_score"] = round(min(funnel_score, 100.0), 2)
        
        metrics["timestamp"] = datetime.now().isoformat()
        
        return {
            "status": "success",
            **metrics,
        }
        
    except HTTPException:
        raise
    except FileNotFoundError as e:
        logger.error(f"Features file not found: {e}")
        raise HTTPException(status_code=404, detail="Account features data not found")
    except Exception as e:
        logger.error(f"Error in network-metrics endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Error computing network metrics: {str(e)}")


@router.get("/layering-detection/{account_id}")
async def get_layering_detection(
    account_id: str = Path(..., description="Account ID to analyze")
) -> Dict[str, Any]:
    """
    Detect layering patterns for an account.
    
    Args:
        account_id: Account ID to analyze
        
    Returns:
        JSON response with layering detection results
        
    Raises:
        HTTPException: If account not found or data loading fails
    """
    try:
        # Load account features
        df = get_account_features()
        
        # Filter by account_id
        account_data = df[df["account_id"] == account_id]
        
        if account_data.empty:
            raise HTTPException(
                status_code=404,
                detail=f"Account not found: {account_id}"
            )
        
        row = account_data.iloc[0]
        
        # Detect layering patterns
        detection = {
            "account_id": account_id,
            "smurfing_detected": False,
            "round_tripping_detected": False,
            "layering_chains_detected": False,
            "layering_indicators": [],
            "confidence_score": 0.0,
        }
        
        confidence = 0.0
        
        # 1. SMURFING: Multiple small transactions below reporting threshold
        if "structuring_40k_50k_count" in row.index and pd.notna(row["structuring_40k_50k_count"]):
            struct_40_50 = float(row["structuring_40k_50k_count"])
            if struct_40_50 > 30:
                detection["smurfing_detected"] = True
                detection["layering_indicators"].append(f"High structuring: {int(struct_40_50)} transactions in 40k-50k range")
                confidence += 0.35
        
        # 2. ROUND-TRIPPING: Money in and out in short timeframe
        if "mean_passthrough_hours" in row.index and pd.notna(row["mean_passthrough_hours"]):
            passthrough_hrs = float(row["mean_passthrough_hours"])
            if passthrough_hrs < 12:
                detection["round_tripping_detected"] = True
                detection["layering_indicators"].append(f"Rapid passthrough: Average {passthrough_hrs:.1f} hours between credit-debit")
                confidence += 0.35
        
        if "pct_within_24h" in row.index and pd.notna(row["pct_within_24h"]):
            within_24h = float(row["pct_within_24h"])
            if within_24h > 0.75:
                detection["round_tripping_detected"] = True
                detection["layering_indicators"].append(f"Time-based round-trip: {within_24h*100:.1f}% within 24 hours")
                confidence += 0.20
        
        # 3. LAYERING CHAINS: Multiple transaction patterns indicating layering
        chain_indicators = 0
        
        # Indicator 1: High fan-in + fan-out (money flowing through)
        if "fan_in_ratio" in row.index and "fan_out_ratio" in row.index:
            fan_in = float(row.get("fan_in_ratio", 0))
            fan_out = float(row.get("fan_out_ratio", 0))
            if fan_in > 5 and fan_out > 5:
                chain_indicators += 1
                detection["layering_indicators"].append(f"Complex network: fan-in={fan_in:.1f}, fan-out={fan_out:.1f}")
        
        # Indicator 2: Channel entropy (using multiple channels for transactions)
        if "channel_entropy" in row.index and pd.notna(row["channel_entropy"]):
            channel_entropy = float(row["channel_entropy"])
            if channel_entropy > 2.5:  # High diversity
                chain_indicators += 1
                detection["layering_indicators"].append(f"Multi-channel activity: entropy={channel_entropy:.2f}")
        
        # Indicator 3: Multiple money movement patterns
        if "txn_pre_mobile_30d" in row.index and "txn_post_mobile_30d" in row.index:
            pre_mobile = float(row.get("txn_pre_mobile_30d", 0))
            post_mobile = float(row.get("txn_post_mobile_30d", 0))
            if pre_mobile > 0 and post_mobile > 0 and post_mobile > pre_mobile * 1.5:
                chain_indicators += 1
                detection["layering_indicators"].append("Mobile activation spike detected")
        
        if chain_indicators >= 2:
            detection["layering_chains_detected"] = True
            confidence += 0.30
        
        # Overall confidence
        detection["confidence_score"] = round(min(confidence, 1.0) * 100, 2)
        
        detection["layering_risk_level"] = "HIGH" if detection["confidence_score"] > 70 else "MEDIUM" if detection["confidence_score"] > 40 else "LOW"
        
        detection["timestamp"] = datetime.now().isoformat()
        
        return {
            "status": "success",
            **detection,
        }
        
    except HTTPException:
        raise
    except FileNotFoundError as e:
        logger.error(f"Features file not found: {e}")
        raise HTTPException(status_code=404, detail="Account features data not found")
    except Exception as e:
        logger.error(f"Error in layering-detection endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Error detecting layering: {str(e)}")


@router.get("/accounts/risk-summary")
async def get_risk_summary(
    limit: int = 100,
    min_risk_score: float = 50.0
) -> Dict[str, Any]:
    """
    Get summary of high-risk accounts.
    
    Args:
        limit: Maximum number of accounts to return
        min_risk_score: Minimum risk score to include (0-100)
        
    Returns:
        JSON response with list of high-risk accounts
    """
    try:
        df = get_account_features()
        
        high_risk_accounts = []
        
        for idx, row in df.iterrows():
            scores = MLEnsemblePredictor.predict_risk_score(row)
            
            if scores["risk_score"] >= min_risk_score:
                risk_level = get_risk_level(scores["risk_score"])
                
                high_risk_accounts.append({
                    "account_id": row.get("account_id"),
                    "risk_score": scores["risk_score"],
                    "risk_level": risk_level,
                    "is_mule_flagged": bool(row.get("is_mule", 0)),
                    "is_frozen": bool(row.get("is_frozen", 0)),
                })
        
        # Sort by risk score descending
        high_risk_accounts.sort(key=lambda x: x["risk_score"], reverse=True)
        
        return {
            "status": "success",
            "high_risk_accounts": high_risk_accounts[:limit],
            "total_high_risk": len(high_risk_accounts),
            "min_risk_score_filter": min_risk_score,
            "timestamp": datetime.now().isoformat(),
        }
        
    except FileNotFoundError as e:
        logger.error(f"Features file not found: {e}")
        raise HTTPException(status_code=404, detail="Account features data not found")
    except Exception as e:
        logger.error(f"Error in risk-summary endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Error computing risk summary: {str(e)}")

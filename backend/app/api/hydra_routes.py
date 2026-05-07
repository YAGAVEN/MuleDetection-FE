"""Hydra routes for GAN-based synthetic money laundering pattern generation and detection"""
from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
import logging
import uuid

from ..services.gan_training import get_gan_service
from .mule_routes import MLEnsemblePredictor, get_risk_level
from ..data import get_account_features
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/hydra", tags=["Hydra - Pattern Generation"])
logger = logging.getLogger(__name__)


class PatternRequest(BaseModel):
    """Request model for pattern detection"""
    pattern_id: str = Field(..., description="Pattern ID to detect")
    pattern_type: str = Field(..., description="Pattern type (layering_scheme, structuring, etc)")
    transactions: List[Dict[str, Any]] = Field(..., description="Transaction steps")
    complexity_score: float = Field(..., description="Pattern complexity (0-100)")


class SimulationStats:
    """Track statistics for simulations"""
    def __init__(self):
        self.total_generated = 0
        self.total_detected = 0
        self.detection_accuracy = 0.0
        self.avg_complexity = 0.0
        self.avg_evasion = 0.0
        self.patterns = []


def map_synthetic_to_transactions(
    synthetic_data: np.ndarray,
    num_steps: int = 8
) -> List[Dict[str, Any]]:
    """
    Map synthetic GAN data to transaction steps.
    
    Args:
        synthetic_data: Numpy array of synthetic features
        num_steps: Number of transaction steps to generate
        
    Returns:
        List of transaction step dictionaries
    """
    transactions = []
    
    # Account ID pool
    account_pool = [f"ACCT_{i:06d}" for i in range(1, 1000)]
    
    # Techniques to alternate
    techniques = ["structuring", "layering", "smurfing", "round_tripping"]
    
    for step in range(num_steps):
        # Extract features for this step (rotate through synthetic data)
        data_idx = step % len(synthetic_data) if len(synthetic_data) > 0 else 0
        features = synthetic_data[data_idx]
        
        # Normalize amount (assuming first feature is amount-related, scale to realistic range)
        amount = float(features[0]) if len(features) > 0 else 5000.0
        amount = max(1000, min(500000, abs(amount) * 1000))  # Normalize to realistic range
        
        # Generate transaction
        transaction = {
            "step": step + 1,
            "from_account": np.random.choice(account_pool),
            "to_account": np.random.choice(account_pool),
            "amount": round(amount, 2),
            "delay_minutes": int((features[1] if len(features) > 1 else 60) * 60),
            "technique": techniques[step % len(techniques)],  # Alternate techniques
            "mcc_code": int((features[2] * 1000) % 9999) if len(features) > 2 else 5651,
            "channel": np.random.choice(["ATW", "FTD", "UPI", "CHQ", "NTD", "END"]),
        }
        transactions.append(transaction)
    
    return transactions


def calculate_complexity_score(transactions: List[Dict[str, Any]]) -> float:
    """
    Calculate complexity score for a pattern.
    
    Args:
        transactions: List of transaction steps
        
    Returns:
        Complexity score (0-100)
    """
    score = 0.0
    
    # Number of steps increases complexity
    score += min(len(transactions) * 5, 30)
    
    # Technique diversity
    techniques = set(t.get("technique") for t in transactions)
    score += len(techniques) * 10
    
    # Amount variance
    amounts = [t.get("amount", 0) for t in transactions]
    if amounts and len(amounts) > 1:
        variance = np.var(amounts)
        score += min(variance / 1000000, 20)
    
    # Time delays (complex patterns have varied delays)
    delays = [t.get("delay_minutes", 0) for t in transactions]
    if delays and len(delays) > 1:
        delay_variance = np.var(delays)
        score += min(delay_variance / 100, 20)
    
    return min(score, 100.0)


def calculate_evasion_score(transactions: List[Dict[str, Any]]) -> float:
    """
    Calculate evasion score (how well the pattern avoids detection).
    
    Args:
        transactions: List of transaction steps
        
    Returns:
        Evasion score (0-100)
    """
    score = 0.0
    
    # Structuring (breaking up large amounts)
    structuring_txns = [t for t in transactions if t.get("technique") == "structuring"]
    if structuring_txns:
        avg_struct_amount = np.mean([t.get("amount", 0) for t in structuring_txns])
        # Smaller amounts are more evasive (under 50k)
        if avg_struct_amount < 50000:
            score += 25
    
    # Variable delays (avoiding patterns)
    delays = [t.get("delay_minutes", 0) for t in transactions]
    if delays and len(delays) > 1:
        delay_variance = np.var(delays)
        if delay_variance > 1000:  # High variance is more evasive
            score += 25
    
    # Round-tripping evasion
    round_trip_txns = [t for t in transactions if t.get("technique") == "round_tripping"]
    if round_trip_txns:
        # Quick turnaround is more evasive
        quick_txns = [t for t in round_trip_txns if t.get("delay_minutes", 0) < 1440]
        if len(quick_txns) > len(round_trip_txns) * 0.5:
            score += 20
    
    # Channel diversity (using multiple channels)
    channels = set(t.get("channel") for t in transactions)
    score += len(channels) * 5
    
    # Account diversity
    accounts = set()
    for t in transactions:
        accounts.add(t.get("from_account"))
        accounts.add(t.get("to_account"))
    score += min(len(accounts) * 3, 20)
    
    return min(score, 100.0)


@router.post("/generate")
async def generate_pattern() -> Dict[str, Any]:
    """
    Generate synthetic money laundering pattern using GAN.
    
    Returns:
        JSON response with generated pattern
        
    Raises:
        HTTPException: If GAN generation fails
    """
    try:
        # Get GAN service
        gan_service = get_gan_service()
        
        # Generate synthetic data (8 samples)
        synthetic_result = gan_service.generate_synthetic_data(8)
        
        if synthetic_result is None or "synthetic_data" not in synthetic_result:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate synthetic data from GAN"
            )
        
        # Extract synthetic data
        synthetic_data = synthetic_result.get("synthetic_data", np.array([]))
        
        if isinstance(synthetic_data, list):
            synthetic_data = np.array(synthetic_data)
        
        # Map to transaction steps
        transactions = map_synthetic_to_transactions(synthetic_data, num_steps=8)
        
        # Calculate scores
        complexity_score = calculate_complexity_score(transactions)
        evasion_score = calculate_evasion_score(transactions)
        
        # Generate pattern ID
        pattern_id = f"HYDRA_{uuid.uuid4().hex[:8].upper()}"
        
        # Generate description
        techniques_used = set(t["technique"] for t in transactions)
        description = f"Synthetic {' + '.join(techniques_used)} pattern with {len(transactions)} steps"
        
        return {
            "status": "success",
            "data": {
                "pattern_id": pattern_id,
                "pattern_type": "layering_scheme",
                "complexity_score": round(complexity_score, 2),
                "evasion_score": round(evasion_score, 2),
                "description": description,
                "transactions": transactions,
                "timestamp": datetime.now().isoformat(),
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating pattern: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate pattern: {str(e)}")


@router.post("/detect")
async def detect_pattern(request: PatternRequest) -> Dict[str, Any]:
    """
    Detect money laundering pattern using ensemble predictor.
    
    Args:
        request: PatternRequest with pattern details
        
    Returns:
        JSON response with detection result
        
    Raises:
        HTTPException: If detection fails
    """
    try:
        # Validate request
        if not request.transactions:
            raise HTTPException(status_code=400, detail="No transactions provided")
        
        # Create a synthetic feature row from transactions
        feature_row = {}
        
        # Extract features from transactions
        amounts = [t.get("amount", 0) for t in request.transactions]
        delays = [t.get("delay_minutes", 0) for t in request.transactions]
        techniques = [t.get("technique") for t in request.transactions]
        
        # Map to account features for ML ensemble
        feature_row["txn_count"] = len(request.transactions)
        feature_row["avg_txn_amount"] = np.mean(amounts) if amounts else 0
        feature_row["max_txn_amount"] = max(amounts) if amounts else 0
        feature_row["unique_counterparties"] = len(set(
            t.get("to_account") for t in request.transactions
        ))
        
        # Structuring detection
        feature_row["structuring_40k_50k_count"] = sum(
            1 for t in request.transactions
            if 40000 <= t.get("amount", 0) <= 50000
        )
        
        # Passthrough detection
        feature_row["mean_passthrough_hours"] = np.mean(delays) / 60 if delays else 0
        feature_row["pct_within_24h"] = sum(1 for d in delays if d <= 1440) / len(delays) if delays else 0
        
        # Network analysis
        unique_from = len(set(t.get("from_account") for t in request.transactions))
        unique_to = len(set(t.get("to_account") for t in request.transactions))
        feature_row["fan_in_ratio"] = unique_from / len(request.transactions) if request.transactions else 0
        feature_row["fan_out_ratio"] = unique_to / len(request.transactions) if request.transactions else 0
        feature_row["sender_concentration"] = 1.0 / unique_from if unique_from > 0 else 1.0
        
        # Create pandas Series for ML ensemble
        series = pd.Series(feature_row)
        
        # Run ensemble predictor
        scores = MLEnsemblePredictor.predict_risk_score(series)
        risk_level = get_risk_level(scores["risk_score"])
        
        # Detection result
        detected = scores["risk_score"] >= 50  # Threshold for detection
        
        return {
            "status": "success",
            "detection_result": {
                "pattern_id": request.pattern_id,
                "pattern_type": request.pattern_type,
                "detected": detected,
                "risk_score": round(scores["risk_score"], 2),
                "risk_level": risk_level,
                "behavioral_score": round(scores["behavioral_score"], 2),
                "network_score": round(scores["network_score"], 2),
                "layering_score": round(scores["layering_score"], 2),
                "velocity_score": round(scores["velocity_score"], 2),
                "confidence": round(scores["risk_score"], 2),  # Use risk score as confidence
                "timestamp": datetime.now().isoformat(),
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error detecting pattern: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to detect pattern: {str(e)}")


@router.get("/simulation")
async def run_simulation(rounds: int = 10) -> Dict[str, Any]:
    """
    Run simulation: generate patterns and test detection in a loop.
    
    Args:
        rounds: Number of simulation rounds (default: 10)
        
    Returns:
        JSON response with aggregated simulation statistics
        
    Raises:
        HTTPException: If simulation fails
    """
    try:
        if rounds < 1 or rounds > 100:
            raise HTTPException(status_code=400, detail="Rounds must be between 1 and 100")
        
        stats = SimulationStats()
        
        for round_num in range(rounds):
            try:
                # Generate pattern
                gan_service = get_gan_service()
                synthetic_result = gan_service.generate_synthetic_data(8)
                
                if synthetic_result is None or "synthetic_data" not in synthetic_result:
                    continue
                
                synthetic_data = synthetic_result.get("synthetic_data", np.array([]))
                if isinstance(synthetic_data, list):
                    synthetic_data = np.array(synthetic_data)
                
                transactions = map_synthetic_to_transactions(synthetic_data, num_steps=8)
                complexity = calculate_complexity_score(transactions)
                evasion = calculate_evasion_score(transactions)
                
                # Create detection request
                pattern_id = f"HYDRA_SIM_{round_num}_{uuid.uuid4().hex[:4].upper()}"
                request = PatternRequest(
                    pattern_id=pattern_id,
                    pattern_type="layering_scheme",
                    transactions=transactions,
                    complexity_score=complexity
                )
                
                # Detect pattern
                detection_response = await detect_pattern(request)
                detection = detection_response["detection_result"]
                
                # Track statistics
                stats.total_generated += 1
                if detection["detected"]:
                    stats.total_detected += 1
                stats.avg_complexity = (stats.avg_complexity * (round_num) + complexity) / (round_num + 1)
                stats.avg_evasion = (stats.avg_evasion * (round_num) + evasion) / (round_num + 1)
                
                stats.patterns.append({
                    "pattern_id": pattern_id,
                    "complexity": round(complexity, 2),
                    "evasion": round(evasion, 2),
                    "detected": detection["detected"],
                    "risk_score": detection["risk_score"],
                    "risk_level": detection["risk_level"],
                })
                
            except Exception as e:
                logger.warning(f"Error in simulation round {round_num}: {e}")
                continue
        
        # Calculate detection accuracy
        if stats.total_generated > 0:
            stats.detection_accuracy = (stats.total_detected / stats.total_generated) * 100
        
        return {
            "status": "success",
            "simulation_results": {
                "rounds": rounds,
                "total_generated": stats.total_generated,
                "total_detected": stats.total_detected,
                "detection_accuracy": round(stats.detection_accuracy, 2),
                "avg_complexity_score": round(stats.avg_complexity, 2),
                "avg_evasion_score": round(stats.avg_evasion, 2),
                "patterns": stats.patterns,
                "timestamp": datetime.now().isoformat(),
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running simulation: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

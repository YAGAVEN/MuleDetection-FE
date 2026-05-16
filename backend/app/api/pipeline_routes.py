"""Pipeline status endpoints."""
from __future__ import annotations

from fastapi import APIRouter

from ..services.pipeline_orchestrator import pipeline_orchestrator
from ..services.storage_service import storage_service


router = APIRouter(prefix="/api/pipeline", tags=["Pipeline"])


@router.get("/status")
async def pipeline_status():
    return pipeline_orchestrator.status()


@router.get("/results")
async def pipeline_results():
    """Get pipeline results including high-risk accounts, alerts, and risk scores."""
    try:
        # Load SHAP reports which contain high-risk accounts
        shap_data = storage_service.load_data("shap_model_reports.json")
        
        if not shap_data:
            return {
                "status": "no_results",
                "cases": [],
                "alerts": [],
                "risk_scores": []
            }
        
        # Extract high-risk cases
        cases = []
        alerts = []
        risk_scores = []
        
        if isinstance(shap_data, dict) and "high_risk_accounts" in shap_data:
            for account in shap_data.get("high_risk_accounts", []):
                # Create case entry
                cases.append({
                    "case_id": account.get("account_id", ""),
                    "risk_score": account.get("risk_score", 0),
                    "risk_level": account.get("risk_level", ""),
                    "account_id": account.get("account_id", ""),
                    "top_factors": account.get("top_risk_factors", [])[:3]
                })
                
                # Create alert entry
                alerts.append({
                    "alert_id": f"ALT_{account.get('account_id', '')}",
                    "type": account.get("risk_level", "MEDIUM"),
                    "severity": "high" if account.get("risk_score", 0) > 0.7 else "medium",
                    "account_id": account.get("account_id", ""),
                    "message": f"High-risk account detected: {account.get('risk_summary', '')}"
                })
                
                # Create risk score entry
                risk_scores.append({
                    "account_id": account.get("account_id", ""),
                    "score": account.get("risk_score", 0),
                    "level": account.get("risk_level", ""),
                    "timestamp": shap_data.get("generated_at", "")
                })
        
        return {
            "status": "success",
            "cases": cases,
            "alerts": alerts,
            "risk_scores": risk_scores,
            "total_cases": len(cases),
            "generated_at": shap_data.get("generated_at", "")
        }
    
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "cases": [],
            "alerts": [],
            "risk_scores": []
        }

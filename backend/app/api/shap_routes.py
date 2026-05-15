"""SHAP Model Report endpoints - Display suspicious accounts with feature explanations"""
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional

from ..services.shap_report_service import shap_report_service

router = APIRouter(prefix="/api/shap", tags=["SHAP Model Reports"])


@router.get("/model-reports")
async def get_model_reports(
    limit: int = Query(50, ge=1, le=100, description="Number of reports to return")
) -> Dict[str, Any]:
    """
    Get SHAP model reports for suspicious accounts.
    Shows which accounts are suspicious and why (feature explanations).
    
    Args:
        limit: Maximum number of reports to return
        
    Returns:
        JSON response with suspicious accounts and their feature explanations
    """
    try:
        result = await shap_report_service.get_model_reports(limit=limit)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving model reports: {str(e)}"
        )


@router.get("/model-reports/{account_id}")
async def get_account_explanation(account_id: str) -> Dict[str, Any]:
    """
    Get detailed SHAP explanation for a specific account.
    Shows all feature contributions and why the account is suspicious.
    
    Args:
        account_id: Account ID to analyze
        
    Returns:
        JSON response with detailed SHAP explanation and feature breakdown
    """
    try:
        result = await shap_report_service.get_account_explanation(account_id)
        return result
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Reports not available: {str(e)}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Account not found: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving explanation: {str(e)}"
        )


@router.get("/debug/shap-data")
async def debug_shap_data() -> Dict[str, Any]:
    """
    DEBUG endpoint to check if SHAP data is being loaded correctly.
    Returns raw SHAP reports data for troubleshooting.
    """
    try:
        result = await shap_report_service.get_model_reports(limit=5)
        return {
            "status": "success",
            "raw_reports": result,
            "message": "Raw SHAP data retrieved for debugging"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "message": "Failed to retrieve raw SHAP data"
        }


@router.get("/high-risk-accounts")
async def get_high_risk_accounts_for_sar(
    limit: int = Query(10, ge=1, le=50, description="Number of high-risk accounts to return")
) -> Dict[str, Any]:
    """
    Get high-risk accounts with SHAP explanations for SAR reports.
    Returns accounts with high risk scores and their feature contributions explaining why.
    
    Args:
        limit: Maximum number of high-risk accounts to return
        
    Returns:
        JSON response with high-risk accounts and detailed SHAP explanations
    """
    try:
        result = await shap_report_service.get_high_risk_accounts_for_sar(limit=limit)
        return result
    except FileNotFoundError as e:
        return {
            "status": "error",
            "high_risk_accounts": [],
            "total_high_risk": 0,
            "error": str(e),
            "message": f"Risk assessment data not found: {str(e)}"
        }
    except Exception as e:
        return {
            "status": "error",
            "high_risk_accounts": [],
            "total_high_risk": 0,
            "error": str(e),
            "message": f"Error retrieving high-risk accounts: {str(e)}"
        }


@router.post("/generate-reports")
async def generate_model_reports() -> Dict[str, Any]:
    """
    Generate SHAP model reports for all suspicious accounts.
    Called after feature extraction and prediction pipeline completion.
    
    Returns:
        JSON response with report generation status and count
    """
    try:
        result = await shap_report_service.generate_model_reports_for_suspicious_accounts()
        return result
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Required data not found: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating reports: {str(e)}"
        )

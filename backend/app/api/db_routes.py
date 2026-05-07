"""Database synchronization API endpoints"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.schemas import (
    AccountResponse, AccountFeaturesBase, 
    AlertResponse, SARReportResponse
)
from app.database import get_db_service

router = APIRouter(prefix="/api/v1/db", tags=["Database"])

db_service = get_db_service()


@router.get("/accounts", response_model=List[AccountResponse])
async def get_accounts(limit: int = Query(100, le=1000)):
    """Get all accounts from Supabase"""
    try:
        result = db_service.get_all('accounts', limit=limit)
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {str(e)}")


@router.get("/accounts/{account_id}", response_model=AccountResponse)
async def get_account(account_id: str):
    """Get a single account by ID"""
    try:
        result = db_service.get_by_id('accounts', 'account_id', account_id)
        if result.data:
            return result.data[0]
        raise HTTPException(status_code=404, detail="Account not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/accounts")
async def create_account(account: AccountResponse):
    """Create a new account"""
    try:
        account_dict = account.dict()
        result = db_service.insert('accounts', account_dict)
        return result.data[0] if result.data else account_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create account: {str(e)}")


@router.put("/accounts/{account_id}")
async def update_account(account_id: str, account: AccountResponse):
    """Update an existing account"""
    try:
        account_dict = account.dict()
        account_dict['account_id'] = account_id
        result = db_service.update(
            'accounts',
            account_dict,
            {'account_id': account_id}
        )
        return result.data[0] if result.data else account_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update account: {str(e)}")


@router.get("/account-features/{account_id}")
async def get_account_features(account_id: str):
    """Get features for an account"""
    try:
        result = db_service.get_by_id('account_features', 'account_id', account_id)
        if result.data:
            return result.data[0]
        raise HTTPException(status_code=404, detail="Features not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/account-features")
async def save_account_features(features: AccountFeaturesBase):
    """Save or update account features"""
    try:
        features_dict = features.dict()
        result = db_service.upsert('account_features', features_dict)
        return result.data[0] if result.data else features_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save features: {str(e)}")


@router.post("/account-features/batch")
async def batch_save_features(features_list: List[AccountFeaturesBase]):
    """Batch save account features"""
    try:
        features_dicts = [f.dict() for f in features_list]
        results = []
        for feature_dict in features_dicts:
            result = db_service.upsert('account_features', feature_dict)
            if result.data:
                results.append(result.data[0])
        
        return {
            "total": len(features_list),
            "saved": len(results),
            "data": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch save failed: {str(e)}")


@router.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(
    limit: int = Query(100, le=1000),
    account_id: Optional[str] = None,
    severity: Optional[str] = None
):
    """Get alerts, optionally filtered by account or severity"""
    try:
        query = db_service.client.table('alerts').select('*')
        
        if account_id:
            query = query.eq('account_id', account_id)
        if severity:
            query = query.eq('severity', severity)
        
        query = query.limit(limit)
        result = query.execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch alerts: {str(e)}")


@router.post("/alerts")
async def create_alert(alert: AlertResponse):
    """Create a new alert"""
    try:
        alert_dict = alert.dict(exclude={'id'})
        result = db_service.insert('alerts', alert_dict)
        return result.data[0] if result.data else alert_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert: {str(e)}")


@router.put("/alerts/{alert_id}")
async def update_alert(alert_id: str, alert: AlertResponse):
    """Update an alert"""
    try:
        alert_dict = alert.dict(exclude={'id'})
        result = db_service.update(
            'alerts',
            alert_dict,
            {'id': alert_id}
        )
        return result.data[0] if result.data else alert_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update alert: {str(e)}")


@router.get("/sar-reports", response_model=List[SARReportResponse])
async def get_sar_reports(
    limit: int = Query(100, le=1000),
    status: Optional[str] = None,
    account_id: Optional[str] = None
):
    """Get SAR reports, optionally filtered"""
    try:
        query = db_service.client.table('sar_reports').select('*')
        
        if status:
            query = query.eq('status', status)
        if account_id:
            query = query.eq('account_id', account_id)
        
        query = query.limit(limit)
        result = query.execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch SAR reports: {str(e)}")


@router.post("/sar-reports")
async def create_sar_report(report: SARReportResponse):
    """Create a new SAR report"""
    try:
        report_dict = report.dict(exclude={'id'})
        result = db_service.insert('sar_reports', report_dict)
        return result.data[0] if result.data else report_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create SAR report: {str(e)}")


@router.put("/sar-reports/{report_id}")
async def update_sar_report(report_id: str, report: SARReportResponse):
    """Update a SAR report"""
    try:
        report_dict = report.dict(exclude={'id'})
        result = db_service.update(
            'sar_reports',
            report_dict,
            {'id': report_id}
        )
        return result.data[0] if result.data else report_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update SAR report: {str(e)}")


@router.get("/sync-status")
async def get_sync_status():
    """Get database synchronization status"""
    try:
        accounts_count = db_service.client.table('accounts').select('account_id', count='exact').execute().count
        features_count = db_service.client.table('account_features').select('account_id', count='exact').execute().count
        alerts_count = db_service.client.table('alerts').select('id', count='exact').execute().count
        
        return {
            "status": "connected",
            "timestamp": datetime.now().isoformat(),
            "table_counts": {
                "accounts": accounts_count,
                "account_features": features_count,
                "alerts": alerts_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync status check failed: {str(e)}")

# SHAP Model Report - Quick Start Guide

## What You Just Implemented

After the ML pipeline completes, the system now automatically generates SHAP model reports showing:
- **Which accounts are suspicious** - Ranked by risk score
- **Why they're suspicious** - SHAP feature importance breakdown
- **How risky they are** - Ensemble + individual model scores

## Testing the Feature (5 Minutes)

### Step 1: Start Backend (Terminal 1)
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 2: Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v4.x.x  ready in xxx ms
Local:     http://localhost:5173/
```

### Step 3: Navigate to Chronos Page
- Open browser: http://localhost:5173
- Click "Chronos Timeline" in navigation
- Or go directly to: http://localhost:5173/chronos

### Step 4: Upload Data
1. Scroll to "🎯 Risk Scoring Pipeline" section
2. Click "📋 Master Data" box
3. Select `backend/Mule-data/master.csv`
4. Click "📊 Transactions" box  
5. Select `backend/Mule-data/transactions_full.csv`
6. **WAIT** for pipeline status updates:
   - "Uploading files..." → "Pipeline running..." → "Pipeline completed!"
   - Takes ~30-45 seconds

### Step 5: View SHAP Model Report
After pipeline completes, scroll down to see:

**"📊 SHAP Model Report"** section with:
- Left panel: List of suspicious accounts
- Right panel: Account details and feature analysis

### Step 6: Interact with Report
1. **Click an account** in the left list (e.g., first one)
2. See account details on right:
   - Ensemble Score (0-1)
   - Risk Level badge (CRITICAL/HIGH/MEDIUM/LOW)
   - LightGBM and GNN scores
3. See "🔍 Top Contributing Features":
   - Feature name
   - Contribution % (visual bar)
   - SHAP value
4. **Click a feature** to expand:
   - See feature name
   - SHAP value (impact)
   - Contribution percentage
   - Interpretation (increases/decreases risk)

## What the Numbers Mean

### Ensemble Score (0.0 - 1.0)
- **0.85 - 1.00**: CRITICAL (Red) - Very likely mule account
- **0.70 - 0.85**: HIGH (Orange) - Probably suspicious
- **0.45 - 0.70**: MEDIUM (Yellow) - Potentially risky
- **0.00 - 0.45**: LOW (Green) - Appears normal

### Feature Contribution %
- Shows how much each feature contributes to suspicion
- Example: If "pct_same_amt_consecutive" = 23.5%, that feature accounts for 23.5% of the suspicion score

### SHAP Value
- Positive: Increases the suspicion score
- Negative: Decreases the suspicion score
- Larger absolute value: More impact on the decision

## Example Interpretation

**Account: ACC001, Ensemble Score: 0.892 (CRITICAL)**

Top Contributing Features:
1. `pct_same_amt_consecutive` (23.5%) - Repeated same amounts in sequence
2. `amt_exact_50k_pct` (18.2%) - Lots of exact 50,000 transfers
3. `sender_concentration` (15.1%) - Most money from few senders

**Interpretation**: This account is flagged because it shows structuring patterns (exact amounts, repetition) and concentrated transfers - classic mule account behavior.

## API Endpoints (Direct Testing)

### Get All Suspicious Accounts
```bash
curl http://localhost:8000/api/shap/model-reports?limit=50
```

Response:
```json
{
    "status": "success",
    "total_suspicious": 42,
    "total_reports": 42,
    "showing": 50,
    "reports": [
        {
            "account_id": "ACC001",
            "ensemble_score": 0.892,
            "risk_level": "CRITICAL",
            "gnn_score": 0.85,
            "lightgbm_score": 0.91,
            "top_risk_features": [...]
        }
    ]
}
```

### Get Single Account Details
```bash
curl http://localhost:8000/api/shap/model-reports/ACC001
```

Response:
```json
{
    "status": "success",
    "report": {
        "account_id": "ACC001",
        "ensemble_score": 0.892,
        "shap_explanation": {
            "feature_contributions": [
                {
                    "feature_name": "pct_same_amt_consecutive",
                    "shap_value": 0.1234,
                    "contribution_percentage": 23.5
                },
                ...
            ]
        }
    }
}
```

## Workflow Summary

```
1. Upload CSV files
   ↓
2. Pipeline starts automatically
   - Feature extraction (10-15s)
   - ML prediction (5-10s)
   - SHAP report generation (5-8s) ← NEW!
   ↓
3. Frontend detects completion
   ↓
4. SHAPModelReportPanel loads and displays
   - Suspicious accounts list
   - Feature importance analysis
   ↓
5. User interacts:
   - Click account → see details
   - Click feature → see impact analysis
   ↓
6. Understand model reasoning
   - Why account flagged
   - Which features matter
   - How risky it really is
```

## Key Points

✅ **Automatic**: SHAP reports generate without manual action
✅ **Fast**: Full pipeline takes ~45 seconds
✅ **Explainable**: See exactly why accounts are flagged
✅ **Interactive**: Click to drill into details
✅ **Compliant**: Full audit trail for investigations

## Troubleshooting

### SHAP Panel Not Showing
1. Check backend started on port 8000
2. Check pipeline completed: Look for "Pipeline completed!" message
3. Open browser console (F12) for error messages

### No Suspicious Accounts Found
1. Your sample data might not have suspicious accounts
2. Try the full `transactions_full.csv` dataset
3. Check predictions were generated: `backend/logs/` directory

### Feature Names Look Strange
1. These are engineered feature names from the feature extraction
2. See `backend/IMPLEMENTATION_SUMMARY.md` for feature definitions
3. Named to be descriptive of AML patterns (e.g., "pct_same_amt_consecutive")

### Backend Connection Error
```bash
# Make sure backend is running
cd backend
uvicorn app.main:app --reload --port 8000
```

## Next Testing Steps

1. **Try different CSV files**: Upload different transaction datasets
2. **Export reports**: Check raw JSON response
3. **Inspect individual accounts**: Click each to verify explanations make sense
4. **Check logs**: `backend/logs/pipeline_*.log` for detailed execution

## Architecture Overview

```
User Interface (ChronosPage)
    ↓
RiskScoringPanel (Upload + Pipeline Orchestration)
    ↓
Backend Pipeline
    ├─ Feature Extraction
    ├─ ML Prediction
    └─ SHAP Report Generation ← NEW!
         ↓
         Saves to: shap_model_reports.json
         ↓
API: GET /api/shap/model-reports
    ↓
SHAPModelReportPanel (Display + Interaction)
    ↓
User sees: Suspicious accounts + Why they're suspicious
```

## Feature Importance Explained

The top risk features are weighted by AML domain knowledge:

- **structuring_40k_50k_pct** (15%): Structuring pattern indicator
- **amt_exact_50k_pct** (12%): Round amount transfers (mule red flag)
- **sender_concentration** (12%): Money from few sources (concentration risk)
- **pct_within_6h** (10%): Rapid transaction velocity
- **pct_same_amt_consecutive** (8%): Repeated exact amounts (structuring)

These weights ensure the model prioritizes actual AML risk factors over noise.

## Compliance & Reporting

This SHAP integration supports compliance by providing:
- ✅ Explainable flagging decisions
- ✅ Feature importance breakdown
- ✅ Full audit trail per account
- ✅ Risk scoring transparency
- ✅ Investigation support documentation

Use this to answer: "Why was this account flagged?" → SHAP feature breakdown shows exactly why.

---

**Ready to test?** Start with Step 1 above! Should take <5 minutes to see the complete flow.

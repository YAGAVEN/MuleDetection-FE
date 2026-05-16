# Chronos Risk Scoring Integration Guide

## 🎯 Overview
Chronos now supports **GNN-powered risk scoring** with real-time account highlighting. Users can upload data → trigger ML pipeline → visualize risk-highlighted accounts.

---

## 📊 Data Flow

```
User Upload (master.csv + transactions.csv)
    ↓
[POST /api/ingestion/upload]
    ↓
Feature Extraction (feature_extraction_pipeline.py)
    ├─ Build 40+ engineered features
    ├─ Output: engineered_features.csv
    └─ Duration: ~10-30 seconds
    ↓
GNN Prediction (prediction_pipeline_service.py)
    ├─ LightGBM model scoring
    ├─ GNN model scoring
    ├─ Ensemble blending (60% LightGBM + 40% GNN)
    ├─ Output: predictions.csv + risk_scores.json
    └─ Duration: ~5-10 seconds
    ↓
Risk Score Available
    ├─ Account ID → Risk Level (LOW/MEDIUM/HIGH/CRITICAL)
    ├─ Ensemble Score (0.0-1.0)
    └─ Individual model scores
    ↓
Frontend Load Scores
    ├─ GET /api/chronos/accounts-with-risk-scores
    ├─ Enrich with transaction metrics
    └─ Display in Chronos UI
```

---

## 🔄 Frontend Components Added

### 1. **RiskScoringPanel.jsx** (NEW)
Located: `frontend/src/components/Chronos/RiskScoringPanel.jsx`

**Features:**
- Dual file upload (master.csv + transactions.csv)
- Pipeline status polling
- Error handling with notifications
- Progress indicators

**Usage:**
```jsx
<RiskScoringPanel 
  onRiskScoresLoaded={handleRiskScoresLoaded}
  loading={uploading}
  pipelineStatus={pipelineStatus}
/>
```

### 2. **ChronosPage.jsx** (CREATED)
Located: `frontend/src/pages/ChronosPage.jsx`

**State Management:**
- `riskScores` - Array of risk-scored accounts
- `pipelineStatus` - Current pipeline state
- `importing` - Upload progress flag

**Key Methods:**
- `handleRiskScoresLoaded()` - Processes risk scores, updates visualization
- `handleGenerateInsights()` - Enhanced with risk score stats
- View mode switching (Timeline/Network)

### 3. **TimelineView.jsx** (UPDATED)
**New Props:**
- `riskScores` - Risk score data array

**New Methods Exposed:**
- `updateRiskScores(scores)` - Pass risk data to D3 service
- `refresh()` - Re-render with risk highlighting

---

## 🎨 Backend Endpoints Added/Updated

### 1. **POST /api/pipeline/start** (NEW)
**Purpose:** Trigger the entire ML pipeline

**Request:**
```bash
POST http://localhost:8000/api/pipeline/start
```

**Response:**
```json
{
  "status": "started",
  "message": "Pipeline started...",
  "pipeline_status": { ... }
}
```

### 2. **GET /api/chronos/accounts-with-risk-scores** (NEW)
**Purpose:** Fetch risk-scored accounts with transaction metrics

**Query Parameters:**
- `limit` (default: 100) - Number of accounts to return

**Response:**
```json
{
  "status": "success",
  "accounts": [
    {
      "account_id": "ACC123",
      "ensemble_score": 0.87,
      "risk_level": "CRITICAL",
      "gnn_score": 0.85,
      "lightgbm_score": 0.89,
      "is_suspicious": 1,
      "transaction_count": 156,
      "total_amount": 2500000,
      "unique_counterparties": 23
    },
    ...
  ],
  "total_accounts": 100,
  "risk_distribution": {
    "critical": 5,
    "high": 12,
    "medium": 28,
    "low": 55
  },
  "pipeline_status": "completed"
}
```

---

## 🎨 D3 Visualization Enhancements

### Risk Highlighting in chronos.js

**New Methods in ChronosTimeline Class:**

#### `setRiskScores(scores)`
Loads GNN risk scores into visualization
```javascript
instance.setRiskScores([
  { account_id: "A1", ensemble_score: 0.92, risk_level: "CRITICAL" },
  { account_id: "A2", ensemble_score: 0.55, risk_level: "MEDIUM" }
])
```

#### `getRiskColor(riskLevel)`
Maps risk levels to colors:
```
LOW      → #4ade80  (Green)
MEDIUM   → #fbbf24  (Amber)
HIGH     → #f87171  (Red)
CRITICAL → #dc2626  (Dark Red)
```

#### `updateVisualization()`
Re-renders timeline/network with risk colors applied

#### `updateTimelineWithRiskHighlighting()`
- Highlights transactions from high-risk accounts
- Adds glow effects (3px red stroke)
- Increases point radius to 6px

#### `updateNetworkWithRiskHighlighting()`
- Colors network nodes by risk level
- Updates node metadata with risk data
- Re-renders force-directed graph

### Status Bar Enhancement
When risk scores are available, status bar expands to 4 columns:
```
Total Transactions | Suspicious Patterns | Risk Assessment | High-Risk (GNN)
```

---

## 🚀 Usage Workflow

### Step 1: Navigate to Chronos
User opens `/chronos` page

### Step 2: Upload Files
1. Click "Master Data" upload → select `master.csv`
2. Click "Transactions" upload → select `transactions_full.csv`
3. System automatically triggers pipeline

### Step 3: Pipeline Runs
**Status Updates:**
- "Uploading files..." (1-2 sec)
- "Starting pipeline..." (1 sec)
- "Pipeline running..." (15-45 sec polling)
- "Pipeline completed!" 

### Step 4: Risk Scores Displayed
- Risk scores loaded from backend
- Accounts sorted by risk (high to low)
- Timeline visualization updates with highlighting
- Status bar shows count of high-risk accounts

### Step 5: Explore Visualization
- **Timeline View** - Transactions color-coded by account risk
- **Network View** - Nodes colored by risk level
- **Risk Filter** - Show all/low-risk/high-risk accounts
- **AI Insights** - Now includes GNN risk statistics

---

## 🔧 Configuration

### Backend Config (chronos_routes.py)
```python
# Loads risk scores from:
storage_service.temp_data_dir / "risk_scores.json"

# Returns top N accounts (default 100)
```

### Frontend Polling (RiskScoringPanel.jsx)
```javascript
// Polls pipeline status every 5 seconds
// Timeout: 60 attempts (5 minutes max)
// Completes when: prediction_engine.status === "completed"
```

---

## 📈 Risk Score Explanation

### Ensemble Model (60/40 Blend)
```
Ensemble Score = (0.6 × LightGBM) + (0.4 × GNN)
```

### Risk Level Classification
```
0.00-0.45  → LOW
0.45-0.70  → MEDIUM
0.70-0.85  → HIGH
0.85-1.00  → CRITICAL
```

### Features Used
- Account balance patterns
- Transaction velocity
- Structuring indicators
- Digital footprint score
- KYC compliance
- Network connectivity
- Historical freezes

---

## ⚠️ Error Handling

### Backend Connection Failed
```
Display: "Backend Unavailable"
Action: Show restart instructions
```

### Pipeline Timeout
```
Condition: Polling exceeds 60 attempts
Message: "Pipeline took too long to complete"
```

### No Risk Scores Available
```
Status: "pipeline_status": "not_run"
Message: "Run the prediction pipeline first"
```

---

## 📁 Files Modified/Created

### Created:
1. `frontend/src/components/Chronos/RiskScoringPanel.jsx` ✅
2. `frontend/src/pages/ChronosPage.jsx` ✅

### Modified:
1. `backend/app/api/chronos_routes.py` ✅
   - Added imports (json, Path, storage_service)
   - Added `load_risk_scores()` function
   - Added `GET /accounts-with-risk-scores` endpoint

2. `backend/app/api/pipeline_routes.py` ✅
   - Added `POST /start` endpoint to trigger pipeline

3. `frontend/src/components/Chronos/TimelineView.jsx` ✅
   - Added `riskScores` prop
   - Added effect to update scores when they change
   - Added `updateRiskScores` method to ref interface

4. `frontend/src/services/chronos.js` ✅
   - Added `riskScores` property to class
   - Added `setRiskScores()` method
   - Added `getRiskColor()` method
   - Added `getAccountRiskData()` method
   - Added `updateVisualization()` method
   - Added `updateTimelineWithRiskHighlighting()` method
   - Added `updateNetworkWithRiskHighlighting()` method
   - Enhanced `setupTimeline()` status bar with GNN risk count

---

## 🧪 Testing Checklist

- [ ] Upload master.csv + transactions.csv
- [ ] Verify pipeline starts automatically
- [ ] Check status polling updates correctly
- [ ] Confirm risk scores load after pipeline completes
- [ ] Verify high-risk accounts highlighted in timeline
- [ ] Test network view with risk coloring
- [ ] Test risk filter (all/low/high)
- [ ] Check AI insights include risk score statistics
- [ ] Test error handling (missing files, backend down)
- [ ] Verify timeout handling (pipeline takes too long)

---

## 📝 API Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ingestion/upload` | POST | Upload CSV files |
| `/api/pipeline/start` | POST | Trigger ML pipeline |
| `/api/pipeline/status` | GET | Check pipeline progress |
| `/api/chronos/accounts-with-risk-scores` | GET | Fetch risk scores |
| `/api/chronos/timeline` | GET | Transaction timeline |
| `/api/chronos/mule-accounts` | GET | Mule-flagged accounts |

---

## 🎯 Next Steps (Optional)

1. **Batch Prediction** - Support file upload without full pipeline re-run
2. **Risk Threshold Settings** - User-configurable risk levels
3. **Export with Scores** - Include risk scores in PDF/CSV exports
4. **Historical Tracking** - Store risk score evolution over time
5. **Anomaly Alerts** - Real-time notifications for new high-risk accounts
6. **Custom Risk Weights** - Allow users to adjust model blend ratios

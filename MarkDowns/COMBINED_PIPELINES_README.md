# Mule Detection - Combined Production Pipelines

**Date Created:** 2025-05-05  
**Purpose:** Extract all prompts from STEP2-STEP6 and combine into organized production scripts

---

## 📋 Overview

All code from the hackathon prompts has been extracted and combined into **4 production-ready Python scripts**:

| Pipeline | File | Lines | Purpose |
|----------|------|-------|---------|
| **EDA** | `Mule-data/eda_pipeline.py` | 386 | Exploratory Data Analysis & Data Quality Checks |
| **Feature Extraction** | `Mule-data/feature_extraction_pipeline.py` | 485 | Build 40+ engineered features |
| **LightGBM** | `Mule-data/lightgbm_pipeline.py` | 470 | Train baseline & tuned models with CV |
| **GNN Ensemble** | `Mule-data/gnn/mule_gnn_pipeline.py` | 474 | Graph Neural Network + Ensemble predictions |

**Total Lines of Code:** 1,815 lines

---

## 🏃 Execution Order

Run the pipelines sequentially:

```bash
# Step 1: EDA & Data Quality
python Mule-data/eda_pipeline.py

# Step 2: Feature Engineering
python Mule-data/feature_extraction_pipeline.py

# Step 3: LightGBM Model Training
python Mule-data/lightgbm_pipeline.py

# Step 4: GNN + Ensemble (requires Steps 1-3)
python Mule-data/gnn/mule_gnn_pipeline.py
```

---

## 📊 Pipeline Details

### 1. EDA Pipeline (`eda_pipeline.py`)

**Sections:**
- SECTION 1: Config & Setup
- SECTION 2: Load Data
- SECTION 3: Null/Missing Value Analysis
- SECTION 4: Date Column Validation
- SECTION 5: Categorical Column Validation
- SECTION 6: Numeric Column Validation
- SECTION 7: Visualizations
- SECTION 8: Summary Report

**Input:**
- `Mule-data/master.csv`
- `Mule-data/transactions_full.csv`

**Output:**
- Console prints with data quality findings
- `reports/eda_plots/01_eda_summary.png`

**Key Features:**
- ✓ Comprehensive null analysis with mule vs legit breakdown
- ✓ Date validation across 8 date columns
- ✓ Cross-column integrity checks (e.g., opening_date before relationship_start_date)
- ✓ Y/N flag signal detection (>10% difference = strong signal)
- ✓ Amount band analysis (₹1K, ₹10K, ₹50K, ₹1L, ₹5L+)
- ✓ Automatic flagging of anomalies

---

### 2. Feature Extraction Pipeline (`feature_extraction_pipeline.py`)

**Sections:**
- SECTION 1: Config & Setup
- SECTION 2: Load Data
- SECTION 3: Account & Balance Features (Task 4A)
- SECTION 4: Transaction Volume Features (Task 4B)
- SECTION 5: Structuring & Round Amount Features (Task 4C)
- SECTION 6: Channel & Time-Based Features (Task 4D-E)
- SECTION 7: Advanced Features (Task 4F-G)
- SECTION 8: Finalize & Validate
- SECTION 9: Save Results

**Input:**
- `Mule-data/master.csv`
- `Mule-data/transactions_full.csv`

**Output:**
- `Mule-data/features/features_combined.csv` (40+ engineered features)
- `Mule-data/features/features_summary.txt`

**Key Features Built:**
- Account & balance features (24 features)
  - is_frozen, avg_balance, balance_volatility, etc.
- Transaction volume (10 features)
  - txn_count, total_credit, fan_in_ratio, sender_concentration, etc.
- Structuring patterns (8 features)
  - structuring_40k_50k_pct, amt_exact_50k_pct, round_1k_pct, etc.
- Channel & time features (6 features)
  - ch_ntd_pct, pct_within_6h, monthly_cv, etc.
- Advanced features (4 features)
  - passthrough_count, mobile_spike_ratio, channel_entropy

**Total Features:** 40+

---

### 3. LightGBM Pipeline (`lightgbm_pipeline.py`)

**Sections:**
- SECTION 1: Config & Setup
- SECTION 2: Load & Prepare Data
- SECTION 3: Feature Selection & Preparation
- SECTION 4: Baseline LightGBM Training
- SECTION 5: Tuned LightGBM Training
- SECTION 6: Visualizations
- SECTION 7: Save Results
- SECTION 8: Final Summary

**Input:**
- `Mule-data/features_combined.csv`

**Output:**
- `Mule-data/models/prep_data.pkl` (prepared data & feature cols)
- `Mule-data/models/baseline_results.pkl`
- `Mule-data/models/tuned_results.pkl`
- `Mule-data/models/final_results.pkl` (uses tuned model)
- `reports/lightgbm_plots/01_roc_curves.png`
- `reports/lightgbm_plots/02_pr_curves.png`
- `reports/lightgbm_plots/03_score_distributions.png`

**Model Details:**
- **Baseline:** 31 leaves, learning_rate=0.05, 1000 rounds
- **Tuned:** 63 leaves, learning_rate=0.02, 1500 rounds, L1/L2 regularization
- **CV:** 5-fold stratified with early stopping (50 rounds)
- **Metric:** AUC with class weight for 1.09% mule rate

**Output Metrics:**
- OOF AUC, AP
- Per-fold scores
- Threshold analysis (precision, recall, F1)
- Performance curves (ROC, PR)

---

### 4. GNN Pipeline (`mule_gnn_pipeline.py`)

**Sections:**
- SECTION 1: Config & Setup
- SECTION 2: Load Data (GNN-2 Part 1)
- SECTION 3: Build Graph (GNN-2 Part 2)
- SECTION 4: Model Definition (GNN-3)
- SECTION 5: Training (GNN-3)
- SECTION 6: Prediction & Ensemble (GNN-4)
- SECTION 7: Save Results
- SECTION 8: Final Summary

**Input:**
- `Mule-data/features_combined.csv`
- `Mule-data/transactions_full.csv`
- `Mule-data/models/final_results.pkl` (LightGBM scores)
- `Mule-data/models/prep_data.pkl`

**Output:**
- `Mule-data/gnn/graph.pt` (PyTorch geometric graph)
- `Mule-data/gnn/best_model.pt` (best GNN weights)
- `Mule-data/gnn/training_history.pkl`
- `Mule-data/gnn/ensemble_predictions.csv` (final ensemble scores)
- `Mule-data/gnn/ensemble_results.pkl`

**Model Architecture:**
- 3-layer GraphSAGE with SAGEConv layers
- Hidden channels: 128
- Output channels: 64
- Dropout: 0.3
- Classifier: Linear(64 → 1) with sigmoid

**Graph Details:**
- Account nodes: 40,038
- Counterparty nodes: Variable (from unique counterparties)
- Edges: Built from transactions since 2023-07-01
- Edge attributes: Transaction amounts
- Node features: 24 standardized features (account + aggregated counterparty)

**Training Details:**
- Optimizer: Adam (lr=0.001, weight_decay=1e-4)
- Scheduler: ReduceLROnPlateau (patience=10, factor=0.5)
- Loss: BCEWithLogitsLoss with pos_weight for class imbalance
- Epochs: 200 with early stopping
- Train/val split: 80/20 from labeled training nodes

**Ensemble:**
- Weighted average of LightGBM + GNN by their AUC scores
- Final output: ensemble_score for all accounts

---

## 🔧 Configuration

Each pipeline has a CONFIG dictionary at the top:

### EDA Config
```python
CONFIG = {
    'data_path': 'Mule-data/',
    'output_path': 'reports/eda_plots/',
    'reference_date': pd.Timestamp('2025-06-30'),
    'txn_cutoff_date': pd.Timestamp('2023-07-01'),
    'random_seed': 42,
}
```

### Feature Extraction Config
```python
CONFIG = {
    'data_path': 'Mule-data/',
    'output_path': 'Mule-data/features/',
    'reference_date': pd.Timestamp('2025-06-30'),
    'random_seed': 42,
}
```

### LightGBM Config
```python
CONFIG = {
    'baseline_params': {...},  # 31 leaves, lr=0.05
    'tuned_params': {...},      # 63 leaves, lr=0.02
    'cv_folds': 5,
    ...
}
```

### GNN Config
```python
CONFIG = {
    'hidden_channels': 128,
    'out_channels': 64,
    'dropout': 0.3,
    'learning_rate': 0.001,
    'epochs': 200,
    'node_features': [...],  # 24 features
    ...
}
```

---

## 📦 Dependencies

**EDA & Feature Extraction:**
```
pandas, numpy, matplotlib, seaborn, scikit-learn
```

**LightGBM:**
```
pandas, numpy, lightgbm, scikit-learn, matplotlib
```

**GNN:**
```
pandas, numpy, torch, torch-geometric, scikit-learn, pickle
```

Install with:
```bash
pip install pandas numpy matplotlib seaborn scikit-learn lightgbm torch torch-geometric
```

---

## ✅ Output Summary

After running all 4 pipelines, you'll have:

**Features:**
- ✓ 40+ engineered features

**Models:**
- ✓ Baseline LightGBM (5-fold CV)
- ✓ Tuned LightGBM (5-fold CV, improved hyperparameters)
- ✓ GraphSAGE GNN (3-layer, 40K+ nodes)

**Predictions:**
- ✓ LightGBM OOF predictions (all training accounts)
- ✓ LightGBM test predictions (all test accounts)
- ✓ GNN predictions (all account nodes)
- ✓ Ensemble predictions (weighted LightGBM + GNN)

**Visualizations:**
- ✓ EDA plots (null analysis, distributions, flagging activity)
- ✓ ROC curves (baseline vs tuned)
- ✓ Precision-Recall curves
- ✓ Score distributions

---

## 🎯 Key Metrics to Track

After running all pipelines, check:

1. **EDA Phase:**
   - Mule rate: 1.09%
   - Strong signals (>10% difference): is_frozen, balance features, structuring patterns
   - Any date anomalies or invalid channels

2. **Feature Engineering:**
   - Feature count: 40+
   - All features filled with valid values (no nulls)
   - Mule vs legit mean differences for key features

3. **LightGBM:**
   - Baseline OOF AUC
   - Tuned OOF AUC (should be higher)
   - Improvement percentage
   - Optimal threshold (balance precision/recall)

4. **GNN + Ensemble:**
   - GNN AUC on training set
   - Ensemble AUC (weighted average)
   - Ensemble improvement over individual models
   - Prediction file row count (should match number of accounts)

---

## 📝 Notes

- All pipelines print progress at every major step with ✓ checkmarks
- Output paths are configurable via CONFIG dicts
- Cross-validation uses StratifiedKFold to preserve mule rate
- Class imbalance handled via scale_pos_weight in LightGBM and pos_weight in GNN
- Graph edges filtered to last 2 years to limit memory usage
- Ensemble uses AUC-weighted average for combining predictions

---

**Status:** ✅ All pipelines extracted and combined successfully

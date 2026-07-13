# Mule Detection - Combined Production Scripts

**Status:** ✅ Complete - All prompts extracted and combined into production pipelines

---

## 📁 Quick Navigation

| Pipeline | File | Size | Lines | Purpose |
|----------|------|------|-------|---------|
| **EDA** | `Mule-data/eda_pipeline.py` | 15 KB | 386 | Data quality & exploratory analysis |
| **Features** | `Mule-data/feature_extraction_pipeline.py` | 18 KB | 485 | Build 40+ engineered features |
| **LightGBM** | `Mule-data/lightgbm_pipeline.py` | 16 KB | 470 | Train baseline & tuned models |
| **GNN** | `Mule-data/gnn/mule_gnn_pipeline.py` | 15 KB | 474 | Graph NN + ensemble predictions |

---

## 🚀 Execution

```bash
# Step 1: Exploratory Data Analysis
python Mule-data/eda_pipeline.py

# Step 2: Feature Engineering  
python Mule-data/feature_extraction_pipeline.py

# Step 3: Model Training (LightGBM)
python Mule-data/lightgbm_pipeline.py

# Step 4: GNN + Ensemble
python Mule-data/gnn/mule_gnn_pipeline.py
```

---

## 📊 Extraction Source

| Stage | Scripts | Inputs | Output |
|-------|---------|--------|--------|
| **STEP2-3: EDA** | 2A-2F, 3A-3F | master.csv, txns.csv | eda_plots/ |
| **STEP4: Features** | 4A-4G | master.csv, txns.csv | features_combined.csv |
| **STEP5: LightGBM** | 5A-5G | features.csv | models/ |
| **STEP6: GNN** | GNN1-GNN5 | features.csv + models/ | ensemble_predictions.csv |

---

## 📚 Documentation

- **COMBINED_PIPELINES_README.md** — Comprehensive guide (all details)
- **EXECUTION_SUMMARY.txt** — Quick reference (overview)
- **INDEX_COMBINED_SCRIPTS.md** — This file (navigation)

---

## 💾 Outputs

```
Mule-data/
├── features/features_combined.csv        (40+ features)
├── models/
│   ├── prep_data.pkl
│   ├── baseline_results.pkl
│   ├── tuned_results.pkl
│   └── final_results.pkl
└── gnn/
    ├── graph.pt
    ├── best_model.pt
    ├── ensemble_predictions.csv          ← FINAL OUTPUT
    └── ensemble_results.pkl

reports/
├── eda_plots/01_eda_summary.png
└── lightgbm_plots/
    ├── 01_roc_curves.png
    ├── 02_pr_curves.png
    └── 03_score_distributions.png
```

---

**Total Code Generated:** 1,815 lines | **Size:** 79.4 KB | **Files:** 6

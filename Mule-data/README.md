# Mule-Data - ML Training & Feature Engineering Workspace

## Overview
Data processing and machine learning training workspace for the Trinetra fraud detection system. Contains raw datasets, feature engineering pipelines, and model training scripts.

## Directory Structure

```
Mule-data/
├── data/                  # Raw and processed datasets
│   ├── accounts.csv                    # Account information
│   ├── customers.csv                   # Customer details
│   ├── customer_account_linkage.csv    # Customer-account mappings
│   ├── product_details.csv             # Product reference data
│   ├── transactions_*.csv              # Transaction datasets (split files)
│   ├── transactions_full.csv           # Combined transaction data
│   ├── train_labels.csv                # Training labels
│   ├── test_accounts.csv               # Test account data
│   └── master.csv                      # Master dataset
├── models/                # ML pipelines and trained models
│   ├── eda_pipeline.py                 # Exploratory Data Analysis pipeline
│   ├── feature_extraction_pipeline.py  # Feature engineering pipeline
│   ├── lightgbm_pipeline.py            # LightGBM training pipeline
│   ├── mule_gnn_pipeline.py            # GNN training pipeline
│   ├── gnn_integration.py              # GNN integration utilities
│   ├── adversarial_framework.py       # Adversarial training framework
│   ├── online_learning.py              # Online learning components
│   ├── train_adversarial_pipeline.py   # Adversarial training pipeline
│   └── lgbm_fold1.txt                  # Trained LightGBM model
├── docs/                  # Documentation and guides
│   ├── README.md                       # Main documentation
│   ├── EDA_GUIDE.md                    # EDA procedures guide
│   ├── SUBMISSION_GUIDELINES.md        # Submission format guidelines
│   ├── IMPLEMENTATION_SUMMARY.md       # Implementation details
│   ├── INDEX.md                        # Documentation index
│   ├── QUICK_REFERENCE.md              # Quick reference guide
│   └── USAGE_GUIDE.md                  # Usage instructions
├── archive/              # Archived features and submissions
│   ├── features/                      # Old feature sets
│   │   ├── feat_4A.csv
│   │   ├── feat_4B.csv
│   │   ├── feat_4C.csv
│   │   ├── feat_4D.csv
│   │   ├── feat_4E.csv
│   │   └── feat_4F.csv
│   └── submission/                    # Old submission files
│       └── submission.csv
└── logs/                  # Training and processing logs
```

## Key Components

### Data Files (`data/`)
- **Transaction Data**: Large dataset split into manageable parts
- **Account Data**: Customer and account information
- **Training Data**: Labels and test datasets
- **Reference Data**: Product and linkage information

### ML Pipelines (`models/`)
- **Feature Engineering**: Automatic feature extraction from raw transactions
- **LightGBM Training**: Gradient boosting model training
- **GNN Training**: Graph neural network pipeline
- **Adversarial Training**: GAN-based adversarial framework
- **Online Learning**: Incremental model updates

### Documentation (`docs/`)
- Comprehensive guides for data processing and model training
- EDA procedures and feature engineering guidelines
- Submission format and competition guidelines

## Data Processing Workflow

### 1. Data Loading & Validation
```bash
# Start with data validation
cd models
python feature_extraction_pipeline.py
```

### 2. Feature Engineering
```bash
# Extract features from raw transactions
python feature_extraction_pipeline.py --input ../data/transactions_full.csv
```

### 3. Model Training
```bash
# Train LightGBM model
python lightgbm_pipeline.py --features ../data/features.csv --labels ../data/train_labels.csv

# Train GNN model
python mule_gnn_pipeline.py --transactions ../data/transactions_full.csv
```

### 4. Adversarial Training
```bash
# Train with adversarial framework
python train_adversarial_pipeline.py --generator --discriminator
```

## Data Schema

### Transaction Data
- Account identifiers
- Transaction amounts and timestamps
- Counterparty information
- Channel and location data
- Product references

### Account Data
- Customer demographics
- Account opening dates
- KYC information
- Risk labels

### Feature Set
The system extracts 22+ features including:
- Transaction patterns (structuring, timing)
- Network features (fan-in, concentration)
- Channel diversity
- Account age and history

## Model Artifacts

### Trained Models
- **lgbm_fold1.txt**: Production LightGBM model (155KB)
- Deployed to: `backend/app/models/lgbm_fold1.txt`

### Feature Sets
- **Features**: Engineering outputs stored in archive for reference
- **Submission Files**: Historical submissions for comparison

## Processing Pipelines

### Feature Extraction Pipeline
```bash
cd models
python feature_extraction_pipeline.py \
    --input ../data/transactions_full.csv \
    --output ../data/features.csv \
    --accounts ../data/accounts.csv
```

### EDA Pipeline
```bash
python eda_pipeline.py \
    --data ../data/master.csv \
    --output ../logs/eda_results.txt
```

### LightGBM Training
```bash
python lightgbm_pipeline.py \
    --train-data ../data/features.csv \
    --train-labels ../data/train_labels.csv \
    --model-output lgbm_fold1.txt
```

## Data Quality

### Validation Steps
1. **Schema Validation**: Column types and constraints
2. **Data Integrity**: Reference data consistency
3. **Business Rules**: Transaction validity checks
4. **Feature Quality**: Missing value handling

### Known Issues
- Large transaction files split into parts for memory management
- Some accounts may have incomplete histories
- Feature extraction requires valid account references

## Archive Structure

### Archived Features (`archive/features/`)
- Historical feature sets (feat_4A through feat_4F)
- Preserved for reproducibility and comparison
- Not used in current production pipeline

### Archived Submissions (`archive/submission/`)
- Previous competition submissions
- Reference for format and scoring
- Historical performance baselines

## Documentation

### Main Guides
- **README.md**: Overall system documentation
- **EDA_GUIDE.md**: Exploratory data analysis procedures
- **SUBMISSION_GUIDELINES.md**: Competition format requirements

### Technical References
- **IMPLEMENTATION_SUMMARY.md**: Technical implementation details
- **QUICK_REFERENCE.md**: Common commands and workflows
- **USAGE_GUIDE.md**: Detailed usage instructions

## Dependencies

Key Python packages:
- pandas, numpy (data processing)
- lightgbm (gradient boosting)
- networkx (graph processing)
- scikit-learn (ML utilities)
- torch/deep learning (GNN training)

## Integration with Backend

### Model Deployment
Trained models are copied to backend runtime:
```bash
cp models/lgbm_fold1.txt ../backend/app/models/
```

### Feature Pipeline
Backend uses similar feature extraction logic from `feature_extraction_pipeline.py`

### Data Access
Backend reads data files for batch processing and validation

## Performance Notes

### Processing Capacity
- Transaction data: ~450MB per part file
- Feature extraction: ~10-15 minutes per million transactions
- Model training: 5-10 minutes depending on data size

### Memory Requirements
- Feature extraction: 4GB+ RAM recommended
- GNN training: 8GB+ RAM for large networks
- LightGBM training: 2GB+ RAM sufficient

## Cleanup & Organization

### Archived Components
- Old feature sets moved to `archive/features/`
- Historical submissions to `archive/submission/`
- Training documentation to `docs/`

### Streamlined Structure
- Consolidated pipeline scripts in `models/`
- Organized data files in `data/`
- Centralized documentation in `docs/`

## Usage Examples

### Quick Feature Extraction
```bash
cd models
python feature_extraction_pipeline.py --quick
```

### Full Training Pipeline
```bash
python lightgbm_pipeline.py --full-training
python mnn_pipeline.py --full-training
```

### Model Evaluation
```bash
python mule_gnn_pipeline.py --evaluate --model ../backend/app/models/gnn_model.pkl
```
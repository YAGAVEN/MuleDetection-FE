# Adversarial Training - Usage Guide

Step-by-step guide to use the adversarial learning framework for fraud detection.

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Basic Training](#basic-training)
3. [Advanced Scenarios](#advanced-scenarios)
4. [Monitoring & Evaluation](#monitoring--evaluation)
5. [Production Deployment](#production-deployment)

---

## Installation & Setup

### Prerequisites

```bash
pip install torch torch-geometric lightgbm pandas numpy scikit-learn
```

### Verify Installation

```python
import sys
sys.path.insert(0, '/media/yagaven_25/coding/Projects/IOB-CyberNova/Mule-data/gan_training')

from adversarial_framework import AdversarialTrainer
from train_adversarial_pipeline import *
from online_learning import StreamingAdversarialLearner

print("✓ All modules imported successfully")
```

---

## Basic Training

### Scenario 1: Train Full Adversarial Pipeline

**Goal:** Generate synthetic data + train augmented models

```python
#!/usr/bin/env python3
import sys
sys.path.insert(0, '/media/yagaven_25/coding/Projects/IOB-CyberNova/Mule-data/gan_training')

import pandas as pd
import numpy as np
from train_adversarial_pipeline import *

# ============================================================
# STEP 1: Load Your Data
# ============================================================

# Load features CSV
features = pd.read_csv('Mule-data/features_combined.csv')

# Separate train and test
train_data = features[features['is_mule'].notna()].copy()
test_data = features[features['is_mule'].isna()].copy()

print(f"Train: {len(train_data)} | Test: {len(test_data)}")
print(f"Mule rate: {train_data['is_mule'].mean()*100:.2f}%")

# ============================================================
# STEP 2: Prepare Features
# ============================================================

# Select numeric features
feature_cols = [c for c in train_data.columns 
                if train_data[c].dtype in [np.float64, np.int64]
                and c not in ['account_id', 'is_mule', 'customer_id']]

X_train = train_data[feature_cols].copy()
y_train = train_data['is_mule'].astype(int).copy()

# Handle missing values
for col in X_train.columns:
    X_train[col] = X_train[col].fillna(X_train[col].median())

print(f"Features: {X_train.shape}")

# ============================================================
# STEP 3: Normalize and Train GAN
# ============================================================

from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_train_scaled = (X_train_scaled - X_train_scaled.min(axis=0)) / \
                 (X_train_scaled.max(axis=0) - X_train_scaled.min(axis=0) + 1e-6)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

gan = AdversarialTrainer(
    feature_dim=X_train_scaled.shape[1],
    latent_dim=100,
    device=device
)

gan.train_gan(
    real_data=X_train_scaled,
    epochs=100,
    batch_size=32,
    lambda_cycle=0.5,
    lambda_gp=10
)

# ============================================================
# STEP 4: Generate Synthetic Data
# ============================================================

num_synthetic = int(len(X_train_scaled) * 0.3)
X_synthetic_scaled = gan.generate_synthetic_data(num_synthetic)
X_synthetic = scaler.inverse_transform(X_synthetic_scaled)

print(f"✓ Generated {num_synthetic} synthetic samples")

# ============================================================
# STEP 5: Create Augmented Data
# ============================================================

from adversarial_framework import AdversarialAugmenter, evaluate_synthetic_quality

augmenter = AdversarialAugmenter(X_train, y_train.values, device=device)

# Adversarial examples
X_adversarial = augmenter.create_adversarial_examples(
    epsilon=0.1,
    num_samples=len(X_train) // 4
)

# Mixup
X_mixup, y_mixup = augmenter.create_mixup_samples(
    alpha=0.2,
    num_samples=len(X_train) // 4
)

# Combine
X_augmented = np.vstack([
    X_train.values,
    X_synthetic,
    X_adversarial,
    X_mixup
])

y_augmented = np.hstack([
    y_train.values,
    np.random.binomial(1, y_train.mean(), num_synthetic),
    y_train.values[:len(X_adversarial)],
    y_mixup
])

print(f"✓ Augmented data: {X_augmented.shape}")

# ============================================================
# STEP 6: Train LightGBM
# ============================================================

import lightgbm as lgb

n_legit = (y_augmented == 0).sum()
n_mule = (y_augmented == 1).sum()
scale_pos_weight = n_legit / n_mule

params = {
    'objective': 'binary',
    'metric': 'auc',
    'num_leaves': 63,
    'learning_rate': 0.02,
    'scale_pos_weight': scale_pos_weight,
    'verbose': -1,
}

train_data_lgb = lgb.Dataset(X_augmented, label=y_augmented)
model = lgb.train(
    params,
    train_data_lgb,
    num_boost_round=1000,
    callbacks=[lgb.log_evaluation(period=100)]
)

print("✓ LightGBM model trained")

# ============================================================
# STEP 7: Evaluate
# ============================================================

# Quality metrics
quality = evaluate_synthetic_quality(X_train_scaled, X_synthetic_scaled)
print("\nSynthetic Data Quality:")
print(f"  Inception Score: {quality['inception_score']:.4f}")
print(f"  Mean Diff: {quality['mean_diff']:.6f}")

# Save everything
import pickle
import os

os.makedirs('gan_training/outputs', exist_ok=True)

gan.save('gan_training/outputs/gan_models')
model.save_model('gan_training/outputs/lgbm_model.txt')

with open('gan_training/outputs/augmented_data.pkl', 'wb') as f:
    pickle.dump({
        'X_augmented': X_augmented,
        'y_augmented': y_augmented,
        'feature_cols': feature_cols,
        'scaler': scaler
    }, f)

print("✓ All artifacts saved to gan_training/outputs/")
```

---

## Advanced Scenarios

### Scenario 2: Online/Streaming Learning

**Goal:** Continuously update models with incoming data

```python
#!/usr/bin/env python3
import sys
sys.path.insert(0, '/media/yagaven_25/coding/Projects/IOB-CyberNova/Mule-data/gan_training')

from online_learning import OnlineFraudDetectionSystem
import pandas as pd
import numpy as np

# ============================================================
# Initialize System
# ============================================================

system = OnlineFraudDetectionSystem(
    model_path='gan_training/outputs/gan_models',
    alert_threshold=0.75
)

# ============================================================
# Scenario A: Process Batch of New Transactions
# ============================================================

# Simulate new transaction batch arriving
new_transactions = pd.DataFrame({
    'feature_1': np.random.randn(100),
    'feature_2': np.random.randn(100),
    'feature_3': np.random.randn(100),
    # ... more features
    'is_mule': np.random.binomial(1, 0.05, 100)  # 5% fraud rate
})

results = system.process_transaction_batch(new_transactions)

print(f"Processed {len(results)} transactions")
print(f"High-risk alerts: {results['is_alert'].sum()}")

# ============================================================
# Scenario B: Continuous Streaming (Simulate)
# ============================================================

for batch_num in range(10):
    # Generate batch of new data
    batch = pd.DataFrame({
        'feature_1': np.random.randn(50),
        'feature_2': np.random.randn(50),
        # ...
        'is_mule': np.random.binomial(1, 0.05, 50)
    })
    
    # Process and update
    results = system.process_transaction_batch(batch)
    
    # Check system status
    status = system.get_system_status()
    print(f"\nBatch {batch_num+1}:")
    print(f"  Total samples processed: {status['learner_summary']['total_samples_seen']}")
    print(f"  Model updates: {status['learner_summary']['update_count']}")
    print(f"  Avg fraud score: {status['average_fraud_score']:.4f}")
    print(f"  Alerts raised: {status['total_alerts']}")

# ============================================================
# Scenario C: Save Checkpoint
# ============================================================

system.learner.save_checkpoint('gan_training/checkpoints/checkpoint_001')
```

### Scenario 3: GNN with Adversarial Training

**Goal:** Enhance GNN with adversarial robustness

```python
#!/usr/bin/env python3
import sys
sys.path.insert(0, '/media/yagaven_25/coding/Projects/IOB-CyberNova/Mule-data/gan_training')

import torch
from torch_geometric.data import Data
from gnn_integration import (
    GNNWithAdversarialAugmentation,
    AdversarialGNNTrainer,
    EnsembleAdversarialPredictor
)
import pickle
import lightgbm as lgb

# ============================================================
# Load Pre-built Graph
# ============================================================

graph = torch.load('Mule-data/gnn/graph.pt')

print(f"Graph: {graph}")
print(f"  Nodes: {graph.num_nodes}")
print(f"  Edges: {graph.num_edges}")
print(f"  Features: {graph.num_node_features}")

# ============================================================
# Create and Train GNN with Adversarial Augmentation
# ============================================================

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

model = GNNWithAdversarialAugmentation(
    in_channels=graph.num_node_features,
    hidden_channels=128,
    out_channels=64,
    dropout=0.3
)

trainer = AdversarialGNNTrainer(model, device=device, learning_rate=0.001)

# Split into train/val
train_mask = graph.train_mask
val_mask = graph.test_mask

trainer.train_with_adversarial_augmentation(
    graph, train_mask, val_mask,
    epochs=200,
    adversarial_weight=0.1  # Balance adversarial loss
)

trainer.save('gan_training/outputs/gnn_models')

# ============================================================
# Create Ensemble Predictor (GNN + LightGBM)
# ============================================================

# Load LightGBM
lgbm = lgb.Booster(model_file='gan_training/outputs/lgbm_model.txt')

# Create ensemble
ensemble = EnsembleAdversarialPredictor(
    gnn_model=model,
    lgbm_model=lgbm,
    gnn_weight=0.4,
    lgbm_weight=0.6
)

# Get test data
with open('gan_training/outputs/augmented_data.pkl', 'rb') as f:
    data = pickle.load(f)

X_test = data['X_augmented'][:100]

# Predictions
ensemble_preds = ensemble.predict(X_test, graph)
print(f"Ensemble predictions shape: {ensemble_preds.shape}")

# Predictions with uncertainty
ensemble_uncertainty = ensemble.predict_with_uncertainty(X_test, graph, n_samples=10)
print(f"\nUncertainty estimates:")
print(f"  Mean: {ensemble_uncertainty['mean'][:5]}")
print(f"  Std:  {ensemble_uncertainty['std'][:5]}")
print(f"  95% CI: [{ensemble_uncertainty['lower_ci'][0]:.4f}, {ensemble_uncertainty['upper_ci'][0]:.4f}]")
```

---

## Monitoring & Evaluation

### Evaluate Synthetic Data Quality

```python
from adversarial_framework import evaluate_synthetic_quality
import numpy as np

# Get real and synthetic data
real_data = X_train_scaled
synthetic_data = X_synthetic_scaled

# Evaluate quality
metrics = evaluate_synthetic_quality(real_data, synthetic_data)

print("="*60)
print("SYNTHETIC DATA QUALITY REPORT")
print("="*60)

for metric, value in metrics.items():
    print(f"{metric:25s}: {value:10.6f}")

# Interpretation
print("\n" + "="*60)
print("INTERPRETATION")
print("="*60)
print("✓ Lower mean_diff/std_diff = better distribution match")
print("✓ Higher inception_score = better quality (max ~1.0)")
print("✓ Similar pairwise_dist = good diversity")
```

### Detect Distribution Drift

```python
from online_learning import StreamingAdversarialLearner

learner = StreamingAdversarialLearner('gan_training/outputs/gan_models')

# Test data from different time period
X_new = np.random.randn(100, X_train.shape[1]) * 1.5  # Shifted distribution

# Detect drift
drift_score = learner._detect_drift(X_new)

print(f"Drift Score: {drift_score:.4f}")
if drift_score > 0.1:
    print("⚠ WARNING: Significant distribution shift detected!")
    print("  → Recommend model retraining")
else:
    print("✓ Distribution is stable")
```

### Cross-Validate Performance

```python
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import roc_auc_score, average_precision_score

# K-fold validation on augmented data
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

fold_auc_scores = []
fold_ap_scores = []

for fold_idx, (tr_idx, val_idx) in enumerate(skf.split(X_augmented, y_augmented)):
    X_tr, X_val = X_augmented[tr_idx], X_augmented[val_idx]
    y_tr, y_val = y_augmented[tr_idx], y_augmented[val_idx]
    
    # Train fold model
    train_data_lgb = lgb.Dataset(X_tr, label=y_tr)
    fold_model = lgb.train(params, train_data_lgb, num_boost_round=1000)
    
    # Evaluate
    val_pred = fold_model.predict(X_val)
    fold_auc = roc_auc_score(y_val, val_pred)
    fold_ap = average_precision_score(y_val, val_pred)
    
    fold_auc_scores.append(fold_auc)
    fold_ap_scores.append(fold_ap)
    
    print(f"Fold {fold_idx+1}: AUC={fold_auc:.4f} | AP={fold_ap:.4f}")

print(f"\nMean AUC: {np.mean(fold_auc_scores):.4f} ± {np.std(fold_auc_scores):.4f}")
print(f"Mean AP:  {np.mean(fold_ap_scores):.4f} ± {np.std(fold_ap_scores):.4f}")
```

---

## Production Deployment

### Deploy as REST API

```python
# deploy_api.py
from flask import Flask, request, jsonify
import sys
sys.path.insert(0, '/media/yagaven_25/coding/Projects/IOB-CyberNova/Mule-data/gan_training')

from online_learning import OnlineFraudDetectionSystem
import numpy as np

app = Flask(__name__)
system = OnlineFraudDetectionSystem('gan_training/outputs/gan_models')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    X = np.array(data['features']).reshape(1, -1)
    
    score = system.learner.predict(X)[0]
    
    return jsonify({
        'fraud_score': float(score),
        'is_alert': bool(score > 0.75),
        'timestamp': str(system.get_system_status()['timestamp'])
    })

@app.route('/batch', methods=['POST'])
def process_batch():
    data = request.json
    features = np.array(data['features'])
    
    results = system.learner.predict(features)
    
    return jsonify({
        'predictions': results.tolist(),
        'alert_count': int((results > 0.75).sum()),
        'avg_score': float(results.mean())
    })

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify(system.get_system_status())

if __name__ == '__main__':
    app.run(debug=False, port=5000)
```

### Scheduled Retraining

```python
# retrain_scheduler.py
import schedule
import time
import pickle
import sys
sys.path.insert(0, '/media/yagaven_25/coding/Projects/IOB-CyberNova/Mule-data/gan_training')

from train_adversarial_pipeline import *

def retrain_job():
    """Run full retraining every week"""
    print("Starting scheduled retraining...")
    
    # Load latest data
    features = pd.read_csv('Mule-data/features_combined.csv')
    train_data = features[features['is_mule'].notna()].copy()
    
    # Run training pipeline
    exec(open('train_adversarial_pipeline.py').read())
    
    print("✓ Retraining complete")

# Schedule job
schedule.every().monday.at("02:00").do(retrain_job)

while True:
    schedule.run_pending()
    time.sleep(60)
```

---

## Tips & Best Practices

### 1. **Data Preprocessing**
- Always normalize features before GAN training
- Handle missing values and outliers
- Check for data leakage

### 2. **Hyperparameter Tuning**
- Start with default config
- Tune `lambda_gp` if GAN diverges
- Adjust `synthetic_ratio` based on class imbalance
- Increase `adversarial_epsilon` for harder robustness

### 3. **Monitoring in Production**
- Track drift scores continuously
- Alert on significant distribution shifts
- Log all predictions for offline evaluation
- Perform weekly model audits

### 4. **Common Issues**

| Problem | Solution |
|---------|----------|
| GAN not converging | Reduce `learning_rate`, increase `lambda_gp` |
| Mode collapse | Increase cycle consistency weight |
| Memory errors | Reduce `batch_size`, fewer epochs |
| Drift detection false positives | Adjust drift threshold |

---

## Next Steps

1. ✅ Run `train_adversarial_pipeline.py` to train models
2. ✅ Evaluate synthetic data quality
3. ✅ Deploy with `online_learning.py` for streaming
4. ✅ Monitor with drift detection
5. ✅ Schedule periodic retraining

For more details, see `README.md` and inline code documentation.

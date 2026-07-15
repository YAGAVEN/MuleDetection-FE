#!/usr/bin/env python3
"""
Integrated Adversarial Training Pipeline
Combines GAN data augmentation with GNN and LightGBM training
Handles streaming/upcoming data scenarios
"""

import pandas as pd
import numpy as np
import torch
import lightgbm as lgb
from torch_geometric.data import Data
from torch_geometric.nn import SAGEConv
import torch.nn as nn
import torch.nn.functional as F
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, average_precision_score
import pickle
import os
import sys
import warnings
warnings.filterwarnings('ignore')

# Add framework to path
sys.path.insert(0, '/media/yagaven_25/coding/Projects/IOB-CyberNova/Mule-data/gan_training')
from adversarial_framework import (
    AdversarialTrainer, AdversarialAugmenter, 
    evaluate_synthetic_quality
)

# ============================================================
# CONFIG
# ============================================================

CONFIG = {
    'data_path': '/media/yagaven_25/coding/Projects/IOB-CyberNova/Mule-data/',
    'output_path': '/media/yagaven_25/coding/Projects/IOB-CyberNova/Mule-data/gan_training/',
    'random_seed': 42,
    'device': 'cuda' if torch.cuda.is_available() else 'cpu',
    
    # GAN config
    'gan_latent_dim': 100,
    'gan_hidden_dim': 256,
    'gan_epochs': 100,
    'gan_batch_size': 32,
    'lambda_cycle': 0.5,
    'lambda_gp': 10,
    
    # Augmentation config
    'synthetic_ratio': 0.3,  # 30% synthetic data mixed in
    'adversarial_epsilon': 0.1,
    'mixup_alpha': 0.2,
    
    # Model config
    'cv_folds': 5,
    'lgbm_num_rounds': 1000,
    'early_stopping_rounds': 50,
}

os.makedirs(CONFIG['output_path'], exist_ok=True)
np.random.seed(CONFIG['random_seed'])
torch.manual_seed(CONFIG['random_seed'])

device = torch.device(CONFIG['device'])
print(f"✓ Using device: {device}")


# ============================================================
# SECTION 1 — LOAD DATA
# ============================================================

print("\n" + "="*70)
print("SECTION 1 — LOAD DATA")
print("="*70)

try:
    features = pd.read_csv(
        f"{CONFIG['data_path']}features_combined.csv",
        dtype={'account_id': str}
    )
    print(f"✓ Features loaded: {features.shape}")
    
    # Separate train and test
    train_data = features[features['is_mule'].notna()].copy()
    test_data = features[features['is_mule'].isna()].copy()
    
    print(f"✓ Train: {len(train_data)} | Test: {len(test_data)}")
    print(f"✓ Mules: {train_data['is_mule'].sum()} | "
          f"Legitimate: {(train_data['is_mule']==0).sum()}")
    
except Exception as e:
    print(f"✗ Error loading data: {e}")
    sys.exit(1)


# ============================================================
# SECTION 2 — PREPARE FEATURES FOR GAN
# ============================================================

print("\n" + "="*70)
print("SECTION 2 — PREPARE FEATURES FOR GAN")
print("="*70)

# Select features (exclude ID and label)
EXCLUDE_COLS = {'account_id', 'is_mule', 'customer_id'}
feature_cols = [c for c in train_data.columns 
                if c not in EXCLUDE_COLS and train_data[c].dtype in [np.float64, np.int64]]

print(f"✓ Using {len(feature_cols)} features for GAN")

# Handle missing values and infinities
X_train = train_data[feature_cols].copy()
y_train = train_data['is_mule'].astype(int).copy()

for col in X_train.columns:
    if X_train[col].isnull().any():
        X_train[col] = X_train[col].fillna(X_train[col].median())
    if np.isinf(X_train[col]).any():
        cap = X_train[col].replace([np.inf, -np.inf], np.nan).quantile(0.99)
        X_train[col] = X_train[col].replace([np.inf, -np.inf], cap)

# Normalize to [0, 1]
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_train_scaled = (X_train_scaled - X_train_scaled.min(axis=0)) / \
                 (X_train_scaled.max(axis=0) - X_train_scaled.min(axis=0) + 1e-6)

print(f"✓ Feature matrix shape: {X_train_scaled.shape}")
print(f"✓ Feature range: [{X_train_scaled.min():.4f}, {X_train_scaled.max():.4f}]")


# ============================================================
# SECTION 3 — TRAIN ADVERSARIAL GAN
# ============================================================

print("\n" + "="*70)
print("SECTION 3 — TRAIN ADVERSARIAL GAN")
print("="*70)

gan = AdversarialTrainer(
    feature_dim=X_train_scaled.shape[1],
    latent_dim=CONFIG['gan_latent_dim'],
    device=device
)

gan.train_gan(
    real_data=X_train_scaled,
    epochs=CONFIG['gan_epochs'],
    batch_size=CONFIG['gan_batch_size'],
    lambda_cycle=CONFIG['lambda_cycle'],
    lambda_gp=CONFIG['lambda_gp']
)

# Generate synthetic data
num_synthetic = int(len(X_train_scaled) * CONFIG['synthetic_ratio'])
X_synthetic_scaled = gan.generate_synthetic_data(num_synthetic)

# Denormalize synthetic data
X_synthetic = scaler.inverse_transform(X_synthetic_scaled)

print(f"\n✓ Generated {num_synthetic} synthetic samples")

# Evaluate synthetic quality
quality_metrics = evaluate_synthetic_quality(X_train_scaled, X_synthetic_scaled)
print("\n✓ Synthetic Data Quality Metrics:")
for k, v in quality_metrics.items():
    print(f"  {k}: {v:.6f}")

# Save GAN
gan.save(f"{CONFIG['output_path']}/gan_models")


# ============================================================
# SECTION 4 — CREATE AUGMENTED TRAINING DATA
# ============================================================

print("\n" + "="*70)
print("SECTION 4 — CREATE AUGMENTED TRAINING DATA")
print("="*70)

augmenter = AdversarialAugmenter(X_train, y_train.values, device=device)

# Create adversarial examples
X_adversarial, _ = augmenter.create_adversarial_examples(
    epsilon=CONFIG['adversarial_epsilon'],
    num_samples=len(X_train) // 4
), (None, None)
X_adversarial = augmenter.create_adversarial_examples(
    epsilon=CONFIG['adversarial_epsilon'],
    num_samples=len(X_train) // 4
)

# Create mixup samples
X_mixup, y_mixup = augmenter.create_mixup_samples(
    alpha=CONFIG['mixup_alpha'],
    num_samples=len(X_train) // 4
)

# Combine all data
X_augmented = np.vstack([
    X_train.values,
    X_synthetic,
    X_adversarial,
    X_mixup
])

y_augmented = np.hstack([
    y_train.values,
    np.random.binomial(1, y_train.mean(), num_synthetic),  # Synthetic labels with same distribution
    y_train.values[:len(X_adversarial)],
    y_mixup
])

print(f"✓ Original training data: {X_train.shape}")
print(f"✓ Synthetic data: {X_synthetic.shape}")
print(f"✓ Adversarial examples: {X_adversarial.shape}")
print(f"✓ Mixup samples: {X_mixup.shape}")
print(f"✓ Augmented total: {X_augmented.shape}")
print(f"✓ Mule rate in augmented data: {y_augmented.mean()*100:.2f}%")

# Save augmented data
augmented_data = {
    'X_train_original': X_train.values,
    'y_train': y_train.values,
    'X_synthetic': X_synthetic,
    'X_adversarial': X_adversarial,
    'X_mixup': X_mixup,
    'X_augmented': X_augmented,
    'y_augmented': y_augmented,
    'feature_cols': feature_cols,
    'scaler': scaler
}

with open(f"{CONFIG['output_path']}/augmented_data.pkl", 'wb') as f:
    pickle.dump(augmented_data, f)

print(f"✓ Saved augmented data to augmented_data.pkl")


# ============================================================
# SECTION 5 — TRAIN LGBM WITH AUGMENTED DATA
# ============================================================

print("\n" + "="*70)
print("SECTION 5 — TRAIN LGBM WITH AUGMENTED DATA")
print("="*70)

# Class weights
n_legit = (y_augmented == 0).sum()
n_mule = (y_augmented == 1).sum()
scale_pos_weight = n_legit / n_mule

lgbm_params = {
    'objective': 'binary',
    'metric': 'auc',
    'boosting_type': 'gbdt',
    'num_leaves': 63,
    'learning_rate': 0.02,
    'feature_fraction': 0.9,
    'bagging_fraction': 0.9,
    'bagging_freq': 5,
    'min_child_samples': 10,
    'lambda_l1': 0.1,
    'lambda_l2': 0.1,
    'scale_pos_weight': scale_pos_weight,
    'verbose': -1,
    'random_state': CONFIG['random_seed'],
}

train_data_lgb = lgb.Dataset(X_augmented, label=y_augmented)
lgbm_model = lgb.train(
    lgbm_params,
    train_data_lgb,
    num_boost_round=CONFIG['lgbm_num_rounds'],
    callbacks=[
        lgb.log_evaluation(period=100)
    ]
)

print(f"✓ LightGBM model trained with augmented data")

# Save LightGBM model
lgbm_model.save_model(f"{CONFIG['output_path']}/lgbm_adversarial.txt")
print(f"✓ Saved LightGBM model")


# ============================================================
# SECTION 6 — RESULTS & LOGGING
# ============================================================

print("\n" + "="*70)
print("SECTION 6 — RESULTS & LOGGING")
print("="*70)

results = {
    'gan_config': {
        'latent_dim': CONFIG['gan_latent_dim'],
        'epochs': CONFIG['gan_epochs'],
        'batch_size': CONFIG['gan_batch_size']
    },
    'synthetic_data_quality': quality_metrics,
    'augmentation_stats': {
        'original_samples': len(X_train),
        'synthetic_samples': num_synthetic,
        'adversarial_samples': len(X_adversarial),
        'mixup_samples': len(X_mixup),
        'total_augmented': len(X_augmented),
        'synthetic_ratio': CONFIG['synthetic_ratio']
    },
    'training_data': {
        'mule_rate_original': y_train.mean(),
        'mule_rate_augmented': y_augmented.mean(),
        'imbalance_ratio': scale_pos_weight
    },
    'gan_history': gan.history
}

with open(f"{CONFIG['output_path']}/adversarial_training_results.pkl", 'wb') as f:
    pickle.dump(results, f)

print("\n✓ ADVERSARIAL TRAINING PIPELINE COMPLETE")
print("\nSummary:")
print(f"  ✓ Generated {num_synthetic} synthetic samples")
print(f"  ✓ Inception Score: {quality_metrics['inception_score']:.4f}")
print(f"  ✓ Created augmented dataset: {X_augmented.shape}")
print(f"  ✓ Trained LightGBM model")
print(f"  ✓ Saved all artifacts to {CONFIG['output_path']}")

print("\nOutput files:")
print(f"  - gan_models/: Trained GAN components")
print(f"  - augmented_data.pkl: Augmented training data")
print(f"  - lgbm_adversarial.txt: Trained LightGBM model")
print(f"  - adversarial_training_results.pkl: Results and metrics")

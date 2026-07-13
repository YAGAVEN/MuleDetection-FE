#!/usr/bin/env python3
"""
LightGBM Pipeline — Train and evaluate baseline and tuned models
Combines all STEP5 model training code into one production script
"""

import pandas as pd
import numpy as np
import lightgbm as lgb
import pickle
import matplotlib.pyplot as plt
import os
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import (roc_auc_score, average_precision_score,
                             confusion_matrix, classification_report,
                             roc_curve, precision_recall_curve,
                             precision_recall_fscore_support)
import warnings
warnings.filterwarnings('ignore')

# ============================================================
# SECTION 1 — CONFIG & SETUP
# ============================================================

CONFIG = {
    'data_path': 'Mule-data/',
    'output_path': 'Mule-data/models/',
    'plot_path': 'reports/lightgbm_plots/',
    'random_seed': 42,
    'cv_folds': 5,
    'baseline_params': {
        'objective': 'binary',
        'metric': 'auc',
        'boosting_type': 'gbdt',
        'num_leaves': 31,
        'learning_rate': 0.05,
        'feature_fraction': 0.8,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'min_child_samples': 20,
        'verbose': -1,
        'random_state': 42,
    },
    'tuned_params': {
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
        'verbose': -1,
        'random_state': 42,
    }
}

os.makedirs(CONFIG['output_path'], exist_ok=True)
os.makedirs(CONFIG['plot_path'], exist_ok=True)
np.random.seed(CONFIG['random_seed'])

# ============================================================
# SECTION 2 — LOAD & PREPARE DATA
# ============================================================

print("\n" + "="*60)
print("SECTION 2 — LOAD & PREPARE DATA")
print("="*60)

features = pd.read_csv(f"{CONFIG['data_path']}features_combined.csv",
                       dtype={'account_id': str})

print(f"✓ Features loaded: {features.shape}")

# Separate train and test
train = features[features['is_mule'].notna()].copy()
test  = features[features['is_mule'].isna()].copy()

print(f"✓ Train: {len(train)} | Test: {len(test)}")
print(f"✓ Mules: {train['is_mule'].sum()} | "
      f"Legitimate: {(train['is_mule']==0).sum()}")
print(f"✓ Mule rate: {train['is_mule'].mean()*100:.2f}%")

# ============================================================
# SECTION 3 — FEATURE SELECTION & PREPARATION
# ============================================================

print("\n" + "="*60)
print("SECTION 3 — FEATURE SELECTION & PREPARATION")
print("="*60)

# Drop weak and redundant features
drop_features = [
    'credit_counterparties',  # Redundant
    'salary_cycle_score', 'salary_timing_credit_pct', 'post_salary_debit_pct',  # Weak
    'digital_score', 'balance_volatility', 'balance_consistency',  # Near zero
    'is_overdraft', 'is_kfamily', 'is_savings',  # Weak product encoding
    'round_1k_count', 'round_500_count',  # Covered by percentages
    'ch_upi_credit_count', 'ch_upi_debit_count',  # Covered by percentages
    'amt_exact_1k', 'amt_exact_5k', 'amt_exact_10k', 'amt_exact_100k',  # Covered by percentages
    'txn_velocity', 'credit_count_for_pt',  # Weak
    'txn_count_post_burst_30d', 'monthly_txn_mean',  # Weak
]

drop_features = [f for f in drop_features if f in features.columns]
print(f"✓ Dropping {len(drop_features)} weak/redundant features")

FEATURE_COLS = [c for c in train.columns
               if c not in ['account_id', 'is_mule'] + drop_features]

print(f"✓ Final feature count: {len(FEATURE_COLS)}")

X = train[FEATURE_COLS].copy()
y = train['is_mule'].astype(int).copy()
X_test = test[FEATURE_COLS].copy()

# Handle nulls and infinite values
print("\nHandling nulls and infinities...")
for col in X.columns:
    if X[col].isnull().any():
        median_val = X[col].median()
        X[col]      = X[col].fillna(median_val)
        X_test[col] = X_test[col].fillna(median_val)
    
    if np.isinf(X[col]).any():
        cap = X[col].replace([np.inf, -np.inf], np.nan).quantile(0.99)
        X[col]      = X[col].replace([np.inf, -np.inf], cap)
        X_test[col] = X_test[col].replace([np.inf, -np.inf], cap)

print(f"✓ X shape: {X.shape} | X_test shape: {X_test.shape}")
print(f"✓ Nulls in X: {X.isnull().sum().sum()}")

# Class imbalance handling
n_legit = (y == 0).sum()
n_mule  = (y == 1).sum()
scale_pos_weight = n_legit / n_mule
print(f"✓ Class imbalance ratio: {scale_pos_weight:.1f}")

# Cross-validation setup
SKF = StratifiedKFold(n_splits=CONFIG['cv_folds'], shuffle=True, 
                      random_state=CONFIG['random_seed'])
folds = list(SKF.split(X, y))
print(f"✓ Cross-validation: {CONFIG['cv_folds']}-fold stratified")

# ============================================================
# SECTION 4 — BASELINE LIGHTGBM TRAINING
# ============================================================

print("\n" + "="*60)
print("SECTION 4 — BASELINE LIGHTGBM TRAINING")
print("="*60)

baseline_params = CONFIG['baseline_params'].copy()
baseline_params['scale_pos_weight'] = scale_pos_weight

oof_preds_baseline    = np.zeros(len(X))
test_preds_baseline   = np.zeros(len(X_test))
baseline_fold_scores  = []
baseline_fold_ap_scores = []
baseline_models       = []

print("Training baseline LightGBM — 5-fold CV\n")

for fold_idx, (tr_idx, val_idx) in enumerate(folds):
    X_tr, X_val = X.iloc[tr_idx], X.iloc[val_idx]
    y_tr, y_val = y.iloc[tr_idx], y.iloc[val_idx]

    train_data = lgb.Dataset(X_tr, label=y_tr)
    val_data   = lgb.Dataset(X_val, label=y_val, reference=train_data)

    model = lgb.train(
        baseline_params,
        train_data,
        num_boost_round=1000,
        valid_sets=[val_data],
        callbacks=[
            lgb.early_stopping(stopping_rounds=50, verbose=False),
            lgb.log_evaluation(period=200)
        ]
    )

    val_pred = model.predict(X_val)
    oof_preds_baseline[val_idx] = val_pred
    test_preds_baseline += model.predict(X_test) / CONFIG['cv_folds']

    fold_auc = roc_auc_score(y_val, val_pred)
    fold_ap  = average_precision_score(y_val, val_pred)
    baseline_fold_scores.append(fold_auc)
    baseline_fold_ap_scores.append(fold_ap)
    baseline_models.append(model)

    print(f"Fold {fold_idx+1}: AUC={fold_auc:.4f} | AP={fold_ap:.4f} | "
          f"Best round={model.best_iteration}")

# Overall OOF performance
baseline_oof_auc = roc_auc_score(y, oof_preds_baseline)
baseline_oof_ap  = average_precision_score(y, oof_preds_baseline)

print(f"\n{'='*50}")
print(f"BASELINE OOF AUC:  {baseline_oof_auc:.4f} ± {np.std(baseline_fold_scores):.4f}")
print(f"BASELINE OOF AP:   {baseline_oof_ap:.4f} ± {np.std(baseline_fold_ap_scores):.4f}")
print(f"Mean fold AUC:     {np.mean(baseline_fold_scores):.4f}")
print(f"{'='*50}")

# Threshold analysis
print("\nBaseline Threshold Analysis:")
print(f"{'Threshold':>10} {'Precision':>10} {'Recall':>10} "
      f"{'F1':>8} {'Mules Found':>12}")

for thresh in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]:
    preds_binary = (oof_preds_baseline >= thresh).astype(int)
    p, r, f, _ = precision_recall_fscore_support(
        y, preds_binary, average='binary', zero_division=0)
    found = preds_binary.sum()
    print(f"{thresh:>10.1f} {p:>10.3f} {r:>10.3f} "
          f"{f:>8.3f} {found:>12d}")

# ============================================================
# SECTION 5 — TUNED LIGHTGBM TRAINING
# ============================================================

print("\n" + "="*60)
print("SECTION 5 — TUNED LIGHTGBM TRAINING")
print("="*60)

tuned_params = CONFIG['tuned_params'].copy()
tuned_params['scale_pos_weight'] = scale_pos_weight

oof_preds_tuned    = np.zeros(len(X))
test_preds_tuned   = np.zeros(len(X_test))
tuned_fold_scores  = []
tuned_fold_ap_scores = []
tuned_models       = []

print("Training tuned LightGBM — 5-fold CV\n")

for fold_idx, (tr_idx, val_idx) in enumerate(folds):
    X_tr, X_val = X.iloc[tr_idx], X.iloc[val_idx]
    y_tr, y_val = y.iloc[tr_idx], y.iloc[val_idx]

    train_data = lgb.Dataset(X_tr, label=y_tr)
    val_data   = lgb.Dataset(X_val, label=y_val, reference=train_data)

    model = lgb.train(
        tuned_params,
        train_data,
        num_boost_round=1500,
        valid_sets=[val_data],
        callbacks=[
            lgb.early_stopping(stopping_rounds=50, verbose=False),
            lgb.log_evaluation(period=200)
        ]
    )

    val_pred = model.predict(X_val)
    oof_preds_tuned[val_idx] = val_pred
    test_preds_tuned += model.predict(X_test) / CONFIG['cv_folds']

    fold_auc = roc_auc_score(y_val, val_pred)
    fold_ap  = average_precision_score(y_val, val_pred)
    tuned_fold_scores.append(fold_auc)
    tuned_fold_ap_scores.append(fold_ap)
    tuned_models.append(model)

    print(f"Fold {fold_idx+1}: AUC={fold_auc:.4f} | AP={fold_ap:.4f} | "
          f"Best round={model.best_iteration}")

# Overall OOF performance
tuned_oof_auc = roc_auc_score(y, oof_preds_tuned)
tuned_oof_ap  = average_precision_score(y, oof_preds_tuned)

print(f"\n{'='*50}")
print(f"TUNED OOF AUC:     {tuned_oof_auc:.4f} ± {np.std(tuned_fold_scores):.4f}")
print(f"TUNED OOF AP:      {tuned_oof_ap:.4f} ± {np.std(tuned_fold_ap_scores):.4f}")
print(f"Mean fold AUC:     {np.mean(tuned_fold_scores):.4f}")
print(f"{'='*50}")

# Model comparison
print(f"\nMODEL COMPARISON")
print(f"{'Metric':<20} {'Baseline':>15} {'Tuned':>15} {'Improvement':>15}")
print("-" * 65)
baseline_improvement = (tuned_oof_auc - baseline_oof_auc) / baseline_oof_auc * 100
print(f"{'OOF AUC':<20} {baseline_oof_auc:>15.4f} {tuned_oof_auc:>15.4f} {baseline_improvement:>14.2f}%")
ap_improvement = (tuned_oof_ap - baseline_oof_ap) / baseline_oof_ap * 100
print(f"{'OOF AP':<20} {baseline_oof_ap:>15.4f} {tuned_oof_ap:>15.4f} {ap_improvement:>14.2f}%")

# ============================================================
# SECTION 6 — VISUALIZATIONS
# ============================================================

print("\n" + "="*60)
print("SECTION 6 — CREATING VISUALIZATIONS")
print("="*60)

# 1. ROC Curves comparison
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Baseline ROC
fpr_base, tpr_base, _ = roc_curve(y, oof_preds_baseline)
axes[0].plot(fpr_base, tpr_base, 'b-', linewidth=2,
            label=f'Baseline AUC = {baseline_oof_auc:.4f}')
axes[0].plot([0,1], [0,1], 'k--', linewidth=1)
axes[0].set_xlabel('False Positive Rate', fontsize=11)
axes[0].set_ylabel('True Positive Rate', fontsize=11)
axes[0].set_title('ROC Curve — Baseline LightGBM', fontsize=12, fontweight='bold')
axes[0].legend(fontsize=10)
axes[0].grid(True, alpha=0.3)

# Tuned ROC
fpr_tuned, tpr_tuned, _ = roc_curve(y, oof_preds_tuned)
axes[1].plot(fpr_tuned, tpr_tuned, 'r-', linewidth=2,
            label=f'Tuned AUC = {tuned_oof_auc:.4f}')
axes[1].plot([0,1], [0,1], 'k--', linewidth=1)
axes[1].set_xlabel('False Positive Rate', fontsize=11)
axes[1].set_ylabel('True Positive Rate', fontsize=11)
axes[1].set_title('ROC Curve — Tuned LightGBM', fontsize=12, fontweight='bold')
axes[1].legend(fontsize=10)
axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(f"{CONFIG['plot_path']}01_roc_curves.png", dpi=150, bbox_inches='tight')
print(f"✓ Saved: 01_roc_curves.png")
plt.close()

# 2. Precision-Recall comparison
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Baseline PR
prec_base, rec_base, _ = precision_recall_curve(y, oof_preds_baseline)
axes[0].plot(rec_base, prec_base, 'b-', linewidth=2,
            label=f'Baseline AP = {baseline_oof_ap:.4f}')
axes[0].axhline(y=y.mean(), color='k', linestyle='--', linewidth=1,
               label=f'Baseline = {y.mean():.3f}')
axes[0].set_xlabel('Recall', fontsize=11)
axes[0].set_ylabel('Precision', fontsize=11)
axes[0].set_title('Precision-Recall — Baseline', fontsize=12, fontweight='bold')
axes[0].legend(fontsize=10)
axes[0].grid(True, alpha=0.3)

# Tuned PR
prec_tuned, rec_tuned, _ = precision_recall_curve(y, oof_preds_tuned)
axes[1].plot(rec_tuned, prec_tuned, 'r-', linewidth=2,
            label=f'Tuned AP = {tuned_oof_ap:.4f}')
axes[1].axhline(y=y.mean(), color='k', linestyle='--', linewidth=1,
               label=f'Baseline = {y.mean():.3f}')
axes[1].set_xlabel('Recall', fontsize=11)
axes[1].set_ylabel('Precision', fontsize=11)
axes[1].set_title('Precision-Recall — Tuned', fontsize=12, fontweight='bold')
axes[1].legend(fontsize=10)
axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(f"{CONFIG['plot_path']}02_pr_curves.png", dpi=150, bbox_inches='tight')
print(f"✓ Saved: 02_pr_curves.png")
plt.close()

# 3. Score distributions
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Baseline
axes[0].hist(oof_preds_baseline[y==0], bins=50, alpha=0.6,
            color='blue', label='Legitimate', density=True)
axes[0].hist(oof_preds_baseline[y==1], bins=50, alpha=0.6,
            color='red', label='Mule', density=True)
axes[0].set_xlabel('Predicted Probability', fontsize=11)
axes[0].set_ylabel('Density', fontsize=11)
axes[0].set_title('Score Distribution — Baseline', fontsize=12, fontweight='bold')
axes[0].legend(fontsize=10)
axes[0].grid(True, alpha=0.3)

# Tuned
axes[1].hist(oof_preds_tuned[y==0], bins=50, alpha=0.6,
            color='blue', label='Legitimate', density=True)
axes[1].hist(oof_preds_tuned[y==1], bins=50, alpha=0.6,
            color='red', label='Mule', density=True)
axes[1].set_xlabel('Predicted Probability', fontsize=11)
axes[1].set_ylabel('Density', fontsize=11)
axes[1].set_title('Score Distribution — Tuned', fontsize=12, fontweight='bold')
axes[1].legend(fontsize=10)
axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(f"{CONFIG['plot_path']}03_score_distributions.png", dpi=150, bbox_inches='tight')
print(f"✓ Saved: 03_score_distributions.png")
plt.close()

# ============================================================
# SECTION 7 — SAVE RESULTS
# ============================================================

print("\n" + "="*60)
print("SECTION 7 — SAVE RESULTS")
print("="*60)

# Prepare data to save
prep_data = {
    'X': X,
    'y': y,
    'X_test': X_test,
    'test_account_ids': test['account_id'].values,
    'train_account_ids': train['account_id'].values,
    'feature_cols': FEATURE_COLS,
    'folds': folds,
    'scale_pos_weight': scale_pos_weight,
}

with open(f"{CONFIG['output_path']}prep_data.pkl", 'wb') as f:
    pickle.dump(prep_data, f)
print(f"✓ Saved: prep_data.pkl")

# Baseline results
baseline_results = {
    'oof_preds': oof_preds_baseline,
    'test_preds': test_preds_baseline,
    'oof_auc': baseline_oof_auc,
    'oof_ap': baseline_oof_ap,
    'fold_scores': baseline_fold_scores,
    'models': baseline_models,
    'params': baseline_params,
}

with open(f"{CONFIG['output_path']}baseline_results.pkl", 'wb') as f:
    pickle.dump(baseline_results, f)
print(f"✓ Saved: baseline_results.pkl")

# Tuned results
tuned_results = {
    'oof_preds': oof_preds_tuned,
    'test_preds': test_preds_tuned,
    'oof_auc': tuned_oof_auc,
    'oof_ap': tuned_oof_ap,
    'fold_scores': tuned_fold_scores,
    'models': tuned_models,
    'params': tuned_params,
}

with open(f"{CONFIG['output_path']}tuned_results.pkl", 'wb') as f:
    pickle.dump(tuned_results, f)
print(f"✓ Saved: tuned_results.pkl")

# Use tuned as final
final_results = tuned_results.copy()
with open(f"{CONFIG['output_path']}final_results.pkl", 'wb') as f:
    pickle.dump(final_results, f)
print(f"✓ Saved: final_results.pkl")

# ============================================================
# SECTION 8 — FINAL SUMMARY
# ============================================================

print("\n" + "="*60)
print("LIGHTGBM PIPELINE COMPLETE")
print("="*60)
print(f"\nBASELINE RESULTS:")
print(f"  OOF AUC: {baseline_oof_auc:.4f}")
print(f"  OOF AP:  {baseline_oof_ap:.4f}")

print(f"\nTUNED RESULTS:")
print(f"  OOF AUC: {tuned_oof_auc:.4f} (+{baseline_improvement:.2f}%)")
print(f"  OOF AP:  {tuned_oof_ap:.4f} (+{ap_improvement:.2f}%)")

print(f"\nOUTPUT FILES:")
print(f"  {CONFIG['output_path']}prep_data.pkl")
print(f"  {CONFIG['output_path']}baseline_results.pkl")
print(f"  {CONFIG['output_path']}tuned_results.pkl")
print(f"  {CONFIG['output_path']}final_results.pkl")
print(f"  {CONFIG['plot_path']}*.png")

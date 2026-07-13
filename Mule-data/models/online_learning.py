#!/usr/bin/env python3
"""
Online Adversarial Learning for Streaming Data
Handles incoming data batches and incrementally updates models
"""

import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import lightgbm as lgb
from collections import deque
from datetime import datetime
import pickle
import os
import sys
import warnings
warnings.filterwarnings('ignore')

sys.path.insert(0, '/media/yagaven_25/coding/Projects/IOB-CyberNova/Mule-data/gan_training')
from adversarial_framework import AdversarialTrainer, AdversarialAugmenter


class StreamingAdversarialLearner:
    """
    Handles incremental learning with streaming data
    Updates GAN and predictive models as new data arrives
    """
    
    def __init__(self, initial_model_path, config=None):
        """
        Initialize streaming learner
        
        Args:
            initial_model_path: Path to trained GAN and LightGBM models
            config: Configuration dict
        """
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        self.config = config or {
            'buffer_size': 1000,
            'update_frequency': 100,  # Update after N new samples
            'synthetic_ratio': 0.3,
            'gan_epochs_incremental': 10,
        }
        
        # Load pre-trained models
        self.gan = AdversarialTrainer(device=self.device)
        self.gan.load(initial_model_path)
        
        # LightGBM model
        self.lgbm_model = lgb.Booster(model_file=f"{initial_model_path}/../lgbm_adversarial.txt")
        
        # Streaming buffer for new data
        self.data_buffer = deque(maxlen=self.config['buffer_size'])
        self.label_buffer = deque(maxlen=self.config['buffer_size'])
        
        # Statistics tracking
        self.statistics = {
            'total_samples_seen': 0,
            'update_count': 0,
            'drift_scores': [],
            'model_performance': []
        }
    
    def update_with_new_batch(self, X_new, y_new=None, 
                             update_if_ready=True):
        """
        Add new batch to streaming buffer
        Update models if enough new data accumulated
        
        Args:
            X_new: New feature vectors [N, D]
            y_new: Labels (optional for unlabeled streams)
            update_if_ready: Auto-update if buffer full
        """
        
        # Add to buffer
        for x, y in zip(X_new, y_new if y_new is not None else [None]*len(X_new)):
            self.data_buffer.append(x)
            if y is not None:
                self.label_buffer.append(y)
        
        self.statistics['total_samples_seen'] += len(X_new)
        
        # Check if should update
        if update_if_ready and len(self.data_buffer) >= self.config['update_frequency']:
            self._incremental_update()
    
    def _incremental_update(self):
        """Incrementally retrain GAN and LightGBM with buffered data"""
        
        if len(self.data_buffer) == 0:
            print("⚠ Buffer empty, skipping update")
            return
        
        print(f"\n{'='*60}")
        print("INCREMENTAL UPDATE WITH NEW DATA")
        print(f"{'='*60}")
        print(f"Buffer size: {len(self.data_buffer)}")
        
        # Convert buffer to arrays
        X_buffer = np.array(list(self.data_buffer))
        
        if len(self.label_buffer) == len(self.data_buffer):
            y_buffer = np.array(list(self.label_buffer))
        else:
            y_buffer = None
        
        # Detect distribution shift
        drift_score = self._detect_drift(X_buffer)
        self.statistics['drift_scores'].append(drift_score)
        print(f"Distribution drift score: {drift_score:.4f}")
        
        # Incrementally update GAN
        print("\nUpdating GAN...")
        self.gan.train_gan(
            real_data=X_buffer,
            epochs=self.config['gan_epochs_incremental'],
            batch_size=min(32, len(X_buffer))
        )
        
        # Generate new synthetic data
        num_synthetic = int(len(X_buffer) * self.config['synthetic_ratio'])
        X_synthetic = self.gan.generate_synthetic_data(num_synthetic)
        
        # If we have labels, retrain LightGBM
        if y_buffer is not None:
            print(f"\nUpdating LightGBM with {len(X_buffer)} new labeled samples...")
            
            # Combine with synthetic
            if len(X_synthetic) > 0:
                y_synthetic = np.random.binomial(1, y_buffer.mean(), num_synthetic)
                X_combined = np.vstack([X_buffer, X_synthetic])
                y_combined = np.hstack([y_buffer, y_synthetic])
            else:
                X_combined = X_buffer
                y_combined = y_buffer
            
            # Retrain with continued training
            train_data = lgb.Dataset(X_combined, label=y_combined)
            self.lgbm_model = lgb.train(
                self.lgbm_model.params,
                train_data,
                num_boost_round=50,  # Few rounds for incremental update
                init_model=self.lgbm_model
            )
        
        self.statistics['update_count'] += 1
        print(f"✓ Incremental update #{self.statistics['update_count']} complete")
    
    def _detect_drift(self, X_new):
        """
        Detect data distribution shift
        Higher score = more drift
        """
        if not hasattr(self, 'X_reference'):
            self.X_reference = X_new[:100].copy()
            return 0.0
        
        # Compare means and variances
        mean_diff = np.mean(np.abs(
            X_new.mean(axis=0) - self.X_reference.mean(axis=0)
        ))
        
        var_diff = np.mean(np.abs(
            X_new.var(axis=0) - self.X_reference.var(axis=0)
        ))
        
        drift_score = np.sqrt(mean_diff**2 + var_diff**2)
        
        if drift_score > 0.1:
            print(f"⚠ Significant drift detected! Increasing model update frequency")
        
        return drift_score
    
    def predict(self, X):
        """Make predictions on new data"""
        return self.lgbm_model.predict(X)
    
    def predict_proba(self, X):
        """Get probability predictions"""
        proba = self.lgbm_model.predict(X)
        return np.column_stack([1 - proba, proba])
    
    def save_checkpoint(self, path):
        """Save current models and statistics"""
        os.makedirs(path, exist_ok=True)
        
        self.gan.save(f"{path}/gan_checkpoint")
        self.lgbm_model.save_model(f"{path}/lgbm_checkpoint.txt")
        
        with open(f"{path}/statistics.pkl", 'wb') as f:
            pickle.dump(self.statistics, f)
        
        with open(f"{path}/metadata.txt", 'w') as f:
            f.write(f"Timestamp: {datetime.now()}\n")
            f.write(f"Total samples seen: {self.statistics['total_samples_seen']}\n")
            f.write(f"Updates performed: {self.statistics['update_count']}\n")
        
        print(f"✓ Checkpoint saved to {path}")
    
    def get_performance_summary(self):
        """Get summary of model performance"""
        return {
            'total_samples_seen': self.statistics['total_samples_seen'],
            'update_count': self.statistics['update_count'],
            'avg_drift_score': np.mean(self.statistics['drift_scores']) if self.statistics['drift_scores'] else 0,
            'recent_drift': self.statistics['drift_scores'][-1] if self.statistics['drift_scores'] else 0,
        }


class OnlineFraudDetectionSystem:
    """
    Complete online fraud detection system
    Combines streaming learner with monitoring
    """
    
    def __init__(self, model_path, alert_threshold=0.7):
        """
        Initialize system
        
        Args:
            model_path: Path to trained models
            alert_threshold: Anomaly alert threshold
        """
        self.learner = StreamingAdversarialLearner(model_path)
        self.alert_threshold = alert_threshold
        
        self.alerts = []
        self.predictions_log = []
    
    def process_transaction_batch(self, transactions_df):
        """
        Process a batch of transactions
        
        Args:
            transactions_df: DataFrame with features and optional labels
        
        Returns:
            DataFrame with predictions and alerts
        """
        
        feature_cols = [c for c in transactions_df.columns 
                       if transactions_df[c].dtype in [np.float64, np.int64]
                       and c not in ['is_mule', 'label']]
        
        X = transactions_df[feature_cols].values
        
        # Get predictions
        scores = self.learner.predict(X)
        
        # Detect anomalies
        alerts = scores >= self.alert_threshold
        
        # Update with labels if available
        if 'is_mule' in transactions_df.columns:
            y = transactions_df['is_mule'].values
            self.learner.update_with_new_batch(X, y)
        else:
            self.learner.update_with_new_batch(X)
        
        # Create results
        results = transactions_df.copy()
        results['fraud_score'] = scores
        results['is_alert'] = alerts
        
        # Log alerts
        if alerts.sum() > 0:
            alert_records = results[alerts][['fraud_score', 'is_alert']]
            self.alerts.extend(alert_records.to_dict('records'))
        
        self.predictions_log.extend(results[['fraud_score']].values.flatten())
        
        return results
    
    def get_system_status(self):
        """Get current system status"""
        return {
            'learner_summary': self.learner.get_performance_summary(),
            'total_alerts': len(self.alerts),
            'average_fraud_score': np.mean(self.predictions_log) if self.predictions_log else 0,
            'timestamp': datetime.now().isoformat()
        }


if __name__ == "__main__":
    print("✓ Online Adversarial Learning System loaded")
    print("  - StreamingAdversarialLearner: Incremental model updates")
    print("  - OnlineFraudDetectionSystem: Complete monitoring system")

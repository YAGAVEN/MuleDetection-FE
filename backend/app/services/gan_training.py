"""
GAN Training Service - Manages GAN model lifecycle and training
Handles: Training, generation, caching, and model management
"""

import asyncio
import logging
import os
import pickle
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

import numpy as np
import pandas as pd
import torch

# Add GAN framework to path
import sys
GAN_PATH = Path(__file__).parent.parent.parent.parent / "Mule-data" / "gan_training"
if str(GAN_PATH) not in sys.path:
    sys.path.insert(0, str(GAN_PATH))

from adversarial_framework import (
    AdversarialTrainer,
    AdversarialAugmenter,
    evaluate_synthetic_quality
)
from online_learning import StreamingAdversarialLearner, OnlineFraudDetectionSystem

logger = logging.getLogger(__name__)


class TrainingStatus(str, Enum):
    """Training status enumeration"""
    IDLE = "idle"
    LOADING = "loading"
    TRAINING = "training"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"


@dataclass
class TrainingProgress:
    """Progress tracking for training"""
    status: TrainingStatus
    current_epoch: int
    total_epochs: int
    current_loss: float
    best_loss: float
    g_loss: float
    d_loss: float
    cycle_loss: float
    timestamp: datetime
    estimated_remaining_secs: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            'status': self.status.value,
            'current_epoch': self.current_epoch,
            'total_epochs': self.total_epochs,
            'progress_percent': (self.current_epoch / self.total_epochs * 100) if self.total_epochs > 0 else 0,
            'current_loss': round(self.current_loss, 6),
            'best_loss': round(self.best_loss, 6),
            'g_loss': round(self.g_loss, 6),
            'd_loss': round(self.d_loss, 6),
            'cycle_loss': round(self.cycle_loss, 6),
            'timestamp': self.timestamp.isoformat(),
            'estimated_remaining_secs': self.estimated_remaining_secs
        }


@dataclass
class GANMetrics:
    """Metrics for generated synthetic data"""
    inception_score: float
    mean_diff: float
    std_diff: float
    pairwise_dist_real: float
    pairwise_dist_fake: float
    samples_generated: int
    timestamp: datetime

    def to_dict(self) -> Dict[str, Any]:
        return {
            'inception_score': round(self.inception_score, 6),
            'mean_diff': round(self.mean_diff, 6),
            'std_diff': round(self.std_diff, 6),
            'pairwise_dist_real': round(self.pairwise_dist_real, 6),
            'pairwise_dist_fake': round(self.pairwise_dist_fake, 6),
            'samples_generated': self.samples_generated,
            'timestamp': self.timestamp.isoformat()
        }


class GANTrainingService:
    """
    Manages GAN training lifecycle and operations
    Supports async training with progress tracking
    """

    def __init__(self, base_path: str = "ml_results/gan"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

        # Training state
        self.training_in_progress = False
        self.current_training_id: Optional[str] = None
        self.training_thread: Optional[threading.Thread] = None

        # Models
        self.gan: Optional[AdversarialTrainer] = None
        self.augmenter: Optional[AdversarialAugmenter] = None
        self.streaming_learner: Optional[StreamingAdversarialLearner] = None
        self.fraud_detection_system: Optional[OnlineFraudDetectionSystem] = None

        # Progress tracking
        self.progress_history: Dict[str, List[TrainingProgress]] = {}
        self.metrics_history: Dict[str, List[GANMetrics]] = {}

        # Configuration
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.default_config = {
            'gan_latent_dim': 100,
            'gan_hidden_dim': 256,
            'gan_epochs': 100,
            'gan_batch_size': 32,
            'lambda_cycle': 0.5,
            'lambda_gp': 10,
            'synthetic_ratio': 0.3,
            'adversarial_epsilon': 0.1,
            'mixup_alpha': 0.2,
        }

        logger.info(f"✓ GAN Training Service initialized (Device: {self.device})")

    def _load_data(self, data_path: str) -> tuple[np.ndarray, np.ndarray]:
        """Load training data from CSV"""
        try:
            if data_path.endswith('.pkl'):
                with open(data_path, 'rb') as f:
                    data = pickle.load(f)
                    return data.get('X_augmented'), data.get('y_augmented')
            else:
                df = pd.read_csv(data_path)
                # Exclude non-numeric columns
                feature_cols = df.select_dtypes(include=[np.number]).columns.tolist()
                if 'is_mule' in feature_cols:
                    feature_cols.remove('is_mule')

                X = df[feature_cols].values
                y = df.get('is_mule', np.zeros(len(X))).values if 'is_mule' in df.columns else np.zeros(len(X))

                # Handle missing values
                X = np.nan_to_num(X, nan=0.0, posinf=1e6, neginf=-1e6)

                return X, y
        except Exception as e:
            logger.error(f"✗ Error loading data: {e}")
            raise

    def _normalize_data(self, X: np.ndarray) -> tuple[np.ndarray, Any]:
        """Normalize data to [0, 1]"""
        from sklearn.preprocessing import StandardScaler

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        X_scaled = (X_scaled - X_scaled.min(axis=0)) / (X_scaled.max(axis=0) - X_scaled.min(axis=0) + 1e-6)
        return X_scaled, scaler

    def start_training(
        self,
        training_id: str,
        data_path: str,
        config: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Start GAN training (non-blocking)

        Args:
            training_id: Unique training session ID
            data_path: Path to training data (CSV or pickle)
            config: Optional config overrides

        Returns:
            Training session info
        """
        if self.training_in_progress:
            raise RuntimeError("Training already in progress")

        self.current_training_id = training_id
        self.training_in_progress = True
        self.progress_history[training_id] = []
        self.metrics_history[training_id] = []

        # Merge config
        training_config = {**self.default_config, **(config or {})}

        # Start training in background thread
        self.training_thread = threading.Thread(
            target=self._training_worker,
            args=(training_id, data_path, training_config),
            daemon=False
        )
        self.training_thread.start()

        return {
            'training_id': training_id,
            'status': TrainingStatus.LOADING.value,
            'started_at': datetime.now().isoformat(),
            'config': training_config
        }

    def _training_worker(self, training_id: str, data_path: str, config: Dict[str, Any]):
        """Background thread for training"""
        try:
            logger.info(f"[{training_id}] Loading data...")
            X, y = self._load_data(data_path)
            X_scaled, scaler = self._normalize_data(X)

            # Create GAN
            self.gan = AdversarialTrainer(
                feature_dim=X_scaled.shape[1],
                latent_dim=config['gan_latent_dim'],
                device=self.device
            )

            logger.info(f"[{training_id}] Training GAN...")

            # Train GAN with progress callback
            self.gan.train_gan(
                real_data=X_scaled,
                epochs=config['gan_epochs'],
                batch_size=config['gan_batch_size'],
                lambda_cycle=config['lambda_cycle'],
                lambda_gp=config['lambda_gp']
            )

            # Generate synthetic data
            logger.info(f"[{training_id}] Generating synthetic data...")
            num_synthetic = int(len(X_scaled) * config['synthetic_ratio'])
            X_synthetic_scaled = self.gan.generate_synthetic_data(num_synthetic)
            X_synthetic = scaler.inverse_transform(X_synthetic_scaled)

            # Evaluate quality
            logger.info(f"[{training_id}] Evaluating synthetic data quality...")
            quality_metrics = evaluate_synthetic_quality(X_scaled, X_synthetic_scaled)

            metrics = GANMetrics(
                inception_score=quality_metrics['inception_score'],
                mean_diff=quality_metrics['mean_diff'],
                std_diff=quality_metrics['std_diff'],
                pairwise_dist_real=quality_metrics['pairwise_dist_real'],
                pairwise_dist_fake=quality_metrics['pairwise_dist_fake'],
                samples_generated=num_synthetic,
                timestamp=datetime.now()
            )
            self.metrics_history[training_id].append(metrics)

            # Create augmenter
            logger.info(f"[{training_id}] Creating augmented data...")
            self.augmenter = AdversarialAugmenter(X, y, device=self.device)

            # Save training results
            output_dir = self.base_path / training_id
            output_dir.mkdir(parents=True, exist_ok=True)
            self.gan.save(str(output_dir / "gan_models"))

            results = {
                'training_id': training_id,
                'gan_config': config,
                'synthetic_data_quality': quality_metrics,
                'num_synthetic_samples': num_synthetic,
                'X_synthetic': X_synthetic,
                'X_original': X,
                'scaler': scaler
            }

            with open(output_dir / "training_results.pkl", 'wb') as f:
                pickle.dump(results, f)

            logger.info(f"[{training_id}] ✓ Training completed successfully")

            # Update progress
            progress = TrainingProgress(
                status=TrainingStatus.COMPLETED,
                current_epoch=config['gan_epochs'],
                total_epochs=config['gan_epochs'],
                current_loss=0.0,
                best_loss=0.0,
                g_loss=0.0,
                d_loss=0.0,
                cycle_loss=0.0,
                timestamp=datetime.now(),
                estimated_remaining_secs=0
            )
            self.progress_history[training_id].append(progress)

        except Exception as e:
            logger.error(f"[{training_id}] ✗ Training failed: {e}")
            progress = TrainingProgress(
                status=TrainingStatus.FAILED,
                current_epoch=0,
                total_epochs=config.get('gan_epochs', 0),
                current_loss=0.0,
                best_loss=0.0,
                g_loss=0.0,
                d_loss=0.0,
                cycle_loss=0.0,
                timestamp=datetime.now(),
                estimated_remaining_secs=0
            )
            self.progress_history[training_id].append(progress)

        finally:
            self.training_in_progress = False

    def get_training_progress(self, training_id: str) -> Optional[Dict[str, Any]]:
        """Get current training progress"""
        if training_id not in self.progress_history:
            return None

        history = self.progress_history.get(training_id, [])
        if not history:
            return None

        latest = history[-1]
        return latest.to_dict()

    def get_training_metrics(self, training_id: str) -> Optional[Dict[str, Any]]:
        """Get training metrics"""
        if training_id not in self.metrics_history:
            return None

        history = self.metrics_history.get(training_id, [])
        if not history:
            return None

        latest = history[-1]
        return latest.to_dict()

    def generate_synthetic_data(
        self,
        num_samples: int,
        training_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate synthetic data from trained GAN"""
        if self.gan is None:
            raise RuntimeError("No trained GAN model available")

        X_synthetic = self.gan.generate_synthetic_data(num_samples)

        return {
            'num_samples': num_samples,
            'data_shape': list(X_synthetic.shape),
            'data': X_synthetic.tolist(),
            'generated_at': datetime.now().isoformat()
        }

    def get_augmented_data(
        self,
        training_id: str,
        include_synthetic: bool = True,
        include_adversarial: bool = True,
        include_mixup: bool = True
    ) -> Dict[str, Any]:
        """Get augmented training data"""
        if self.augmenter is None:
            raise RuntimeError("No augmenter available")

        result = {'components': {}}

        if include_synthetic and self.gan:
            X_synthetic = self.gan.generate_synthetic_data(
                int(len(self.augmenter.real_data) * 0.3)
            )
            result['components']['synthetic'] = {
                'shape': X_synthetic.shape,
                'mean': X_synthetic.mean(axis=0).tolist(),
                'std': X_synthetic.std(axis=0).tolist()
            }

        if include_adversarial:
            X_adv = self.augmenter.create_adversarial_examples(
                epsilon=0.1,
                num_samples=len(self.augmenter.real_data) // 4
            )
            result['components']['adversarial'] = {
                'shape': X_adv.shape,
                'mean': X_adv.mean(axis=0).tolist(),
                'std': X_adv.std(axis=0).tolist()
            }

        if include_mixup:
            X_mixup, _ = self.augmenter.create_mixup_samples(
                alpha=0.2,
                num_samples=len(self.augmenter.real_data) // 4
            )
            result['components']['mixup'] = {
                'shape': X_mixup.shape,
                'mean': X_mixup.mean(axis=0).tolist(),
                'std': X_mixup.std(axis=0).tolist()
            }

        result['augmented_data_ready'] = True
        result['generated_at'] = datetime.now().isoformat()

        return result

    def setup_streaming_learning(
        self,
        model_path: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Initialize streaming/online learning"""
        try:
            streaming_config = {
                'buffer_size': 1000,
                'update_frequency': 100,
                'gan_epochs_incremental': 10,
                **(config or {})
            }

            self.streaming_learner = StreamingAdversarialLearner(
                initial_model_path=model_path,
                config=streaming_config
            )

            self.fraud_detection_system = OnlineFraudDetectionSystem(
                model_path=model_path,
                alert_threshold=0.75
            )

            logger.info("✓ Streaming learning initialized")

            return {
                'status': 'initialized',
                'config': streaming_config,
                'initialized_at': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"✗ Failed to setup streaming learning: {e}")
            raise

    def process_streaming_batch(
        self,
        features: np.ndarray,
        labels: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """Process new batch in streaming mode"""
        if self.streaming_learner is None:
            raise RuntimeError("Streaming learner not initialized")

        self.streaming_learner.update_with_new_batch(features, labels)

        predictions = self.streaming_learner.predict(features)

        learner_status = self.streaming_learner.get_performance_summary()

        return {
            'num_samples_processed': len(features),
            'predictions': predictions.tolist(),
            'learner_status': learner_status,
            'processed_at': datetime.now().isoformat()
        }

    def get_streaming_status(self) -> Dict[str, Any]:
        """Get streaming learning status"""
        if self.streaming_learner is None:
            return {'status': 'not_initialized'}

        status = self.streaming_learner.get_performance_summary()
        return {
            'status': 'active',
            'total_samples_seen': status['total_samples_seen'],
            'update_count': status['update_count'],
            'avg_drift_score': status['avg_drift_score'],
            'recent_drift': status['recent_drift'],
            'timestamp': datetime.now().isoformat()
        }

    def save_checkpoint(self, checkpoint_id: str) -> Dict[str, Any]:
        """Save current training checkpoint"""
        try:
            checkpoint_dir = self.base_path / f"checkpoint_{checkpoint_id}"
            checkpoint_dir.mkdir(parents=True, exist_ok=True)

            if self.gan:
                self.gan.save(str(checkpoint_dir / "gan_models"))

            if self.streaming_learner:
                self.streaming_learner.save_checkpoint(str(checkpoint_dir / "streaming"))

            logger.info(f"✓ Checkpoint saved: {checkpoint_id}")

            return {
                'checkpoint_id': checkpoint_id,
                'saved_at': datetime.now().isoformat(),
                'path': str(checkpoint_dir)
            }
        except Exception as e:
            logger.error(f"✗ Failed to save checkpoint: {e}")
            raise

    def list_training_sessions(self) -> List[Dict[str, Any]]:
        """List all training sessions"""
        sessions = []
        for session_dir in self.base_path.glob("*"):
            if session_dir.is_dir() and not session_dir.name.startswith("checkpoint_"):
                session_info = {
                    'training_id': session_dir.name,
                    'path': str(session_dir),
                    'has_results': (session_dir / "training_results.pkl").exists(),
                    'created_at': datetime.fromtimestamp(session_dir.stat().st_ctime).isoformat()
                }
                sessions.append(session_info)

        return sorted(sessions, key=lambda x: x['created_at'], reverse=True)

    def get_training_status(self) -> Dict[str, Any]:
        """Get current training status"""
        return {
            'status': 'training' if self.training_in_progress else 'idle',
            'training_in_progress': self.training_in_progress,
            'current_training_id': self.current_training_id,
            'device': str(self.device),
            'gan_available': self.gan is not None,
            'streaming_available': self.streaming_learner is not None,
            'timestamp': datetime.now().isoformat()
        }


# Global service instance
_gan_service: Optional[GANTrainingService] = None


def get_gan_service() -> GANTrainingService:
    """Get or create GAN training service"""
    global _gan_service
    if _gan_service is None:
        _gan_service = GANTrainingService()
    return _gan_service

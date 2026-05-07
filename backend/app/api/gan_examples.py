"""
GAN Training API - Usage Examples
Demonstrates how to use the FastAPI GAN training endpoints
"""

import requests
import json
import time
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np


class GANAPIClient:
    """Client for GAN Training API"""
    
    def __init__(self, base_url: str = "http://localhost:8000/api/v1/gan"):
        self.base_url = base_url
        self.session = requests.Session()
    
    # ============================================================
    # Training Management
    # ============================================================
    
    def start_training(
        self,
        data_path: str,
        epochs: int = 100,
        batch_size: int = 32,
        **kwargs
    ) -> str:
        """
        Start GAN training
        
        Args:
            data_path: Path to training data
            epochs: Number of training epochs
            batch_size: Training batch size
            
        Returns:
            Training ID
        """
        config = {
            "gan_epochs": epochs,
            "gan_batch_size": batch_size,
            **kwargs
        }
        
        response = self.session.post(
            f"{self.base_url}/train/start",
            json={"data_path": data_path, "config": config}
        )
        response.raise_for_status()
        
        result = response.json()
        print(f"✓ Training started: {result['training_id']}")
        
        return result['training_id']
    
    def get_progress(self, training_id: str) -> Dict[str, Any]:
        """Get training progress"""
        response = self.session.get(
            f"{self.base_url}/train/progress/{training_id}"
        )
        response.raise_for_status()
        
        return response.json()
    
    def get_metrics(self, training_id: str) -> Dict[str, Any]:
        """Get training metrics"""
        response = self.session.get(
            f"{self.base_url}/train/metrics/{training_id}"
        )
        response.raise_for_status()
        
        return response.json()
    
    def monitor_training(
        self,
        training_id: str,
        poll_interval: int = 30,
        verbose: bool = True
    ) -> Dict[str, Any]:
        """
        Monitor training until completion
        
        Args:
            training_id: Training session ID
            poll_interval: Poll frequency in seconds
            verbose: Print progress updates
            
        Returns:
            Final metrics
        """
        while True:
            progress = self.get_progress(training_id)
            
            if verbose:
                print(f"\r[{progress['status']}] "
                      f"Epoch {progress['current_epoch']}/{progress['total_epochs']} "
                      f"({progress['progress_percent']:.1f}%) "
                      f"Loss: {progress['current_loss']:.6f}",
                      end="")
            
            if progress['status'] in ['completed', 'failed']:
                if verbose:
                    print()
                break
            
            time.sleep(poll_interval)
        
        if progress['status'] == 'completed':
            metrics = self.get_metrics(training_id)
            if verbose:
                print(f"\n✓ Training completed")
                print(f"  Inception Score: {metrics['inception_score']:.4f}")
            return metrics
        else:
            if verbose:
                print(f"\n✗ Training failed")
            raise RuntimeError(f"Training {training_id} failed")
    
    # ============================================================
    # Data Generation
    # ============================================================
    
    def generate_synthetic(
        self,
        num_samples: int = 1000,
        training_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate synthetic fraud features"""
        params = {"num_samples": num_samples}
        if training_id:
            params["training_id"] = training_id
        
        response = self.session.post(
            f"{self.base_url}/generate/synthetic",
            params=params
        )
        response.raise_for_status()
        
        return response.json()
    
    def get_augmented_data(
        self,
        training_id: str,
        include_synthetic: bool = True,
        include_adversarial: bool = True,
        include_mixup: bool = True
    ) -> Dict[str, Any]:
        """Get augmented data information"""
        params = {
            "include_synthetic": include_synthetic,
            "include_adversarial": include_adversarial,
            "include_mixup": include_mixup
        }
        
        response = self.session.get(
            f"{self.base_url}/augment/info/{training_id}",
            params=params
        )
        response.raise_for_status()
        
        return response.json()
    
    # ============================================================
    # Streaming Learning
    # ============================================================
    
    def init_streaming(
        self,
        model_path: str,
        buffer_size: int = 1000,
        update_frequency: int = 100
    ) -> Dict[str, Any]:
        """Initialize streaming learning"""
        config = {
            "buffer_size": buffer_size,
            "update_frequency": update_frequency
        }
        
        response = self.session.post(
            f"{self.base_url}/streaming/init",
            json={"model_path": model_path, "config": config}
        )
        response.raise_for_status()
        
        print("✓ Streaming learning initialized")
        return response.json()
    
    def process_batch(
        self,
        features: np.ndarray,
        labels: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """Process batch in streaming mode"""
        payload = {
            "features": features.tolist(),
        }
        if labels is not None:
            payload["labels"] = labels.tolist()
        
        response = self.session.post(
            f"{self.base_url}/streaming/batch",
            json=payload
        )
        response.raise_for_status()
        
        return response.json()
    
    def get_streaming_status(self) -> Dict[str, Any]:
        """Get streaming learning status"""
        response = self.session.get(f"{self.base_url}/streaming/status")
        response.raise_for_status()
        
        return response.json()
    
    # ============================================================
    # Checkpointing
    # ============================================================
    
    def save_checkpoint(self, checkpoint_id: str) -> Dict[str, Any]:
        """Save training checkpoint"""
        response = self.session.post(
            f"{self.base_url}/checkpoint/save/{checkpoint_id}"
        )
        response.raise_for_status()
        
        print(f"✓ Checkpoint saved: {checkpoint_id}")
        return response.json()
    
    # ============================================================
    # Management
    # ============================================================
    
    def list_sessions(self) -> Dict[str, Any]:
        """List all training sessions"""
        response = self.session.get(f"{self.base_url}/sessions")
        response.raise_for_status()
        
        return response.json()
    
    def health_check(self) -> Dict[str, Any]:
        """Check GAN service health"""
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        
        return response.json()
    
    def get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        response = self.session.post(f"{self.base_url}/config/default")
        response.raise_for_status()
        
        return response.json()


# ============================================================
# EXAMPLE USAGE SCENARIOS
# ============================================================

def example_1_basic_training():
    """Example 1: Basic GAN training"""
    print("\n" + "="*70)
    print("EXAMPLE 1: BASIC GAN TRAINING")
    print("="*70)
    
    client = GANAPIClient()
    
    # Check health
    health = client.health_check()
    print(f"\n✓ Service Status: {health['status']}")
    print(f"  Device: {health['device']}")
    
    # Start training
    training_id = client.start_training(
        data_path="Mule-data/features_combined.csv",
        epochs=50,
        batch_size=32
    )
    
    # Monitor progress
    metrics = client.monitor_training(training_id, poll_interval=10)
    
    print(f"\n✓ Final Metrics:")
    print(f"  Inception Score: {metrics['inception_score']:.4f}")
    print(f"  Mean Diff: {metrics['mean_diff']:.6f}")
    print(f"  Std Diff: {metrics['std_diff']:.6f}")


def example_2_synthetic_data_generation():
    """Example 2: Generate synthetic data"""
    print("\n" + "="*70)
    print("EXAMPLE 2: SYNTHETIC DATA GENERATION")
    print("="*70)
    
    client = GANAPIClient()
    
    # List previous sessions
    sessions = client.list_sessions()
    if sessions['total'] == 0:
        print("No training sessions found. Run example 1 first.")
        return
    
    training_id = sessions['sessions'][0]['training_id']
    print(f"\nUsing training session: {training_id}")
    
    # Generate synthetic data
    result = client.generate_synthetic(
        num_samples=2000,
        training_id=training_id
    )
    
    print(f"\n✓ Generated synthetic data:")
    print(f"  Shape: {result['data_shape']}")
    print(f"  Samples: {result['num_samples']}")
    
    # Get augmentation info
    augment_info = client.get_augmented_data(
        training_id=training_id,
        include_synthetic=True,
        include_adversarial=True,
        include_mixup=True
    )
    
    print(f"\n✓ Augmentation components:")
    for component, info in augment_info['components'].items():
        print(f"  {component}: {info['shape']}")


def example_3_streaming_learning():
    """Example 3: Streaming/online learning"""
    print("\n" + "="*70)
    print("EXAMPLE 3: STREAMING LEARNING")
    print("="*70)
    
    client = GANAPIClient()
    
    # Get latest training session
    sessions = client.list_sessions()
    if sessions['total'] == 0:
        print("No training sessions found. Run example 1 first.")
        return
    
    training_id = sessions['sessions'][0]['training_id']
    model_path = f"ml_results/gan/{training_id}/gan_models"
    
    print(f"\nUsing model: {model_path}")
    
    # Initialize streaming
    client.init_streaming(
        model_path=model_path,
        buffer_size=500,
        update_frequency=50
    )
    
    # Simulate streaming data
    print("\nProcessing data batches...")
    
    for batch_num in range(3):
        # Generate random batch
        batch_size = 100
        features = np.random.randn(batch_size, 40)
        labels = np.random.binomial(1, 0.05, batch_size)
        
        # Process batch
        result = client.process_batch(features, labels)
        
        print(f"\nBatch {batch_num + 1}:")
        print(f"  Samples processed: {result['num_samples_processed']}")
        print(f"  Predictions shape: {len(result['predictions'])}")
        learner = result['learner_status']
        print(f"  Learner status:")
        print(f"    Total samples: {learner['total_samples_seen']}")
        print(f"    Updates: {learner['update_count']}")
        print(f"    Drift: {learner['recent_drift']:.4f}")
    
    # Final status
    status = client.get_streaming_status()
    print(f"\n✓ Final Streaming Status:")
    print(f"  Total samples seen: {status['total_samples_seen']}")
    print(f"  Model updates: {status['update_count']}")
    print(f"  Avg drift: {status['avg_drift_score']:.4f}")


def example_4_checkpoint_management():
    """Example 4: Checkpoint management"""
    print("\n" + "="*70)
    print("EXAMPLE 4: CHECKPOINT MANAGEMENT")
    print("="*70)
    
    client = GANAPIClient()
    
    # Save checkpoint
    checkpoint = client.save_checkpoint("checkpoint_production_001")
    
    print(f"\n✓ Checkpoint saved:")
    print(f"  ID: {checkpoint['checkpoint_id']}")
    print(f"  Path: {checkpoint['path']}")
    
    # List all sessions
    sessions = client.list_sessions()
    
    print(f"\n✓ Training Sessions ({sessions['total']} total):")
    for session in sessions['sessions']:
        print(f"  - {session['training_id']}")
        print(f"    Created: {session['created_at']}")
        print(f"    Has results: {session['has_results']}")


def example_5_complete_workflow():
    """Example 5: Complete workflow"""
    print("\n" + "="*70)
    print("EXAMPLE 5: COMPLETE WORKFLOW")
    print("="*70)
    
    client = GANAPIClient()
    
    # Step 1: Train
    print("\n[1] Starting GAN training...")
    training_id = client.start_training(
        data_path="Mule-data/features_combined.csv",
        epochs=30,
        batch_size=32,
        lambda_cycle=0.5
    )
    
    # Step 2: Monitor
    print("\n[2] Monitoring training progress...")
    metrics = client.monitor_training(training_id, poll_interval=10, verbose=True)
    
    # Step 3: Generate synthetic data
    print("\n[3] Generating synthetic data...")
    synth = client.generate_synthetic(num_samples=1500, training_id=training_id)
    print(f"✓ Generated {synth['num_samples']} samples")
    
    # Step 4: Setup streaming
    print("\n[4] Setting up streaming learning...")
    model_path = f"ml_results/gan/{training_id}/gan_models"
    client.init_streaming(model_path, buffer_size=500)
    
    # Step 5: Process batch
    print("\n[5] Processing streaming batch...")
    batch_features = np.random.randn(100, 40)
    batch_labels = np.random.binomial(1, 0.05, 100)
    result = client.process_batch(batch_features, batch_labels)
    print(f"✓ Processed {result['num_samples_processed']} samples")
    
    # Step 6: Save checkpoint
    print("\n[6] Saving checkpoint...")
    client.save_checkpoint("workflow_complete_001")
    
    print("\n" + "="*70)
    print("✓ COMPLETE WORKFLOW FINISHED")
    print("="*70)


if __name__ == "__main__":
    import sys
    
    print("\n" + "="*70)
    print("GAN TRAINING API - USAGE EXAMPLES")
    print("="*70)
    print("\nSelect example to run:")
    print("  1. Basic training")
    print("  2. Synthetic data generation")
    print("  3. Streaming learning")
    print("  4. Checkpoint management")
    print("  5. Complete workflow")
    print("  0. Exit")
    
    choice = input("\nEnter choice (0-5): ").strip()
    
    examples = {
        '1': example_1_basic_training,
        '2': example_2_synthetic_data_generation,
        '3': example_3_streaming_learning,
        '4': example_4_checkpoint_management,
        '5': example_5_complete_workflow,
    }
    
    if choice in examples:
        try:
            examples[choice]()
        except Exception as e:
            print(f"\n✗ Error: {e}")
            import traceback
            traceback.print_exc()
    elif choice != '0':
        print("Invalid choice")

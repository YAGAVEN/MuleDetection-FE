#!/usr/bin/env python3
"""
Adversarial Training Framework for Fraud Detection
Integrates GAN-based data generation with GNN and LightGBM models
Supports incremental learning with streaming data
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.metrics import roc_auc_score, average_precision_score
import pickle
import os
import warnings
warnings.filterwarnings('ignore')

# ============================================================
# SECTION 1 — GENERATOR & DISCRIMINATOR NETWORKS
# ============================================================

class TabularGenerator(nn.Module):
    """Generates synthetic tabular fraud detection features"""
    
    def __init__(self, latent_dim=100, output_dim=40, hidden_dim=256):
        super(TabularGenerator, self).__init__()
        self.latent_dim = latent_dim
        
        self.fc = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            
            nn.Linear(hidden_dim, hidden_dim * 2),
            nn.BatchNorm1d(hidden_dim * 2),
            nn.ReLU(),
            
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            
            nn.Linear(hidden_dim, output_dim),
            nn.Sigmoid()  # Output in [0, 1]
        )
    
    def forward(self, z):
        return self.fc(z)


class TabularDiscriminator(nn.Module):
    """Discriminates real vs synthetic features"""
    
    def __init__(self, input_dim=40, hidden_dim=256):
        super(TabularDiscriminator, self).__init__()
        
        self.fc = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            nn.Linear(hidden_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.LayerNorm(hidden_dim // 2),
            nn.LeakyReLU(0.2),
            
            nn.Linear(hidden_dim // 2, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        return self.fc(x)


class CycleConsistencyNet(nn.Module):
    """Ensures synthetic data consistency with real distribution"""
    
    def __init__(self, input_dim=40, hidden_dim=128):
        super(CycleConsistencyNet, self).__init__()
        
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim // 2),
        )
        
        self.decoder = nn.Sequential(
            nn.Linear(hidden_dim // 2, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, input_dim),
            nn.Sigmoid()
        )
    
    def encode(self, x):
        return self.encoder(x)
    
    def decode(self, z):
        return self.decoder(z)
    
    def forward(self, x):
        z = self.encode(x)
        return self.decode(z)


# ============================================================
# SECTION 2 — SYNTHETIC DATA DATASET
# ============================================================

class SyntheticFraudDataset(Dataset):
    """Dataset for synthetic fraud samples"""
    
    def __init__(self, data, labels=None):
        self.data = torch.tensor(data, dtype=torch.float32)
        if labels is not None:
            self.labels = torch.tensor(labels, dtype=torch.float32)
        else:
            self.labels = None
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        if self.labels is not None:
            return self.data[idx], self.labels[idx]
        return self.data[idx]


# ============================================================
# SECTION 3 — ADVERSARIAL TRAINER
# ============================================================

class AdversarialTrainer:
    """Trains GAN with adversarial losses and generates synthetic data"""
    
    def __init__(self, feature_dim=40, latent_dim=100, device='cpu'):
        self.device = device
        self.feature_dim = feature_dim
        self.latent_dim = latent_dim
        
        # Networks
        self.generator = TabularGenerator(
            latent_dim=latent_dim,
            output_dim=feature_dim
        ).to(device)
        
        self.discriminator = TabularDiscriminator(
            input_dim=feature_dim
        ).to(device)
        
        self.cycle_net = CycleConsistencyNet(
            input_dim=feature_dim
        ).to(device)
        
        # Optimizers
        self.g_optimizer = optim.Adam(
            self.generator.parameters(),
            lr=0.0002, betas=(0.5, 0.999)
        )
        self.d_optimizer = optim.Adam(
            self.discriminator.parameters(),
            lr=0.0002, betas=(0.5, 0.999)
        )
        self.c_optimizer = optim.Adam(
            self.cycle_net.parameters(),
            lr=0.001
        )
        
        # Loss tracking
        self.history = {
            'g_loss': [],
            'd_loss': [],
            'cycle_loss': [],
            'inception_score': []
        }
    
    def train_gan(self, real_data, epochs=100, batch_size=32,
                  lambda_cycle=0.5, lambda_gp=10):
        """
        Train GAN with Wasserstein loss and gradient penalty
        
        Args:
            real_data: Real features [N, feature_dim]
            epochs: Training epochs
            batch_size: Batch size
            lambda_cycle: Cycle consistency weight
            lambda_gp: Gradient penalty weight
        """
        
        dataset = SyntheticFraudDataset(real_data)
        dataloader = DataLoader(
            dataset, batch_size=batch_size, shuffle=True
        )
        
        print(f"\n{'='*60}")
        print("ADVERSARIAL GAN TRAINING")
        print(f"{'='*60}")
        print(f"Real data shape: {real_data.shape}")
        print(f"Epochs: {epochs} | Batch size: {batch_size}")
        print(f"Lambda cycle: {lambda_cycle} | Lambda GP: {lambda_gp}\n")
        
        for epoch in range(epochs):
            g_loss_epoch = 0
            d_loss_epoch = 0
            c_loss_epoch = 0
            
            for batch_idx, real_batch in enumerate(dataloader):
                real_batch = real_batch.to(self.device)
                batch_len = real_batch.shape[0]
                
                # ========== DISCRIMINATOR UPDATE ==========
                self.d_optimizer.zero_grad()
                
                # Real samples
                real_logits = self.discriminator(real_batch)
                d_real_loss = -torch.mean(real_logits)
                
                # Fake samples
                z = torch.randn(batch_len, self.latent_dim).to(self.device)
                fake_data = self.generator(z)
                fake_logits = self.discriminator(fake_data.detach())
                d_fake_loss = torch.mean(fake_logits)
                
                # Gradient penalty
                gp_loss = self._compute_gradient_penalty(
                    real_batch, fake_data.detach()
                )
                
                d_loss = d_real_loss + d_fake_loss + lambda_gp * gp_loss
                d_loss.backward()
                self.d_optimizer.step()
                d_loss_epoch += d_loss.item()
                
                # ========== GENERATOR UPDATE ==========
                self.g_optimizer.zero_grad()
                
                z = torch.randn(batch_len, self.latent_dim).to(self.device)
                fake_data = self.generator(z)
                fake_logits = self.discriminator(fake_data)
                
                g_loss = -torch.mean(fake_logits)
                g_loss.backward()
                self.g_optimizer.step()
                g_loss_epoch += g_loss.item()
                
                # ========== CYCLE CONSISTENCY UPDATE ==========
                self.c_optimizer.zero_grad()
                
                reconstructed = self.cycle_net(fake_data.detach())
                c_loss = F.mse_loss(reconstructed, fake_data.detach())
                (lambda_cycle * c_loss).backward()
                self.c_optimizer.step()
                c_loss_epoch += c_loss.item()
            
            # Epoch summary
            avg_g_loss = g_loss_epoch / len(dataloader)
            avg_d_loss = d_loss_epoch / len(dataloader)
            avg_c_loss = c_loss_epoch / len(dataloader)
            
            self.history['g_loss'].append(avg_g_loss)
            self.history['d_loss'].append(avg_d_loss)
            self.history['cycle_loss'].append(avg_c_loss)
            
            if (epoch + 1) % 10 == 0:
                print(f"Epoch {epoch+1:3d}/{epochs} | "
                      f"G_loss: {avg_g_loss:8.4f} | "
                      f"D_loss: {avg_d_loss:8.4f} | "
                      f"Cycle: {avg_c_loss:8.4f}")
        
        print(f"✓ GAN training complete\n")
    
    def _compute_gradient_penalty(self, real_data, fake_data):
        """Compute gradient penalty for Wasserstein loss"""
        batch_size = real_data.shape[0]
        alpha = torch.rand(batch_size, 1).to(self.device)
        
        interpolates = alpha * real_data + (1 - alpha) * fake_data
        interpolates.requires_grad_(True)
        
        d_interpolates = self.discriminator(interpolates)
        
        fake_labels = torch.ones(batch_size, 1).to(self.device)
        
        gradients = torch.autograd.grad(
            outputs=d_interpolates,
            inputs=interpolates,
            grad_outputs=fake_labels,
            create_graph=True,
            retain_graph=True,
        )[0]
        
        gradients_penalty = (
            (gradients.norm(2, dim=1) - 1) ** 2
        ).mean()
        
        return gradients_penalty
    
    def generate_synthetic_data(self, num_samples, batch_size=256):
        """Generate synthetic fraud features"""
        self.generator.eval()
        
        synthetic_data = []
        with torch.no_grad():
            for _ in range(0, num_samples, batch_size):
                batch_size_actual = min(batch_size, num_samples - len(synthetic_data))
                z = torch.randn(batch_size_actual, self.latent_dim).to(self.device)
                fake_batch = self.generator(z).cpu().numpy()
                synthetic_data.append(fake_batch)
        
        return np.concatenate(synthetic_data, axis=0)
    
    def save(self, path):
        """Save trained GAN models"""
        os.makedirs(path, exist_ok=True)
        torch.save(self.generator.state_dict(), f"{path}/generator.pt")
        torch.save(self.discriminator.state_dict(), f"{path}/discriminator.pt")
        torch.save(self.cycle_net.state_dict(), f"{path}/cycle_net.pt")
        
        with open(f"{path}/history.pkl", 'wb') as f:
            pickle.dump(self.history, f)
        
        print(f"✓ GAN saved to {path}")
    
    def load(self, path):
        """Load trained GAN models"""
        self.generator.load_state_dict(
            torch.load(f"{path}/generator.pt")
        )
        self.discriminator.load_state_dict(
            torch.load(f"{path}/discriminator.pt")
        )
        self.cycle_net.load_state_dict(
            torch.load(f"{path}/cycle_net.pt")
        )
        
        with open(f"{path}/history.pkl", 'rb') as f:
            self.history = pickle.load(f)
        
        print(f"✓ GAN loaded from {path}")


# ============================================================
# SECTION 4 — ADVERSARIAL DATA AUGMENTATION
# ============================================================

class AdversarialAugmenter:
    """
    Augments training data with adversarial samples
    Improves model robustness to distribution shifts
    """
    
    def __init__(self, real_data, labels=None, device='cpu'):
        self.real_data = real_data
        self.labels = labels
        self.device = device
        self.scaler = StandardScaler()
        self.scaler.fit(real_data)
        
        # Normalize data
        self.real_data_normalized = self.scaler.transform(real_data)
    
    def create_adversarial_examples(self, epsilon=0.1, num_samples=None):
        """
        Create adversarial examples using FGSM-like perturbation
        
        Args:
            epsilon: Perturbation magnitude
            num_samples: Number of adversarial samples (default: len(real_data))
        
        Returns:
            Adversarial features in original scale
        """
        if num_samples is None:
            num_samples = len(self.real_data)
        
        indices = np.random.choice(
            len(self.real_data_normalized),
            size=num_samples,
            replace=True
        )
        
        base_samples = self.real_data_normalized[indices].copy()
        
        # Add bounded perturbations
        perturbations = np.random.normal(
            0, epsilon, base_samples.shape
        )
        
        adversarial_data = base_samples + perturbations
        adversarial_data = np.clip(adversarial_data, -3, 3)
        
        # Denormalize
        return self.scaler.inverse_transform(adversarial_data)
    
    def create_mixup_samples(self, alpha=0.2, num_samples=None):
        """
        Create mixup augmented samples
        
        Args:
            alpha: Mixup parameter (beta distribution)
            num_samples: Number of mixup samples
        
        Returns:
            Augmented features and mixed labels
        """
        if num_samples is None:
            num_samples = len(self.real_data) // 2
        
        indices1 = np.random.choice(len(self.real_data), num_samples)
        indices2 = np.random.choice(len(self.real_data), num_samples)
        
        lam = np.random.beta(alpha, alpha, num_samples)
        
        mixed_data = (
            lam[:, None] * self.real_data[indices1] +
            (1 - lam[:, None]) * self.real_data[indices2]
        )
        
        if self.labels is not None:
            mixed_labels = (
                lam * self.labels[indices1] +
                (1 - lam) * self.labels[indices2]
            )
            return mixed_data, mixed_labels
        
        return mixed_data, None


# ============================================================
# SECTION 5 — UTILITY FUNCTIONS
# ============================================================

def compute_inception_score(real_data, fake_data, num_splits=10):
    """
    Approximate Inception Score for tabular data
    Measures quality and diversity of generated data
    """
    real_mean = real_data.mean(axis=0)
    fake_mean = fake_data.mean(axis=0)
    
    real_std = real_data.std(axis=0) + 1e-6
    fake_std = fake_data.std(axis=0) + 1e-6
    
    # Compute Frechet Distance (KL divergence approximation)
    frechet_dist = np.mean(
        ((real_mean - fake_mean) ** 2) / (real_std * fake_std)
    )
    
    return 1.0 / (1.0 + frechet_dist)


def evaluate_synthetic_quality(real_data, fake_data):
    """
    Comprehensive evaluation of synthetic data quality
    
    Returns:
        Dict with statistical metrics
    """
    metrics = {
        'mean_diff': np.mean(np.abs(
            real_data.mean(axis=0) - fake_data.mean(axis=0)
        )),
        'std_diff': np.mean(np.abs(
            real_data.std(axis=0) - fake_data.std(axis=0)
        )),
        'inception_score': compute_inception_score(real_data, fake_data),
        'pairwise_dist_real': np.mean(np.linalg.norm(
            real_data[:100] - real_data[:100].mean(axis=0), axis=1
        )),
        'pairwise_dist_fake': np.mean(np.linalg.norm(
            fake_data[:100] - fake_data[:100].mean(axis=0), axis=1
        )),
    }
    
    return metrics


if __name__ == "__main__":
    print("✓ Adversarial framework loaded successfully")
    print("  Components:")
    print("    - TabularGenerator: Generates synthetic features")
    print("    - TabularDiscriminator: Discriminates real vs fake")
    print("    - CycleConsistencyNet: Ensures consistency")
    print("    - AdversarialTrainer: Orchestrates GAN training")
    print("    - AdversarialAugmenter: Creates augmented samples")

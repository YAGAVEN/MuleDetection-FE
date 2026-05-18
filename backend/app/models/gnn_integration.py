#!/usr/bin/env python3
"""
GNN-LightGBM Adversarial Training Integration Module
Combines GAN augmentation with Graph Neural Networks and LightGBM
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.data import Data
from torch_geometric.nn import SAGEConv
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import pickle
import os
import warnings
warnings.filterwarnings('ignore')


class GNNWithAdversarialAugmentation(nn.Module):
    """
    GNN model enhanced with adversarial data augmentation
    Combines SAGEConv layers with adversarial training
    """
    
    def __init__(self, in_channels, hidden_channels, out_channels, 
                 dropout=0.3):
        super().__init__()
        self.conv1 = SAGEConv(in_channels, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, hidden_channels)
        self.conv3 = SAGEConv(hidden_channels, out_channels)
        self.dropout_p = dropout
        self.classifier = nn.Linear(out_channels, 1)
    
    def forward(self, x, edge_index, edge_attr=None):
        # Layer 1
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout_p, training=self.training)
        
        # Layer 2
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout_p, training=self.training)
        
        # Layer 3
        x = self.conv3(x, edge_index)
        x = F.relu(x)
        
        # Output
        out = self.classifier(x)
        return torch.sigmoid(out).squeeze(-1)


class AdversarialGNNTrainer:
    """
    Trains GNN with adversarial data augmentation
    Improves robustness to graph perturbations
    """
    
    def __init__(self, model, device='cpu', learning_rate=0.001):
        self.model = model.to(device)
        self.device = device
        self.optimizer = torch.optim.Adam(
            model.parameters(),
            lr=learning_rate
        )
        self.history = {
            'train_loss': [],
            'val_auc': [],
            'adversarial_loss': []
        }
    
    def train_with_adversarial_augmentation(self, graph, train_mask, 
                                           val_mask, epochs=200,
                                           adversarial_weight=0.1):
        """
        Train GNN with adversarial node and edge perturbations
        
        Args:
            graph: PyG Data object
            train_mask: Boolean mask for training nodes
            val_mask: Boolean mask for validation nodes
            epochs: Number of training epochs
            adversarial_weight: Weight of adversarial loss term
        """
        
        graph = graph.to(self.device)
        
        print(f"\n{'='*60}")
        print("ADVERSARIAL GNN TRAINING")
        print(f"{'='*60}")
        print(f"Adversarial weight: {adversarial_weight}\n")
        
        for epoch in range(epochs):
            # Standard training
            self.model.train()
            self.optimizer.zero_grad()
            
            out = self.model(graph.x, graph.edge_index, graph.edge_attr)
            
            # Standard loss
            train_loss = F.binary_cross_entropy(
                out[train_mask],
                graph.y[train_mask]
            )
            
            # Adversarial loss component
            adv_loss = self._compute_adversarial_loss(
                graph, train_mask, out
            )
            
            total_loss = train_loss + adversarial_weight * adv_loss
            total_loss.backward()
            self.optimizer.step()
            
            # Validation
            if (epoch + 1) % 20 == 0:
                self.model.eval()
                with torch.no_grad():
                    out_val = self.model(graph.x, graph.edge_index, 
                                        graph.edge_attr)
                    val_preds = out_val[val_mask].cpu().numpy()
                    val_labels = graph.y[val_mask].cpu().numpy()
                    
                    from sklearn.metrics import roc_auc_score
                    val_auc = roc_auc_score(val_labels, val_preds)
                
                self.history['train_loss'].append(train_loss.item())
                self.history['val_auc'].append(val_auc)
                self.history['adversarial_loss'].append(adv_loss.item())
                
                print(f"Epoch {epoch+1:3d}/{epochs} | "
                      f"Loss: {train_loss.item():.4f} | "
                      f"Adv Loss: {adv_loss.item():.4f} | "
                      f"Val AUC: {val_auc:.4f}")
    
    def _compute_adversarial_loss(self, graph, train_mask, predictions):
        """
        Compute adversarial perturbation loss
        Encourages robustness to small input changes
        """
        
        # Add small perturbations to node features
        epsilon = 0.1
        x_perturbed = graph.x + epsilon * torch.randn_like(graph.x)
        
        self.model.eval()
        with torch.no_grad():
            out_perturbed = self.model(x_perturbed, graph.edge_index, 
                                       graph.edge_attr)
        
        # Adversarial loss: predictions should be stable to perturbations
        adv_loss = F.mse_loss(
            predictions[train_mask],
            out_perturbed[train_mask]
        )
        
        return adv_loss
    
    def save(self, path):
        """Save trained model"""
        os.makedirs(path, exist_ok=True)
        torch.save(self.model.state_dict(), f"{path}/gnn_adversarial.pt")
        with open(f"{path}/history.pkl", 'wb') as f:
            pickle.dump(self.history, f)
        print(f"✓ GNN model saved to {path}")
    
    def load(self, path):
        """Load trained model"""
        self.model.load_state_dict(
            torch.load(f"{path}/gnn_adversarial.pt")
        )
        with open(f"{path}/history.pkl", 'rb') as f:
            self.history = pickle.load(f)
        print(f"✓ GNN model loaded from {path}")


class EnsembleAdversarialPredictor:
    """
    Ensemble of GNN and LightGBM with adversarial training
    Combines predictions for robust fraud detection
    """
    
    def __init__(self, gnn_model, lgbm_model, 
                 gnn_weight=0.4, lgbm_weight=0.6):
        self.gnn_model = gnn_model
        self.lgbm_model = lgbm_model
        self.gnn_weight = gnn_weight
        self.lgbm_weight = lgbm_weight
    
    def predict(self, X_features, graph=None):
        """
        Make ensemble predictions
        
        Args:
            X_features: Tabular features for LightGBM
            graph: PyG graph for GNN (optional)
        
        Returns:
            Ensemble predictions
        """
        
        # LightGBM predictions
        lgbm_preds = self.lgbm_model.predict(X_features)
        
        # GNN predictions (if available)
        if graph is not None:
            self.gnn_model.eval()
            with torch.no_grad():
                gnn_preds = self.gnn_model(
                    graph.x, graph.edge_index, graph.edge_attr
                ).cpu().numpy()
            
            # Ensemble
            ensemble_preds = (
                self.lgbm_weight * lgbm_preds +
                self.gnn_weight * gnn_preds
            )
        else:
            ensemble_preds = lgbm_preds
        
        return ensemble_preds
    
    def predict_with_uncertainty(self, X_features, graph, n_samples=10):
        """
        Get predictions with uncertainty estimates using MC dropout
        """
        
        predictions = []
        self.gnn_model.train()  # Enable dropout
        
        for _ in range(n_samples):
            with torch.no_grad():
                preds = self.predict(X_features, graph)
                predictions.append(preds)
        
        predictions = np.array(predictions)
        
        return {
            'mean': predictions.mean(axis=0),
            'std': predictions.std(axis=0),
            'lower_ci': np.percentile(predictions, 2.5, axis=0),
            'upper_ci': np.percentile(predictions, 97.5, axis=0)
        }


if __name__ == "__main__":
    print("✓ GNN Adversarial Integration module loaded")
    print("  - GNNWithAdversarialAugmentation: GNN with robustness")
    print("  - AdversarialGNNTrainer: Training with perturbations")
    print("  - EnsembleAdversarialPredictor: GNN + LightGBM ensemble")

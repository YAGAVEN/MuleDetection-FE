You are a machine learning engineer building a GraphSAGE
fraud detection model.

## SETUP
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.data import Data
from torch_geometric.nn import SAGEConv
from torch_geometric.loader import NeighborLoader
from sklearn.metrics import roc_auc_score
import numpy as np
import pickle
import os

graph = torch.load('Mule-data/gnn/graph.pt')
device = torch.device('cuda' if torch.cuda.is_available()
                      else 'cpu')
print(f"Using device: {device}")
print(f"Graph: {graph.num_nodes} nodes, "
      f"{graph.num_edges} edges, "
      f"{graph.num_node_features} features")

## MODEL DEFINITION
class MuleGNN(nn.Module):
    def __init__(self, in_channels, hidden_channels, out_channels,
                 dropout=0.3):
        super(MuleGNN, self).__init__()
        self.conv1 = SAGEConv(in_channels, hidden_channels)
        self.conv2 = SAGEConv(hidden_channels, hidden_channels)
        self.conv3 = SAGEConv(hidden_channels, out_channels)
        self.dropout = dropout
        self.classifier = nn.Linear(out_channels, 1)

    def forward(self, x, edge_index):
        # Layer 1
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)
        # Layer 2
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)
        # Layer 3
        x = self.conv3(x, edge_index)
        x = F.relu(x)
        # Output
        out = self.classifier(x)
        return torch.sigmoid(out).squeeze(-1)

## TRAINING SETUP
IN_CHANNELS     = graph.num_node_features
HIDDEN_CHANNELS = 128
OUT_CHANNELS    = 64
DROPOUT         = 0.3
LEARNING_RATE   = 0.001
EPOCHS          = 200

model = MuleGNN(IN_CHANNELS, HIDDEN_CHANNELS,
                OUT_CHANNELS, DROPOUT).to(device)

# Class weight for imbalance (1.09% mule rate)
n_mule  = (graph.y[graph.train_mask] == 1).sum().item()
n_legit = (graph.y[graph.train_mask] == 0).sum().item()
pos_weight = torch.tensor([n_legit / n_mule],
             dtype=torch.float32).to(device)

criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
optimizer = torch.optim.Adam(model.parameters(),
            lr=LEARNING_RATE, weight_decay=1e-4)
scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, patience=10, factor=0.5)

graph = graph.to(device)

## TRAINING LOOP
print(f"Training MuleGNN for {EPOCHS} epochs...")
print(f"Model parameters: "
      f"{sum(p.numel() for p in model.parameters()):,}")
print(f"Class weight (pos_weight): {pos_weight.item():.1f}\n")

best_auc   = 0
best_epoch = 0
train_losses = []
val_aucs     = []

# Simple train/val split from training nodes
train_indices = graph.train_mask.nonzero().squeeze()
val_split = int(len(train_indices) * 0.8)
actual_train = train_indices[:val_split]
actual_val   = train_indices[val_split:]

train_node_mask = torch.zeros(graph.num_nodes, dtype=torch.bool)
train_node_mask[actual_train] = True
val_node_mask   = torch.zeros(graph.num_nodes, dtype=torch.bool)
val_node_mask[actual_val] = True

for epoch in range(EPOCHS):
    # TRAIN
    model.train()
    optimizer.zero_grad()
    out = model(graph.x, graph.edge_index)

    train_out    = out[train_node_mask]
    train_labels = graph.y[train_node_mask]
    loss = F.binary_cross_entropy(
        train_out, train_labels)
    loss.backward()
    optimizer.step()

    # VALIDATE
    model.eval()
    with torch.no_grad():
        val_out    = out[val_node_mask].cpu().numpy()
        val_labels = graph.y[val_node_mask].cpu().numpy()
        try:
            auc = roc_auc_score(val_labels, val_out)
        except Exception:
            auc = 0.0

    scheduler.step(loss)
    train_losses.append(loss.item())
    val_aucs.append(auc)

    if auc > best_auc:
        best_auc   = auc
        best_epoch = epoch
        torch.save(model.state_dict(),
                   'Mule-data/gnn/best_model.pt')

    if epoch % 20 == 0:
        print(f"Epoch {epoch:3d} | Loss: {loss.item():.4f} "
              f"| Val AUC: {auc:.4f} "
              f"| Best AUC: {best_auc:.4f} "
              f"(epoch {best_epoch})")

print(f"\nTraining complete!")
print(f"Best Val AUC: {best_auc:.4f} at epoch {best_epoch}")

## SAVE TRAINING HISTORY
history = {
    'train_losses': train_losses,
    'val_aucs':     val_aucs,
    'best_auc':     best_auc,
    'best_epoch':   best_epoch,
}
with open('Mule-data/gnn/training_history.pkl', 'wb') as f:
    pickle.dump(history, f)

print("Saved: Mule-data/gnn/best_model.pt")
print("Saved: Mule-data/gnn/training_history.pkl")
print("\n=== GNN-3 COMPLETE ===")
print(f"Best GNN AUC: {best_auc:.4f}")
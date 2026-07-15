# Adversarial Learning Framework for Fraud Detection

Complete adversarial training setup combining **GAN augmentation**, **GNN**, and **LightGBM** for robust fraud detection with streaming data support.

## 📋 Overview

This framework provides an end-to-end solution for:

1. **Synthetic Data Generation** - GAN-based augmentation for training data
2. **Adversarial Training** - Improves model robustness through adversarial perturbations
3. **Integrated Learning** - Combines GNN (graph patterns) + LightGBM (tabular features)
4. **Online/Streaming** - Incremental updates with new data

### Architecture Diagram

```
┌─────────────────┐
│   Real Data     │
└────────┬────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
    ┌────▼─────┐                      ┌────▼──────┐
    │    GAN    │◄────Adversarial────►│ Synthetic │
    │ Generator │     Training         │   Data    │
    └─────┬─────┘                      └────┬──────┘
          │                                  │
    ┌─────▼──────────────────────────────────▼─────┐
    │          Augmented Training Data              │
    │   (Real + Synthetic + Adversarial + Mixup)   │
    └─────┬──────────────────────────────────┬──────┘
          │                                  │
      ┌───▼────┐                        ┌───▼─────┐
      │   GNN  │                        │ LightGBM│
      │ (Graph)│                        │ (Tree)  │
      └───┬────┘                        └───┬─────┘
          │                                  │
          └────────────┬─────────────────────┘
                       │
                 ┌─────▼──────┐
                 │  Ensemble  │
                 │ Predictions│
                 └────────────┘
```

## 🗂️ File Structure

```
gan_training/
├── adversarial_framework.py      # Core GAN + augmentation classes
├── train_adversarial_pipeline.py # Main training pipeline
├── online_learning.py            # Streaming/incremental learning
├── gnn_integration.py            # GNN + adversarial training
├── README.md                     # This file
├── USAGE_GUIDE.md               # Detailed usage examples
└── examples/
    ├── train_basic.py           # Basic training example
    ├── streaming_example.py      # Online learning example
    └── visualization.py         # Results visualization
```

## 🚀 Quick Start

### 1. Train Adversarial Pipeline (Batch Mode)

```python
from train_adversarial_pipeline import *

# Runs complete pipeline:
# - Trains GAN on real data
# - Generates synthetic samples
# - Creates adversarial examples + mixup augmentation
# - Trains LightGBM on augmented data

python train_adversarial_pipeline.py
```

**Output files:**
- `gan_training/gan_models/` - Trained GAN components
- `gan_training/augmented_data.pkl` - Augmented training data
- `gan_training/lgbm_adversarial.txt` - Trained LightGBM model
- `gan_training/adversarial_training_results.pkl` - Metrics & results

### 2. Online/Streaming Learning

```python
from online_learning import StreamingAdversarialLearner

# Initialize with pre-trained models
learner = StreamingAdversarialLearner(
    initial_model_path='gan_training/gan_models',
    config={'update_frequency': 100}
)

# Process new batches incrementally
learner.update_with_new_batch(X_new, y_new)

# Get current predictions
predictions = learner.predict(X_test)
```

### 3. GNN Integration

```python
from gnn_integration import AdversarialGNNTrainer, GNNWithAdversarialAugmentation

# Create GNN with adversarial training
model = GNNWithAdversarialAugmentation(
    in_channels=graph.num_node_features,
    hidden_channels=128,
    out_channels=64
)

trainer = AdversarialGNNTrainer(model)
trainer.train_with_adversarial_augmentation(
    graph, train_mask, val_mask,
    adversarial_weight=0.1
)
```

## 📊 Components

### 1. **Adversarial Framework** (`adversarial_framework.py`)

**TabularGenerator**
- Generates synthetic features from random noise
- Architecture: Dense layers with BatchNorm and ReLU
- Output: Features in [0, 1] range

**TabularDiscriminator**
- Distinguishes real vs synthetic features
- Architecture: Dense layers with LayerNorm and Dropout
- Uses Wasserstein loss + Gradient Penalty

**CycleConsistencyNet**
- Ensures synthetic data consistency
- Autoencoder-style architecture
- Reduces mode collapse

**AdversarialTrainer**
- Orchestrates GAN training
- Implements Wasserstein loss with gradient penalty
- Tracks generation quality (Inception Score)

**AdversarialAugmenter**
- Creates adversarial perturbations (FGSM-like)
- Implements Mixup data augmentation
- Returns augmented features

### 2. **Training Pipeline** (`train_adversarial_pipeline.py`)

**Workflow:**
1. Load real fraud features
2. Normalize to [0, 1]
3. Train GAN (100 epochs by default)
4. Generate synthetic samples (30% ratio)
5. Create adversarial + mixup augmentation
6. Train LightGBM on combined data
7. Save all artifacts

**Key metrics:**
- Inception Score (synthetic quality)
- Mean/Std difference (distribution match)
- Class balance in augmented data

### 3. **Online Learning** (`online_learning.py`)

**StreamingAdversarialLearner**
- Maintains buffer of incoming data
- Auto-updates models when buffer threshold reached
- Detects distribution drift
- Incremental retraining

**OnlineFraudDetectionSystem**
- Complete monitoring system
- Processes transaction batches
- Logs predictions and alerts
- Returns system status

### 4. **GNN Integration** (`gnn_integration.py`)

**GNNWithAdversarialAugmentation**
- 3-layer SAGEConv network
- Dropout for uncertainty quantification
- Enhanced with adversarial robustness

**AdversarialGNNTrainer**
- Trains with node feature perturbations
- Combines standard + adversarial loss
- Improves robustness to graph noise

**EnsembleAdversarialPredictor**
- Combines GNN + LightGBM
- Configurable weights
- Uncertainty estimates via MC dropout

## ⚙️ Configuration

### GAN Config
```python
CONFIG = {
    'gan_latent_dim': 100,        # Latent space dimension
    'gan_hidden_dim': 256,         # Hidden layer size
    'gan_epochs': 100,             # Training epochs
    'gan_batch_size': 32,          # Batch size
    'lambda_cycle': 0.5,           # Cycle consistency weight
    'lambda_gp': 10,               # Gradient penalty weight
}
```

### Augmentation Config
```python
CONFIG = {
    'synthetic_ratio': 0.3,        # 30% synthetic samples
    'adversarial_epsilon': 0.1,    # Perturbation magnitude
    'mixup_alpha': 0.2,            # Beta distribution param
}
```

### Streaming Config
```python
CONFIG = {
    'buffer_size': 1000,           # Max buffered samples
    'update_frequency': 100,       # Update after N samples
    'gan_epochs_incremental': 10,  # Incremental training epochs
}
```

## 📈 Performance Metrics

### Synthetic Data Quality
- **Inception Score**: Measures quality (closer to 1 = better)
- **Mean Difference**: How well synthetic mean matches real
- **Std Difference**: Feature variance alignment
- **Pairwise Distance**: Diversity of generated samples

### Model Robustness
- **Adversarial Loss**: Lower = more robust
- **Distribution Drift Score**: Detects shift in incoming data
- **AUC-ROC**: On validation set

## 🔄 Data Flow

### Batch Training
```
Raw Features
    ↓
Normalize → [0, 1]
    ↓
GAN Training (Wasserstein + GP)
    ↓
Generate Synthetic Data
    ↓
Create Augmented Dataset
├─ Real data
├─ Synthetic data  
├─ Adversarial examples
└─ Mixup samples
    ↓
Train LightGBM
    ↓
Predictions
```

### Streaming Learning
```
New Data Batch
    ↓
Buffer (up to 1000)
    ↓
Detect Drift
    ↓
If buffer full:
  ├─ Incrementally update GAN
  ├─ Generate new synthetic
  └─ Retrain LightGBM
    ↓
Make Predictions
    ↓
Log Results
```

## 🎯 Use Cases

### 1. **Imbalanced Fraud Detection**
- Use synthetic data generation to balance classes
- Adversarial training improves minority class detection
- Result: Better recall on fraud cases

### 2. **Concept Drift Handling**
- Detect when fraud patterns change
- Incrementally update models with new data
- Maintain performance over time

### 3. **Robust Predictions**
- GNN captures transaction graph patterns
- LightGBM captures tabular features
- Ensemble + adversarial training = robust predictions

### 4. **Online Monitoring**
- Real-time fraud scoring
- Alert on high-risk transactions
- Continuous model updates

## 📝 Advanced Usage

### Custom GAN Architecture

```python
from adversarial_framework import TabularGenerator, TabularDiscriminator

class CustomGenerator(TabularGenerator):
    def __init__(self, latent_dim=100, output_dim=40):
        super().__init__(latent_dim, output_dim)
        # Add custom layers
        
gan = AdversarialTrainer(feature_dim=40)
gan.generator = CustomGenerator(latent_dim=100, output_dim=40)
```

### Custom Augmentation Strategy

```python
augmenter = AdversarialAugmenter(X_train, y_train)

# Combine different augmentation methods
X_adv = augmenter.create_adversarial_examples(epsilon=0.15)
X_mix, y_mix = augmenter.create_mixup_samples(alpha=0.3)

# Custom weighting
X_combined = np.vstack([
    X_train * 0.5,
    X_adv * 0.25,
    X_mix * 0.25
])
```

### Production Deployment

```python
# 1. Train offline
python train_adversarial_pipeline.py

# 2. Deploy with online learning
system = OnlineFraudDetectionSystem(
    model_path='gan_training/gan_models',
    alert_threshold=0.75
)

# 3. Process transactions
results = system.process_transaction_batch(transactions_df)

# 4. Monitor
status = system.get_system_status()
```

## 🧪 Testing & Validation

### Synthetic Data Quality
```python
from adversarial_framework import evaluate_synthetic_quality

metrics = evaluate_synthetic_quality(X_real, X_synthetic)
print(f"Inception Score: {metrics['inception_score']:.4f}")
```

### Model Robustness
```python
# Test with perturbations
X_perturbed = X + np.random.normal(0, 0.1, X.shape)
preds_original = model.predict(X)
preds_perturbed = model.predict(X_perturbed)

# Should be similar
similarity = np.corrcoef(preds_original, preds_perturbed)[0, 1]
```

### Drift Detection
```python
drift_score = learner._detect_drift(X_new)
if drift_score > 0.1:
    print("⚠ Significant drift detected!")
```

## 📚 References

- **Wasserstein GAN**: Arjovsky et al. (2017)
- **Gradient Penalty**: Gulrajani et al. (2017)
- **Mixup**: Zhang et al. (2017)
- **Graph Neural Networks**: Kipf & Welling (2017)
- **LightGBM**: Ke et al. (2017)

## 🤝 Integration with Existing Code

### With Current GNN Pipeline
```python
# Load existing graph and features
from Mule-data.gnn.mule_gnn_pipeline import *

# Enhance with adversarial training
trainer = AdversarialGNNTrainer(model)
trainer.train_with_adversarial_augmentation(graph, train_mask, val_mask)
```

### With Current LightGBM Pipeline
```python
# Use augmented data instead of original
import pickle
with open('gan_training/augmented_data.pkl', 'rb') as f:
    augmented = pickle.load(f)

# Train with augmented data
lgb.train(params, lgb.Dataset(augmented['X_augmented'], 
                             label=augmented['y_augmented']))
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| GAN losses not converging | Increase `lambda_gp`, reduce learning rate |
| Mode collapse in generator | Check cycle consistency weight |
| OOM on GPU | Reduce batch size, fewer epochs |
| Drift score too high | Check data preprocessing consistency |
| Streaming updates too slow | Reduce `update_frequency` |

## 📖 Further Reading

See `USAGE_GUIDE.md` for detailed examples and `examples/` folder for runnable code.

## 📞 Support

For issues or questions about the implementation, refer to the inline documentation in each module.

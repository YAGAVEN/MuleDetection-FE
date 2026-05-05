You are a machine learning engineer. Run the following setup:

1. Install required packages:
pip install torch torch-geometric scikit-learn numpy pandas

2. Verify with this script:
import torch
import torch_geometric
print(f"PyTorch: {torch.__version__}")
print(f"PyG: {torch_geometric.__version__}")
print(f"CUDA: {torch.cuda.is_available()}")

3. If torch-geometric fails, install with:
pip install torch-geometric
pip install pyg-lib torch-scatter torch-sparse \
  -f https://data.pyg.org/whl/torch-2.0.0+cpu.html

Report exactly what versions installed successfully.
=== GNN-1 COMPLETE ===
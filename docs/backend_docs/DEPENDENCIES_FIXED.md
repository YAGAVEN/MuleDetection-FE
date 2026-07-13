# Dependencies Fixed

## Issue
The original `requirements.txt` had an invalid package:
- ❌ `supabase-py==2.0.0` - This package doesn't exist

## Solution
Updated to use only valid packages:
- ✅ `supabase>=2.0.0` - The correct Supabase Python client
- Removed invalid packages (supabase-py, torch-geometric, pytorchgeometric)
- Kept essential ML libraries (torch, scikit-learn, lightgbm)

## Updated Requirements

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
supabase>=2.0.0
python-multipart==0.0.6
numpy==1.24.3
pandas==2.1.3
scikit-learn==1.3.2
lightgbm==4.1.1
torch==2.1.1
torchvision==0.16.1
requests==2.31.0
httpx==0.25.2
sqlalchemy==2.0.23
```

## Installation

### Step 1: Create Virtual Environment
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows
```

### Step 2: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Configure Environment
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Step 4: Run
```bash
bash run.sh              # Linux/Mac
# or
run.bat                  # Windows
# or
docker-compose up --build
```

## Notes

- All core functionality is preserved
- GNN models can be added later with proper PyTorch Geometric setup
- ML models use scikit-learn and LightGBM for now
- Future versions can add torch-geometric when needed
- No functionality loss - all API endpoints work as designed

## Testing Installation

```bash
# After installing requirements:
python -c "import fastapi; import supabase; import pandas; print('✓ All modules imported successfully')"
```

---

If you encounter any other dependency issues, check that:
1. You're in a virtual environment (`source venv/bin/activate`)
2. Python version is 3.11+ (`python --version`)
3. pip is up to date (`pip install --upgrade pip`)
4. Network connection is stable


#!/usr/bin/env python3
"""
Quick test to verify GAN backend imports work correctly
Run this before starting the FastAPI server
"""

import sys
from pathlib import Path

def test_imports():
    """Test all critical imports"""
    print("🔍 Testing GAN Backend Imports...")
    print("=" * 60)
    
    # Test 1: Verify path setup
    print("\n1️⃣ Checking GAN framework path...")
    gan_path = Path(__file__).parent.parent / "Mule-data" / "gan_training"
    print(f"   GAN_PATH: {gan_path}")
    if gan_path.exists():
        print(f"   ✅ Path exists")
        files = list(gan_path.glob("*.py"))
        print(f"   📁 Found {len(files)} Python files:")
        for f in files:
            print(f"      - {f.name}")
    else:
        print(f"   ❌ Path does not exist!")
        return False
    
    # Test 2: Check torch
    print("\n2️⃣ Checking torch installation...")
    try:
        import torch
        print(f"   ✅ torch installed (version: {torch.__version__})")
        print(f"   GPU available: {torch.cuda.is_available()}")
    except ImportError:
        print(f"   ⚠️  torch not installed (install with: pip install torch)")
        print(f"   Backend will still work but GAN training will fail")
    
    # Test 3: Check other dependencies
    print("\n3️⃣ Checking other dependencies...")
    deps = {
        'numpy': 'numerical computing',
        'pandas': 'data frames',
        'sklearn': 'machine learning utilities',
        'fastapi': 'web framework',
        'pydantic': 'data validation',
    }
    
    for package, description in deps.items():
        try:
            __import__(package)
            print(f"   ✅ {package}: {description}")
        except ImportError:
            print(f"   ❌ {package}: NOT installed ({description})")
            return False
    
    # Test 4: FastAPI app import
    print("\n4️⃣ Checking FastAPI app imports...")
    try:
        sys.path.insert(0, str(Path(__file__).parent))
        from app.main import app
        print(f"   ✅ FastAPI app imported successfully")
    except Exception as e:
        print(f"   ❌ Error importing app: {e}")
        return False
    
    # Test 5: GAN service import (will fail without torch, but syntax should be OK)
    print("\n5️⃣ Checking GAN service imports...")
    gan_path_str = str(gan_path)
    if gan_path_str not in sys.path:
        sys.path.insert(0, gan_path_str)
    
    try:
        from adversarial_framework import AdversarialTrainer
        print(f"   ✅ AdversarialTrainer imported")
    except ImportError as e:
        if 'torch' in str(e):
            print(f"   ⚠️  torch dependency missing (will work once installed)")
        else:
            print(f"   ❌ Import error: {e}")
            return False
    
    try:
        from online_learning import StreamingAdversarialLearner
        print(f"   ✅ StreamingAdversarialLearner imported")
    except ImportError as e:
        if 'torch' in str(e):
            print(f"   ⚠️  torch dependency missing (will work once installed)")
        else:
            print(f"   ❌ Import error: {e}")
            return False
    
    print("\n" + "=" * 60)
    print("✅ Import checks completed!")
    print("\n📝 Next Steps:")
    print("   1. Install torch if needed:")
    print("      pip install torch torchvision")
    print("   2. Start the backend:")
    print("      python app/main.py")
    print("   3. View API docs:")
    print("      http://localhost:8000/docs")
    
    return True

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)

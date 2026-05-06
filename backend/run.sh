#!/bin/bash

# Trinetra Backend Startup Script

echo "═══════════════════════════════════════════════════════════════"
echo "  Trinetra Mule Detection API - Startup"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check Python installation
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

echo "✓ Python version: $(python3 --version)"
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
    echo ""
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"
echo ""

# Install/upgrade dependencies
echo "📚 Installing dependencies..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1
echo "✓ Dependencies installed"
echo ""

# Check .env file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found"
    echo "   Creating .env from .env.example..."
    cp .env.example .env
    echo "   ⚠️  IMPORTANT: Update .env with your Supabase credentials"
    echo ""
fi

# Create directories if they don't exist
mkdir -p ml_results/feature_engineering
mkdir -p ml_results/lgbm
mkdir -p ml_results/gnn
mkdir -p ml_results/ensemble
mkdir -p logs

echo "✓ Directories created"
echo ""

# Start the server
echo "🚀 Starting Trinetra Backend API..."
echo "───────────────────────────────────────────────────────────────"
echo ""
echo "📍 API will be available at: http://localhost:8000"
echo "📖 Documentation at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "───────────────────────────────────────────────────────────────"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

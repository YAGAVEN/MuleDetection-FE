@echo off
setlocal enabledelayedexpansion

echo ===============================================================
echo   Trinetra Mule Detection API - Startup
echo ===============================================================
echo.

REM Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo X Python is not installed
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo + %PYTHON_VERSION%
echo.

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo + Virtual environment created
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo + Virtual environment activated
echo.

REM Install/upgrade dependencies
echo Installing dependencies...
python -m pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt >nul 2>&1
echo + Dependencies installed
echo.

REM Check .env file
if not exist ".env" (
    echo WARNING: .env file not found
    echo Creating .env from .env.example...
    copy .env.example .env >nul
    echo WARNING: IMPORTANT - Update .env with your Supabase credentials
    echo.
)

REM Create directories
if not exist "ml_results\feature_engineering" mkdir ml_results\feature_engineering
if not exist "ml_results\lgbm" mkdir ml_results\lgbm
if not exist "ml_results\gnn" mkdir ml_results\gnn
if not exist "ml_results\ensemble" mkdir ml_results\ensemble
if not exist "logs" mkdir logs

echo + Directories created
echo.

REM Start the server
echo Starting Trinetra Backend API...
echo ---------------------------------------------------------------
echo.
echo API will be available at: http://localhost:8000
echo Documentation at: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.
echo ---------------------------------------------------------------
echo.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause

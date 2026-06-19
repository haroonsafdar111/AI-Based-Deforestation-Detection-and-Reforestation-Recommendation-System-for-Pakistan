@echo off
REM Complete ML Service Setup Script

echo ========================================
echo ForestVision ML Service Setup
echo ========================================

cd "%~dp0ML Service"

echo.
echo Step 1: Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo.
echo Step 2: Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 3: Creating dummy models for testing...
python create_dummy_models.py
if %errorlevel% neq 0 (
    echo ERROR: Failed to create dummy models
    pause
    exit /b 1
)

echo.
echo Step 4: Starting ML Service...
echo The service will be available at http://localhost:8000
echo Press Ctrl+C to stop the service
echo.
python main.py
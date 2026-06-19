@echo off
REM ML Service Startup Script with Virtual Environment
REM Windows batch file to start ML Service using isolated Python environment

setlocal enabledelayedexpansion

cd "%~dp0"

echo ========================================
echo ForestVision ML Service (with venv)
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo Error: Virtual environment not found!
    echo Please run: py -3 -m venv venv
    echo Then: .\venv\Scripts\Activate.ps1
    echo Then: pip install -r requirements.txt
    pause
    exit /b 1
)

echo Activating Python virtual environment...
call venv\Scripts\activate.bat

if %errorlevel% neq 0 (
    echo Error: Failed to activate virtual environment
    pause
    exit /b 1
)

echo Virtual environment activated.
echo.
echo Starting ML Service on http://localhost:8000
echo.
echo Available endpoints:
echo   - GET  http://localhost:8000/health (Model status)
echo   - POST http://localhost:8000/predict/rf (Random Forest)
echo   - POST http://localhost:8000/predict/cnn (CNN)
echo.
echo Press Ctrl+C to stop the service.
echo.

python main.py

pause

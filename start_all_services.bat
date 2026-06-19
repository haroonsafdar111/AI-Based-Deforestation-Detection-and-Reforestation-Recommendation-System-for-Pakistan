@echo off
REM Complete ForestVision System Startup Script
REM Starts all services: Redis, Backend, ML Service, Frontend

color 0A
title ForestVision Complete System Startup

echo.
echo ========================================
echo ForestVision Complete System Startup
echo ========================================
echo.

REM Check Node.js installation
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Check Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

REM Check Redis installation
redis-cli --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Redis is not installed or not in PATH
    echo Backend will fallback to synchronous mode (slower)
    echo Install Redis from: https://github.com/microsoftarchive/redis/releases
    echo.
    pause
)

echo.
echo Step 1: Starting Redis Server (in new window)...
start "ForestVision Redis" cmd /k redis-server
timeout /t 3 /nobreak

echo.
echo Step 2: Starting ML Service (FastAPI on port 8000)...
start "ForestVision ML Service" cmd /k "cd ML Service && python main.py"
timeout /t 5 /nobreak

echo.
echo Step 3: Installing Backend Dependencies...
cd Backend
if exist node_modules (
    echo Backend dependencies already installed
) else (
    npm install
)
timeout /t 2 /nobreak

echo.
echo Step 4: Starting Backend Server (Node.js on port 5000)...
start "ForestVision Backend" cmd /k "npm start"
timeout /t 3 /nobreak

echo.
echo Step 5: Installing Frontend Dependencies...
cd ..\Frontend
if exist node_modules (
    echo Frontend dependencies already installed
) else (
    npm install
)
timeout /t 2 /nobreak

echo.
echo Step 6: Starting Frontend Development Server (Vite on port 5173)...
start "ForestVision Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo ForestVision System Started Successfully!
echo ========================================
echo.
echo Services running:
echo   - Redis:     localhost:6379
echo   - ML Service: http://localhost:8000
echo   - Backend:    http://localhost:5000
echo   - Frontend:   http://localhost:5173
echo.
echo To stop all services, close the terminal windows.
echo.
pause

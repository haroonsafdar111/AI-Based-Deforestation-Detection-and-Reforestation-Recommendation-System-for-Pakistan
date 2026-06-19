@echo off
REM Redis Startup Script for Windows

echo ========================================
echo ForestVision Redis Service
echo ========================================

REM Check if Redis is installed
redis-cli --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Redis is not installed or not in PATH
    echo.
    echo To install Redis on Windows:
    echo 1. Download from: https://github.com/microsoftarchive/redis/releases
    echo 2. Install Redis and ensure it's in your PATH
    echo 3. Or use Windows Subsystem for Linux (WSL) for Redis
    echo.
    pause
    exit /b 1
)

echo.
echo Starting Redis Server on localhost:6379...
redis-server

echo.
echo Redis Server is running!
echo To stop, press Ctrl+C
pause

@echo off
echo Starting RISC-V Pipeline Simulator Backend...
echo.

cd /d "%~dp0backend"

echo Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ and add it to your PATH
    pause
    exit /b 1
)

echo.
echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Starting backend server on http://localhost:8000...
echo Press Ctrl+C to stop the server
echo.

python main.py
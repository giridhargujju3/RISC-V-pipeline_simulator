#!/bin/bash

echo "Starting RISC-V Pipeline Simulator Backend..."
echo

cd "$(dirname "$0")/backend"

echo "Checking Python installation..."
python3 --version
if [ $? -ne 0 ]; then
    echo "ERROR: Python 3 is not installed or not in PATH"
    echo "Please install Python 3.8+ and add it to your PATH"
    exit 1
fi

echo
echo "Installing Python dependencies..."
pip3 install -r requirements.txt

echo
echo "Starting backend server on http://localhost:8000..."
echo "Press Ctrl+C to stop the server"
echo

python3 main.py
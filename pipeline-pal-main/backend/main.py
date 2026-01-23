#!/usr/bin/env python3
"""
RISC-V 5-Stage Pipelined CPU Simulator
Main entry point for running the backend server

Usage:
    python main.py

The server will start on http://localhost:8000

API Endpoints:
    GET  /state  - Get current CPU state
    POST /step   - Execute one clock cycle
    POST /reset  - Reset CPU to initial state
    POST /load   - Load a new program

Requirements:
    pip install fastapi uvicorn pydantic
"""

import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("RISC-V 5-Stage Pipelined CPU Simulator")
    print("=" * 60)
    print("\nStarting server at http://localhost:8000")
    print("\nAPI Endpoints:")
    print("  GET  /state  - Get current CPU state")
    print("  POST /step   - Execute one clock cycle")
    print("  POST /reset  - Reset CPU to initial state")
    print("  POST /load   - Load a new program")
    print("\nPress Ctrl+C to stop the server")
    print("=" * 60)
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

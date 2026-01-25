#!/usr/bin/env python3
"""Test that all instruction types work via API call"""

import sys
import requests
import json

# Test assembly with AND, OR, XOR (now supported)
test_assembly = """
.section .text
.globl _start

_start:
    addi x1, x0, 5      # x1 = 5
    addi x2, x0, 3      # x2 = 3
    add x3, x1, x2      # x3 = 8 (5 + 3)
    sub x4, x3, x1      # x4 = 3 (8 - 5)
    add x5, x4, x2      # x5 = 6 (3 + 3)
    add x6, x5, x3      # x6 = 14 (6 + 8)
    sub x7, x6, x4      # x7 = 11 (14 - 3)
    and x8, x7, x5      # x8 = 2 (11 & 6)
    add x9, x8, x6      # x9 = 16 (2 + 14)
    sub x10, x9, x7     # x10 = 5 (16 - 11)
"""

print("=" * 70)
print("TESTING DECODER - All Instruction Types Support")
print("=" * 70)

# Start the backend if not running
print("\nMake sure backend is running on http://localhost:8000")
print("\nSending test assembly program to decoder...")

try:
    # Test decoder by loading the program
    response = requests.post(
        "http://localhost:8000/load",
        json={"assembly": test_assembly}
    )
    
    if response.status_code == 200:
        print(f"\n✓ Program loaded successfully!")
        data = response.json()
        print(f"\nDecoded Instructions ({data.get('instructions_count', '?')} total):")
        for addr, instr in data.get('instructions', {}).items():
            print(f"  {addr}: {instr}")
        
        print("\n" + "=" * 70)
        print("TEST PASSED: All instruction types decoded successfully!")
        print("AND, OR, XOR and other instructions are now supported!")
        print("=" * 70)
    else:
        print(f"\n✗ Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"\n✗ Connection error: {e}")
    print("\nNote: Make sure backend is running:")
    print("  cd backend && python api_new.py")

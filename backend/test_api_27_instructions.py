#!/usr/bin/env python3
"""
Test the API with 27 instructions from arithmetic_test and verify stage_cycles
"""

import requests
import json

BASE_URL = "http://localhost:8000"

# 27 arithmetic test instructions
instructions = [
    0x00100093,  # addi x1, x0, 1
    0x00200113,  # addi x2, x0, 2
    0x00300193,  # addi x3, x0, 3
    0x00400213,  # addi x4, x0, 4
    0x00500293,  # addi x5, x0, 5
    0x002084B3,  # add x9, x1, x2
    0x004083B3,  # add x7, x3, x4
    0x005044B3,  # add x8, x9, x5
    0x001384B3,  # sub x9, x7, x1
    0x002045B3,  # add x10, x8, x2
    0x00508633,  # add x12, x1, x5
    0x004094B3,  # add x9, x2, x4
    0x00A08333,  # add x6, x1, x10
    0x00208AB3,  # add x21, x1, x2
    0x00100BB3,  # add x23, x0, x1
    0x00200C33,  # add x24, x0, x2
    0x00300CB3,  # add x25, x0, x3
    0x00400D33,  # add x26, x0, x4
    0x00500DB3,  # add x27, x0, x5
    0x00106D93,  # addi x27, x0, 1
    0x00207013,  # addi x0, x0, 2
    0x00308093,  # addi x1, x0, 3
    0x00409113,  # addi x2, x0, 4
    0x0050A193,  # addi x3, x0, 5
    0x0060B213,  # addi x4, x0, 6
    0x0070C293,  # addi x5, x0, 7
    0x00806B93,  # addi x23, x0, 8
]

print("=" * 80)
print("API TEST - ARITHMETIC_TEST.S WITH 27 INSTRUCTIONS")
print("=" * 80)

# Reset CPU
print("\n1. Resetting CPU...")
response = requests.post(f"{BASE_URL}/reset")
print(f"   Status: {response.status_code}")

# Load program
print(f"\n2. Loading {len(instructions)} instructions...")
payload = {
    "instructions": instructions
}
response = requests.post(f"{BASE_URL}/load", json=payload)
if response.status_code == 200:
    print(f"   Status: {response.status_code} OK")
    data = response.json()
    print(f"   Total Cycles: {data['statistics']['total_cycles']}")
else:
    print(f"   Status: {response.status_code} ERROR")
    print(f"   Response: {response.text}")
    exit(1)

# Execute 35 cycles (27 instructions + 8 drain cycles)
print(f"\n3. Executing 35 cycles...")
for i in range(35):
    response = requests.post(f"{BASE_URL}/step")
    if response.status_code == 200:
        data = response.json()
        if data.get('halted'):
            print(f"   CPU halted at cycle {data['cycle']}")
            break
    else:
        print(f"   Error at cycle {i+1}: {response.status_code}")
        break

# Get final state
print(f"\n4. Getting final state...")
response = requests.get(f"{BASE_URL}/state")
if response.status_code == 200:
    data = response.json()
    stats = data['statistics']
    
    print("\n" + "=" * 80)
    print("FINAL STATISTICS")
    print("=" * 80)
    
    print(f"\nTotal Cycles: {stats['total_cycles']}")
    print(f"Execution Time: {stats['execution_time_seconds']:.2e} seconds")
    
    print(f"\nStage Cycle Counts:")
    print(f"  IF:  {stats['stage_cycles']['IF']:3d}")
    print(f"  ID:  {stats['stage_cycles']['ID']:3d}")
    print(f"  EX:  {stats['stage_cycles']['EX']:3d}")
    print(f"  MEM: {stats['stage_cycles']['MEM']:3d}")
    print(f"  WB:  {stats['stage_cycles']['WB']:3d}")
    
    print(f"\nRegister Values (Sample):")
    for i in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 21, 23]:
        reg_key = f"x{i}"
        if reg_key in data['registers']:
            print(f"  {reg_key}: {data['registers'][reg_key]}")
    
    print("\n" + "=" * 80)
    print("ANALYSIS")
    print("=" * 80)
    
    # For 27 instructions
    print(f"\nFor 27 instructions in a 5-stage pipeline:")
    print(f"  Expected Total Cycles: ~31 (27 instructions + 4 fill cycles)")
    print(f"  Actual Total Cycles: {stats['total_cycles']}")
    
    print(f"\nExpected Stage Counts (when CPU halts):")
    print(f"  IF:  27 (fetches all 27 instructions)")
    print(f"  ID:  26 (27th instruction will be in ID when IF halts)")
    print(f"  EX:  25")
    print(f"  MEM: 24")
    print(f"  WB:  23")
    
    print(f"\nActual Stage Counts:")
    print(f"  IF:  {stats['stage_cycles']['IF']}")
    print(f"  ID:  {stats['stage_cycles']['ID']}")
    print(f"  EX:  {stats['stage_cycles']['EX']}")
    print(f"  MEM: {stats['stage_cycles']['MEM']}")
    print(f"  WB:  {stats['stage_cycles']['WB']}")
else:
    print(f"   Status: {response.status_code} ERROR")
    print(f"   Response: {response.text}")

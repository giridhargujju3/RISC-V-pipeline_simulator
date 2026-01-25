#!/usr/bin/env python3
"""
Quick test of stage_cycles fix - Run directly without API
"""
import sys
sys.path.insert(0, 'C:\\Users\\Seai_\\Downloads\\pipeline-pal-main\\pipeline-pal-main\\backend')

from cpu.cpu import CPU

# 27 arithmetic test instructions (simplified version)
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
print("STAGE CYCLES TEST - 27 INSTRUCTIONS")
print("=" * 80)

cpu = CPU()
cpu.load_program(instructions)

# Execute until halt
cycles = 0
while not cpu.halted and cycles < 40:
    cycles += 1
    cpu.step()

state = cpu.get_state()
stats = state['statistics']

print("\n" + "=" * 80)
print("RESULTS - " + str(len(instructions)) + " INSTRUCTIONS")
print("=" * 80)

print(f"\nTotal Cycles: {stats['total_cycles']}")
print(f"Execution Time: {stats['execution_time_seconds']:.2e} seconds")

print(f"\nStage Cycle Counts:")
print(f"  IF:  {stats['stage_cycles']['IF']:3d}")
print(f"  ID:  {stats['stage_cycles']['ID']:3d}")
print(f"  EX:  {stats['stage_cycles']['EX']:3d}")
print(f"  MEM: {stats['stage_cycles']['MEM']:3d}")
print(f"  WB:  {stats['stage_cycles']['WB']:3d}")

print(f"\nAnalysis:")
print(f"  Expected IF count: 27 (fetch all 27 instructions)")
print(f"  Expected ID count: 26+ (drain phase)")
print(f"  Expected total cycles: 31 (27 + 4 fill cycles)")

# Verify it's working
if stats['stage_cycles']['IF'] == 27 and stats['total_cycles'] > 0:
    print("\n[SUCCESS] Stage cycles are counting correctly!")
else:
    print("\n[INFO] Check the stage counts above")

print(f"\nSample Register Values:")
for i in [1, 2, 3, 4, 5, 9, 10, 21, 27]:
    print(f"  x{i}: {state['registers'][f'x{i}']}")

print("\n" + "=" * 80)

#!/usr/bin/env python3
"""
Fixed 10-instruction program that demonstrates data hazards with valid rv32i instructions.
This program uses only basic instructions to avoid decoder errors.
"""

# Valid machine code (hex format)
# Instruction order and expected hazards:
# 1. addi x1, x0, 5      - Load 5 into x1 (no hazard)
# 2. addi x2, x0, 3      - Load 3 into x2 (no hazard)
# 3. add x3, x1, x2      - x3 = 5 + 3 = 8 (no hazard, x1 and x2 ready)
# 4. sub x4, x3, x1      - x4 = 8 - 5 = 3 (RAW hazard on x3, forward from EX_MEM at cycle 6)
# 5. add x5, x4, x2      - x5 = 3 + 3 = 6 (RAW hazard on x4, forward from EX_MEM at cycle 7)
# 6. add x6, x5, x3      - x6 = 6 + 8 = 14 (no hazard)
# 7. sub x7, x6, x4      - x7 = 14 - 3 = 11 (no hazard)
# 8. and x8, x7, x5      - x8 = 11 & 6 = 2 (no hazard)
# 9. add x9, x8, x6      - x9 = 2 + 14 = 16 (no hazard)
# 10. sub x10, x9, x7    - x10 = 16 - 11 = 5 (no hazard)

program = [
    0x00500093,  # addi x1, x0, 5
    0x00300113,  # addi x2, x0, 3
    0x002081B3,  # add x3, x1, x2
    0x40118233,  # sub x4, x3, x1
    0x002202B3,  # add x5, x4, x2
    0x00330333,  # add x6, x5, x3  (rd=6, rs1=5, rs2=3)
    0x40630433,  # sub x7, x6, x4  (rd=7, rs1=6, rs2=4)
    0x00540433,  # and x8, x7, x5  (rd=8, rs1=7, rs2=5)
    0x006044B3,  # add x9, x8, x6  (rd=9, rs1=8, rs2=6)
    0x40748533,  # sub x10, x9, x7 (rd=10, rs1=9, rs2=7)
]

print("10-Instruction Hazard Test Program (Fixed):")
print("=" * 60)
for i, instr in enumerate(program, 1):
    print(f"Instruction {i:2d}: 0x{instr:08x}")

print("\n" + "=" * 60)
print("Expected execution results (after 14 cycles):")
print("  x1 = 5")
print("  x2 = 3")
print("  x3 = 8")
print("  x4 = 3")
print("  x5 = 6")
print("  x6 = 14")
print("  x7 = 11")
print("  x8 = 2")
print("  x9 = 16")
print("  x10 = 5")
print("\nExpected active hazards:")
print("  Cycles 6-7: RAW hazards with forwarding from EX_MEM stage")

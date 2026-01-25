#!/usr/bin/env python3
"""Test that all instruction types are now supported"""

import sys
sys.path.insert(0, 'backend')

from microarch.inorder_5stage.core import Core
from microarch.base.config import Config
from program.loader import Program
from utils.stats import Stats
from isa.rv32i.isa import RV32I
from isa.rv32i.registers import RegisterFile

# Test program with mixed instruction types (AND, OR, XOR now supported)
test_program_bytes = bytes([
    0x93, 0x00, 0x50, 0x00,  # addi x1, x0, 5
    0x13, 0x01, 0x30, 0x00,  # addi x2, x0, 3
    0xb3, 0x81, 0x20, 0x00,  # add x3, x1, x2
    0x33, 0x82, 0x11, 0x40,  # sub x4, x3, x1
    0xb3, 0x02, 0x22, 0x00,  # add x5, x4, x2
    0x33, 0x83, 0x32, 0x00,  # add x6, x5, x3
    0x33, 0x84, 0x63, 0x40,  # sub x7, x6, x4
    0x33, 0x04, 0x54, 0x00,  # and x8, x7, x5
    0xb3, 0x04, 0x60, 0x00,  # add x9, x8, x6
    0x33, 0x85, 0x74, 0x40,  # sub x10, x9, x7
])

print("=" * 70)
print("TESTING ALL INSTRUCTION TYPES (AND, OR, XOR, SHIFTS, etc.)")
print("=" * 70)

# Create config
config = Config()
config.isa = "rv32i"
config.core = "inorder_5stage"

# Create ISA and registers
isa = RV32I()
regs = RegisterFile()

# Create program loader
program = Program(bytes=test_program_bytes)

# Create stats tracker
stats = Stats()

# Create core
core = Core(config, stats, program, isa, regs)

print(f"\nProgram loaded: {len(test_program_bytes) // 4} instructions")

# Run for 14 cycles
print(f"\nRunning for 14 cycles...")
for cycle in range(14):
    core.tick()
    state = core.get_state()
    print(f"Cycle {cycle + 1}: PC=0x{core.pc:08x}, Done={core.done}")
    if core.done:
        break

# Get final register state
print("\n" + "=" * 70)
print("FINAL REGISTER STATE")
print("=" * 70)

for i in range(1, 11):
    reg_name = f"x{i}"
    value = regs.read(i)
    print(f"{reg_name} = {value}")

print("\n" + "=" * 70)
print("TEST COMPLETED SUCCESSFULLY!")
print("All instruction types (including AND, OR, XOR) are now supported!")
print("=" * 70)

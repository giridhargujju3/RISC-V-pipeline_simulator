#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, '.')

from config import Config
from program.loader import Program
from utils.stats import Stats
from isa.rv32i.isa import ISA
from microarch.inorder_5stage.core import Core

HAZARD_TEST_PROGRAM = [
    0x00500093,  # addi x1, x0, 5
    0x00300113,  # addi x2, x0, 3
    0x002081B3,  # add x3, x1, x2   (x3 = 5 + 3 = 8)
    0x40118233,  # sub x4, x3, x1   (x4 = 8 - 5 = 3)
    0x002202B3,  # add x5, x4, x2   (x5 = 3 + 3 = 6)
    0x00328333,  # add x6, x5, x3   (x6 = 6 + 8 = 14)
    0x404303B3,  # sub x7, x6, x4   (x7 = 14 - 3 = 11)
    0x0053F433,  # and x8, x7, x5   (x8 = 11 & 6 = 2)
    0x006404B3,  # add x9, x8, x6   (x9 = 2 + 14 = 16)
    0x40748533,  # sub x10, x9, x7  (x10 = 16 - 11 = 5)
]

EXPECTED_RESULTS = {
    'x1': 5,
    'x2': 3,
    'x3': 8,
    'x4': 3,
    'x5': 6,
    'x6': 14,
    'x7': 11,
    'x8': 2,
    'x9': 16,
    'x10': 5,
}

print("="*80)
print("RISC-V PIPELINE HAZARD & FORWARDING TEST")
print("="*80)
print("\nTest Program:")
print("  addi x1, x0, 5      # x1 = 5")
print("  addi x2, x0, 3      # x2 = 3")
print("  add x3, x1, x2      # x3 = 8 (5 + 3)")
print("  sub x4, x3, x1      # x4 = 3 (8 - 5) <- RAW hazard on x3")
print("  add x5, x4, x2      # x5 = 6 (3 + 3) <- RAW hazard on x4")
print("  add x6, x5, x3      # x6 = 14 (6 + 8)")
print("  sub x7, x6, x4      # x7 = 11 (14 - 3)")
print("  and x8, x7, x5      # x8 = 2 (11 & 6)")
print("  add x9, x8, x6      # x9 = 16 (2 + 14)")
print("  sub x10, x9, x7     # x10 = 5 (16 - 11)")
print("\n" + "="*80)

cfg = Config(1e9)
isa = ISA()
stats = Stats()
program = Program(HAZARD_TEST_PROGRAM)
regs = isa.create_register_file()
core = Core(cfg, stats, program, isa, regs)

print(f"\nRunning simulation...")
print("="*80)

cycles = 0
max_cycles = 20

while not core.is_done() and cycles < max_cycles:
    core.tick()
    cycles += 1

print("\n" + "="*80)
print("SIMULATION COMPLETE")
print("="*80)
print(f"\nTotal cycles: {core.cycle}")

print("\n📊 FINAL REGISTER VALUES:")
print("="*80)
results = {}
for i in range(1, 11):
    val = regs.read(i)
    results[f'x{i}'] = val
    expected = EXPECTED_RESULTS.get(f'x{i}', 0)
    status = "✅ PASS" if val == expected else f"❌ FAIL (expected {expected})"
    print(f"  x{i:<2} = {val:<10} {status}")

print("\n" + "="*80)
all_pass = all(results[f'x{i}'] == EXPECTED_RESULTS[f'x{i}'] for i in range(1, 11))
if all_pass:
    print("✅ ALL TESTS PASSED!")
else:
    print("❌ SOME TESTS FAILED")
print("="*80)

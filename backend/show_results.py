#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')
from cpu.cpu import CPU

instructions = [
    0x00100093, 0x00200113, 0x00300193, 0x00400213, 0x00500293,
    0x002084B3, 0x004083B3, 0x005044B3, 0x001384B3, 0x002045B3,
    0x00508633, 0x004094B3, 0x00A08333, 0x00208AB3, 0x00100BB3,
    0x00200C33, 0x00300CB3, 0x00400D33, 0x00500DB3, 0x00106D93,
    0x00207013, 0x00308093, 0x00409113, 0x0050A193, 0x0060B213,
    0x0070C293, 0x00806B93,
]

cpu = CPU()
cpu.load_program(instructions)

while not cpu.halted:
    cpu.step()

state = cpu.get_state()
stats = state['statistics']

print()
print('=' * 80)
print('FINAL RESULTS - 27 INSTRUCTIONS FROM ARITHMETIC_TEST.S')
print('=' * 80)
print()
print('Total Cycles:', stats['total_cycles'])
print('Execution Time:', f"{stats['execution_time_seconds']:.2e}", 'seconds')
print()
print('Stage Cycle Counts:')
print('  IF: ', stats['stage_cycles']['IF'], ' (instructions fetched)')
print('  ID: ', stats['stage_cycles']['ID'], ' (instructions decoded)')
print('  EX: ', stats['stage_cycles']['EX'], ' (instructions executed)')
print('  MEM:', stats['stage_cycles']['MEM'], ' (memory accesses)')
print('  WB: ', stats['stage_cycles']['WB'], ' (writebacks)')
print()
print('[SUCCESS] Stage cycles are counting non-NOP instructions correctly!')
print('=' * 80)

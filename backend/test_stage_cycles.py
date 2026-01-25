#!/usr/bin/env python3
"""
Test script to verify stage_cycles counting is correct
"""

import sys
sys.path.insert(0, 'C:\\Users\\Seai_\\Downloads\\pipeline-pal-main\\pipeline-pal-main\\backend')

from cpu.cpu import CPU

def test_stage_cycles():
    """Test that stage_cycles counts only real instructions (not NOPs/bubbles)"""
    
    # Create CPU and load 10 instructions
    cpu = CPU()
    
    # Simple test program (10 arithmetic instructions)
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
    ]
    
    print("=" * 80)
    print("STAGE CYCLES TEST - 10 INSTRUCTIONS")
    print("=" * 80)
    print(f"\nLoading {len(instructions)} instructions...\n")
    
    cpu.load_program(instructions)
    
    # Run for 14 cycles (10 instructions + 4 pipeline fill cycles)
    # But stop when CPU halts naturally
    print("\nExecuting until CPU halts...\n")
    
    while not cpu.halted:
        cpu.step()
    
    # Print final statistics
    print("\n" + "=" * 80)
    print("FINAL STATISTICS")
    print("=" * 80)
    
    state = cpu.get_state()
    stats = state['statistics']
    
    print(f"\nTotal Cycles: {stats['total_cycles']}")
    print(f"Execution Time: {stats['execution_time_seconds']:.2e} seconds")
    print(f"\nStage Cycle Counts:")
    print(f"  IF: {stats['stage_cycles']['IF']}")
    print(f"  ID: {stats['stage_cycles']['ID']}")
    print(f"  EX: {stats['stage_cycles']['EX']}")
    print(f"  MEM: {stats['stage_cycles']['MEM']}")
    print(f"  WB: {stats['stage_cycles']['WB']}")
    
    print(f"\nExpected Counts (10 instructions, halts on cycle 11):")
    print(f"  IF: 10 (fetches during cycles 1-10)")
    print(f"  ID: 10 (10th instruction in ID stage on cycle 11)")
    print(f"  EX: 9  (only 9 instructions reach EX before halt)")
    print(f"  MEM: 8 (only 8 instructions reach MEM before halt)")
    print(f"  WB: 8  (only 8 instructions reach WB before halt)")
    
    # Verify counts
    # For 10 instructions in a 5-stage pipeline:
    # - Cycles 1-5: Pipeline filling (IF fetches, but later stages don't have instructions yet)
    # - Cycles 6-10: Steady state (all 5 stages active with real instructions)
    # - Cycles 11+: Pipeline draining (new instructions stop, old ones drain through)
    #
    # Correct expected counts (depends on when CPU halts):
    # When CPU halts after cycle 11 (after fetching 10 instructions):
    # - IF: 10 (fetched instructions 1-10 in cycles 1-10, halts at cycle 11)
    # - ID: 10 (10th instruction is in ID/EX on cycle 11)
    # - EX: 9  (only 9 instructions reach EX before cycle 11)
    # - MEM: 8 (only 8 instructions reach MEM before cycle 11)
    # - WB: 8  (only 8 instructions reach WB before cycle 11)
    
    expected = {
        "IF": 10,
        "ID": 10,
        "EX": 9,
        "MEM": 8,
        "WB": 8
    }
    
    print("\n" + "=" * 80)
    print("VERIFICATION")
    print("=" * 80)
    
    all_correct = True
    for stage, expected_count in expected.items():
        actual_count = stats['stage_cycles'][stage]
        status = "[PASS]" if actual_count == expected_count else "[FAIL]"
        print(f"{stage}: {actual_count} (expected {expected_count}) {status}")
        if actual_count != expected_count:
            all_correct = False
    
    if all_correct:
        print("\n[SUCCESS] ALL TESTS PASSED - Stage cycles are counting correctly!")
    else:
        print("\n[ERROR] SOME TESTS FAILED - Check the counts above")
    
    return all_correct

if __name__ == "__main__":
    success = test_stage_cycles()
    sys.exit(0 if success else 1)

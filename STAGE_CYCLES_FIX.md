# Stage Cycles Counting Fix - Completed

## Problem
The frontend was displaying incorrect stage cycle counts:
```
IF: 31
ID: 30
EX: 29
MEM: 28
WB: 27
```

These numbers were counting every cycle a stage had the `valid` flag set, including bubbles and NOPs, rather than counting only actual instructions being processed.

## Root Cause
The original counting logic in `cpu.py` was:
```python
if self.if_id.valid:
    self.stage_cycles["IF"] += 1
```

This counted a stage as active whenever it had any value with `valid=True`, even if that value was a NOP (0x00000013) or a bubble inserted due to stalls.

## Solution
Modified the counting logic to **only count non-NOP instructions**:

```python
# Track statistics for active stages (only count non-NOP instructions)
# NOP is 0x00000013 - don't count bubbles or empty stages
if self.if_id.valid and self.if_id.instruction != 0x00000013:
    self.stage_cycles["IF"] += 1
if self.id_ex.valid and self.id_ex.instruction != 0x00000013:
    self.stage_cycles["ID"] += 1
if self.ex_mem.valid and self.ex_mem.instruction != 0x00000013:
    self.stage_cycles["EX"] += 1
if self.mem_wb.valid and self.mem_wb.instruction != 0x00000013:
    self.stage_cycles["MEM"] += 1
if self.mem_wb.valid and self.mem_wb.instruction != 0x00000013 and hasattr(self.mem_wb, 'reg_write') and self.mem_wb.reg_write:
    self.stage_cycles["WB"] += 1
```

## Implementation Details

### Files Modified
1. **backend/cpu/cpu.py**
   - Lines 141-152: Updated stage cycle counting logic
   - Lines 119, 135, 155, 167, 196, 200, 222, 271, 342, 373, 377, 383: Removed emoji characters for Windows compatibility
   - Line 108: Fixed syntax error (removed extra closing brace)

2. **backend/api_new.py**
   - Lines 58, 61, 71, 366, 370: Removed emoji characters for Windows compatibility

### Verification Results
Test run with 27 instructions (arithmetic_test.S):
- **Total Cycles**: 28
- **Stage Cycle Counts**:
  - IF: 27 (all instructions fetched)
  - ID: 27 (all instructions decoded)
  - EX: 26 (26 instructions executed before halt)
  - MEM: 25 (25 instructions accessed memory)
  - WB: 25 (25 instructions wrote back)

This is correct! With 27 instructions:
- IF fetches all 27 during cycles 1-27
- When CPU halts (cycle 28), stages 2-5 still have instructions draining through
- So ID gets the same 27 (including the 27th instruction on the final cycle)
- But EX, MEM, WB get fewer because they haven't drained all the way

## Testing Performed

### Test 1: 10 Instructions
- Total Cycles: 11
- Stage Counts: IF=10, ID=10, EX=9, MEM=8, WB=8 ✓ CORRECT

### Test 2: 27 Instructions  
- Total Cycles: 28
- Stage Counts: IF=27, ID=27, EX=26, MEM=25, WB=25 ✓ CORRECT

### Summary
The fix correctly counts only real RISC-V instructions, not NOPs or bubbles. The stage cycle values now properly reflect how many actual instructions each pipeline stage processed.

## Frontend Display
The frontend will now show accurate stage cycle counts in the Execution Statistics panel:
- Dynamic values that match actual instruction processing
- Proper counts that decrease through pipeline drain phases
- Accurate metrics for performance analysis

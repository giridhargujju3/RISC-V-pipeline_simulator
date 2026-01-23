# Assembly Error Troubleshooting Guide

## Common Assembly Errors and Solutions

### 1. "Invalid characters in assembly"

**Error Message**: `Line X: Invalid characters in assembly`

**Cause**: The assembler only accepts specific characters in assembly code.

**Allowed Characters**:
- Letters: `a-z`, `A-Z`
- Numbers: `0-9`
- Spaces and tabs
- Commas: `,`
- Parentheses: `(`, `)`
- Hash for comments: `#`
- Period: `.`
- Colon for labels: `:`
- Underscore: `_`
- Plus sign: `+`
- Dollar sign: `$`

**Common Invalid Characters**:
- Curly braces: `{`, `}`
- Square brackets: `[`, `]`
- Semicolon: `;`
- Quotation marks: `"`, `'`
- Backslash: `\`

**Solution**: Remove or replace invalid characters.

**Example**:
```assembly
# ❌ Wrong
add x1, x2, x3;  # semicolon not allowed

# ✅ Correct
add x1, x2, x3   # use hash for comments
```

### 2. "Unknown instruction"

**Error Message**: `Line X: Unknown instruction: [instruction]`

**Cause**: The instruction is not supported or misspelled.

**Supported Instructions**:
- **R-type**: `add`, `sub`, `and`, `or`, `xor`, `sll`, `srl`, `sra`, `slt`, `sltu`
- **I-type**: `addi`, `andi`, `ori`, `xori`, `slti`, `sltiu`, `lw`, `jalr`
- **S-type**: `sw`
- **B-type**: `beq`, `bne`, `blt`, `bge`, `bltu`, `bgeu`
- **U-type**: `lui`, `auipc`
- **J-type**: `jal`
- **Pseudo**: `nop`

**Solution**: Check spelling and use supported instructions.

**Example**:
```assembly
# ❌ Wrong
mov x1, x2        # mov not supported in RISC-V

# ✅ Correct
add x1, x2, x0    # use add with x0 to move
```

### 3. "Invalid register"

**Error Message**: `Line X: Invalid register: [register]`

**Cause**: Register name is incorrect or not supported.

**Valid Registers**:
- **Numbered**: `x0` to `x31`
- **Aliases**: `zero`, `ra`, `sp`, `gp`, `tp`, `t0-t6`, `s0-s11`, `a0-a7`, `fp`

**Solution**: Use correct register names.

**Example**:
```assembly
# ❌ Wrong
add r1, r2, r3    # r1, r2, r3 not valid in RISC-V

# ✅ Correct
add x1, x2, x3    # use x1, x2, x3
add t0, t1, t2    # or use aliases
```

### 4. "Invalid lw syntax" / "Invalid sw syntax"

**Error Message**: `Line X: Invalid lw syntax` or `Invalid sw syntax`

**Cause**: Incorrect memory instruction format.

**Correct Format**:
- Load: `lw rd, offset(rs1)`
- Store: `sw rs2, offset(rs1)`

**Solution**: Use proper syntax with parentheses.

**Example**:
```assembly
# ❌ Wrong
lw x1, x2, 4      # incorrect format
sw x1, x2, 8      # incorrect format

# ✅ Correct
lw x1, 4(x2)      # load from address x2+4 into x1
sw x1, 8(x2)      # store x1 to address x2+8
```

### 5. Label-related errors

**Error Message**: `Line X: Label not found: [label]`

**Cause**: Branch/jump instruction references undefined label.

**Solution**: Define labels before using them.

**Example**:
```assembly
# ❌ Wrong
beq x1, x2, end   # 'end' not defined yet
add x3, x1, x2
end:

# ✅ Correct
loop:
  add x3, x1, x2
  beq x1, x2, end
  bne x1, x0, loop
end:
  nop
```

### 6. Immediate value errors

**Error Message**: Various errors related to immediate values

**Cause**: Immediate values out of range or incorrect format.

**Immediate Ranges**:
- **I-type**: -2048 to 2047 (12-bit signed)
- **S-type**: -2048 to 2047 (12-bit signed)
- **B-type**: -4096 to 4094, even numbers only (13-bit signed)
- **U-type**: 0 to 1048575 (20-bit unsigned)
- **J-type**: -1048576 to 1048574, even numbers only (21-bit signed)

**Solution**: Use values within valid ranges.

**Example**:
```assembly
# ❌ Wrong
addi x1, x0, 5000  # 5000 > 2047, out of range

# ✅ Correct
lui x1, 1          # load upper immediate
addi x1, x1, 904   # add lower part (1*4096 + 904 = 5000)
```

## Best Practices

### 1. Use Comments Effectively
```assembly
# Good commenting
addi x1, x0, 10    # Initialize counter to 10
add x2, x1, x0     # Copy counter to x2
```

### 2. Consistent Register Usage
```assembly
# Use meaningful register aliases
addi t0, zero, 5   # temporary register for loop counter
addi s0, zero, 0   # saved register for accumulator
```

### 3. Proper Label Naming
```assembly
# Use descriptive labels
main_loop:
  # loop body
  bne t0, zero, main_loop
exit_program:
  nop
```

### 4. Handle Edge Cases
```assembly
# Check for zero before division-like operations
beq x2, zero, skip_operation
# ... division logic ...
skip_operation:
  nop
```

## Debugging Tips

1. **Start Simple**: Begin with basic instructions and gradually add complexity
2. **Check Syntax**: Ensure proper spacing and punctuation
3. **Verify Registers**: Double-check register names and aliases
4. **Test Incrementally**: Add one instruction at a time
5. **Use Examples**: Start with provided example programs
6. **Read Error Messages**: Error messages usually indicate the exact problem

## Quick Reference

### Instruction Format Examples
```assembly
# R-type: op rd, rs1, rs2
add x1, x2, x3

# I-type: op rd, rs1, imm
addi x1, x2, 100

# S-type: op rs2, imm(rs1)
sw x1, 4(x2)

# B-type: op rs1, rs2, label
beq x1, x2, loop

# U-type: op rd, imm
lui x1, 0x10000

# J-type: op rd, label
jal x1, function
```

### Register Quick Reference
```
x0/zero  - Always 0
x1/ra    - Return address
x2/sp    - Stack pointer
x5-x7    - t0-t2 (temporaries)
x10-x17  - a0-a7 (arguments)
x18-x27  - s2-s11 (saved)
x28-x31  - t3-t6 (temporaries)
```
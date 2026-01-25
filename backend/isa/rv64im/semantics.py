def execute(instr, regs):
    if instr.name == "nop":
        return 0
    
    if instr.name == "add":
        return regs.read(instr.rs1) + regs.read(instr.rs2)

    if instr.name == "sub":
        return regs.read(instr.rs1) - regs.read(instr.rs2)

    if instr.name == "addi":
        return regs.read(instr.rs1) + instr.imm
    
    # M Extension
    if instr.name == "mul":
        return regs.read(instr.rs1) * regs.read(instr.rs2)
    
    if instr.name == "div":
        rs1_val = regs.read(instr.rs1)
        rs2_val = regs.read(instr.rs2)
        if rs2_val == 0:
            return -1  # Division by zero returns -1 per RISC-V spec
        return rs1_val // rs2_val
    
    if instr.name == "rem":
        rs1_val = regs.read(instr.rs1)
        rs2_val = regs.read(instr.rs2)
        if rs2_val == 0:
            return rs1_val  # Remainder by zero returns dividend per RISC-V spec
        return rs1_val % rs2_val

    raise RuntimeError(f"No semantics for {instr.name}")

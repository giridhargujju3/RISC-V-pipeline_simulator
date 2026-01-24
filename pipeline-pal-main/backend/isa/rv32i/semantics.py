def execute(instr, regs):
    if instr.name == "nop":
        return 0
    
    if instr.name == "add":
        return regs.read(instr.rs1) + regs.read(instr.rs2)

    if instr.name == "sub":
        return regs.read(instr.rs1) - regs.read(instr.rs2)

    if instr.name == "addi":
        return regs.read(instr.rs1) + instr.imm

    raise RuntimeError(f"No semantics for {instr.name}")

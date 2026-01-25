def execute(instr, regs):
    if instr.name == "nop":
        return 0
    
    # Arithmetic
    if instr.name == "add":
        return regs.read(instr.rs1) + regs.read(instr.rs2)
    if instr.name == "sub":
        return regs.read(instr.rs1) - regs.read(instr.rs2)
    if instr.name == "addi":
        return regs.read(instr.rs1) + instr.imm

    # Bitwise
    if instr.name == "and":
        return regs.read(instr.rs1) & regs.read(instr.rs2)
    if instr.name == "andi":
        return regs.read(instr.rs1) & instr.imm
    if instr.name == "or":
        return regs.read(instr.rs1) | regs.read(instr.rs2)
    if instr.name == "ori":
        return regs.read(instr.rs1) | instr.imm
    if instr.name == "xor":
        return regs.read(instr.rs1) ^ regs.read(instr.rs2)
    if instr.name == "xori":
        return regs.read(instr.rs1) ^ instr.imm

    # Shift
    if instr.name == "sll":
        return regs.read(instr.rs1) << (regs.read(instr.rs2) & 0x1F)
    if instr.name == "slli":
        return regs.read(instr.rs1) << (instr.imm & 0x1F)
    if instr.name == "srl":
        return regs.read(instr.rs1) >> (regs.read(instr.rs2) & 0x1F)
    if instr.name == "srli":
        return regs.read(instr.rs1) >> (instr.imm & 0x1F)
    if instr.name == "sra":
        val = regs.read(instr.rs1)
        shift = regs.read(instr.rs2) & 0x1F
        if val & 0x80000000:
            return (val >> shift) | ((0xFFFFFFFF << (32 - shift)) & 0xFFFFFFFF)
        else:
            return val >> shift
    if instr.name == "srai":
        val = regs.read(instr.rs1)
        if val & 0x80000000:
            return (val >> instr.imm) | ((0xFFFFFFFF << (32 - instr.imm)) & 0xFFFFFFFF)
        else:
            return val >> instr.imm

    # Compare
    if instr.name == "slt":
        return 1 if regs.read(instr.rs1) < regs.read(instr.rs2) else 0
    if instr.name == "slti":
        return 1 if regs.read(instr.rs1) < instr.imm else 0
    if instr.name == "sltu":
        return 1 if (regs.read(instr.rs1) & 0xFFFFFFFF) < (regs.read(instr.rs2) & 0xFFFFFFFF) else 0
    if instr.name == "sltiu":
        return 1 if (regs.read(instr.rs1) & 0xFFFFFFFF) < (instr.imm & 0xFFFFFFFF) else 0

    raise RuntimeError(f"No semantics for {instr.name}")

from isa.rv32i.instruction import Instruction

def sign_extend(val, bits):
    if val & (1 << (bits - 1)):
        val |= -1 << bits
    return val

def decode(bits):
    opcode = bits & 0x7F
    rd = (bits >> 7) & 0x1F
    funct3 = (bits >> 12) & 0x7
    rs1 = (bits >> 15) & 0x1F
    rs2 = (bits >> 20) & 0x1F
    funct7 = (bits >> 25) & 0x7F
    imm_i = sign_extend(bits >> 20, 12)
    shamt = (bits >> 20) & 0x1F

    # NOP (addi x0, x0, 0)
    if bits == 0x00000013:
        return Instruction("nop", rd=0, rs1=0, imm=0)

    # R-TYPE INSTRUCTIONS (opcode = 0x33)
    if opcode == 0x33:
        if funct3 == 0x0 and funct7 == 0x00:
            return Instruction("add", rd, rs1, rs2)
        if funct3 == 0x0 and funct7 == 0x20:
            return Instruction("sub", rd, rs1, rs2)
        if funct3 == 0x4 and funct7 == 0x00:
            return Instruction("xor", rd, rs1, rs2)
        if funct3 == 0x6 and funct7 == 0x00:
            return Instruction("or", rd, rs1, rs2)
        if funct3 == 0x7 and funct7 == 0x00:
            return Instruction("and", rd, rs1, rs2)
        if funct3 == 0x1 and funct7 == 0x00:
            return Instruction("sll", rd, rs1, rs2)
        if funct3 == 0x5 and funct7 == 0x00:
            return Instruction("srl", rd, rs1, rs2)
        if funct3 == 0x5 and funct7 == 0x20:
            return Instruction("sra", rd, rs1, rs2)
        if funct3 == 0x2 and funct7 == 0x00:
            return Instruction("slt", rd, rs1, rs2)
        if funct3 == 0x3 and funct7 == 0x00:
            return Instruction("sltu", rd, rs1, rs2)

    # I-TYPE INSTRUCTIONS (opcode = 0x13)
    if opcode == 0x13:
        if funct3 == 0x0:
            return Instruction("addi", rd, rs1, imm=imm_i)
        if funct3 == 0x4:
            return Instruction("xori", rd, rs1, imm=imm_i)
        if funct3 == 0x6:
            return Instruction("ori", rd, rs1, imm=imm_i)
        if funct3 == 0x7:
            return Instruction("andi", rd, rs1, imm=imm_i)
        if funct3 == 0x1 and funct7 == 0x00:
            return Instruction("slli", rd, rs1, imm=shamt)
        if funct3 == 0x5 and funct7 == 0x00:
            return Instruction("srli", rd, rs1, imm=shamt)
        if funct3 == 0x5 and funct7 == 0x20:
            return Instruction("srai", rd, rs1, imm=shamt)
        if funct3 == 0x2:
            return Instruction("slti", rd, rs1, imm=imm_i)
        if funct3 == 0x3:
            return Instruction("sltiu", rd, rs1, imm=imm_i)

    # Load/Store instructions (optional)
    if opcode == 0x03:  # LOAD
        if funct3 == 0x2:
            return Instruction("lw", rd, rs1, imm=imm_i)
        if funct3 == 0x0:
            return Instruction("lb", rd, rs1, imm=imm_i)
        if funct3 == 0x1:
            return Instruction("lh", rd, rs1, imm=imm_i)

    if opcode == 0x23:  # STORE
        imm_s = sign_extend(((bits >> 25) << 5) | ((bits >> 7) & 0x1F), 12)
        if funct3 == 0x2:
            return Instruction("sw", None, rs1, rs2, imm=imm_s)
        if funct3 == 0x0:
            return Instruction("sb", None, rs1, rs2, imm=imm_s)
        if funct3 == 0x1:
            return Instruction("sh", None, rs1, rs2, imm=imm_s)

    raise RuntimeError(f"Unsupported instruction: 0x{bits:08x}")

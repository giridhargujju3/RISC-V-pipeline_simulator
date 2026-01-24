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

    # NOP (addi x0, x0, 0)
    if bits == 0x00000013:
        return Instruction("nop", rd=0, rs1=0, imm=0)

    # ADD / SUB
    if opcode == 0x33:
        if funct3 == 0x0 and funct7 == 0x00:
            return Instruction("add", rd, rs1, rs2)
        if funct3 == 0x0 and funct7 == 0x20:
            return Instruction("sub", rd, rs1, rs2)

    # ADDI
    if opcode == 0x13 and funct3 == 0x0:
        imm = sign_extend(bits >> 20, 12)
        return Instruction("addi", rd, rs1, imm=imm)

    raise RuntimeError(f"Unsupported instruction: 0x{bits:08x}")

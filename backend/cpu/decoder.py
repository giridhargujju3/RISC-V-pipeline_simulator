# RISC-V Instruction Decoder
# Extracts fields from 32-bit machine code instructions

from dataclasses import dataclass
from typing import Optional

@dataclass
class DecodedInstruction:
    """Decoded instruction fields"""
    raw: int           # Original 32-bit instruction
    opcode: int        # bits [6:0]
    rd: int            # bits [11:7]
    funct3: int        # bits [14:12]
    rs1: int           # bits [19:15]
    rs2: int           # bits [24:20]
    funct7: int        # bits [31:25]
    imm: int           # Immediate value (sign-extended)
    inst_type: str     # R, I, S, B, U, J
    assembly: str      # Human-readable assembly


def sign_extend(value: int, bits: int) -> int:
    """Sign extend a value from given bit width to 32 bits"""
    sign_bit = 1 << (bits - 1)
    return (value & (sign_bit - 1)) - (value & sign_bit)


def decode_instruction(instr: int) -> DecodedInstruction:
    """Decode a 32-bit RISC-V instruction"""
    
    # Extract common fields
    opcode = instr & 0x7F
    rd = (instr >> 7) & 0x1F
    funct3 = (instr >> 12) & 0x7
    rs1 = (instr >> 15) & 0x1F
    rs2 = (instr >> 20) & 0x1F
    funct7 = (instr >> 25) & 0x7F
    
    # Determine instruction type and immediate
    imm = 0
    inst_type = "UNKNOWN"
    assembly = "UNKNOWN"
    
    if opcode == 0x33:  # R-type (ADD, SUB, AND, OR, XOR, SLL, SRL, SRA, SLT, SLTU)
        inst_type = "R"
        imm = 0
        
        if funct3 == 0x0:
            if funct7 == 0x00:
                assembly = f"add x{rd}, x{rs1}, x{rs2}"
            elif funct7 == 0x20:
                assembly = f"sub x{rd}, x{rs1}, x{rs2}"
        elif funct3 == 0x7:
            assembly = f"and x{rd}, x{rs1}, x{rs2}"
        elif funct3 == 0x6:
            assembly = f"or x{rd}, x{rs1}, x{rs2}"
        elif funct3 == 0x4:
            assembly = f"xor x{rd}, x{rs1}, x{rs2}"
        elif funct3 == 0x1:
            assembly = f"sll x{rd}, x{rs1}, x{rs2}"
        elif funct3 == 0x5:
            if funct7 == 0x00:
                assembly = f"srl x{rd}, x{rs1}, x{rs2}"
            elif funct7 == 0x20:
                assembly = f"sra x{rd}, x{rs1}, x{rs2}"
        elif funct3 == 0x2:
            assembly = f"slt x{rd}, x{rs1}, x{rs2}"
        elif funct3 == 0x3:
            assembly = f"sltu x{rd}, x{rs1}, x{rs2}"
    
    elif opcode == 0x13:  # I-type ALU (ADDI, ANDI, ORI, XORI, SLTI, SLTIU, SLLI, SRLI, SRAI)
        inst_type = "I"
        imm = sign_extend((instr >> 20) & 0xFFF, 12)
        
        if funct3 == 0x0:
            assembly = f"addi x{rd}, x{rs1}, {imm}"
        elif funct3 == 0x7:
            assembly = f"andi x{rd}, x{rs1}, {imm}"
        elif funct3 == 0x6:
            assembly = f"ori x{rd}, x{rs1}, {imm}"
        elif funct3 == 0x4:
            assembly = f"xori x{rd}, x{rs1}, {imm}"
        elif funct3 == 0x2:
            assembly = f"slti x{rd}, x{rs1}, {imm}"
        elif funct3 == 0x3:
            assembly = f"sltiu x{rd}, x{rs1}, {imm}"
        elif funct3 == 0x1:
            shamt = rs2
            assembly = f"slli x{rd}, x{rs1}, {shamt}"
        elif funct3 == 0x5:
            shamt = rs2
            if funct7 == 0x00:
                assembly = f"srli x{rd}, x{rs1}, {shamt}"
            elif funct7 == 0x20:
                assembly = f"srai x{rd}, x{rs1}, {shamt}"
    
    elif opcode == 0x03:  # I-type Load (LB, LH, LW, LBU, LHU)
        inst_type = "I"
        imm = sign_extend((instr >> 20) & 0xFFF, 12)
        
        if funct3 == 0x0:
            assembly = f"lb x{rd}, {imm}(x{rs1})"
        elif funct3 == 0x1:
            assembly = f"lh x{rd}, {imm}(x{rs1})"
        elif funct3 == 0x2:
            assembly = f"lw x{rd}, {imm}(x{rs1})"
        elif funct3 == 0x4:
            assembly = f"lbu x{rd}, {imm}(x{rs1})"
        elif funct3 == 0x5:
            assembly = f"lhu x{rd}, {imm}(x{rs1})"
    
    elif opcode == 0x23:  # S-type (SB, SH, SW)
        inst_type = "S"
        imm = sign_extend(((instr >> 25) << 5) | ((instr >> 7) & 0x1F), 12)
        
        if funct3 == 0x0:
            assembly = f"sb x{rs2}, {imm}(x{rs1})"
        elif funct3 == 0x1:
            assembly = f"sh x{rs2}, {imm}(x{rs1})"
        elif funct3 == 0x2:
            assembly = f"sw x{rs2}, {imm}(x{rs1})"
    
    elif opcode == 0x63:  # B-type (BEQ, BNE, BLT, BGE, BLTU, BGEU)
        inst_type = "B"
        imm = sign_extend(
            (((instr >> 31) & 0x1) << 12) |
            (((instr >> 7) & 0x1) << 11) |
            (((instr >> 25) & 0x3F) << 5) |
            (((instr >> 8) & 0xF) << 1),
            13
        )
        
        if funct3 == 0x0:
            assembly = f"beq x{rs1}, x{rs2}, {imm}"
        elif funct3 == 0x1:
            assembly = f"bne x{rs1}, x{rs2}, {imm}"
        elif funct3 == 0x4:
            assembly = f"blt x{rs1}, x{rs2}, {imm}"
        elif funct3 == 0x5:
            assembly = f"bge x{rs1}, x{rs2}, {imm}"
        elif funct3 == 0x6:
            assembly = f"bltu x{rs1}, x{rs2}, {imm}"
        elif funct3 == 0x7:
            assembly = f"bgeu x{rs1}, x{rs2}, {imm}"
    
    elif opcode == 0x37:  # U-type LUI
        inst_type = "U"
        imm = instr & 0xFFFFF000
        assembly = f"lui x{rd}, {imm >> 12}"
    
    elif opcode == 0x17:  # U-type AUIPC
        inst_type = "U"
        imm = instr & 0xFFFFF000
        assembly = f"auipc x{rd}, {imm >> 12}"
    
    elif opcode == 0x6F:  # J-type JAL
        inst_type = "J"
        imm = sign_extend(
            (((instr >> 31) & 0x1) << 20) |
            (((instr >> 12) & 0xFF) << 12) |
            (((instr >> 20) & 0x1) << 11) |
            (((instr >> 21) & 0x3FF) << 1),
            21
        )
        assembly = f"jal x{rd}, {imm}"
    
    elif opcode == 0x67:  # I-type JALR
        inst_type = "I"
        imm = sign_extend((instr >> 20) & 0xFFF, 12)
        assembly = f"jalr x{rd}, x{rs1}, {imm}"
    
    elif instr == 0x00000013:  # NOP (addi x0, x0, 0)
        inst_type = "I"
        imm = 0
        assembly = "nop"
    
    return DecodedInstruction(
        raw=instr,
        opcode=opcode,
        rd=rd,
        funct3=funct3,
        rs1=rs1,
        rs2=rs2,
        funct7=funct7,
        imm=imm,
        inst_type=inst_type,
        assembly=assembly
    )

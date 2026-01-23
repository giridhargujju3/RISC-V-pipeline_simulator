# RISC-V ALU (Arithmetic Logic Unit)
# Performs arithmetic and logic operations

from dataclasses import dataclass

@dataclass
class ALUResult:
    """ALU computation result"""
    result: int
    zero: bool
    negative: bool
    overflow: bool


def to_signed(value: int) -> int:
    """Convert unsigned 32-bit to signed"""
    if value & 0x80000000:
        return value - 0x100000000
    return value


def alu_execute(operand_a: int, operand_b: int, operation: str, pc: int = 0, imm: int = 0) -> ALUResult:
    """Execute ALU operation"""
    
    # Ensure 32-bit values
    a = operand_a & 0xFFFFFFFF
    b = operand_b & 0xFFFFFFFF
    
    result = 0
    
    if operation == "ADD":
        result = (a + b) & 0xFFFFFFFF
    
    elif operation == "SUB":
        result = (a - b) & 0xFFFFFFFF
    
    elif operation == "AND":
        result = a & b
    
    elif operation == "OR":
        result = a | b
    
    elif operation == "XOR":
        result = a ^ b
    
    elif operation == "SLL":
        # Shift left logical
        shamt = b & 0x1F  # Only lower 5 bits
        result = (a << shamt) & 0xFFFFFFFF
    
    elif operation == "SRL":
        # Shift right logical
        shamt = b & 0x1F
        result = a >> shamt
    
    elif operation == "SRA":
        # Shift right arithmetic
        shamt = b & 0x1F
        signed_a = to_signed(a)
        result = (signed_a >> shamt) & 0xFFFFFFFF
    
    elif operation == "SLT":
        # Set less than (signed)
        result = 1 if to_signed(a) < to_signed(b) else 0
    
    elif operation == "SLTU":
        # Set less than unsigned
        result = 1 if a < b else 0
    
    elif operation == "LUI":
        # Load upper immediate
        result = imm & 0xFFFFF000
    
    elif operation == "AUIPC":
        # Add upper immediate to PC
        result = (pc + (imm & 0xFFFFF000)) & 0xFFFFFFFF
    
    elif operation == "JAL":
        # Jump and link - return address
        result = (pc + 4) & 0xFFFFFFFF
    
    elif operation == "JALR":
        # Jump and link register - return address
        result = (pc + 4) & 0xFFFFFFFF
    
    zero = (result == 0)
    negative = bool(result & 0x80000000)
    
    # Simplified overflow detection for ADD/SUB
    overflow = False
    if operation == "ADD":
        a_sign = bool(a & 0x80000000)
        b_sign = bool(b & 0x80000000)
        r_sign = bool(result & 0x80000000)
        overflow = (a_sign == b_sign) and (a_sign != r_sign)
    elif operation == "SUB":
        a_sign = bool(a & 0x80000000)
        b_sign = bool(b & 0x80000000)
        r_sign = bool(result & 0x80000000)
        overflow = (a_sign != b_sign) and (a_sign != r_sign)
    
    return ALUResult(
        result=result,
        zero=zero,
        negative=negative,
        overflow=overflow
    )


def branch_evaluate(rs1_val: int, rs2_val: int, funct3: int) -> bool:
    """Evaluate branch condition"""
    a = rs1_val & 0xFFFFFFFF
    b = rs2_val & 0xFFFFFFFF
    
    if funct3 == 0x0:  # BEQ
        return a == b
    elif funct3 == 0x1:  # BNE
        return a != b
    elif funct3 == 0x4:  # BLT
        return to_signed(a) < to_signed(b)
    elif funct3 == 0x5:  # BGE
        return to_signed(a) >= to_signed(b)
    elif funct3 == 0x6:  # BLTU
        return a < b
    elif funct3 == 0x7:  # BGEU
        return a >= b
    
    return False

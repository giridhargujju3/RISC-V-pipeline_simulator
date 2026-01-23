# RISC-V Control Unit
# Generates control signals based on opcode and funct fields

from dataclasses import dataclass

@dataclass
class ControlSignals:
    """Control signals for the CPU"""
    reg_write: bool = False    # Write to register file
    mem_read: bool = False     # Read from data memory
    mem_write: bool = False    # Write to data memory
    mem_to_reg: bool = False   # Select memory data for register write
    alu_src: bool = False      # Select immediate (True) or rs2 (False) for ALU
    branch: bool = False       # Branch instruction
    jump: bool = False         # Jump instruction
    alu_op: str = "ADD"        # ALU operation


def generate_control_signals(opcode: int, funct3: int, funct7: int) -> ControlSignals:
    """Generate control signals based on instruction fields"""
    
    signals = ControlSignals()
    
    if opcode == 0x33:  # R-type
        signals.reg_write = True
        signals.alu_src = False
        
        if funct3 == 0x0:
            if funct7 == 0x00:
                signals.alu_op = "ADD"
            elif funct7 == 0x20:
                signals.alu_op = "SUB"
        elif funct3 == 0x7:
            signals.alu_op = "AND"
        elif funct3 == 0x6:
            signals.alu_op = "OR"
        elif funct3 == 0x4:
            signals.alu_op = "XOR"
        elif funct3 == 0x1:
            signals.alu_op = "SLL"
        elif funct3 == 0x5:
            if funct7 == 0x00:
                signals.alu_op = "SRL"
            elif funct7 == 0x20:
                signals.alu_op = "SRA"
        elif funct3 == 0x2:
            signals.alu_op = "SLT"
        elif funct3 == 0x3:
            signals.alu_op = "SLTU"
    
    elif opcode == 0x13:  # I-type ALU
        signals.reg_write = True
        signals.alu_src = True
        
        if funct3 == 0x0:
            signals.alu_op = "ADD"  # ADDI
        elif funct3 == 0x7:
            signals.alu_op = "AND"  # ANDI
        elif funct3 == 0x6:
            signals.alu_op = "OR"   # ORI
        elif funct3 == 0x4:
            signals.alu_op = "XOR"  # XORI
        elif funct3 == 0x2:
            signals.alu_op = "SLT"  # SLTI
        elif funct3 == 0x3:
            signals.alu_op = "SLTU" # SLTIU
        elif funct3 == 0x1:
            signals.alu_op = "SLL"  # SLLI
        elif funct3 == 0x5:
            if funct7 == 0x00:
                signals.alu_op = "SRL"  # SRLI
            elif funct7 == 0x20:
                signals.alu_op = "SRA"  # SRAI
    
    elif opcode == 0x03:  # Load
        signals.reg_write = True
        signals.mem_read = True
        signals.mem_to_reg = True
        signals.alu_src = True
        signals.alu_op = "ADD"
    
    elif opcode == 0x23:  # Store
        signals.mem_write = True
        signals.alu_src = True
        signals.alu_op = "ADD"
    
    elif opcode == 0x63:  # Branch
        signals.branch = True
        signals.alu_op = "SUB"  # For comparison
    
    elif opcode == 0x37:  # LUI
        signals.reg_write = True
        signals.alu_op = "LUI"
    
    elif opcode == 0x17:  # AUIPC
        signals.reg_write = True
        signals.alu_op = "AUIPC"
    
    elif opcode == 0x6F:  # JAL
        signals.reg_write = True
        signals.jump = True
        signals.alu_op = "JAL"
    
    elif opcode == 0x67:  # JALR
        signals.reg_write = True
        signals.jump = True
        signals.alu_src = True
        signals.alu_op = "JALR"
    
    return signals

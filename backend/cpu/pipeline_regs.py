# RISC-V Pipeline Registers
# IF/ID, ID/EX, EX/MEM, MEM/WB

from dataclasses import dataclass, field
from typing import Optional
from .control import ControlSignals

@dataclass
class IF_ID_Register:
    """IF/ID Pipeline Register"""
    instruction: int = 0x00000013  # NOP
    pc: int = 0
    valid: bool = False
    
    def to_dict(self) -> dict:
        return {
            "instruction": f"0x{self.instruction:08X}",
            "pc": self.pc,
            "valid": self.valid
        }


@dataclass
class ID_EX_Register:
    """ID/EX Pipeline Register"""
    instruction: int = 0x00000013
    pc: int = 0
    valid: bool = False
    
    # Decoded fields
    rd: int = 0
    rs1: int = 0
    rs2: int = 0
    rs1_value: int = 0
    rs2_value: int = 0
    immediate: int = 0
    funct3: int = 0
    funct7: int = 0
    
    # Control signals
    reg_write: bool = False
    mem_read: bool = False
    mem_write: bool = False
    mem_to_reg: bool = False
    alu_src: bool = False
    branch: bool = False
    jump: bool = False
    alu_op: str = "ADD"
    
    # Assembly for display
    assembly: str = "nop"
    
    def to_dict(self) -> dict:
        return {
            "instruction": f"0x{self.instruction:08X}",
            "assembly": self.assembly,
            "pc": self.pc,
            "valid": self.valid,
            "rd": self.rd,
            "rs1": self.rs1,
            "rs2": self.rs2,
            "rs1_value": self.rs1_value,
            "rs2_value": self.rs2_value,
            "immediate": self.immediate,
            "control_signals": {
                "regWrite": self.reg_write,
                "memRead": self.mem_read,
                "memWrite": self.mem_write,
                "memToReg": self.mem_to_reg,
                "aluSrc": self.alu_src,
                "branch": self.branch,
                "jump": self.jump,
                "aluOp": self.alu_op
            }
        }


@dataclass
class EX_MEM_Register:
    """EX/MEM Pipeline Register"""
    instruction: int = 0x00000013
    pc: int = 0
    valid: bool = False
    
    # From ID/EX
    rd: int = 0
    rs1: int = 0
    rs2: int = 0
    rs2_value: int = 0  # For store instructions
    
    # ALU result
    alu_result: int = 0
    zero: bool = False
    
    # Branch target
    branch_target: int = 0
    branch_taken: bool = False
    
    # Control signals (forwarded)
    reg_write: bool = False
    mem_read: bool = False
    mem_write: bool = False
    mem_to_reg: bool = False
    branch: bool = False
    jump: bool = False
    
    # Assembly for display
    assembly: str = "nop"
    
    def to_dict(self) -> dict:
        return {
            "instruction": f"0x{self.instruction:08X}",
            "assembly": self.assembly,
            "pc": self.pc,
            "valid": self.valid,
            "rd": self.rd,
            "rs1": self.rs1,
            "rs2": self.rs2,
            "alu_result": self.alu_result,
            "zero": self.zero,
            "branch_target": self.branch_target,
            "branch_taken": self.branch_taken
        }


@dataclass
class MEM_WB_Register:
    """MEM/WB Pipeline Register"""
    instruction: int = 0x00000013
    pc: int = 0
    valid: bool = False
    
    # From EX/MEM
    rd: int = 0
    alu_result: int = 0
    
    # Memory data (for load instructions)
    mem_data: Optional[int] = None
    
    # Control signals (forwarded)
    reg_write: bool = False
    mem_to_reg: bool = False
    
    # Assembly for display
    assembly: str = "nop"
    
    def to_dict(self) -> dict:
        return {
            "instruction": f"0x{self.instruction:08X}",
            "assembly": self.assembly,
            "pc": self.pc,
            "valid": self.valid,
            "rd": self.rd,
            "alu_result": self.alu_result,
            "mem_data": self.mem_data
        }

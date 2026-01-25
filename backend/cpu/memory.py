# RISC-V Memory Module
# Instruction Memory + Data Memory

from typing import List, Dict

class InstructionMemory:
    def __init__(self):
        self.memory: List[int] = []  # List of 32-bit instructions
        self.size = 0
    
    def load_program(self, instructions: List[int]):
        """Load a program (list of 32-bit machine code instructions)"""
        self.memory = instructions.copy()
        self.size = len(instructions) * 4  # Each instruction is 4 bytes
    
    def fetch(self, address: int) -> int:
        """Fetch instruction at given address"""
        index = address // 4
        if index < 0 or index >= len(self.memory):
            return 0x00000013  # Return NOP if out of bounds
        return self.memory[index]
    
    def get_all(self) -> List[dict]:
        """Return all instructions for display"""
        return [
            {
                "address": i * 4,
                "hex": f"0x{instr:08X}",
                "machine_code": instr
            }
            for i, instr in enumerate(self.memory)
        ]
    
    def reset(self):
        """Clear instruction memory"""
        self.memory = []
        self.size = 0


class DataMemory:
    def __init__(self, size: int = 4096):
        self.memory: Dict[int, int] = {}  # Sparse memory representation
        self.size = size
    
    def read_word(self, address: int) -> int:
        """Read 32-bit word from memory"""
        if address % 4 != 0:
            raise ValueError(f"Misaligned memory access at address: {address}")
        return self.memory.get(address, 0)
    
    def write_word(self, address: int, value: int):
        """Write 32-bit word to memory"""
        if address % 4 != 0:
            raise ValueError(f"Misaligned memory access at address: {address}")
        self.memory[address] = value & 0xFFFFFFFF
    
    def read_byte(self, address: int) -> int:
        """Read single byte from memory"""
        word_addr = (address // 4) * 4
        byte_offset = address % 4
        word = self.memory.get(word_addr, 0)
        return (word >> (byte_offset * 8)) & 0xFF
    
    def write_byte(self, address: int, value: int):
        """Write single byte to memory"""
        word_addr = (address // 4) * 4
        byte_offset = address % 4
        word = self.memory.get(word_addr, 0)
        mask = ~(0xFF << (byte_offset * 8))
        word = (word & mask) | ((value & 0xFF) << (byte_offset * 8))
        self.memory[word_addr] = word
    
    def reset(self):
        """Clear data memory"""
        self.memory = {}
    
    def get_state(self) -> dict:
        """Return memory state for API"""
        return {
            "size": self.size,
            "contents": {str(k): v for k, v in self.memory.items()}
        }

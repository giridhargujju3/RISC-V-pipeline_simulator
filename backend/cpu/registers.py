# RISC-V Register File
# 32 general-purpose registers (x0-x31)
# x0 is hardwired to 0

class RegisterFile:
    def __init__(self):
        self.regs = [0] * 32  # 32 registers initialized to 0
        self.updated_reg = None  # Track which register was last updated
    
    def read(self, reg_num: int) -> int:
        """Read value from register"""
        if reg_num < 0 or reg_num > 31:
            raise ValueError(f"Invalid register number: {reg_num}")
        return self.regs[reg_num]
    
    def write(self, reg_num: int, value: int):
        """Write value to register (x0 is always 0)"""
        if reg_num < 0 or reg_num > 31:
            raise ValueError(f"Invalid register number: {reg_num}")
        if reg_num == 0:
            return  # x0 is hardwired to 0, ignore writes
        
        # Handle 32-bit signed integers
        self.regs[reg_num] = value & 0xFFFFFFFF
        self.updated_reg = reg_num
    
    def reset(self):
        """Reset all registers to 0"""
        self.regs = [0] * 32
        self.updated_reg = None
    
    def get_state(self) -> dict:
        """Return register state for API"""
        return {
            "values": self.regs.copy(),
            "updated": self.updated_reg
        }

# ABI register names for display
REGISTER_NAMES = [
    "zero", "ra", "sp", "gp", "tp", "t0", "t1", "t2",
    "s0", "s1", "a0", "a1", "a2", "a3", "a4", "a5",
    "a6", "a7", "s2", "s3", "s4", "s5", "s6", "s7",
    "s8", "s9", "s10", "s11", "t3", "t4", "t5", "t6"
]

class Instruction:
    def __init__(self, name, rd=None, rs1=None, rs2=None, imm=None):
        self.name = name
        self.rd = rd
        self.rs1 = rs1
        self.rs2 = rs2
        self.imm = imm

    @property
    def writes_rd(self):
        return self.rd is not None
    
    def to_assembly(self):
        """Convert instruction to assembly string"""
        # R-type instructions (register-register operations)
        r_type = ["add", "sub", "and", "or", "xor", "sll", "srl", "sra", "slt", "sltu"]
        if self.name in r_type:
            return f"{self.name} x{self.rd}, x{self.rs1}, x{self.rs2}"
        
        # I-type instructions (immediate operations)
        i_type = ["addi", "andi", "ori", "xori", "slti", "sltiu"]
        if self.name in i_type:
            return f"{self.name} x{self.rd}, x{self.rs1}, {self.imm}"
        
        # Shift immediate instructions
        shift_imm = ["slli", "srli", "srai"]
        if self.name in shift_imm:
            return f"{self.name} x{self.rd}, x{self.rs1}, {self.imm}"
        
        # Load instructions
        load_type = ["lw", "lb", "lh"]
        if self.name in load_type:
            return f"{self.name} x{self.rd}, {self.imm}(x{self.rs1})"
        
        # Store instructions
        store_type = ["sw", "sb", "sh"]
        if self.name in store_type:
            return f"{self.name} x{self.rs2}, {self.imm}(x{self.rs1})"
        
        # Special cases
        if self.name == "nop":
            return "nop"
        
        return self.name

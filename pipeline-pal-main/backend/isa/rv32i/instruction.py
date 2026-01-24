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
        if self.name == "add" or self.name == "sub":
            return f"{self.name} x{self.rd}, x{self.rs1}, x{self.rs2}"
        elif self.name == "addi":
            return f"{self.name} x{self.rd}, x{self.rs1}, {self.imm}"
        elif self.name == "nop":
            return "nop"
        return self.name

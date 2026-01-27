class Instruction:
    OPERATION_SYMBOLS = {
        "add": "+", "addi": "+",
        "sub": "-",
        "and": "&", "andi": "&",
        "or": "|", "ori": "|",
        "xor": "^", "xori": "^",
        "sll": "<<", "slli": "<<",
        "srl": ">>", "srli": ">>",
        "sra": ">>>", "srai": ">>>",
        "slt": "<", "slti": "<",
        "sltu": "<", "sltiu": "<",
        "mul": "×", "mulh": "×h", "mulhu": "×hu", "mulhsu": "×hsu",
        "div": "÷", "divu": "÷u",
        "rem": "%", "remu": "%u",
    }
    
    OPERATION_CATEGORIES = {
        "arithmetic": ["add", "addi", "sub", "mul", "mulh", "mulhu", "mulhsu"],
        "logical": ["and", "andi", "or", "ori", "xor", "xori"],
        "shift": ["sll", "slli", "srl", "srli", "sra", "srai"],
        "compare": ["slt", "slti", "sltu", "sltiu"],
        "divide": ["div", "divu", "rem", "remu"],
    }
    
    OPCODE_NAMES = {
        0x33: "R-TYPE",
        0x13: "I-TYPE", 
        0x03: "LOAD",
        0x23: "STORE",
        0x63: "BRANCH",
        0x6F: "JAL",
        0x67: "JALR",
        0x37: "LUI",
        0x17: "AUIPC",
    }
    
    def __init__(self, name, rd=None, rs1=None, rs2=None, imm=None, opcode=None, funct3=None, funct7=None, raw_bits=None):
        self.name = name
        self.rd = rd
        self.rs1 = rs1
        self.rs2 = rs2
        self.imm = imm
        self.opcode = opcode
        self.funct3 = funct3
        self.funct7 = funct7
        self.raw_bits = raw_bits

    @property
    def writes_rd(self):
        return self.rd is not None
    
    @property
    def operation_symbol(self):
        if self.name in self.OPERATION_SYMBOLS:
            return self.OPERATION_SYMBOLS[self.name]
        
        if self.opcode == 0x33 and self.funct3 is not None and self.funct7 is not None:
            return f"OP[{self.funct7:02x},{self.funct3:x}]"
        elif self.opcode == 0x13 and self.funct3 is not None:
            return f"OPI[{self.funct3:x}]"
        
        return self.name.upper() if self.name else "UNKNOWN"
    
    @property
    def operation_category(self):
        for category, ops in self.OPERATION_CATEGORIES.items():
            if self.name in ops:
                return category
        
        if self.opcode == 0x33 or self.opcode == 0x13:
            return "arithmetic"
        elif self.opcode == 0x03:
            return "load"
        elif self.opcode == 0x23:
            return "store"
        elif self.opcode == 0x63:
            return "branch"
        
        return "other"
    
    @classmethod
    def register_operation(cls, name, symbol, category="other"):
        cls.OPERATION_SYMBOLS[name] = symbol
        if category not in cls.OPERATION_CATEGORIES:
            cls.OPERATION_CATEGORIES[category] = []
        cls.OPERATION_CATEGORIES[category].append(name)
    
    def to_assembly(self):
        """Convert instruction to assembly string"""
        if self.name == "nop":
            return "nop"
        
        r_type = ["add", "sub", "and", "or", "xor", "sll", "srl", "sra", "slt", "sltu", 
                  "mul", "mulh", "mulhu", "mulhsu", "div", "divu", "rem", "remu"]
        if self.name in r_type:
            return f"{self.name} x{self.rd}, x{self.rs1}, x{self.rs2}"
        
        i_type = ["addi", "andi", "ori", "xori", "slti", "sltiu"]
        if self.name in i_type:
            return f"{self.name} x{self.rd}, x{self.rs1}, {self.imm}"
        
        shift_imm = ["slli", "srli", "srai"]
        if self.name in shift_imm:
            return f"{self.name} x{self.rd}, x{self.rs1}, {self.imm}"
        
        load_type = ["lw", "lb", "lh"]
        if self.name in load_type:
            return f"{self.name} x{self.rd}, {self.imm}(x{self.rs1})"
        
        store_type = ["sw", "sb", "sh"]
        if self.name in store_type:
            return f"{self.name} x{self.rs2}, {self.imm}(x{self.rs1})"
        
        if self.opcode == 0x33 and self.rd is not None:
            return f"{self.name} x{self.rd}, x{self.rs1}, x{self.rs2}"
        elif self.opcode == 0x13 and self.rd is not None:
            return f"{self.name} x{self.rd}, x{self.rs1}, {self.imm}"
        elif self.raw_bits is not None:
            return f"{self.name} [0x{self.raw_bits:08x}]"
        
        return self.name if self.name else "unknown"

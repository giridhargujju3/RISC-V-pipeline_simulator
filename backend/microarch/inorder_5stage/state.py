class PipeReg:
    def __init__(self):
        self.valid = False
        self.instr = None
        self.pc = 0
        self.result = None
        self.rs1_value = 0
        self.rs2_value = 0
        self.imm = 0
        self.alu_op_a = 0
        self.alu_op_b = 0
        self.alu_operation = "NOP"
        self.mem_stall_cycles = 0

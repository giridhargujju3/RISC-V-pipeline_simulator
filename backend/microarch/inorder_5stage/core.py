from microarch.base.core_base import CoreBase
from microarch.inorder_5stage.state import PipeReg


class Core(CoreBase):
    SUPPORTED_ISA = ["rv32i"]
    XLEN = 32
    
    ALU_OPERATIONS = {}

    def __init__(self, config, stats, program, isa, regs):
        super().__init__(config, stats, program, isa, regs)

        self.pc = 0
        self.IF_ID = PipeReg()
        self.ID_EX = PipeReg()
        self.EX_MEM = PipeReg()
        self.MEM_WB = PipeReg()

        self.done = False

        # Register trace per cycle
        self.reg_trace = {}
        
        self._initialize_alu_operations()

    # -------------------------
    # ALU Operation Registry
    # -------------------------
    
    def _initialize_alu_operations(self):
        self.ALU_OPERATIONS = {
            "nop": lambda a, b, i: 0,
            "add": lambda a, b, i: (a + b) & 0xFFFFFFFF,
            "sub": lambda a, b, i: (a - b) & 0xFFFFFFFF,
            "addi": lambda a, b, i: (a + self._sign_extend(i, 32)) & 0xFFFFFFFF,
            "and": lambda a, b, i: (a & b) & 0xFFFFFFFF,
            "andi": lambda a, b, i: (a & i) & 0xFFFFFFFF,
            "or": lambda a, b, i: (a | b) & 0xFFFFFFFF,
            "ori": lambda a, b, i: (a | i) & 0xFFFFFFFF,
            "xor": lambda a, b, i: (a ^ b) & 0xFFFFFFFF,
            "xori": lambda a, b, i: (a ^ i) & 0xFFFFFFFF,
            "sll": lambda a, b, i: (a << (b & 0x1F)) & 0xFFFFFFFF,
            "slli": lambda a, b, i: (a << (i & 0x1F)) & 0xFFFFFFFF,
            "srl": lambda a, b, i: (a >> (b & 0x1F)) & 0xFFFFFFFF,
            "srli": lambda a, b, i: (a >> (i & 0x1F)) & 0xFFFFFFFF,
            "sra": lambda a, b, i: self._arithmetic_shift_right(a, b & 0x1F),
            "srai": lambda a, b, i: self._arithmetic_shift_right(a, i & 0x1F),
            "slt": lambda a, b, i: 1 if self._to_signed(a) < self._to_signed(b) else 0,
            "slti": lambda a, b, i: 1 if self._to_signed(a) < self._to_signed(i) else 0,
            "sltu": lambda a, b, i: 1 if a < b else 0,
            "sltiu": lambda a, b, i: 1 if a < i else 0,
        }
    
    def register_alu_operation(self, name, operation_func):
        self.ALU_OPERATIONS[name] = operation_func
        print(f"[CORE] Registered custom ALU operation: {name}")

    # -------------------------
    # Pipeline stages
    # -------------------------

    def fetch(self):
        if self.pc < self.program.end:
            bits = self.program.load_word(self.pc)
            instr = self.isa.decode(bits)

            print(f"[IF] Fetched instruction 0x{bits:08X} from PC 0x{self.pc:08X} -> {instr.to_assembly()}")

            self.IF_ID.valid = True
            self.IF_ID.instr = instr
            self.pc += 4

    def decode(self):
        if not self.IF_ID.valid:
            return

        instr = self.IF_ID.instr
        
        rs1_val = self.regs.read(instr.rs1) if instr.rs1 is not None else 0
        rs2_val = self.regs.read(instr.rs2) if instr.rs2 is not None else 0
        imm_val = instr.imm if instr.imm is not None else 0
        
        print(f"[ID] Decoding '{instr.to_assembly()}' (rd=x{instr.rd}, rs1=x{instr.rs1}({rs1_val}), rs2=x{instr.rs2}({rs2_val}))")

        self.ID_EX.valid = True
        self.ID_EX.instr = instr
        self.ID_EX.rs1_value = rs1_val
        self.ID_EX.rs2_value = rs2_val
        self.ID_EX.imm = imm_val
        self.IF_ID.valid = False

    def execute(self, ex_mem_fwd, mem_wb_fwd):
        if not self.ID_EX.valid:
            return

        instr = self.ID_EX.instr
        
        op_a = self.ID_EX.rs1_value
        op_b = self.ID_EX.rs2_value
        imm = self.ID_EX.imm
        
        forward_a_msg = ""
        forward_b_msg = ""
        
        if ex_mem_fwd and ex_mem_fwd['valid'] and ex_mem_fwd['writes_rd'] and ex_mem_fwd['rd'] != 0:
            if instr.rs1 == ex_mem_fwd['rd']:
                op_a = ex_mem_fwd['result']
                forward_a_msg = f" [FWD from EX/MEM x{ex_mem_fwd['rd']}={ex_mem_fwd['result']}]"
            if instr.rs2 == ex_mem_fwd['rd']:
                op_b = ex_mem_fwd['result']
                forward_b_msg = f" [FWD from EX/MEM x{ex_mem_fwd['rd']}={ex_mem_fwd['result']}]"
        
        if mem_wb_fwd and mem_wb_fwd['valid'] and mem_wb_fwd['writes_rd'] and mem_wb_fwd['rd'] != 0:
            if instr.rs1 == mem_wb_fwd['rd'] and forward_a_msg == "":
                op_a = mem_wb_fwd['result']
                forward_a_msg = f" [FWD from MEM/WB x{mem_wb_fwd['rd']}={mem_wb_fwd['result']}]"
            if instr.rs2 == mem_wb_fwd['rd'] and forward_b_msg == "":
                op_b = mem_wb_fwd['result']
                forward_b_msg = f" [FWD from MEM/WB x{mem_wb_fwd['rd']}={mem_wb_fwd['result']}]"
        
        result = self._execute_instruction(instr, op_a, op_b, imm)
        
        fwd_info = (forward_a_msg + forward_b_msg) if (forward_a_msg or forward_b_msg) else ""
        print(f"[EX] Executing '{instr.to_assembly()}' -> result = {result}{fwd_info}")

        self.EX_MEM.valid = True
        self.EX_MEM.instr = instr
        self.EX_MEM.result = result
        self.EX_MEM.alu_op_a = op_a
        self.EX_MEM.alu_op_b = op_b if not self._is_immediate_instruction(instr) else imm
        self.EX_MEM.alu_operation = instr.name.upper()
        self.ID_EX.valid = False

    def memory(self):
        if not self.EX_MEM.valid:
            return

        instr = self.EX_MEM.instr
        print(f"[MEM] Processing '{instr.to_assembly()}' (no memory operation)")

        self.MEM_WB.valid = True
        self.MEM_WB.instr = instr
        self.MEM_WB.result = self.EX_MEM.result
        self.EX_MEM.valid = False

    def writeback(self):
        if not self.MEM_WB.valid:
            return

        instr = self.MEM_WB.instr
        if instr.writes_rd:
            self.regs.write(instr.rd, self.MEM_WB.result)
            print(f"[WB] Writing x{instr.rd} = {self.MEM_WB.result} ('{instr.to_assembly()}')")
        else:
            print(f"[WB] Processing '{instr.to_assembly()}' (no writeback)")

        self.MEM_WB.valid = False

    # -------------------------
    # Main cycle tick
    # -------------------------

    def tick(self):
        print(f"\n{'='*80}")
        print(f"CYCLE {self.cycle + 1}")
        print(f"{'='*80}")
        print(f"PC: 0x{self.pc:08X}")
        print(f"Status: {'Halted' if self.done else 'Running'}")

        ex_mem_fwd = {
            'valid': self.EX_MEM.valid,
            'writes_rd': self.EX_MEM.instr.writes_rd if self.EX_MEM.valid else False,
            'rd': self.EX_MEM.instr.rd if self.EX_MEM.valid else 0,
            'result': self.EX_MEM.result if self.EX_MEM.valid else 0
        }
        
        mem_wb_fwd = {
            'valid': self.MEM_WB.valid,
            'writes_rd': self.MEM_WB.instr.writes_rd if self.MEM_WB.valid else False,
            'rd': self.MEM_WB.instr.rd if self.MEM_WB.valid else 0,
            'result': self.MEM_WB.result if self.MEM_WB.valid else 0
        }

        # WB → MEM → EX → ID → IF
        self.writeback()
        self.memory()
        self.execute(ex_mem_fwd, mem_wb_fwd)
        self.decode()
        self.fetch()

        self.cycle += 1

        # Snapshot architectural registers AFTER WB
        self.reg_trace[self.cycle] = {
            f"x{i}": self.regs.read(i) for i in range(32)
        }

        # Print pipeline state
        print(f"\nPipeline Stages")
        print(f"IF/ID:")
        print(f"{self.IF_ID.instr.to_assembly() if self.IF_ID.valid and self.IF_ID.instr else 'empty'}")
        print(f"ID/EX:")
        print(f"{self.ID_EX.instr.to_assembly() if self.ID_EX.valid and self.ID_EX.instr else 'empty'}")
        print(f"EX/MEM:")
        print(f"{self.EX_MEM.instr.to_assembly() if self.EX_MEM.valid and self.EX_MEM.instr else 'empty'}")
        print(f"MEM/WB:")
        print(f"{self.MEM_WB.instr.to_assembly() if self.MEM_WB.valid and self.MEM_WB.instr else 'empty'}")

        # Print register state
        print(f"Register State")
        non_zero = [(i, self.regs.read(i)) for i in range(1, 11) if self.regs.read(i) != 0]
        if non_zero:
            reg_str = ", ".join([f"x{i}={val}" for i, val in non_zero])
            print(reg_str)
        else:
            print("(all registers zero)")

        # Correct termination (pipeline drain)
        self.done = (
            self.pc >= self.program.end and
            not self.IF_ID.valid and
            not self.ID_EX.valid and
            not self.EX_MEM.valid and
            not self.MEM_WB.valid
        )

    # -------------------------
    # Reporting
    # -------------------------

    def report_activity(self):
        return {
            "IF": self.pc < self.program.end,
            "ID": self.IF_ID.valid,
            "EX": self.ID_EX.valid,
            "MEM": self.EX_MEM.valid,
            "WB": self.MEM_WB.valid,
        }

    def is_done(self):
        return self.done
    
    def _execute_instruction(self, instr, op_a, op_b, imm):
        op_a = op_a & 0xFFFFFFFF
        op_b = op_b & 0xFFFFFFFF
        imm = imm & 0xFFFFFFFF
        
        if instr.name in self.ALU_OPERATIONS:
            return self.ALU_OPERATIONS[instr.name](op_a, op_b, imm)
        else:
            print(f"[WARNING] Unknown instruction '{instr.name}' - attempting ISA fallback execution")
            try:
                return self._execute_via_isa(instr, op_a, op_b, imm)
            except Exception as e:
                raise RuntimeError(f"Unsupported instruction in execute: {instr.name} - {e}")
    
    def _sign_extend(self, val, bits):
        if val & (1 << (bits - 1)):
            return val | (-1 << bits)
        return val
    
    def _to_signed(self, val):
        if val & 0x80000000:
            return val - 0x100000000
        return val
    
    def _arithmetic_shift_right(self, val, shift):
        if val & 0x80000000:
            return ((val >> shift) | ((0xFFFFFFFF << (32 - shift)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        else:
            return (val >> shift) & 0xFFFFFFFF
    
    def _execute_via_isa(self, instr, op_a, op_b, imm):
        temp_regs_state = {instr.rs1: op_a, instr.rs2: op_b}
        
        class TempRegs:
            def __init__(self, state):
                self.state = state
            def read(self, reg):
                return self.state.get(reg, 0)
        
        temp_regs = TempRegs(temp_regs_state)
        
        from isa.rv32i import semantics
        return semantics.execute(instr, temp_regs)
    
    def _is_immediate_instruction(self, instr):
        immediate_ops = ['addi', 'andi', 'ori', 'xori', 'slli', 'srli', 'srai', 'slti', 'sltiu']
        return instr.name in immediate_ops

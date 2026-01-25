from microarch.base.core_base import CoreBase
from microarch.inorder_5stage.state import PipeReg


class Core(CoreBase):
    SUPPORTED_ISA = ["rv32i"]
    XLEN = 32

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

    # -------------------------
    # Pipeline stages
    # -------------------------

    def fetch(self):
        if self.pc < self.program.end:
            bits = self.program.load_word(self.pc)
            instr = self.isa.decode(bits)

            print(f"🔵 IF STAGE: Fetched instruction 0x{bits:08X} from PC 0x{self.pc:08X} -> {instr.to_assembly()}")

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
        
        print(f"🟢 ID STAGE: Decoding '{instr.to_assembly()}' (rd=x{instr.rd}, rs1=x{instr.rs1}({rs1_val}), rs2=x{instr.rs2}({rs2_val}))")

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
        print(f"🟡 EX STAGE: Executing '{instr.to_assembly()}' -> result = {result}{fwd_info}")

        self.EX_MEM.valid = True
        self.EX_MEM.instr = instr
        self.EX_MEM.result = result
        self.ID_EX.valid = False

    def memory(self):
        if not self.EX_MEM.valid:
            return

        instr = self.EX_MEM.instr
        print(f"🔵 MEM STAGE: Processing '{instr.to_assembly()}' (no memory operation)")

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
            print(f"🟣 WB STAGE: Writing x{instr.rd} = {self.MEM_WB.result} ('{instr.to_assembly()}')")
        else:
            print(f"🟣 WB STAGE: Processing '{instr.to_assembly()}' (no writeback)")

        self.MEM_WB.valid = False

    # -------------------------
    # Main cycle tick
    # -------------------------

    def tick(self):
        print(f"\n{'='*80}")
        print(f"🔄 CYCLE {self.cycle + 1}")
        print(f"{'='*80}")
        print(f"PC: 0x{self.pc:08X}")
        print(f"Status: {'⏸ Halted' if self.done else '▶ Running'}")

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
        print(f"\n📋 Pipeline Stages")
        print(f"IF/ID:")
        print(f"{self.IF_ID.instr.to_assembly() if self.IF_ID.valid and self.IF_ID.instr else 'empty'}")
        print(f"ID/EX:")
        print(f"{self.ID_EX.instr.to_assembly() if self.ID_EX.valid and self.ID_EX.instr else 'empty'}")
        print(f"EX/MEM:")
        print(f"{self.EX_MEM.instr.to_assembly() if self.EX_MEM.valid and self.EX_MEM.instr else 'empty'}")
        print(f"MEM/WB:")
        print(f"{self.MEM_WB.instr.to_assembly() if self.MEM_WB.valid and self.MEM_WB.instr else 'empty'}")

        # Print register state
        print(f"📊 Register State")
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
        
        if instr.name == "nop":
            return 0
        elif instr.name == "add":
            return (op_a + op_b) & 0xFFFFFFFF
        elif instr.name == "sub":
            return (op_a - op_b) & 0xFFFFFFFF
        elif instr.name == "addi":
            return (op_a + self._sign_extend(imm, 32)) & 0xFFFFFFFF
        elif instr.name == "and":
            return (op_a & op_b) & 0xFFFFFFFF
        elif instr.name == "andi":
            return (op_a & imm) & 0xFFFFFFFF
        elif instr.name == "or":
            return (op_a | op_b) & 0xFFFFFFFF
        elif instr.name == "ori":
            return (op_a | imm) & 0xFFFFFFFF
        elif instr.name == "xor":
            return (op_a ^ op_b) & 0xFFFFFFFF
        elif instr.name == "xori":
            return (op_a ^ imm) & 0xFFFFFFFF
        elif instr.name == "sll":
            return (op_a << (op_b & 0x1F)) & 0xFFFFFFFF
        elif instr.name == "slli":
            return (op_a << (imm & 0x1F)) & 0xFFFFFFFF
        elif instr.name == "srl":
            return (op_a >> (op_b & 0x1F)) & 0xFFFFFFFF
        elif instr.name == "srli":
            return (op_a >> (imm & 0x1F)) & 0xFFFFFFFF
        elif instr.name == "sra":
            shift = op_b & 0x1F
            if op_a & 0x80000000:
                return ((op_a >> shift) | ((0xFFFFFFFF << (32 - shift)) & 0xFFFFFFFF)) & 0xFFFFFFFF
            else:
                return (op_a >> shift) & 0xFFFFFFFF
        elif instr.name == "srai":
            shift = imm & 0x1F
            if op_a & 0x80000000:
                return ((op_a >> shift) | ((0xFFFFFFFF << (32 - shift)) & 0xFFFFFFFF)) & 0xFFFFFFFF
            else:
                return (op_a >> shift) & 0xFFFFFFFF
        elif instr.name == "slt":
            return 1 if self._to_signed(op_a) < self._to_signed(op_b) else 0
        elif instr.name == "slti":
            return 1 if self._to_signed(op_a) < self._to_signed(imm) else 0
        elif instr.name == "sltu":
            return 1 if op_a < op_b else 0
        elif instr.name == "sltiu":
            return 1 if op_a < imm else 0
        else:
            raise RuntimeError(f"Unsupported instruction in execute: {instr.name}")
    
    def _sign_extend(self, val, bits):
        if val & (1 << (bits - 1)):
            return val | (-1 << bits)
        return val
    
    def _to_signed(self, val):
        if val & 0x80000000:
            return val - 0x100000000
        return val

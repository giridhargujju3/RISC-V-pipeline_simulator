from microarch.base.core_base import CoreBase
from microarch.inorder_7stage.state import PipeReg


class Core(CoreBase):
    SUPPORTED_ISA = ["rv32i", "rv64i", "rv64im"]
    XLEN = 32

    def __init__(self, config, stats, program, isa, regs):
        super().__init__(config, stats, program, isa, regs)

        self.pc = 0
        # 7-stage pipeline: IF1 -> IF2 -> ID -> EX1 -> EX2 -> MEM -> WB
        self.IF1_IF2 = PipeReg()
        self.IF2_ID = PipeReg()
        self.ID_EX1 = PipeReg()
        self.EX1_EX2 = PipeReg()
        self.EX2_MEM = PipeReg()
        self.MEM_WB = PipeReg()

        self.done = False
        self.reg_trace = {}

    def fetch1(self):
        """First instruction fetch stage"""
        if self.pc < self.program.end:
            bits = self.program.load_word(self.pc)
            print(f"🔵 IF1 STAGE: Fetching from PC 0x{self.pc:08X}")
            self.IF1_IF2.valid = True
            self.IF1_IF2.instr = bits
            self.pc += 4

    def fetch2(self):
        """Second instruction fetch stage (decode address)"""
        if not self.IF1_IF2.valid:
            return
        bits = self.IF1_IF2.instr
        instr = self.isa.decode(bits)
        print(f"🟦 IF2 STAGE: Decoded 0x{bits:08X} -> {instr.to_assembly()}")
        self.IF2_ID.valid = True
        self.IF2_ID.instr = instr
        self.IF1_IF2.valid = False

    def decode(self):
        """Instruction decode stage"""
        if not self.IF2_ID.valid:
            return
        instr = self.IF2_ID.instr
        print(f"🟢 ID STAGE: Decoding '{instr.to_assembly()}' (rd=x{instr.rd}, rs1=x{instr.rs1}, rs2=x{instr.rs2})")
        self.ID_EX1.valid = True
        self.ID_EX1.instr = instr
        self.IF2_ID.valid = False

    def execute1(self):
        """First execution stage"""
        if not self.ID_EX1.valid:
            return
        instr = self.ID_EX1.instr
        print(f"🟡 EX1 STAGE: Starting execution '{instr.to_assembly()}'")
        self.EX1_EX2.valid = True
        self.EX1_EX2.instr = instr
        self.ID_EX1.valid = False

    def execute2(self):
        """Second execution stage"""
        if not self.EX1_EX2.valid:
            return
        instr = self.EX1_EX2.instr
        result = self.isa.execute(instr, self.regs)
        print(f"🟠 EX2 STAGE: Completed execution '{instr.to_assembly()}' -> result = {result}")
        self.EX2_MEM.valid = True
        self.EX2_MEM.instr = instr
        self.EX2_MEM.result = result
        self.EX1_EX2.valid = False

    def memory(self):
        """Memory access stage"""
        if not self.EX2_MEM.valid:
            return
        instr = self.EX2_MEM.instr
        print(f"🔵 MEM STAGE: Processing '{instr.to_assembly()}' (no memory operation)")
        self.MEM_WB.valid = True
        self.MEM_WB.instr = instr
        self.MEM_WB.result = self.EX2_MEM.result
        self.EX2_MEM.valid = False

    def writeback(self):
        """Write back stage"""
        if not self.MEM_WB.valid:
            return
        instr = self.MEM_WB.instr
        if instr.writes_rd:
            self.regs.write(instr.rd, self.MEM_WB.result)
            print(f"🟣 WB STAGE: Writing x{instr.rd} = {self.MEM_WB.result} ('{instr.to_assembly()}')")
        else:
            print(f"🟣 WB STAGE: Processing '{instr.to_assembly()}' (no writeback)")
        self.MEM_WB.valid = False

    def tick(self):
        """Execute one clock cycle"""
        print(f"\n{'='*80}")
        print(f"🔄 CYCLE {self.cycle + 1}")
        print(f"{'='*80}")
        print(f"PC: 0x{self.pc:08X}")

        # WB → MEM → EX2 → EX1 → ID → IF2 → IF1
        self.writeback()
        self.memory()
        self.execute2()
        self.execute1()
        self.decode()
        self.fetch2()
        self.fetch1()

        self.cycle += 1

        # Snapshot registers
        self.reg_trace[self.cycle] = {
            f"x{i}": self.regs.read(i) for i in range(32)
        }

        # Print pipeline state
        print(f"\n📋 PIPELINE STAGES (7-stage):")
        print(f"  IF1/IF2: {hex(self.IF1_IF2.instr) if self.IF1_IF2.valid and isinstance(self.IF1_IF2.instr, int) else 'empty'}")
        print(f"  IF2/ID:  {self.IF2_ID.instr.to_assembly() if self.IF2_ID.valid and self.IF2_ID.instr else 'empty'}")
        print(f"  ID/EX1:  {self.ID_EX1.instr.to_assembly() if self.ID_EX1.valid and self.ID_EX1.instr else 'empty'}")
        print(f"  EX1/EX2: {self.EX1_EX2.instr.to_assembly() if self.EX1_EX2.valid and self.EX1_EX2.instr else 'empty'}")
        print(f"  EX2/MEM: {self.EX2_MEM.instr.to_assembly() if self.EX2_MEM.valid and self.EX2_MEM.instr else 'empty'}")
        print(f"  MEM/WB:  {self.MEM_WB.instr.to_assembly() if self.MEM_WB.valid and self.MEM_WB.instr else 'empty'}")

        # Termination check
        self.done = (
            self.pc >= self.program.end and
            not self.IF1_IF2.valid and
            not self.IF2_ID.valid and
            not self.ID_EX1.valid and
            not self.EX1_EX2.valid and
            not self.EX2_MEM.valid and
            not self.MEM_WB.valid
        )

    def report_activity(self):
        return {
            "IF1": self.pc < self.program.end,
            "IF2": self.IF1_IF2.valid,
            "ID": self.IF2_ID.valid,
            "EX1": self.ID_EX1.valid,
            "EX2": self.EX1_EX2.valid,
            "MEM": self.EX2_MEM.valid,
            "WB": self.MEM_WB.valid,
        }

    def is_done(self):
        return self.done

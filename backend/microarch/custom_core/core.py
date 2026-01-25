from microarch.base.core_base import CoreBase
from microarch.custom_core.state import PipeReg


class Core(CoreBase):
    SUPPORTED_ISA = ["rv32i", "rv64i", "rv64im"]
    XLEN = 32

    def __init__(self, config, stats, program, isa, regs):
        super().__init__(config, stats, program, isa, regs)

        self.pc = 0
        # Custom 5-stage pipeline with simplified implementation
        self.IF_ID = PipeReg()
        self.ID_EX = PipeReg()
        self.EX_MEM = PipeReg()
        self.MEM_WB = PipeReg()

        self.done = False
        self.reg_trace = {}

    def fetch(self):
        """Instruction fetch stage"""
        if self.pc < self.program.end:
            bits = self.program.load_word(self.pc)
            instr = self.isa.decode(bits)
            print(f"🔵 [CUSTOM] IF: Fetched '{instr.to_assembly()}' from 0x{self.pc:08X}")
            self.IF_ID.valid = True
            self.IF_ID.instr = instr
            self.pc += 4

    def decode(self):
        """Instruction decode stage"""
        if not self.IF_ID.valid:
            return
        instr = self.IF_ID.instr
        print(f"🟢 [CUSTOM] ID: Decoding '{instr.to_assembly()}'")
        self.ID_EX.valid = True
        self.ID_EX.instr = instr
        self.IF_ID.valid = False

    def execute(self):
        """Execute stage"""
        if not self.ID_EX.valid:
            return
        instr = self.ID_EX.instr
        result = self.isa.execute(instr, self.regs)
        print(f"🟡 [CUSTOM] EX: Executing '{instr.to_assembly()}' -> {result}")
        self.EX_MEM.valid = True
        self.EX_MEM.instr = instr
        self.EX_MEM.result = result
        self.ID_EX.valid = False

    def memory(self):
        """Memory access stage"""
        if not self.EX_MEM.valid:
            return
        instr = self.EX_MEM.instr
        print(f"🔵 [CUSTOM] MEM: Processing '{instr.to_assembly()}'")
        self.MEM_WB.valid = True
        self.MEM_WB.instr = instr
        self.MEM_WB.result = self.EX_MEM.result
        self.EX_MEM.valid = False

    def writeback(self):
        """Write back stage"""
        if not self.MEM_WB.valid:
            return
        instr = self.MEM_WB.instr
        if instr.writes_rd:
            self.regs.write(instr.rd, self.MEM_WB.result)
            print(f"🟣 [CUSTOM] WB: x{instr.rd} = {self.MEM_WB.result}")
        else:
            print(f"🟣 [CUSTOM] WB: Processing '{instr.to_assembly()}' (no writeback)")
        self.MEM_WB.valid = False

    def tick(self):
        """Execute one clock cycle"""
        print(f"\n{'='*80}")
        print(f"🔄 [CUSTOM CORE] CYCLE {self.cycle + 1}")
        print(f"{'='*80}")
        print(f"PC: 0x{self.pc:08X}")

        # Execute stages in reverse order
        self.writeback()
        self.memory()
        self.execute()
        self.decode()
        self.fetch()

        self.cycle += 1

        # Snapshot registers
        self.reg_trace[self.cycle] = {
            f"x{i}": self.regs.read(i) for i in range(32)
        }

        # Print pipeline state
        print(f"\n📋 CUSTOM PIPELINE STATE:")
        print(f"  IF/ID:  {self.IF_ID.instr.to_assembly() if self.IF_ID.valid and self.IF_ID.instr else 'empty'}")
        print(f"  ID/EX:  {self.ID_EX.instr.to_assembly() if self.ID_EX.valid and self.ID_EX.instr else 'empty'}")
        print(f"  EX/MEM: {self.EX_MEM.instr.to_assembly() if self.EX_MEM.valid and self.EX_MEM.instr else 'empty'}")
        print(f"  MEM/WB: {self.MEM_WB.instr.to_assembly() if self.MEM_WB.valid and self.MEM_WB.instr else 'empty'}")

        # Termination check
        self.done = (
            self.pc >= self.program.end and
            not self.IF_ID.valid and
            not self.ID_EX.valid and
            not self.EX_MEM.valid and
            not self.MEM_WB.valid
        )

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

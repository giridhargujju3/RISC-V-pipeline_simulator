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
        print(f"🟢 ID STAGE: Decoding '{instr.to_assembly()}' (rd=x{instr.rd}, rs1=x{instr.rs1}, rs2=x{instr.rs2})")

        self.ID_EX.valid = True
        self.ID_EX.instr = instr
        self.IF_ID.valid = False

    def execute(self):
        if not self.ID_EX.valid:
            return

        instr = self.ID_EX.instr
        result = self.isa.execute(instr, self.regs)

        print(f"🟡 EX STAGE: Executing '{instr.to_assembly()}' -> result = {result}")

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

        # WB → MEM → EX → ID → IF
        self.writeback()
        self.memory()
        self.execute()
        self.decode()
        self.fetch()

        self.cycle += 1

        # Snapshot architectural registers AFTER WB
        self.reg_trace[self.cycle] = {
            f"x{i}": self.regs.read(i) for i in range(32)
        }

        # Print pipeline state
        print(f"\n📋 PIPELINE STAGES:")
        print(f"  IF/ID:  {self.IF_ID.instr.to_assembly() if self.IF_ID.valid and self.IF_ID.instr else 'empty'}")
        print(f"  ID/EX:  {self.ID_EX.instr.to_assembly() if self.ID_EX.valid and self.ID_EX.instr else 'empty'}")
        print(f"  EX/MEM: {self.EX_MEM.instr.to_assembly() if self.EX_MEM.valid and self.EX_MEM.instr else 'empty'}")
        print(f"  MEM/WB: {self.MEM_WB.instr.to_assembly() if self.MEM_WB.valid and self.MEM_WB.instr else 'empty'}")

        # Print register state
        print(f"\n📊 REGISTER STATE:")
        non_zero = [(i, self.regs.read(i)) for i in range(1, 10) if self.regs.read(i) != 0]
        if non_zero:
            for i, val in non_zero:
                print(f"  x{i}={val:<10}", end="")
            print()
        else:
            print("  (all registers zero)")

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

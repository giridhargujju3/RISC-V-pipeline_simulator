from microarch.base.core_base import CoreBase
from microarch.inorder_5stage.state import PipeReg

# Load microarchitecture specification
try:
    from microarch.inorder_5stage.microarch_spec import MICROARCH as _SPEC
except ImportError:
    _SPEC = {}

_DEFAULT_SPEC = {
    "name": "inorder_5stage",
    "description": "Classic 5-stage in-order RISC pipeline",
    "pipeline_stages": ["IF", "ID", "EX", "MEM", "WB"],
    "issue_width": 1,
    "forwarding": True,
    "branch_penalty": 3,
    "memory_latency": 2,
    "functional_units": {
        "ALU":    {"latency": 1, "instances": 1},
        "MEM":    {"latency": 2, "instances": 1},
        "BRANCH": {"latency": 1, "instances": 1},
        "JUMP":   {"latency": 1, "instances": 1},
    },
    "pipeline_capacity": 5,
    "pipelined_execution": True,
    "control": {"branch_resolution_stage": "EX", "branch_prediction": False},
    "debug": {"trace_pipeline": False, "trace_stalls": False},
}


def _merge(default, override):
    result = dict(default)
    for k, v in override.items():
        if isinstance(v, dict) and k in result and isinstance(result[k], dict):
            result[k] = _merge(result[k], v)
        else:
            result[k] = v
    return result


class Core(CoreBase):
    SUPPORTED_ISA = ["rv32i"]
    XLEN = 32

    ALU_OPERATIONS = {}

    def __init__(self, config, stats, program, isa, regs):
        super().__init__(config, stats, program, isa, regs)

        # ── Load & merge microarch spec ───────────────────────────────────────
        self.spec = _merge(_DEFAULT_SPEC, _SPEC)

        self.forwarding      = self.spec.get("forwarding", True)
        self.branch_penalty  = self.spec.get("branch_penalty", 3)
        self.memory_latency  = self.spec.get("memory_latency", 2)
        self.fu_latencies    = {
            k: v.get("latency", 1)
            for k, v in self.spec.get("functional_units", {}).items()
        }
        self.debug_trace     = self.spec.get("debug", {}).get("trace_pipeline", False)
        self.debug_stalls    = self.spec.get("debug", {}).get("trace_stalls", False)

        print(f"[CORE] Loaded spec '{self.spec['name']}': "
              f"forwarding={self.forwarding}, branch_penalty={self.branch_penalty}, "
              f"memory_latency={self.memory_latency}")

        # ── Pipeline registers ────────────────────────────────────────────────
        self.pc     = 0
        self.IF_ID  = PipeReg()
        self.ID_EX  = PipeReg()
        self.EX_MEM = PipeReg()
        self.MEM_WB = PipeReg()

        self.done = False

        # ── Stall / flush state ───────────────────────────────────────────────
        self._stall_cycles  = 0   # remaining stall cycles (load-use / mem latency)
        self._flush_pending = 0   # remaining penalty cycles to flush

        # Register trace per cycle
        self.reg_trace = {}

        self._initialize_alu_operations()

    # ─────────────────────────────────────────────────────────────────────────
    # Public: expose spec for the API
    # ─────────────────────────────────────────────────────────────────────────

    def get_microarch_spec(self) -> dict:
        return self.spec

    # ─────────────────────────────────────────────────────────────────────────
    # ALU Operation Registry
    # ─────────────────────────────────────────────────────────────────────────

    def _initialize_alu_operations(self):
        self.ALU_OPERATIONS = {
            "nop":   lambda a, b, i: 0,
            "add":   lambda a, b, i: (a + b) & 0xFFFFFFFF,
            "sub":   lambda a, b, i: (a - b) & 0xFFFFFFFF,
            "addi":  lambda a, b, i: (a + self._sign_extend(i, 32)) & 0xFFFFFFFF,
            "and":   lambda a, b, i: (a & b) & 0xFFFFFFFF,
            "andi":  lambda a, b, i: (a & i) & 0xFFFFFFFF,
            "or":    lambda a, b, i: (a | b) & 0xFFFFFFFF,
            "ori":   lambda a, b, i: (a | i) & 0xFFFFFFFF,
            "xor":   lambda a, b, i: (a ^ b) & 0xFFFFFFFF,
            "xori":  lambda a, b, i: (a ^ i) & 0xFFFFFFFF,
            "sll":   lambda a, b, i: (a << (b & 0x1F)) & 0xFFFFFFFF,
            "slli":  lambda a, b, i: (a << (i & 0x1F)) & 0xFFFFFFFF,
            "srl":   lambda a, b, i: (a >> (b & 0x1F)) & 0xFFFFFFFF,
            "srli":  lambda a, b, i: (a >> (i & 0x1F)) & 0xFFFFFFFF,
            "sra":   lambda a, b, i: self._arithmetic_shift_right(a, b & 0x1F),
            "srai":  lambda a, b, i: self._arithmetic_shift_right(a, i & 0x1F),
            "slt":   lambda a, b, i: 1 if self._to_signed(a) < self._to_signed(b) else 0,
            "slti":  lambda a, b, i: 1 if self._to_signed(a) < self._to_signed(i) else 0,
            "sltu":  lambda a, b, i: 1 if a < b else 0,
            "sltiu": lambda a, b, i: 1 if a < i else 0,
            # Memory ops — effective address calculation
            "lw":    lambda a, b, i: (a + self._sign_extend(i, 32)) & 0xFFFFFFFF,
            "lh":    lambda a, b, i: (a + self._sign_extend(i, 32)) & 0xFFFFFFFF,
            "lb":    lambda a, b, i: (a + self._sign_extend(i, 32)) & 0xFFFFFFFF,
            "lhu":   lambda a, b, i: (a + self._sign_extend(i, 32)) & 0xFFFFFFFF,
            "lbu":   lambda a, b, i: (a + self._sign_extend(i, 32)) & 0xFFFFFFFF,
            "sw":    lambda a, b, i: (a + self._sign_extend(i, 32)) & 0xFFFFFFFF,
            "sh":    lambda a, b, i: (a + self._sign_extend(i, 32)) & 0xFFFFFFFF,
            "sb":    lambda a, b, i: (a + self._sign_extend(i, 32)) & 0xFFFFFFFF,
            # Branches — evaluate condition, return 1=taken 0=not taken
            "beq":   lambda a, b, i: 1 if a == b else 0,
            "bne":   lambda a, b, i: 1 if a != b else 0,
            "blt":   lambda a, b, i: 1 if self._to_signed(a) < self._to_signed(b) else 0,
            "bge":   lambda a, b, i: 1 if self._to_signed(a) >= self._to_signed(b) else 0,
            "bltu":  lambda a, b, i: 1 if a < b else 0,
            "bgeu":  lambda a, b, i: 1 if a >= b else 0,
            # Jumps — return link address
            "jal":   lambda a, b, i: 0,   # link handled in execute()
            "jalr":  lambda a, b, i: (a + self._sign_extend(i, 32)) & 0xFFFFFFFE,
            # Upper immediates
            "lui":   lambda a, b, i: i & 0xFFFFF000,
            "auipc": lambda a, b, i: (a + (i & 0xFFFFF000)) & 0xFFFFFFFF,
        }

    def register_alu_operation(self, name, operation_func):
        self.ALU_OPERATIONS[name] = operation_func
        print(f"[CORE] Registered custom ALU operation: {name}")

    # ─────────────────────────────────────────────────────────────────────────
    # Pipeline stages
    # ─────────────────────────────────────────────────────────────────────────

    def fetch(self):
        if self._stall_cycles > 0 or self._flush_pending > 0:
            if self.debug_stalls:
                print(f"[IF] Stalled (stall={self._stall_cycles}, flush={self._flush_pending})")
            return

        if self.pc < self.program.end:
            bits = self.program.load_word(self.pc)
            instr = self.isa.decode(bits)
            if self.debug_trace:
                print(f"[IF] Fetched 0x{bits:08X} @ PC 0x{self.pc:08X} -> {instr.to_assembly()}")

            self.IF_ID.valid = True
            self.IF_ID.instr = instr
            self.IF_ID.pc    = self.pc
            self.pc += 4

    def decode(self):
        if self._stall_cycles > 0:
            if self.debug_stalls:
                print(f"[ID] Stalled ({self._stall_cycles} cycles remaining)")
            return

        if self._flush_pending > 0:
            self.IF_ID.valid = False
            return

        if not self.IF_ID.valid:
            return

        instr = self.IF_ID.instr
        rs1_val = self.regs.read(instr.rs1) if instr.rs1 is not None else 0
        rs2_val = self.regs.read(instr.rs2) if instr.rs2 is not None else 0
        imm_val = instr.imm if instr.imm is not None else 0

        if self.debug_trace:
            print(f"[ID] Decoding '{instr.to_assembly()}' "
                  f"(rd=x{instr.rd}, rs1=x{instr.rs1}({rs1_val}), rs2=x{instr.rs2}({rs2_val}))")

        self.ID_EX.valid     = True
        self.ID_EX.instr     = instr
        self.ID_EX.pc        = self.IF_ID.pc
        self.ID_EX.rs1_value = rs1_val
        self.ID_EX.rs2_value = rs2_val
        self.ID_EX.imm       = imm_val
        self.IF_ID.valid     = False

    def execute(self, ex_mem_fwd, mem_wb_fwd):
        if self._flush_pending > 0:
            self._flush_pending -= 1
            self.ID_EX.valid = False
            if self.debug_stalls:
                print(f"[EX] Flushing (penalty remaining={self._flush_pending})")
            return

        if not self.ID_EX.valid:
            return

        instr = self.ID_EX.instr
        op_a  = self.ID_EX.rs1_value
        op_b  = self.ID_EX.rs2_value
        imm   = self.ID_EX.imm
        pc    = self.ID_EX.pc

        # ── Forwarding (controlled by spec) ──────────────────────────────────
        if self.forwarding:
            if ex_mem_fwd and ex_mem_fwd['valid'] and ex_mem_fwd['writes_rd'] and ex_mem_fwd['rd'] != 0:
                if instr.rs1 is not None and instr.rs1 == ex_mem_fwd['rd']:
                    op_a = ex_mem_fwd['result']
                if instr.rs2 is not None and instr.rs2 == ex_mem_fwd['rd']:
                    op_b = ex_mem_fwd['result']

            if mem_wb_fwd and mem_wb_fwd['valid'] and mem_wb_fwd['writes_rd'] and mem_wb_fwd['rd'] != 0:
                if instr.rs1 is not None and instr.rs1 == mem_wb_fwd['rd']:
                    if not (ex_mem_fwd and ex_mem_fwd['valid'] and ex_mem_fwd['rd'] == instr.rs1):
                        op_a = mem_wb_fwd['result']
                if instr.rs2 is not None and instr.rs2 == mem_wb_fwd['rd']:
                    if not (ex_mem_fwd and ex_mem_fwd['valid'] and ex_mem_fwd['rd'] == instr.rs2):
                        op_b = mem_wb_fwd['result']

        result = self._execute_instruction(instr, op_a, op_b, imm)

        # ── Branch / jump resolution ──────────────────────────────────────────
        is_branch = hasattr(instr, 'is_branch') and instr.is_branch
        is_jump   = hasattr(instr, 'is_jump')   and instr.is_jump
        branch_taken = False

        if is_branch and result == 1:
            branch_taken = True
            # Flush instructions already fetched (branch_penalty from spec)
            self._flush_pending = self.branch_penalty - 1
            target = pc + imm
            self.pc = target & 0xFFFFFFFF
            if self.debug_stalls:
                print(f"[EX] Branch taken -> PC=0x{self.pc:08X}, flushing {self._flush_pending} stages")

        if is_jump:
            if instr.name == 'jal':
                result = (pc + 4) & 0xFFFFFFFF
                self._flush_pending = self.branch_penalty - 1
                self.pc = (pc + imm) & 0xFFFFFFFF
            elif instr.name == 'jalr':
                result = (pc + 4) & 0xFFFFFFFF
                self._flush_pending = self.branch_penalty - 1
                self.pc = result & 0xFFFFFFFE

        if self.debug_trace:
            print(f"[EX] '{instr.to_assembly()}' -> result={result}"
                  + (f" [branch_taken, flush={self._flush_pending}]" if branch_taken else ""))

        # ── Detect load-use hazard → stall ────────────────────────────────────
        is_load = hasattr(instr, 'is_load') and instr.is_load
        if is_load:
            mem_lat = self.fu_latencies.get("MEM", self.memory_latency)
            self._stall_cycles = max(0, mem_lat - 1)

        self.EX_MEM.valid         = True
        self.EX_MEM.instr         = instr
        self.EX_MEM.pc            = pc
        self.EX_MEM.result        = result
        self.EX_MEM.alu_op_a     = op_a
        self.EX_MEM.alu_op_b     = op_b if not self._is_immediate_instruction(instr) else imm
        self.EX_MEM.alu_operation = instr.name.upper()
        self.ID_EX.valid          = False

    def memory(self):
        if not self.EX_MEM.valid:
            return

        instr = self.EX_MEM.instr
        is_load  = hasattr(instr, 'is_load')  and instr.is_load
        is_store = hasattr(instr, 'is_store') and instr.is_store

        if self.debug_trace:
            print(f"[MEM] '{instr.to_assembly()}'"
                  + (" [LOAD]" if is_load else " [STORE]" if is_store else ""))

        # Handle memory stall countdown
        if self.EX_MEM.mem_stall_cycles > 0:
            self.EX_MEM.mem_stall_cycles -= 1
            if self.debug_stalls:
                print(f"[MEM] Memory stall ({self.EX_MEM.mem_stall_cycles} remaining)")
            return

        self.MEM_WB.valid  = True
        self.MEM_WB.instr  = instr
        self.MEM_WB.pc     = self.EX_MEM.pc
        self.MEM_WB.result = self.EX_MEM.result
        self.EX_MEM.valid  = False

    def writeback(self):
        if not self.MEM_WB.valid:
            return

        instr = self.MEM_WB.instr
        if instr.writes_rd and instr.rd is not None and instr.rd != 0:
            self.regs.write(instr.rd, self.MEM_WB.result)
            if self.debug_trace:
                print(f"[WB] x{instr.rd} = {self.MEM_WB.result} ('{instr.to_assembly()}')")
        else:
            if self.debug_trace:
                print(f"[WB] '{instr.to_assembly()}' (no writeback)")

        self.MEM_WB.valid = False

        # Count completed instruction
        from api_new import hazard_counters
        try:
            hazard_counters["completed_instructions"] += 1
        except Exception:
            pass

    # ─────────────────────────────────────────────────────────────────────────
    # Main cycle tick
    # ─────────────────────────────────────────────────────────────────────────

    def tick(self):
        # Build forwarding bundles BEFORE executing (use current pipeline state)
        ex_mem_fwd = {
            'valid':     self.EX_MEM.valid,
            'writes_rd': self.EX_MEM.instr.writes_rd if self.EX_MEM.valid and self.EX_MEM.instr else False,
            'rd':        self.EX_MEM.instr.rd        if self.EX_MEM.valid and self.EX_MEM.instr else 0,
            'result':    self.EX_MEM.result           if self.EX_MEM.valid else 0,
        }
        mem_wb_fwd = {
            'valid':     self.MEM_WB.valid,
            'writes_rd': self.MEM_WB.instr.writes_rd if self.MEM_WB.valid and self.MEM_WB.instr else False,
            'rd':        self.MEM_WB.instr.rd        if self.MEM_WB.valid and self.MEM_WB.instr else 0,
            'result':    self.MEM_WB.result           if self.MEM_WB.valid else 0,
        }

        # Drain stall counter
        if self._stall_cycles > 0:
            self._stall_cycles -= 1

        # WB → MEM → EX → ID → IF  (back-to-front prevents double-advance)
        self.writeback()
        self.memory()
        self.execute(ex_mem_fwd, mem_wb_fwd)
        self.decode()
        self.fetch()

        self.cycle += 1

        self.reg_trace[self.cycle] = {
            f"x{i}": self.regs.read(i) for i in range(32)
        }

        # Pipeline fully drained?
        self.done = (
            self.pc >= self.program.end and
            not self.IF_ID.valid  and
            not self.ID_EX.valid  and
            not self.EX_MEM.valid and
            not self.MEM_WB.valid
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Reporting
    # ─────────────────────────────────────────────────────────────────────────

    def report_activity(self):
        return {
            "IF":  self.pc < self.program.end,
            "ID":  self.IF_ID.valid,
            "EX":  self.ID_EX.valid,
            "MEM": self.EX_MEM.valid,
            "WB":  self.MEM_WB.valid,
        }

    def is_done(self):
        return self.done

    # ─────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _execute_instruction(self, instr, op_a, op_b, imm):
        op_a = op_a & 0xFFFFFFFF
        op_b = op_b & 0xFFFFFFFF
        imm  = imm  & 0xFFFFFFFF

        if instr.name in self.ALU_OPERATIONS:
            return self.ALU_OPERATIONS[instr.name](op_a, op_b, imm)

        print(f"[WARNING] Unknown instruction '{instr.name}' - attempting ISA fallback")
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
        return (val >> shift) & 0xFFFFFFFF

    def _execute_via_isa(self, instr, op_a, op_b, imm):
        class TempRegs:
            def __init__(self, state):
                self.state = state
            def read(self, reg):
                return self.state.get(reg, 0)

        temp_regs = TempRegs({instr.rs1: op_a, instr.rs2: op_b})
        from isa.rv32i import semantics
        return semantics.execute(instr, temp_regs)

    def _is_immediate_instruction(self, instr):
        return instr.name in {
            'addi', 'andi', 'ori', 'xori', 'slli', 'srli', 'srai',
            'slti', 'sltiu', 'lw', 'lh', 'lb', 'lhu', 'lbu', 'jalr'
        }

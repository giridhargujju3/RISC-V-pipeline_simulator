"""
Out-of-Order Superscalar Core — Tomasulo-style
Phase 4: Full ROB, Reservation Station, Register Renaming, CDB

Exposes the same interface as in-order cores so the API can
use it transparently.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict


# ═══════════════════════════════════════════════════════════════════════════════
# Data structures
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class FakePipeReg:
    """Fake pipeline register — satisfies API compatibility checks."""
    valid: bool = False
    instr: object = None
    pc: int = 0
    result: Optional[int] = None
    alu_op_a: int = 0
    alu_op_b: int = 0
    alu_operation: str = "NOP"


@dataclass
class PhysReg:
    value: int = 0
    ready: bool = True


@dataclass
class ROBEntry:
    id: int
    instruction: str
    pc: int
    instr_obj: object
    state: str = "DISPATCH"   # DISPATCH → EXECUTE → WRITEBACK → COMMIT
    dst_preg: Optional[int] = None
    old_preg: Optional[int] = None
    result: Optional[int] = None
    ready: bool = False


@dataclass
class RSEntry:
    id: int
    instruction: str
    pc: int
    instr_obj: object
    rob_id: int
    dst_preg: Optional[int]
    fu_type: str = "ALU"
    src1_preg: Optional[int] = None
    src1_ready: bool = True
    src1_val: int = 0
    src2_preg: Optional[int] = None
    src2_ready: bool = True
    src2_val: int = 0
    executing: bool = False


# ═══════════════════════════════════════════════════════════════════════════════
# OoO Core
# ═══════════════════════════════════════════════════════════════════════════════

class Core:
    SUPPORTED_ISA = ["rv32i", "rv64i", "rv64im"]

    # OoO config
    FETCH_WIDTH   = 2
    ISSUE_WIDTH   = 2
    COMMIT_WIDTH  = 2
    ROB_SIZE      = 32
    RS_SIZE       = 16
    NUM_PHYS_REGS = 64
    NUM_ARCH_REGS = 32

    FU_CONFIG = {
        "ALU":    {"latency": 1},
        "MEM":    {"latency": 2},
        "BRANCH": {"latency": 1},
    }

    def __init__(self, config, stats, program, isa, regs):
        self.config  = config
        self.stats   = stats
        self.program = program
        self.isa     = isa
        self.regs    = regs

        # ── Decode all instructions up front ─────────────────────────────────
        self._decoded: List[tuple] = []   # list of (pc_int, instr_obj)
        addr = 0
        while addr < program.end:
            bits = program.load_word(addr)
            if bits == 0:
                break
            try:
                instr = isa.decode(bits)
                self._decoded.append((addr, instr))
            except Exception:
                pass
            addr += 4

        self.total_instructions = len(self._decoded)
        self.fetch_ptr = 0        # index into self._decoded

        # ── OoO Structures ────────────────────────────────────────────────────
        # Physical register file
        self.prf: List[PhysReg] = [PhysReg() for _ in range(self.NUM_PHYS_REGS)]

        # Free list: physical regs beyond arch regs are initially free
        self.free_list: List[int] = list(range(self.NUM_ARCH_REGS, self.NUM_PHYS_REGS))

        # Rename table: logical_reg → physical_reg (starts identity-mapped)
        self.rename_table: Dict[int, int] = {i: i for i in range(self.NUM_ARCH_REGS)}

        # ROB and RS
        self.rob: List[ROBEntry] = []
        self.rs:  List[RSEntry]  = []

        # Functional units
        self.functional_units: Dict[str, dict] = {
            name: {"busy": False, "entry": None, "remaining": 0, "latency": cfg["latency"]}
            for name, cfg in self.FU_CONFIG.items()
        }

        # Common Data Bus: list of (preg, value) broadcast this cycle
        self.cdb: List[tuple] = []

        # ── State ─────────────────────────────────────────────────────────────
        self.cycle            = 0
        self.total_committed  = 0
        self.total_issued     = 0
        self._next_rob_id     = 0
        self._next_rs_id      = 0

        # Cumulative counters
        self.raw_stalls        = 0
        self.structural_stalls = 0
        self.branch_flushes    = 0
        self.waw_renames       = 0

        # ── Fake pipeline regs for API compatibility ───────────────────────────
        self.IF_ID  = FakePipeReg()
        self.ID_EX  = FakePipeReg()
        self.EX_MEM = FakePipeReg()
        self.MEM_WB = FakePipeReg()

    # ─── Helpers ──────────────────────────────────────────────────────────────

    @property
    def pc(self) -> int:
        return self.fetch_ptr * 4

    def is_done(self) -> bool:
        return (
            self.fetch_ptr >= self.total_instructions
            and len(self.rob) == 0
            and not any(fu["busy"] for fu in self.functional_units.values())
        )

    def _fu_type(self, instr) -> str:
        is_load   = hasattr(instr, 'is_load')   and instr.is_load
        is_store  = hasattr(instr, 'is_store')  and instr.is_store
        is_branch = hasattr(instr, 'is_branch') and instr.is_branch
        is_jump   = hasattr(instr, 'is_jump')   and instr.is_jump
        if is_load or is_store:
            return "MEM"
        if is_branch or is_jump:
            return "BRANCH"
        return "ALU"

    def _dst_reg(self, instr) -> Optional[int]:
        """Return logical destination register or None."""
        is_store  = hasattr(instr, 'is_store')  and instr.is_store
        is_branch = hasattr(instr, 'is_branch') and instr.is_branch
        writes_rd = hasattr(instr, 'writes_rd') and instr.writes_rd
        if writes_rd and not is_store and not is_branch:
            rd = getattr(instr, 'rd', None)
            if rd is not None and rd != 0:
                return rd
        return None

    def _src_pregs(self, instr) -> List[int]:
        """Return list of physical registers this instruction reads."""
        out = []
        rs1 = getattr(instr, 'rs1', None)
        rs2 = getattr(instr, 'rs2', None)
        is_load  = hasattr(instr, 'is_load')  and instr.is_load

        if rs1 is not None and rs1 != 0:
            out.append(self.rename_table.get(rs1, rs1))
        if rs2 is not None and rs2 != 0 and not is_load:
            out.append(self.rename_table.get(rs2, rs2))
        return out

    def _compute(self, entry: RSEntry) -> int:
        """Execute instruction and return integer result."""
        instr = entry.instr_obj
        s1    = entry.src1_val
        s2    = entry.src2_val
        imm   = getattr(instr, 'imm', 0) or 0
        name  = (getattr(instr, 'name', '') or '').upper()

        try:
            if   'ADDI' in name or ('ADD' in name and 'I' in name):
                return (s1 + imm) & 0xFFFFFFFF
            elif 'ADD'  in name:   return (s1 + s2)  & 0xFFFFFFFF
            elif 'SUB'  in name:   return (s1 - s2)  & 0xFFFFFFFF
            elif 'ANDI' in name:   return (s1 & imm) & 0xFFFFFFFF
            elif 'AND'  in name:   return (s1 & s2)  & 0xFFFFFFFF
            elif 'ORI'  in name:   return (s1 | imm) & 0xFFFFFFFF
            elif 'OR'   in name:   return (s1 | s2)  & 0xFFFFFFFF
            elif 'XORI' in name:   return (s1 ^ imm) & 0xFFFFFFFF
            elif 'XOR'  in name:   return (s1 ^ s2)  & 0xFFFFFFFF
            elif 'SLLI' in name:   return (s1 << (imm & 0x1F)) & 0xFFFFFFFF
            elif 'SLL'  in name:   return (s1 << (s2 & 0x1F))  & 0xFFFFFFFF
            elif 'SRLI' in name:   return (s1 >> (imm & 0x1F)) & 0xFFFFFFFF
            elif 'SRL'  in name:   return (s1 >> (s2 & 0x1F))  & 0xFFFFFFFF
            elif 'SLTI' in name:   return 1 if s1 < imm else 0
            elif 'SLT'  in name:   return 1 if s1 < s2  else 0
            elif 'LW'   in name or 'LB' in name or 'LH' in name:
                return 0   # simplified memory model
            elif 'JAL'  in name or 'JALR' in name:
                return (entry.pc + 4) & 0xFFFFFFFF
            else:
                return (s1 + s2) & 0xFFFFFFFF
        except Exception:
            return 0

    # ─── Pipeline stages ──────────────────────────────────────────────────────

    def _fetch_and_dispatch(self):
        """Fetch FETCH_WIDTH instructions and dispatch to ROB + RS."""
        for _ in range(self.FETCH_WIDTH):
            if self.fetch_ptr >= self.total_instructions:
                break
            if len(self.rob) >= self.ROB_SIZE:
                self.structural_stalls += 1
                break
            if len(self.rs) >= self.RS_SIZE:
                self.structural_stalls += 1
                break

            pc_int, instr = self._decoded[self.fetch_ptr]
            self.fetch_ptr += 1

            try:
                asm = instr.to_assembly()
            except Exception:
                asm = "?"

            dst_log = self._dst_reg(instr)

            # ── Register Renaming ────────────────────────────────────────────
            dst_preg = None
            old_preg = None
            if dst_log is not None:
                if self.free_list:
                    dst_preg = self.free_list.pop(0)
                    old_preg = self.rename_table[dst_log]
                    # WAW detected when old_preg was already renamed
                    if old_preg != dst_log:
                        self.waw_renames += 1
                    self.rename_table[dst_log] = dst_preg
                    self.prf[dst_preg].ready = False
                    self.prf[dst_preg].value = 0

            # ── ROB entry ─────────────────────────────────────────────────────
            rob_entry = ROBEntry(
                id=self._next_rob_id, instruction=asm,
                pc=pc_int, instr_obj=instr,
                dst_preg=dst_preg, old_preg=old_preg,
            )
            self._next_rob_id += 1
            self.rob.append(rob_entry)

            # ── RS entry ──────────────────────────────────────────────────────
            rs_entry = RSEntry(
                id=self._next_rs_id, instruction=asm,
                pc=pc_int, instr_obj=instr,
                rob_id=rob_entry.id,
                dst_preg=dst_preg,
                fu_type=self._fu_type(instr),
            )
            self._next_rs_id += 1

            src_pregs = self._src_pregs(instr)

            # Source 1
            if len(src_pregs) >= 1:
                p = src_pregs[0]
                rs_entry.src1_preg = p
                if self.prf[p].ready:
                    rs_entry.src1_ready = True
                    rs_entry.src1_val   = self.prf[p].value
                else:
                    rs_entry.src1_ready = False
                    self.raw_stalls += 1
            else:
                rs_entry.src1_ready = True

            # Source 2 (or immediate)
            is_load  = hasattr(instr, 'is_load')  and instr.is_load
            uses_imm = hasattr(instr, 'imm')      and instr.imm is not None
            if len(src_pregs) >= 2:
                p = src_pregs[1]
                rs_entry.src2_preg = p
                if self.prf[p].ready:
                    rs_entry.src2_ready = True
                    rs_entry.src2_val   = self.prf[p].value
                else:
                    rs_entry.src2_ready = False
                    self.raw_stalls += 1
            elif uses_imm or is_load:
                rs_entry.src2_ready = True
                rs_entry.src2_val   = getattr(instr, 'imm', 0) or 0
            else:
                rs_entry.src2_ready = True

            self.rs.append(rs_entry)
            self.total_issued += 1

            # Update fake IF register for API display
            self.IF_ID = FakePipeReg(valid=True, instr=instr, pc=pc_int)

    def _issue(self):
        """Issue ready RS entries to free functional units."""
        issued = 0
        for entry in self.rs:
            if issued >= self.ISSUE_WIDTH:
                break
            if entry.executing:
                continue
            if not (entry.src1_ready and entry.src2_ready):
                continue
            fu = self.functional_units.get(entry.fu_type)
            if fu and not fu["busy"]:
                fu["busy"]      = True
                fu["entry"]     = entry
                fu["remaining"] = fu["latency"]
                entry.executing = True
                issued += 1
                # Update ROB state
                for r in self.rob:
                    if r.id == entry.rob_id:
                        r.state = "EXECUTE"
                        break
                self.ID_EX = FakePipeReg(valid=True, instr=entry.instr_obj, pc=entry.pc)

    def _execute(self):
        """Tick functional units and broadcast finished results on CDB."""
        self.cdb = []
        for fu_name, fu in self.functional_units.items():
            if not fu["busy"]:
                continue
            fu["remaining"] -= 1
            if fu["remaining"] <= 0:
                entry  = fu["entry"]
                result = self._compute(entry)

                # Mark ROB entry ready
                for r in self.rob:
                    if r.id == entry.rob_id:
                        r.result = result
                        r.ready  = True
                        r.state  = "WRITEBACK"
                        break

                # CDB broadcast
                if entry.dst_preg is not None:
                    self.cdb.append((entry.dst_preg, result))

                # Remove from RS
                self.rs = [r for r in self.rs if r.id != entry.id]
                fu["busy"]  = False
                fu["entry"] = None

                self.EX_MEM = FakePipeReg(
                    valid=True, instr=entry.instr_obj, pc=entry.pc,
                    result=result, alu_operation=fu_name,
                )

    def _writeback(self):
        """Update physical register file from CDB and wake up RS."""
        for preg, value in self.cdb:
            self.prf[preg].value = value
            self.prf[preg].ready = True
            for entry in self.rs:
                if entry.src1_preg == preg and not entry.src1_ready:
                    entry.src1_ready = True
                    entry.src1_val   = value
                if entry.src2_preg == preg and not entry.src2_ready:
                    entry.src2_ready = True
                    entry.src2_val   = value

    def _commit(self):
        """In-order commit from head of ROB."""
        committed = 0
        while committed < self.COMMIT_WIDTH and self.rob:
            head = self.rob[0]
            if not head.ready:
                break
            head.state = "COMMIT"

            # Write-back to arch register file
            dst_log = self._dst_reg(head.instr_obj)
            if dst_log is not None and head.result is not None:
                self.regs.write(dst_log, head.result)
                if head.dst_preg is not None:
                    self.prf[head.dst_preg].value = head.result

            # Free old physical register
            if head.old_preg is not None and head.old_preg >= self.NUM_ARCH_REGS:
                self.free_list.append(head.old_preg)
                self.prf[head.old_preg].ready = True

            self.rob.pop(0)
            self.total_committed += 1
            committed += 1

            self.MEM_WB = FakePipeReg(
                valid=True, instr=head.instr_obj, pc=head.pc, result=head.result
            )

    # ─── Public interface ─────────────────────────────────────────────────────

    def tick(self):
        """Advance one cycle: commit → writeback → execute → issue → fetch."""
        self._commit()
        self._writeback()
        self._execute()
        self._issue()
        self._fetch_and_dispatch()
        self.cycle += 1

    def get_ooo_state(self) -> dict:
        """Return full OoO hardware state for the frontend (Phase 4)."""

        rob_data = [
            {
                "id":          e.id,
                "instruction": e.instruction,
                "pc":          f"0x{e.pc:04X}",
                "state":       e.state,
                "ready":       e.ready,
                "result":      e.result,
                "dst_preg":    e.dst_preg,
            }
            for e in self.rob
        ]

        rs_data = [
            {
                "id":          e.id,
                "instruction": e.instruction,
                "fu_type":     e.fu_type,
                "src1_ready":  e.src1_ready,
                "src1_val":    e.src1_val if e.src1_ready else None,
                "src2_ready":  e.src2_ready,
                "src2_val":    e.src2_val if e.src2_ready else None,
                "executing":   e.executing,
                "rob_id":      e.rob_id,
            }
            for e in self.rs
        ]

        # Only show non-trivial rename mappings (logical != physical)
        rename_data = {}
        for log_r, phys_r in self.rename_table.items():
            rename_data[f"x{log_r}"] = {
                "physical": phys_r,
                "ready":    self.prf[phys_r].ready,
                "value":    self.prf[phys_r].value if self.prf[phys_r].ready else None,
                "renamed":  phys_r != log_r,
            }

        fu_data = {
            name: {
                "busy":             fu["busy"],
                "instruction":      fu["entry"].instruction if fu["entry"] else None,
                "remaining_cycles": fu["remaining"],
                "latency":          fu["latency"],
            }
            for name, fu in self.functional_units.items()
        }

        return {
            "mode":               "ooo",
            "cycle":              self.cycle,
            "fetch_ptr":          self.fetch_ptr,
            "total_instructions": self.total_instructions,
            "rob_size":           self.ROB_SIZE,
            "rs_size":            self.RS_SIZE,
            "rob_used":           len(self.rob),
            "rs_used":            len(self.rs),
            "free_regs":          len(self.free_list),
            "rob":                rob_data,
            "reservation_station": rs_data,
            "rename_table":        rename_data,
            "functional_units":    fu_data,
            "cdb_active":          len(self.cdb),
            "statistics": {
                "issued":              self.total_issued,
                "committed":           self.total_committed,
                "raw_stalls":          self.raw_stalls,
                "structural_stalls":   self.structural_stalls,
                "waw_renames":         self.waw_renames,
                "cpi": round(self.cycle / max(1, self.total_committed), 4),
            },
        }

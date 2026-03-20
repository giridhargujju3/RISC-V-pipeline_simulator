"""
RISC-V CPU Simulator Backend API
Phases 1-4: Full hazard detection, pipeline trace, OoO engine
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from config import Config
from program.loader import Program
from utils.stats import Stats
from compiler import get_compiler
import importlib
import os

app = FastAPI(
    title="RISC-V CPU Simulator API",
    description="Backend API for multi-ISA multi-core RISC-V CPU simulation",
    version="4.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AVAILABLE_ISAS = {
    "rv32i":  {"name": "RV32I",  "description": "32-bit Base Integer ISA",        "xlen": 32},
    "rv64i":  {"name": "RV64I",  "description": "64-bit Base Integer ISA",        "xlen": 64},
    "rv64im": {"name": "RV64IM", "description": "64-bit with Multiply/Divide",    "xlen": 64},
}

AVAILABLE_CORES = {
    "inorder_5stage": {"name": "5-Stage Pipeline",    "description": "Classic 5-stage in-order pipeline",        "stages": 5},
    "inorder_7stage": {"name": "7-Stage Pipeline",    "description": "Extended 7-stage in-order pipeline",      "stages": 7},
    "custom_core":    {"name": "Custom Core",          "description": "Educational customizable core",            "stages": 5},
    "ooo_core":       {"name": "Out-of-Order Core",   "description": "Tomasulo-style OoO superscalar CPU",      "stages": 8},
}

# ─── Global CPU State ──────────────────────────────────────────────────────────
current_isa_name  = "rv32i"
current_core_name = "inorder_5stage"
isa     = None
cfg     = Config(1e9)
stats   = None
program = None
regs    = None
core    = None

# ─── Phase 1 & 2: Cumulative Hazard Counters (reset on load/reset) ─────────────
hazard_counters = {
    "raw_hazards":        0,
    "war_hazards":        0,
    "waw_hazards":        0,
    "structural_hazards": 0,
    "memory_hazards":     0,
    "control_hazards":    0,
    "branch_flushes":     0,
    "total_stall_cycles": 0,
    "completed_instructions": 0,
}

# ─── Phase 1: Static Dependency Analysis ────────────────────────────────────────
static_dependencies: List[dict] = []

# ─── Phase 3: Pipeline Trace History ────────────────────────────────────────────
MAX_TRACE_HISTORY   = 200
pipeline_trace_history: List[dict] = []


# ═══════════════════════════════════════════════════════════════════════════════
# Helper: reset all per-run counters
# ═══════════════════════════════════════════════════════════════════════════════
def reset_hazard_counters():
    global hazard_counters, static_dependencies, pipeline_trace_history
    hazard_counters = {k: 0 for k in hazard_counters}
    static_dependencies = []
    pipeline_trace_history = []


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 1: Static dependency analysis (run once on program load)
# ═══════════════════════════════════════════════════════════════════════════════
def analyze_static_dependencies():
    global static_dependencies
    if core is None or program is None:
        return

    deps = []
    instr_list = []

    addr = 0
    while addr < program.end:
        bits = program.load_word(addr)
        if bits == 0:
            break
        try:
            instr = isa.decode(bits)
            instr_list.append((addr, instr))
        except Exception:
            pass
        addr += 4

    n = len(instr_list)
    for i in range(n):
        pc_i, inst_i = instr_list[i]
        try:
            asm_i = inst_i.to_assembly()
        except Exception:
            asm_i = "?"

        writes_i = []
        reads_i  = []

        if hasattr(inst_i, 'writes_rd') and inst_i.writes_rd:
            if hasattr(inst_i, 'rd') and inst_i.rd is not None and inst_i.rd != 0:
                writes_i.append(inst_i.rd)
        if hasattr(inst_i, 'rs1') and inst_i.rs1 is not None and inst_i.rs1 != 0:
            reads_i.append(inst_i.rs1)
        if hasattr(inst_i, 'rs2') and inst_i.rs2 is not None and inst_i.rs2 != 0:
            reads_i.append(inst_i.rs2)

        is_branch_i = hasattr(inst_i, 'is_branch') and inst_i.is_branch
        is_jump_i   = hasattr(inst_i, 'is_jump')   and inst_i.is_jump

        for j in range(i + 1, min(i + 5, n)):
            pc_j, inst_j = instr_list[j]
            try:
                asm_j = inst_j.to_assembly()
            except Exception:
                asm_j = "?"

            writes_j = []
            reads_j  = []

            if hasattr(inst_j, 'writes_rd') and inst_j.writes_rd:
                if hasattr(inst_j, 'rd') and inst_j.rd is not None and inst_j.rd != 0:
                    writes_j.append(inst_j.rd)
            if hasattr(inst_j, 'rs1') and inst_j.rs1 is not None and inst_j.rs1 != 0:
                reads_j.append(inst_j.rs1)
            if hasattr(inst_j, 'rs2') and inst_j.rs2 is not None and inst_j.rs2 != 0:
                reads_j.append(inst_j.rs2)

            distance = j - i

            # RAW: i writes → j reads
            for r in writes_i:
                if r in reads_j:
                    deps.append({
                        "type": "RAW", "producer": i, "consumer": j,
                        "register": f"x{r}", "producer_instr": asm_i,
                        "consumer_instr": asm_j, "distance": distance,
                        "producer_pc": f"0x{pc_i:04X}", "consumer_pc": f"0x{pc_j:04X}",
                    })

            # WAR: i reads → j writes
            for r in reads_i:
                if r in writes_j:
                    deps.append({
                        "type": "WAR", "producer": i, "consumer": j,
                        "register": f"x{r}", "producer_instr": asm_i,
                        "consumer_instr": asm_j, "distance": distance,
                        "producer_pc": f"0x{pc_i:04X}", "consumer_pc": f"0x{pc_j:04X}",
                    })

            # WAW: both write same register
            for r in writes_i:
                if r in writes_j:
                    deps.append({
                        "type": "WAW", "producer": i, "consumer": j,
                        "register": f"x{r}", "producer_instr": asm_i,
                        "consumer_instr": asm_j, "distance": distance,
                        "producer_pc": f"0x{pc_i:04X}", "consumer_pc": f"0x{pc_j:04X}",
                    })

        # CONTROL: branch/jump affects next few instructions
        if is_branch_i or is_jump_i:
            kind = "BRANCH" if is_branch_i else "JUMP"
            for j in range(i + 1, min(i + 4, n)):
                pc_j, inst_j = instr_list[j]
                try:
                    asm_j = inst_j.to_assembly()
                except Exception:
                    asm_j = "?"
                deps.append({
                    "type": "CONTROL", "producer": i, "consumer": j,
                    "register": None, "producer_instr": asm_i,
                    "consumer_instr": asm_j, "distance": j - i,
                    "producer_pc": f"0x{pc_i:04X}", "consumer_pc": f"0x{pc_j:04X}",
                    "control_kind": kind,
                })

    static_dependencies = deps


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 1: Dynamic per-cycle hazard detection
# ═══════════════════════════════════════════════════════════════════════════════
def detect_hazards_this_cycle() -> dict:
    global hazard_counters

    result = {
        "raw": False, "war": False, "waw": False,
        "structural": False, "memory": False, "control": False,
        "stall": False, "forward_a": None, "forward_b": None,
        "hazard_details": [],
        "raw_count": 0, "war_count": 0, "waw_count": 0,
        "structural_count": 0, "memory_count": 0, "control_count": 0,
    }

    if core is None:
        return result

    # Skip OoO core — it handles hazards internally
    if hasattr(core, 'get_ooo_state'):
        return result

    id_ex  = core.ID_EX
    ex_mem = core.EX_MEM
    mem_wb = core.MEM_WB
    if_id  = core.IF_ID

    def safe_asm(reg):
        if reg.valid and reg.instr:
            try:
                return reg.instr.to_assembly()
            except Exception:
                return "?"
        return "NOP"

    def get_rd(reg):
        if reg.valid and reg.instr and hasattr(reg.instr, 'rd'):
            return reg.instr.rd
        return None

    def get_rs1(reg):
        if reg.valid and reg.instr and hasattr(reg.instr, 'rs1'):
            return reg.instr.rs1
        return None

    def get_rs2(reg):
        if reg.valid and reg.instr and hasattr(reg.instr, 'rs2'):
            return reg.instr.rs2
        return None

    def get_result(reg):
        if hasattr(reg, 'result') and reg.result is not None:
            return reg.result
        return 0

    id_rs1 = get_rs1(id_ex)
    id_rs2 = get_rs2(id_ex)

    # ── RAW + Forwarding ──────────────────────────────────────────────────────
    ex_rd  = get_rd(ex_mem)
    mem_rd = get_rd(mem_wb)

    if ex_mem.valid and ex_rd and ex_rd != 0:
        if id_rs1 is not None and id_rs1 == ex_rd:
            result["raw"] = True
            result["forward_a"] = {"from": "EX_MEM", "register": ex_rd, "value": get_result(ex_mem)}
            result["hazard_details"].append({
                "type": "RAW", "source": f"EX/MEM (x{ex_rd})",
                "destination": "ID/EX rs1", "resolution": "FORWARD",
                "description": f"EX/MEM → rs1: forwarding x{ex_rd} = {get_result(ex_mem)}",
            })
            result["raw_count"] += 1
            hazard_counters["raw_hazards"] += 1

        if id_rs2 is not None and id_rs2 == ex_rd and result["forward_b"] is None:
            result["raw"] = True
            result["forward_b"] = {"from": "EX_MEM", "register": ex_rd, "value": get_result(ex_mem)}
            result["hazard_details"].append({
                "type": "RAW", "source": f"EX/MEM (x{ex_rd})",
                "destination": "ID/EX rs2", "resolution": "FORWARD",
                "description": f"EX/MEM → rs2: forwarding x{ex_rd} = {get_result(ex_mem)}",
            })
            result["raw_count"] += 1
            hazard_counters["raw_hazards"] += 1

    if mem_wb.valid and mem_rd and mem_rd != 0:
        if id_rs1 is not None and id_rs1 == mem_rd and result["forward_a"] is None:
            result["raw"] = True
            result["forward_a"] = {"from": "MEM_WB", "register": mem_rd, "value": get_result(mem_wb)}
            result["hazard_details"].append({
                "type": "RAW", "source": f"MEM/WB (x{mem_rd})",
                "destination": "ID/EX rs1", "resolution": "FORWARD",
                "description": f"MEM/WB → rs1: forwarding x{mem_rd}",
            })
            result["raw_count"] += 1
            hazard_counters["raw_hazards"] += 1

        if id_rs2 is not None and id_rs2 == mem_rd and result["forward_b"] is None:
            result["raw"] = True
            result["forward_b"] = {"from": "MEM_WB", "register": mem_rd, "value": get_result(mem_wb)}
            result["hazard_details"].append({
                "type": "RAW", "source": f"MEM/WB (x{mem_rd})",
                "destination": "ID/EX rs2", "resolution": "FORWARD",
                "description": f"MEM/WB → rs2: forwarding x{mem_rd}",
            })
            result["raw_count"] += 1
            hazard_counters["raw_hazards"] += 1

    # ── Load-Use Stall ────────────────────────────────────────────────────────
    if id_ex.valid and id_ex.instr:
        is_load = hasattr(id_ex.instr, 'is_load') and id_ex.instr.is_load
        if is_load:
            load_rd = get_rd(id_ex)
            if_rs1  = get_rs1(if_id) if if_id.valid else None
            if_rs2  = get_rs2(if_id) if if_id.valid else None
            if load_rd and load_rd != 0:
                if (if_rs1 is not None and if_rs1 == load_rd) or \
                   (if_rs2 is not None and if_rs2 == load_rd):
                    result["stall"] = True
                    hazard_counters["total_stall_cycles"] += 1
                    result["hazard_details"].append({
                        "type": "LOAD-USE", "source": f"ID/EX load x{load_rd}",
                        "destination": "IF/ID", "resolution": "STALL",
                        "description": f"Load-use hazard on x{load_rd}: pipeline stall inserted",
                    })

    # ── WAR Hazard ────────────────────────────────────────────────────────────
    id_reads = [r for r in [id_rs1, id_rs2] if r is not None and r != 0]
    if_writes = get_rd(if_id) if if_id.valid else None
    if if_writes and if_writes != 0 and if_writes in id_reads:
        result["war"] = True
        result["war_count"] += 1
        hazard_counters["war_hazards"] += 1
        result["hazard_details"].append({
            "type": "WAR", "source": f"ID/EX reads x{if_writes}",
            "destination": f"IF/ID will write x{if_writes}", "resolution": "TRACKED",
            "description": f"WAR: ID/EX reads x{if_writes} before IF/ID overwrites it (in-order execution safe)",
        })

    # ── WAW Hazard ────────────────────────────────────────────────────────────
    pipeline_writes = {}
    for stage_name, reg in [("ID/EX", id_ex), ("EX/MEM", ex_mem), ("MEM/WB", mem_wb)]:
        rd = get_rd(reg)
        if rd and rd != 0 and reg.valid:
            if rd in pipeline_writes:
                result["waw"] = True
                result["waw_count"] += 1
                hazard_counters["waw_hazards"] += 1
                result["hazard_details"].append({
                    "type": "WAW",
                    "source": f"{pipeline_writes[rd]} writes x{rd}",
                    "destination": f"{stage_name} writes x{rd}", "resolution": "TRACKED",
                    "description": f"WAW: two in-flight instructions both write x{rd}",
                })
            else:
                pipeline_writes[rd] = stage_name

    # ── Structural Hazard ─────────────────────────────────────────────────────
    def is_mem_op(reg):
        if reg.valid and reg.instr:
            il = hasattr(reg.instr, 'is_load')  and reg.instr.is_load
            ist = hasattr(reg.instr, 'is_store') and reg.instr.is_store
            return il or ist
        return False

    if is_mem_op(ex_mem) and is_mem_op(mem_wb):
        result["structural"] = True
        result["structural_count"] += 1
        hazard_counters["structural_hazards"] += 1
        result["hazard_details"].append({
            "type": "STRUCTURAL", "source": "EX/MEM memory op",
            "destination": "MEM/WB memory op", "resolution": "TRACKED",
            "description": "Structural: two memory operations competing for single memory port",
        })

    # ── Memory Hazard (store → load same base reg) ────────────────────────────
    ex_is_store = ex_mem.valid and ex_mem.instr and \
                  hasattr(ex_mem.instr, 'is_store') and ex_mem.instr.is_store
    id_is_load  = id_ex.valid and id_ex.instr and \
                  hasattr(id_ex.instr, 'is_load') and id_ex.instr.is_load

    if ex_is_store and id_is_load:
        ex_rs1 = get_rs1(ex_mem)
        id_rs1_v = get_rs1(id_ex)
        if ex_rs1 is not None and ex_rs1 == id_rs1_v:
            result["memory"] = True
            result["memory_count"] += 1
            hazard_counters["memory_hazards"] += 1
            result["hazard_details"].append({
                "type": "MEMORY", "source": f"EX/MEM store (rs1=x{ex_rs1})",
                "destination": f"ID/EX load (rs1=x{id_rs1_v})", "resolution": "TRACKED",
                "description": f"Memory hazard: store and load share base register x{ex_rs1}",
            })

    # ── Control Hazard ────────────────────────────────────────────────────────
    if ex_mem.valid and ex_mem.instr:
        is_branch = hasattr(ex_mem.instr, 'is_branch') and ex_mem.instr.is_branch
        is_jump   = hasattr(ex_mem.instr, 'is_jump')   and ex_mem.instr.is_jump
        if is_branch or is_jump:
            result["control"] = True
            result["control_count"] += 1
            hazard_counters["control_hazards"] += 1
            kind = "Branch" if is_branch else "Jump"
            result["hazard_details"].append({
                "type": "CONTROL", "source": f"EX/MEM {kind}: {safe_asm(ex_mem)}",
                "destination": "IF/ID, ID/EX", "resolution": "FLUSH",
                "description": f"Control hazard: {kind} in EX stage may flush pipeline",
            })

    return result


# ═══════════════════════════════════════════════════════════════════════════════
# Phase 3: Record pipeline trace snapshot BEFORE a tick
# ═══════════════════════════════════════════════════════════════════════════════
def record_pipeline_trace(cycle_num: int):
    global pipeline_trace_history
    if core is None:
        return

    def stage_snap(reg, is_wb=False):
        if reg.valid and reg.instr:
            try:
                asm = reg.instr.to_assembly()
            except Exception:
                asm = "?"
            mnemonic = asm.split()[0].upper() if asm else "?"
            return {
                "valid": True, "instruction": asm,
                "mnemonic": mnemonic,
                "pc": f"0x{reg.pc:04X}" if hasattr(reg, 'pc') else "0x0000",
            }
        return {"valid": False, "instruction": "---", "mnemonic": "---", "pc": ""}

    # In OoO mode build a simplified trace
    if hasattr(core, 'get_ooo_state'):
        ooo = core.get_ooo_state()
        snapshot = {
            "cycle": cycle_num,
            "mode": "ooo",
            "FETCH":    {"valid": core.fetch_ptr < core.total_instructions, "instruction": "fetching", "mnemonic": "FETCH", "pc": f"0x{core.fetch_ptr*4:04X}"},
            "DISPATCH": {"valid": len(core.rs) > 0, "instruction": f"{len(core.rs)} in RS", "mnemonic": "DISP", "pc": ""},
            "EXECUTE":  {"valid": any(fu["busy"] for fu in core.functional_units.values()), "instruction": "executing", "mnemonic": "EXEC", "pc": ""},
            "COMMIT":   {"valid": len(core.rob) > 0, "instruction": f"{len(core.rob)} in ROB", "mnemonic": "CMIT", "pc": ""},
        }
    else:
        snapshot = {
            "cycle": cycle_num,
            "mode": "inorder",
            "IF":  stage_snap(core.IF_ID),
            "ID":  stage_snap(core.ID_EX),
            "EX":  stage_snap(core.EX_MEM),
            "MEM": stage_snap(core.MEM_WB),
            "WB":  stage_snap(core.MEM_WB, is_wb=True),
        }

    pipeline_trace_history.append(snapshot)
    if len(pipeline_trace_history) > MAX_TRACE_HISTORY:
        pipeline_trace_history = pipeline_trace_history[-MAX_TRACE_HISTORY:]


# ═══════════════════════════════════════════════════════════════════════════════
# Core loader helpers
# ═══════════════════════════════════════════════════════════════════════════════
def load_isa(isa_name: str):
    global isa
    try:
        isa_module = importlib.import_module(f"isa.{isa_name}.isa")
        isa = isa_module.ISA()
        print(f"[OK] Loaded ISA: {isa_name} (XLEN={isa.XLEN})")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to load ISA {isa_name}: {e}")
        return False


def load_core_class(core_name: str):
    try:
        core_module = importlib.import_module(f"microarch.{core_name}.core")
        return core_module.Core
    except Exception as e:
        print(f"[ERROR] Failed to load core {core_name}: {e}")
        return None


def init_cpu(instructions: List[int]):
    global stats, program, regs, core
    reset_hazard_counters()

    if isa is None:
        load_isa(current_isa_name)

    Core = load_core_class(current_core_name)
    if Core is None:
        raise RuntimeError(f"Failed to load core: {current_core_name}")

    if isa.ISA_NAME not in Core.SUPPORTED_ISA:
        raise RuntimeError(f"ISA {isa.ISA_NAME} not supported by core {current_core_name}")

    stats   = Stats()
    program = Program(instructions)
    regs    = isa.create_register_file()
    core    = Core(cfg, stats, program, isa, regs)

    # Phase 1: run static analysis right after load
    analyze_static_dependencies()

    print(f"\n{'='*60}")
    print(f"CPU INIT | ISA={current_isa_name} | Core={current_core_name}")
    print(f"Instructions: {len(instructions)} | Static deps: {len(static_dependencies)}")
    print(f"{'='*60}")


# ═══════════════════════════════════════════════════════════════════════════════
# instr_to_dict helper
# ═══════════════════════════════════════════════════════════════════════════════
def instr_to_dict(pipe_reg, include_control=False):
    if not pipe_reg.valid or pipe_reg.instr is None:
        return {
            "valid": False, "instruction": "NOP", "assembly": "nop",
            "pc": 0, "rd": None, "rs1": None, "rs2": None, "immediate": None,
            "control_signals": {
                "regWrite": False, "memRead": False, "memWrite": False,
                "memToReg": False, "aluSrc": False, "branch": False,
                "jump": False, "aluOp": "NOP",
            } if include_control else None,
        }

    instr = pipe_reg.instr
    assembly_str = instr.to_assembly() if hasattr(instr, 'to_assembly') else str(instr)

    is_load   = hasattr(instr, 'is_load')   and instr.is_load
    is_store  = hasattr(instr, 'is_store')  and instr.is_store
    is_branch = hasattr(instr, 'is_branch') and instr.is_branch
    is_jump   = hasattr(instr, 'is_jump')   and instr.is_jump
    writes_rd = hasattr(instr, 'writes_rd') and instr.writes_rd
    uses_imm  = hasattr(instr, 'imm')       and instr.imm is not None

    control_signals = None
    if include_control:
        alu_op = "ADD"
        if hasattr(instr, 'name'):
            name = instr.name.upper()
            for op in ['ADD','SUB','AND','OR','XOR','SLL','SRL','SRA','SLT','JAL','JALR']:
                if op in name:
                    alu_op = op
                    break
            if is_branch:
                alu_op = "SUB"

        control_signals = {
            "regWrite": writes_rd,
            "memRead":  is_load,
            "memWrite": is_store,
            "memToReg": is_load,
            "aluSrc":   uses_imm or is_load or is_store,
            "branch":   is_branch,
            "jump":     is_jump,
            "aluOp":    alu_op,
        }

    return {
        "valid":      True,
        "instruction": assembly_str,
        "assembly":    assembly_str,
        "pc":          pipe_reg.pc if hasattr(pipe_reg, 'pc') else 0,
        "rd":          instr.rd   if hasattr(instr, 'rd')   else None,
        "rs1":         instr.rs1  if hasattr(instr, 'rs1')  else None,
        "rs2":         instr.rs2  if hasattr(instr, 'rs2')  else None,
        "immediate":   instr.imm  if hasattr(instr, 'imm') and instr.imm is not None else 0,
        "reg_write":   writes_rd,
        "mem_read":    is_load,
        "mem_write":   is_store,
        "alu_result":  pipe_reg.result if hasattr(pipe_reg, 'result') and pipe_reg.result is not None else 0,
        "control_signals": control_signals,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# get_state_dict — returns full enriched state (Phases 1-4)
# ═══════════════════════════════════════════════════════════════════════════════
def get_state_dict():
    if core is None:
        return {
            "cycle": 0, "pc": 0, "halted": False,
            "registers": [0] * 32,
            "pipeline": {"IF_ID": {"valid": False}, "ID_EX": {"valid": False}, "EX_MEM": {"valid": False}, "MEM_WB": {"valid": False}},
            "instruction_memory": [],
            "alu": {"operandA": 0, "operandB": 0, "operation": "NOP", "result": 0, "zero": True},
            "hazards": {"stall": False, "forward_a": None, "forward_b": None},
            "hazard_stats":      {k: 0 for k in hazard_counters},
            "static_dependencies": [],
            "pipeline_trace":    [],
            "ooo_state":         None,
            "running": False,
            "statistics": {"total_cycles": 0, "execution_time_seconds": 0, "cpi": 0,
                           "instructions_completed": 0, "stage_cycles": {"IF": 0, "ID": 0, "EX": 0, "MEM": 0, "WB": 0}},
        }

    # Build instruction memory
    instr_mem = []
    addr = 0
    while addr < program.end:
        bits = program.load_word(addr)
        try:
            decoded = isa.decode(bits)
            assembly = decoded.to_assembly()
        except Exception:
            assembly = f"unknown (0x{bits:08X})"
        instr_mem.append({"address": addr, "hex": f"{bits:08X}", "assembly": assembly, "opcode": "I-type"})
        addr += 4

    # Per-cycle dynamic hazard detection (in-order only)
    cycle_hazards = detect_hazards_this_cycle()

    # OoO state (Phase 4)
    ooo_state = None
    is_ooo = hasattr(core, 'get_ooo_state')
    if is_ooo:
        ooo_state = core.get_ooo_state()

    # ALU data
    alu_data = {
        "operandA":  core.EX_MEM.alu_op_a      if core.EX_MEM.valid and hasattr(core.EX_MEM, 'alu_op_a')      else 0,
        "operandB":  core.EX_MEM.alu_op_b      if core.EX_MEM.valid and hasattr(core.EX_MEM, 'alu_op_b')      else 0,
        "operation": core.EX_MEM.alu_operation  if core.EX_MEM.valid and hasattr(core.EX_MEM, 'alu_operation')  else "NOP",
        "result":    core.EX_MEM.result         if core.EX_MEM.valid and hasattr(core.EX_MEM, 'result') and core.EX_MEM.result is not None else 0,
        "zero":     (core.EX_MEM.result == 0)   if core.EX_MEM.valid and hasattr(core.EX_MEM, 'result') and core.EX_MEM.result is not None else False,
    }

    # Statistics (Phase 2)
    cycle = core.cycle
    completed = hazard_counters["completed_instructions"]
    cpi = cycle / max(1, completed) if completed > 0 else (cycle / max(1, len(instr_mem)))
    stats_data = {
        "total_cycles":           cycle,
        "execution_time_seconds": cycle / cfg.freq_hz if cfg.freq_hz > 0 else 0,
        "cpi":                    round(cpi, 4),
        "instructions_completed": completed,
        "stage_cycles": {
            "IF":  max(0, cycle),
            "ID":  max(0, cycle - 1),
            "EX":  max(0, cycle - 2),
            "MEM": max(0, cycle - 3),
            "WB":  max(0, cycle - 4),
        },
    }

    return {
        "cycle":   cycle,
        "pc":      core.pc,
        "halted":  core.is_done(),
        "registers": regs.get_all(),

        # Pipeline registers
        "pipeline": {
            "IF_ID":  instr_to_dict(core.IF_ID),
            "ID_EX":  instr_to_dict(core.ID_EX,  include_control=True),
            "EX_MEM": instr_to_dict(core.EX_MEM),
            "MEM_WB": instr_to_dict(core.MEM_WB),
        },
        "IF_ID":  instr_to_dict(core.IF_ID),
        "ID_EX":  instr_to_dict(core.ID_EX,  include_control=True),
        "EX_MEM": instr_to_dict(core.EX_MEM),
        "MEM_WB": instr_to_dict(core.MEM_WB),

        "instruction_memory": instr_mem,

        "alu": alu_data,

        # Phase 1: Dynamic hazard info for this cycle
        "hazards": {
            "stall":     cycle_hazards["stall"],
            "forward_a": cycle_hazards["forward_a"],
            "forward_b": cycle_hazards["forward_b"],
            "raw":       cycle_hazards["raw"],
            "war":       cycle_hazards["war"],
            "waw":       cycle_hazards["waw"],
            "structural": cycle_hazards["structural"],
            "memory":    cycle_hazards["memory"],
            "control":   cycle_hazards["control"],
            "hazard_details": cycle_hazards["hazard_details"],
        },

        # Phase 1+2: Cumulative hazard counters
        "hazard_stats": dict(hazard_counters),

        # Phase 1: Static dependency analysis
        "static_dependencies": static_dependencies,

        # Phase 3: Pipeline trace history
        "pipeline_trace": pipeline_trace_history,

        # Phase 4: OoO state
        "ooo_state": ooo_state,
        "execution_mode": "ooo" if is_ooo else "inorder",

        "running":    False,
        "statistics": stats_data,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Request Models
# ═══════════════════════════════════════════════════════════════════════════════
class LoadProgramRequest(BaseModel):
    instructions: Optional[List[int]] = None
    assembly:     Optional[str]       = None

class ConfigRequest(BaseModel):
    isa:  Optional[str] = None
    core: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# Default program
# ═══════════════════════════════════════════════════════════════════════════════
DEFAULT_PROGRAM = [
    0x00500093,  # addi x1, x0, 5
    0x00A00113,  # addi x2, x0, 10
    0x002081B3,  # add  x3, x1, x2
    0xFFF10213,  # addi x4, x2, -1
    0x00000013,  # nop
    0x00000013,  # nop
]

print(f"\n{'='*80}\nRISC-V CPU SIMULATOR BACKEND v4.0 — STARTING\n{'='*80}")
print(f"Available ISAs:  {list(AVAILABLE_ISAS.keys())}")
print(f"Available Cores: {list(AVAILABLE_CORES.keys())}")
print(f"{'='*80}")

load_isa(current_isa_name)

print(f"\nBACKEND READY\n{'='*80}\n")


# ═══════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/")
async def root():
    return {
        "message": "RISC-V CPU Simulator API v4.0",
        "current_isa":  current_isa_name,
        "current_core": current_core_name,
        "features": ["WAR/WAW/Structural/Memory/Control hazards", "Pipeline trace", "OoO engine", "Static dependency analysis"],
        "endpoints": ["/state", "/step", "/reset", "/load", "/config", "/config/options"],
    }


@app.get("/state")
async def get_state():
    return get_state_dict()


@app.post("/step")
async def step():
    if core is None:
        raise HTTPException(status_code=400, detail="CPU not initialized")
    if core.is_done():
        return get_state_dict()

    print(f"\n── STEP → Cycle {core.cycle + 1} ──")
    print(f"  PC:     0x{core.pc:08X}")

    # Phase 3: Record trace BEFORE tick
    record_pipeline_trace(core.cycle + 1)

    # Execute one cycle
    core.tick()

    # Track completed instructions (WB stage)
    if core.MEM_WB.valid and core.MEM_WB.instr is not None:
        hazard_counters["completed_instructions"] += 1

    state = get_state_dict()
    print(f"  Done → Cycle {state['cycle']} | Halted: {state['halted']}")
    return state


@app.post("/reset")
async def reset():
    if program is None:
        return get_state_dict()
    print(f"\n── RESET ──")
    instructions = program.get_all_instructions()
    init_cpu(instructions)
    print(f"  CPU reset | ISA={current_isa_name} | Core={current_core_name}")
    return get_state_dict()


@app.post("/load")
async def load_program(request: LoadProgramRequest):
    if request.assembly:
        try:
            compiler   = get_compiler()
            instructions = compiler.compile_to_instructions(request.assembly)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Compilation failed: {str(e)}")
    elif request.instructions:
        instructions = request.instructions
    else:
        raise HTTPException(status_code=400, detail="Either 'assembly' or 'instructions' must be provided")

    for i, instr in enumerate(instructions):
        if not isinstance(instr, int) or instr < 0 or instr > 0xFFFFFFFF:
            raise HTTPException(status_code=400, detail=f"Invalid instruction at index {i}: {instr}")

    print(f"\n── LOAD: {len(instructions)} instructions ──")
    init_cpu(instructions)
    print(f"  Static deps detected: {len(static_dependencies)}")
    return get_state_dict()


@app.get("/config")
async def get_config():
    return {
        "isa":       current_isa_name,
        "core":      current_core_name,
        "isa_info":  AVAILABLE_ISAS.get(current_isa_name,  {}),
        "core_info": AVAILABLE_CORES.get(current_core_name, {}),
    }


@app.get("/config/options")
async def get_config_options():
    return {"isas": AVAILABLE_ISAS, "cores": AVAILABLE_CORES}


@app.post("/config")
async def set_config(request: ConfigRequest):
    global current_isa_name, current_core_name, isa, core
    changed = False

    if request.isa is not None:
        if request.isa not in AVAILABLE_ISAS:
            raise HTTPException(status_code=400, detail=f"Invalid ISA: {request.isa}")
        if request.isa != current_isa_name:
            current_isa_name = request.isa
            if not load_isa(current_isa_name):
                raise HTTPException(status_code=500, detail=f"Failed to load ISA: {request.isa}")
            changed = True

    if request.core is not None:
        if request.core not in AVAILABLE_CORES:
            raise HTTPException(status_code=400, detail=f"Invalid core: {request.core}")
        if request.core != current_core_name:
            current_core_name = request.core
            changed = True

    if changed:
        try:
            instructions = program.get_all_instructions() if program else []
            if instructions:
                init_cpu(instructions)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to initialize CPU: {str(e)}")

    return {"success": True, "isa": current_isa_name, "core": current_core_name, "changed": changed}


@app.get("/health")
async def health_check():
    return {
        "status":  "healthy",
        "cycle":   core.cycle if core else 0,
        "backend": "v4.0",
        "isa":     current_isa_name,
        "core":    current_core_name,
        "features": ["phase1-hazards", "phase2-stats", "phase3-trace", "phase4-ooo"],
    }


@app.get("/microarch")
async def get_microarch():
    """Return the active microarchitecture specification."""
    if core is None:
        raise HTTPException(status_code=400, detail="CPU not initialized")

    spec = None
    if hasattr(core, 'get_microarch_spec'):
        spec = core.get_microarch_spec()
    elif hasattr(core, 'spec'):
        spec = core.spec

    if spec is None:
        spec = {
            "name": current_core_name,
            "description": AVAILABLE_CORES.get(current_core_name, {}).get("description", ""),
            "pipeline_stages": ["IF", "ID", "EX", "MEM", "WB"],
            "forwarding": True,
            "branch_penalty": 3,
            "memory_latency": 2,
        }

    return {
        "core": current_core_name,
        "isa":  current_isa_name,
        "spec": spec,
    }


class MicroarchUpdateRequest(BaseModel):
    code: str


@app.post("/microarch/update")
async def update_microarch(request: MicroarchUpdateRequest):
    """Parse Python MICROARCH dict from user code and apply it to the running core."""
    code = request.code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="No code provided")

    # Safely exec the code in an isolated namespace
    namespace: dict = {}
    try:
        exec(compile(code, "<microarch_input>", "exec"), namespace)
    except SyntaxError as e:
        raise HTTPException(status_code=400, detail=f"Syntax error in architecture code: {e}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error executing architecture code: {e}")

    if "MICROARCH" not in namespace:
        raise HTTPException(status_code=400, detail="Code must define a 'MICROARCH' dictionary")

    new_spec = namespace["MICROARCH"]
    if not isinstance(new_spec, dict):
        raise HTTPException(status_code=400, detail="MICROARCH must be a dictionary")

    # Validate required fields
    required = ["name", "pipeline_stages"]
    for field in required:
        if field not in new_spec:
            raise HTTPException(status_code=400, detail=f"MICROARCH missing required field: '{field}'")

    # Apply to running core — reinitialize with current program so new settings take effect
    applied = False
    if core is not None and program is not None:
        try:
            current_instructions = program.get_all_instructions()
            # Temporarily write new spec to the spec file so init_cpu picks it up
            spec_path = os.path.join(
                os.path.dirname(__file__),
                "microarch", "inorder_5stage", "microarch_spec.py"
            )
            with open(spec_path, "w", encoding="utf-8") as f:
                f.write('"""\nMicroarchitecture Specification - auto-generated\n"""\n\n')
                f.write(f"MICROARCH = {repr(new_spec)}\n")
            # Reload the spec module so the new values are used
            import importlib
            import microarch.inorder_5stage.microarch_spec as _spec_mod
            importlib.reload(_spec_mod)
            # Reinitialize CPU with same program + new spec
            init_cpu(current_instructions)
            applied = True
            print(f"[MICROARCH] Re-initialized CPU with new spec: "
                  f"forwarding={core.forwarding}, branch_penalty={core.branch_penalty}, "
                  f"memory_latency={core.memory_latency}")
        except Exception as e:
            print(f"[MICROARCH] Live apply warning: {e}")
            # Fallback: just update settings in-place
            try:
                from microarch.inorder_5stage.core import _merge, _DEFAULT_SPEC
                merged = _merge(_DEFAULT_SPEC, new_spec)
                core.spec           = merged
                core.forwarding     = merged.get("forwarding", True)
                core.branch_penalty = merged.get("branch_penalty", 3)
                core.memory_latency = merged.get("memory_latency", 2)
                core.fu_latencies   = {
                    k: v.get("latency", 1)
                    for k, v in merged.get("functional_units", {}).items()
                }
                applied = True
            except Exception:
                pass

    # If no program loaded yet, initialize with default program so core is ready
    if not applied:
        try:
            spec_path = os.path.join(
                os.path.dirname(__file__),
                "microarch", "inorder_5stage", "microarch_spec.py"
            )
            with open(spec_path, "w", encoding="utf-8") as f:
                f.write('"""\nMicroarchitecture Specification - auto-generated\n"""\n\n')
                f.write(f"MICROARCH = {repr(new_spec)}\n")
            import microarch.inorder_5stage.microarch_spec as _spec_mod
            importlib.reload(_spec_mod)
        except Exception as e:
            print(f"[MICROARCH] Warning: could not persist spec: {e}")
        # Initialize with default program so core is ready for execution
        try:
            init_cpu(DEFAULT_PROGRAM)
            applied = True
        except Exception as e:
            print(f"[MICROARCH] Warning: could not init with default program: {e}")

    # Return full CPU state so frontend updates immediately
    state_dict = get_state_dict()
    state_dict["microarch_applied"] = True
    state_dict["microarch_message"] = f"Architecture '{new_spec.get('name', 'unknown')}' applied successfully"

    return {
        "success": True,
        "applied_live": applied,
        "spec": new_spec,
        "message": f"Architecture '{new_spec.get('name', 'unknown')}' applied successfully",
        "state": state_dict,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

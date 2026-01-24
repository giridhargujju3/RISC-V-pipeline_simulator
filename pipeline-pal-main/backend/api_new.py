# FastAPI Backend for RISC-V CPU Simulator - Integrated with Original Backend

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from config import Config
from program.loader import Program
from utils.stats import Stats
import importlib

app = FastAPI(
    title="RISC-V CPU Simulator API",
    description="Backend API for multi-ISA multi-core RISC-V CPU simulation",
    version="3.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Available ISAs and Cores
AVAILABLE_ISAS = {
    "rv32i": {"name": "RV32I", "description": "32-bit Base Integer ISA", "xlen": 32},
    "rv64i": {"name": "RV64I", "description": "64-bit Base Integer ISA", "xlen": 64},
    "rv64im": {"name": "RV64IM", "description": "64-bit with Multiply/Divide", "xlen": 64}
}

AVAILABLE_CORES = {
    "inorder_5stage": {"name": "5-Stage Pipeline", "description": "Classic 5-stage in-order pipeline", "stages": 5},
    "inorder_7stage": {"name": "7-Stage Pipeline", "description": "Extended 7-stage in-order pipeline", "stages": 7},
    "custom_core": {"name": "Custom Core", "description": "Educational customizable core", "stages": 5}
}

# Global CPU components and configuration
current_isa_name = "rv32i"
current_core_name = "inorder_5stage"
isa = None
cfg = Config(1e9)  # 1 GHz
stats = None
program = None
regs = None
core = None


def load_isa(isa_name: str):
    """Dynamically load ISA module"""
    global isa
    try:
        isa_module = importlib.import_module(f"isa.{isa_name}.isa")
        isa = isa_module.ISA()
        print(f"✅ Loaded ISA: {isa_name} (XLEN={isa.XLEN})")
        return True
    except Exception as e:
        print(f"❌ Failed to load ISA {isa_name}: {e}")
        return False


def load_core_class(core_name: str):
    """Dynamically load Core class"""
    try:
        core_module = importlib.import_module(f"microarch.{core_name}.core")
        return core_module.Core
    except Exception as e:
        print(f"❌ Failed to load core {core_name}: {e}")
        return None


def init_cpu(instructions: List[int]):
    """Initialize CPU with given instructions using current ISA and core"""
    global stats, program, regs, core
    
    if isa is None:
        load_isa(current_isa_name)
    
    Core = load_core_class(current_core_name)
    if Core is None:
        raise RuntimeError(f"Failed to load core: {current_core_name}")
    
    # Validate ISA compatibility
    if isa.ISA_NAME not in Core.SUPPORTED_ISA:
        raise RuntimeError(f"ISA {isa.ISA_NAME} not supported by core {current_core_name}")
    
    stats = Stats()
    program = Program(instructions)
    regs = isa.create_register_file()
    core = Core(cfg, stats, program, isa, regs)
    
    print(f"\n{'='*60}")
    print(f"CPU INITIALIZATION")
    print(f"{'='*60}")
    print(f"ISA: {current_isa_name} (XLEN={isa.XLEN})")
    print(f"Core: {current_core_name} ({AVAILABLE_CORES[current_core_name]['stages']} stages)")
    print(f"Instructions loaded: {len(instructions)}")
    print(f"Program memory: 0x00000000 - 0x{program.end:08X}")
    print(f"Initial PC: 0x{core.pc:08X}")
    print(f"Clock frequency: {cfg.freq_hz/1e9:.1f} GHz")
    print(f"{'='*60}")


def get_state_dict():
    """Convert CPU state to dictionary for API response"""
    if core is None:
        return {
            "cycle": 0,
            "pc": 0,
            "halted": False,
            "registers": [0] * 32,
            "pipeline": {
                "IF_ID": {"valid": False, "instruction": None},
                "ID_EX": {"valid": False, "instruction": None},
                "EX_MEM": {"valid": False, "instruction": None},
                "MEM_WB": {"valid": False, "instruction": None}
            },
            "instructionMemory": [],
            "alu": {"operandA": 0, "operandB": 0, "operation": "NOP", "result": 0, "zero": True},
            "hazards": {"forward_a": None, "forward_b": None, "stall_required": False}
        }
    
    # Build instruction memory
    instr_mem = []
    addr = 0
    while addr < program.end:
        bits = program.load_word(addr)
        try:
            decoded_instr = isa.decode(bits)
            assembly = decoded_instr.to_assembly()
        except:
            assembly = f"unknown (0x{bits:08X})"
        
        instr_mem.append({
            "address": addr,
            "hex": f"{bits:08X}",
            "assembly": assembly,
            "opcode": "I-type"  # simplified
        })
        addr += 4
    
    # Helper to convert instruction to dict
    def instr_to_dict(pipe_reg):
        if not pipe_reg.valid or pipe_reg.instr is None:
            return {
                "valid": False,
                "instruction": "NOP",
                "rd": None,
                "rs1": None,
                "rs2": None,
                "immediate": None
            }
        
        instr = pipe_reg.instr
        assembly_str = instr.to_assembly() if hasattr(instr, 'to_assembly') else str(instr)
        return {
            "valid": True,
            "instruction": assembly_str,
            "rd": instr.rd if hasattr(instr, 'rd') else None,
            "rs1": instr.rs1 if hasattr(instr, 'rs1') else None,
            "rs2": instr.rs2 if hasattr(instr, 'rs2') else None,
            "immediate": instr.imm if hasattr(instr, 'imm') and instr.imm is not None else 0,
            "reg_write": instr.writes_rd if hasattr(instr, 'writes_rd') else False,
            "mem_read": False,
            "mem_write": False,
            "alu_result": pipe_reg.result if hasattr(pipe_reg, 'result') and pipe_reg.result is not None else 0
        }
    
    return {
        "cycle": core.cycle,
        "pc": core.pc,
        "halted": core.is_done(),
        "registers": regs.get_all(),
        "pipeline": {
            "IF_ID": instr_to_dict(core.IF_ID),
            "ID_EX": instr_to_dict(core.ID_EX),
            "EX_MEM": instr_to_dict(core.EX_MEM),
            "MEM_WB": instr_to_dict(core.MEM_WB)
        },
        "instruction_memory": instr_mem,
        "IF_ID": instr_to_dict(core.IF_ID),
        "ID_EX": instr_to_dict(core.ID_EX),
        "EX_MEM": instr_to_dict(core.EX_MEM),
        "MEM_WB": instr_to_dict(core.MEM_WB),
        "alu": {
            "operandA": 0,
            "operandB": 0,
            "operation": "ADD" if core.ID_EX.valid else "NOP",
            "result": core.EX_MEM.result if core.EX_MEM.valid and hasattr(core.EX_MEM, 'result') else 0,
            "zero": False
        },
        "hazards": {
            "stall": False,
            "forward_a": None,
            "forward_b": None
        },
        "running": False,
        "statistics": {
            "total_cycles": core.cycle,
            "execution_time_seconds": (core.cycle / cfg.freq_hz) if cfg.freq_hz > 0 else 0,
            "stage_cycles": {
                "IF": max(0, core.cycle - 0),
                "ID": max(0, core.cycle - 1),
                "EX": max(0, core.cycle - 2),
                "MEM": max(0, core.cycle - 3),
                "WB": max(0, core.cycle - 4)
            }
        }
    }


class LoadProgramRequest(BaseModel):
    """Request body for loading a program"""
    instructions: List[int]


class ConfigRequest(BaseModel):
    """Request body for configuration changes"""
    isa: Optional[str] = None
    core: Optional[str] = None


# Load default program on startup
DEFAULT_PROGRAM = [
    0x00500093,  # addi x1, x0, 5
    0x00A00113,  # addi x2, x0, 10
    0x002081B3,  # add x3, x1, x2
    0xFFF10213,  # addi x4, x2, -1
    0x00000013,  # nop
    0x00000013,  # nop
]

print(f"\n{'='*80}")
print(f"RISC-V CPU SIMULATOR BACKEND STARTING")
print(f"{'='*80}")
print(f"Available ISAs: {list(AVAILABLE_ISAS.keys())}")
print(f"Available Cores: {list(AVAILABLE_CORES.keys())}")
print(f"Default ISA: {current_isa_name}")
print(f"Default Core: {current_core_name}")
print(f"{'='*80}")

load_isa(current_isa_name)
init_cpu(DEFAULT_PROGRAM)

print(f"\nBACKEND READY - Listening for frontend requests...")
print(f"{'='*80}\n")


@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "RISC-V CPU Simulator API - Multi-ISA Multi-Core",
        "version": "3.0.0",
        "current_isa": current_isa_name,
        "current_core": current_core_name,
        "endpoints": ["/state", "/step", "/reset", "/load", "/config", "/config/options"]
    }


@app.get("/state")
async def get_state():
    """Get current CPU state"""
    print(f"Frontend requested CPU state - Cycle: {core.cycle if core else 0}")
    return get_state_dict()


@app.post("/step")
async def step():
    """Execute one clock cycle"""
    if core is None:
        raise HTTPException(status_code=400, detail="CPU not initialized")
    
    if core.is_done():
        print("WARNING: CPU is halted, cannot step")
        return get_state_dict()
    
    print(f"\n{'='*80}")
    print(f"FRONTEND STEP REQUEST - Cycle {core.cycle} -> {core.cycle + 1}")
    print(f"{'='*80}")
    
    # Show pipeline state BEFORE step
    print(f"\nPIPELINE STATE (BEFORE STEP):")
    print(f"  PC: 0x{core.pc:08X}")
    print(f"  IF_ID:  {'VALID' if core.IF_ID.valid else 'EMPTY'} {core.IF_ID.instr.to_assembly() if core.IF_ID.valid and core.IF_ID.instr else 'empty'}")
    print(f"  ID_EX:  {'VALID' if core.ID_EX.valid else 'EMPTY'} {core.ID_EX.instr.to_assembly() if core.ID_EX.valid and core.ID_EX.instr else 'empty'}")
    print(f"  EX_MEM: {'VALID' if core.EX_MEM.valid else 'EMPTY'} {core.EX_MEM.instr.to_assembly() if core.EX_MEM.valid and core.EX_MEM.instr else 'empty'}")
    print(f"  MEM_WB: {'VALID' if core.MEM_WB.valid else 'EMPTY'} {core.MEM_WB.instr.to_assembly() if core.MEM_WB.valid and core.MEM_WB.instr else 'empty'}")
    
    # Show registers BEFORE step (only non-zero)
    regs_before = {f"x{i}": regs.read(i) for i in range(32) if regs.read(i) != 0}
    if regs_before:
        print(f"\nREGISTERS (BEFORE): {regs_before}")
    
    # Execute step
    core.tick()
    
    # Show pipeline state AFTER step
    print(f"\nPIPELINE STATE (AFTER STEP):")
    print(f"  PC: 0x{core.pc:08X}")
    print(f"  IF_ID:  {'VALID' if core.IF_ID.valid else 'EMPTY'} {core.IF_ID.instr.to_assembly() if core.IF_ID.valid and core.IF_ID.instr else 'empty'}")
    print(f"  ID_EX:  {'VALID' if core.ID_EX.valid else 'EMPTY'} {core.ID_EX.instr.to_assembly() if core.ID_EX.valid and core.ID_EX.instr else 'empty'}")
    print(f"  EX_MEM: {'VALID' if core.EX_MEM.valid else 'EMPTY'} {core.EX_MEM.instr.to_assembly() if core.EX_MEM.valid and core.EX_MEM.instr else 'empty'}")
    print(f"  MEM_WB: {'VALID' if core.MEM_WB.valid else 'EMPTY'} {core.MEM_WB.instr.to_assembly() if core.MEM_WB.valid and core.MEM_WB.instr else 'empty'}")
    
    # Show registers AFTER step (only non-zero)
    regs_after = {f"x{i}": regs.read(i) for i in range(32) if regs.read(i) != 0}
    if regs_after:
        print(f"\nREGISTERS (AFTER):  {regs_after}")
    
    # Show what changed
    if regs_before != regs_after:
        changed = {k: v for k, v in regs_after.items() if k not in regs_before or regs_before[k] != v}
        if changed:
            print(f"\nREGISTER CHANGES: {changed}")
    
    state = get_state_dict()
    print(f"\nSTEP COMPLETED - Cycle: {state['cycle']}, Halted: {state['halted']}")
    print(f"{'='*80}\n")
    
    return state


@app.post("/reset")
async def reset():
    """Reset CPU to initial state"""
    if program is None:
        raise HTTPException(status_code=400, detail="No program loaded")
    
    print(f"\n{'='*60}")
    print(f"FRONTEND RESET REQUEST")
    print(f"{'='*60}")
    
    # Reinitialize with last loaded program
    instructions = program.get_all_instructions()
    init_cpu(instructions)
    
    print(f"CPU RESET COMPLETED")
    print(f"  ISA: {current_isa_name}")
    print(f"  Core: {current_core_name}")
    print(f"  Instructions: {len(instructions)}")
    print(f"  Initial PC: 0x{core.pc:08X}")
    print(f"{'='*60}\n")
    
    return get_state_dict()


@app.post("/load")
async def load_program(request: LoadProgramRequest):
    """Load a new program into instruction memory"""
    if not request.instructions:
        raise HTTPException(status_code=400, detail="No instructions provided")
    
    print(f"\n{'='*60}")
    print(f"FRONTEND LOAD PROGRAM REQUEST")
    print(f"{'='*60}")
    print(f"Instructions to load: {len(request.instructions)}")
    
    # Validate instructions (must be 32-bit integers)
    for i, instr in enumerate(request.instructions):
        if not isinstance(instr, int) or instr < 0 or instr > 0xFFFFFFFF:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid instruction at index {i}: {instr}"
            )
    
    # Show instructions being loaded
    print(f"\nINSTRUCTION MEMORY:")
    for i, instr_bits in enumerate(request.instructions):
        addr = i * 4
        try:
            # Try to decode and show assembly
            temp_isa = importlib.import_module(f"isa.{current_isa_name}.isa").ISA()
            decoded = temp_isa.decode(instr_bits)
            assembly = decoded.to_assembly()
        except:
            assembly = f"unknown (0x{instr_bits:08X})"
        print(f"  0x{addr:08X}: 0x{instr_bits:08X} -> {assembly}")
    
    init_cpu(request.instructions)
    
    print(f"\nPROGRAM LOADED SUCCESSFULLY")
    print(f"  Total instructions: {len(request.instructions)}")
    print(f"  Memory range: 0x00000000 - 0x{program.end:08X}")
    print(f"{'='*60}\n")
    
    return get_state_dict()


@app.get("/config")
async def get_config():
    """Get current configuration"""
    return {
        "isa": current_isa_name,
        "core": current_core_name,
        "isa_info": AVAILABLE_ISAS.get(current_isa_name, {}),
        "core_info": AVAILABLE_CORES.get(current_core_name, {})
    }


@app.get("/config/options")
async def get_config_options():
    """Get available ISAs and cores"""
    return {
        "isas": AVAILABLE_ISAS,
        "cores": AVAILABLE_CORES
    }


@app.post("/config")
async def set_config(request: ConfigRequest):
    """Set ISA and/or core configuration"""
    global current_isa_name, current_core_name, isa, core
    
    print(f"\n{'='*60}")
    print(f"FRONTEND CONFIG CHANGE REQUEST")
    print(f"{'='*60}")
    print(f"Current: ISA={current_isa_name}, Core={current_core_name}")
    print(f"Requested: ISA={request.isa}, Core={request.core}")
    
    changed = False
    
    # Validate and set ISA
    if request.isa is not None:
        if request.isa not in AVAILABLE_ISAS:
            raise HTTPException(status_code=400, detail=f"Invalid ISA: {request.isa}")
        if request.isa != current_isa_name:
            current_isa_name = request.isa
            if not load_isa(current_isa_name):
                raise HTTPException(status_code=500, detail=f"Failed to load ISA: {request.isa}")
            changed = True
            print(f"ISA changed to: {current_isa_name}")
    
    # Validate and set core
    if request.core is not None:
        if request.core not in AVAILABLE_CORES:
            raise HTTPException(status_code=400, detail=f"Invalid core: {request.core}")
        if request.core != current_core_name:
            current_core_name = request.core
            changed = True
            print(f"Core changed to: {current_core_name}")
    
    # Reinitialize CPU if configuration changed
    if changed:
        try:
            instructions = program.get_all_instructions() if program else DEFAULT_PROGRAM
            init_cpu(instructions)
            print(f"CPU reinitialized with new configuration")
        except Exception as e:
            print(f"Failed to initialize CPU: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to initialize CPU: {str(e)}")
    else:
        print(f"No changes made")
    
    print(f"{'='*60}\n")
    
    return {
        "success": True,
        "isa": current_isa_name,
        "core": current_core_name,
        "changed": changed
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "cycle": core.cycle if core else 0,
        "backend": "original",
        "isa": current_isa_name,
        "core": current_core_name
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

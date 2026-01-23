# FastAPI Backend for RISC-V CPU Simulator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from cpu.cpu import CPU

app = FastAPI(
    title="RISC-V CPU Simulator API",
    description="Backend API for 5-stage pipelined RISC-V CPU simulation",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global CPU instance
cpu = CPU()

# Load default program
DEFAULT_PROGRAM = [
    0x00A00093,  # addi x1, x0, 10
    0x01400113,  # addi x2, x0, 20
    0x002081B3,  # add x3, x1, x2
    0x00000013,  # nop
    0x00000013,  # nop
]
cpu.load_program(DEFAULT_PROGRAM)


class LoadProgramRequest(BaseModel):
    """Request body for loading a program"""
    instructions: List[int]


@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "RISC-V CPU Simulator API",
        "version": "1.0.0",
        "endpoints": ["/state", "/step", "/reset", "/load"]
    }


@app.get("/state")
async def get_state():
    """Get current CPU state"""
    return cpu.get_state()


@app.post("/step")
async def step():
    """Execute one clock cycle"""
    print(f"\n🔄 API Step called - Current cycle: {cpu.cycle}")
    cpu.step()
    state = cpu.get_state()
    print(f"✅ Step completed - New cycle: {state['cycle']}, PC: 0x{state['pc']:08X}")
    return state


@app.post("/reset")
async def reset():
    """Reset CPU to initial state"""
    cpu.reset()
    # Reload the last program
    return cpu.get_state()


@app.post("/load")
async def load_program(request: LoadProgramRequest):
    """Load a new program into instruction memory"""
    if not request.instructions:
        raise HTTPException(status_code=400, detail="No instructions provided")
    
    # Validate instructions (must be 32-bit integers)
    for i, instr in enumerate(request.instructions):
        if not isinstance(instr, int) or instr < 0 or instr > 0xFFFFFFFF:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid instruction at index {i}: {instr}"
            )
    
    cpu.load_program(request.instructions)
    return cpu.get_state()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "cycle": cpu.cycle}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

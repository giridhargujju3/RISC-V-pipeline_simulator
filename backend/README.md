# RISC-V CPU Simulator Backend

A Python-based backend for simulating a 5-stage pipelined RISC-V CPU.

## Architecture

The simulator follows the classic 5-stage pipeline:

```
IF (Instruction Fetch) → ID (Instruction Decode) → EX (Execute) → MEM (Memory) → WB (Write Back)
```

## Project Structure

```
backend/
├── cpu/
│   ├── __init__.py      # Package init
│   ├── cpu.py           # Main CPU class
│   ├── registers.py     # Register file (x0-x31)
│   ├── memory.py        # Instruction & Data memory
│   ├── decoder.py       # Instruction decoder
│   ├── control.py       # Control unit
│   ├── alu.py           # ALU operations
│   ├── pipeline_regs.py # Pipeline registers
│   └── hazard.py        # Hazard detection & forwarding
├── api.py               # FastAPI endpoints
├── main.py              # Entry point
├── requirements.txt     # Python dependencies
└── README.md            # This file
```

## Installation

```bash
cd backend
pip install -r requirements.txt
```

## Running the Server

```bash
python main.py
```

The server will start at `http://localhost:8000`

## API Endpoints

### GET /state
Returns the current CPU state including:
- Cycle count
- Program counter (PC)
- All 32 registers
- Pipeline register contents
- ALU state
- Hazard information

### POST /step
Executes one clock cycle and returns the new state.

### POST /reset
Resets the CPU to initial state.

### POST /load
Loads a new program. Request body:
```json
{
  "instructions": [
    2654371,    // 0x00288193 (addi x3, x1, 2)
    5308547,    // 0x00510233 (add x4, x2, x5)
    ...
  ]
}
```

## Supported Instructions

### R-Type
- ADD, SUB, AND, OR, XOR
- SLL, SRL, SRA
- SLT, SLTU

### I-Type
- ADDI, ANDI, ORI, XORI
- SLTI, SLTIU
- SLLI, SRLI, SRAI
- LW, LH, LB, LHU, LBU
- JALR

### S-Type
- SW, SH, SB

### B-Type
- BEQ, BNE, BLT, BGE, BLTU, BGEU

### U-Type
- LUI, AUIPC

### J-Type
- JAL

## Example Usage

```python
import requests

# Get current state
response = requests.get("http://localhost:8000/state")
state = response.json()

# Execute one cycle
response = requests.post("http://localhost:8000/step")
new_state = response.json()

# Load a program
program = {
    "instructions": [
        0x00A00093,  # addi x1, x0, 10
        0x01400113,  # addi x2, x0, 20
        0x002081B3,  # add x3, x1, x2
    ]
}
response = requests.post("http://localhost:8000/load", json=program)
```

## Features

- **Cycle-accurate simulation**: Each step represents exactly one clock cycle
- **Data hazard detection**: RAW hazards detected automatically
- **Forwarding**: EX/MEM and MEM/WB forwarding paths
- **Load-use stalls**: Automatic pipeline stalls for load-use hazards
- **Branch handling**: Branch resolution in EX stage

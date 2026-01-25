# RISC-V Pipeline Simulator - Project Structure

## Overview
This is a RISC-V 5-Stage Pipelined CPU Simulator with both frontend and backend components for educational purposes.

## Architecture

### Frontend (React + TypeScript + Vite)
```
src/
├── components/           # React components
│   ├── ui/              # Reusable UI components (shadcn/ui)
│   ├── ALUPanel.tsx     # ALU visualization
│   ├── AssemblyEditor.tsx # Code editor with assembler
│   ├── ControlPanel.tsx # CPU control buttons
│   ├── ExecutionTimeline.tsx # Pipeline timeline
│   ├── HazardPanel.tsx  # Hazard detection display
│   ├── InstructionMemory.tsx # Instruction memory view
│   ├── PipelineVisualization.tsx # Main pipeline display
│   └── RegisterFile.tsx # Register file display
├── hooks/               # Custom React hooks
│   └── useCPUSimulator.ts # Main CPU state management
├── lib/                 # Utility libraries
│   ├── api.ts          # Backend API communication
│   ├── riscv-assembler.ts # Assembly to machine code converter
│   └── utils.ts        # General utilities
├── pages/              # Page components
│   ├── Index.tsx       # Main application page
│   └── NotFound.tsx    # 404 page
├── types/              # TypeScript type definitions
│   └── cpu.ts          # CPU state types
└── App.tsx             # Main app component
```

### Backend (Python + FastAPI)
```
backend/
├── cpu/                # CPU simulation modules
│   ├── alu.py         # Arithmetic Logic Unit
│   ├── control.py     # Control unit
│   ├── cpu.py         # Main CPU class
│   ├── decoder.py     # Instruction decoder
│   ├── hazard.py      # Hazard detection unit
│   ├── memory.py      # Memory components
│   ├── pipeline_regs.py # Pipeline registers
│   └── registers.py   # Register file
├── api.py             # FastAPI endpoints
├── main.py            # Server entry point
└── requirements.txt   # Python dependencies
```

## How It Works

### 1. Assembly Editor
- Write RISC-V assembly code
- Supports R, I, S, B, U, J type instructions
- Real-time syntax validation
- Example programs included

### 2. Assembly Process
- Assembly code → Machine code (32-bit instructions)
- Supports labels and immediate values
- Error checking and reporting

### 3. CPU Pipeline Stages
1. **IF (Instruction Fetch)**: Fetch instruction from memory using PC
2. **ID (Instruction Decode)**: Decode instruction, read registers
3. **EX (Execute)**: Perform ALU operations, calculate addresses
4. **MEM (Memory)**: Access data memory for loads/stores
5. **WB (Write Back)**: Write results back to register file

### 4. Hazard Detection
- **Data Hazards**: RAW (Read After Write) dependencies
- **Forwarding**: Direct result forwarding between stages
- **Stalls**: Insert bubbles for load-use hazards
- **Branch Prediction**: Simple static prediction

### 5. Visualization Components
- **Pipeline Visualization**: Shows instruction flow through stages
- **Register File**: 32 RISC-V registers (x0-x31)
- **ALU Panel**: Current ALU operation and operands
- **Instruction Memory**: Loaded program with current PC
- **Execution Timeline**: Cycle-by-cycle execution history
- **Hazard Panel**: Current hazards and forwarding paths

## Supported Instructions

### R-Type (Register-Register)
- `add rd, rs1, rs2` - Addition
- `sub rd, rs1, rs2` - Subtraction
- `and rd, rs1, rs2` - Bitwise AND
- `or rd, rs1, rs2` - Bitwise OR
- `xor rd, rs1, rs2` - Bitwise XOR
- `sll rd, rs1, rs2` - Shift Left Logical
- `srl rd, rs1, rs2` - Shift Right Logical
- `sra rd, rs1, rs2` - Shift Right Arithmetic
- `slt rd, rs1, rs2` - Set Less Than
- `sltu rd, rs1, rs2` - Set Less Than Unsigned

### I-Type (Immediate)
- `addi rd, rs1, imm` - Add Immediate
- `andi rd, rs1, imm` - AND Immediate
- `ori rd, rs1, imm` - OR Immediate
- `xori rd, rs1, imm` - XOR Immediate
- `slti rd, rs1, imm` - Set Less Than Immediate
- `sltiu rd, rs1, imm` - Set Less Than Immediate Unsigned
- `lw rd, offset(rs1)` - Load Word
- `jalr rd, rs1, imm` - Jump And Link Register

### S-Type (Store)
- `sw rs2, offset(rs1)` - Store Word

### B-Type (Branch)
- `beq rs1, rs2, label` - Branch if Equal
- `bne rs1, rs2, label` - Branch if Not Equal
- `blt rs1, rs2, label` - Branch if Less Than
- `bge rs1, rs2, label` - Branch if Greater or Equal
- `bltu rs1, rs2, label` - Branch if Less Than Unsigned
- `bgeu rs1, rs2, label` - Branch if Greater or Equal Unsigned

### U-Type (Upper Immediate)
- `lui rd, imm` - Load Upper Immediate
- `auipc rd, imm` - Add Upper Immediate to PC

### J-Type (Jump)
- `jal rd, label` - Jump And Link

### Pseudo Instructions
- `nop` - No Operation (addi x0, x0, 0)

## Register Aliases
- `x0` / `zero` - Always zero
- `x1` / `ra` - Return address
- `x2` / `sp` - Stack pointer
- `x3` / `gp` - Global pointer
- `x4` / `tp` - Thread pointer
- `x5-x7` / `t0-t2` - Temporary registers
- `x8` / `s0` / `fp` - Saved register / Frame pointer
- `x9` / `s1` - Saved register
- `x10-x11` / `a0-a1` - Function arguments / Return values
- `x12-x17` / `a2-a7` - Function arguments
- `x18-x27` / `s2-s11` - Saved registers
- `x28-x31` / `t3-t6` - Temporary registers

## Running the Application

### Frontend
```bash
cd pipeline-pal-main
npm install
npm run dev
```

### Backend (Optional)
```bash
cd backend
pip install -r requirements.txt
python main.py
```

The application can run in two modes:
1. **JavaScript Mode**: Pure frontend simulation
2. **Backend Mode**: Uses Python backend for more accurate simulation

## Common Assembly Errors

1. **Invalid characters**: Only use letters, numbers, spaces, commas, parentheses, and basic symbols
2. **Unknown instruction**: Check instruction spelling and supported instruction list
3. **Invalid register**: Use x0-x31 or valid aliases
4. **Invalid syntax**: Follow RISC-V assembly syntax (e.g., `lw rd, offset(rs1)`)
5. **Label not found**: Ensure labels are defined before use

## Educational Features

- **Step-by-step execution**: See how each instruction flows through pipeline
- **Hazard visualization**: Understand data dependencies and forwarding
- **Register tracking**: Watch register values change
- **Pipeline stalls**: See when and why stalls occur
- **Branch prediction**: Understand control hazards
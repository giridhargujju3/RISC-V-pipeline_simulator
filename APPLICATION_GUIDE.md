# RISC-V 5-Stage Pipelined CPU Simulator - Application Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How It Works](#how-it-works)
4. [Components Explained](#components-explained)
5. [Backend-Frontend Connection](#backend-frontend-connection)
6. [Assembly Editor](#assembly-editor)
7. [Instruction Memory](#instruction-memory)
8. [Pipeline Stages](#pipeline-stages)
9. [Hazard Detection](#hazard-detection)
10. [Usage Guide](#usage-guide)

---

## 🎯 Overview

This is an **educational tool** for understanding how a 5-stage pipelined RISC-V CPU works. It simulates:
- **5 Pipeline Stages**: IF (Instruction Fetch) → ID (Instruction Decode) → EX (Execute) → MEM (Memory Access) → WB (Write Back)
- **Hazard Detection**: Identifies data hazards and applies forwarding or stalling
- **Real-time Visualization**: See instructions flow through the pipeline
- **Dual Mode**: Can run with Python backend or JavaScript frontend simulation

---

## 🏗️ Architecture

### Backend (Python)
```
backend/
├── main.py              # Entry point, starts FastAPI server
├── api.py               # REST API endpoints
└── cpu/
    ├── cpu.py           # Main CPU class with pipeline logic
    ├── registers.py     # Register file (x0-x31)
    ├── memory.py        # Instruction and Data memory
    ├── decoder.py       # Instruction decoder
    ├── alu.py           # Arithmetic Logic Unit
    ├── control.py       # Control signal generator
    ├── hazard.py        # Hazard detection and forwarding
    └── pipeline_regs.py # Pipeline stage registers
```

### Frontend (React + TypeScript)
```
src/
├── pages/
│   └── Index.tsx                 # Main dashboard
├── components/
│   ├── AssemblyEditor.tsx        # Code editor with syntax validation
│   ├── PipelineVisualization.tsx # Visual pipeline stages
│   ├── RegisterFile.tsx          # 32 RISC-V registers display
│   ├── InstructionMemory.tsx     # Program memory view
│   ├── ExecutionLog.tsx          # Real-time execution log
│   ├── ExecutionTimeline.tsx     # Pipeline timeline visualization
│   ├── HazardPanel.tsx           # Hazard detection display
│   ├── ALUPanel.tsx              # ALU operations display
│   └── ControlSignalsPanel.tsx   # Control signals display
├── lib/
│   ├── riscv-assembler.ts        # Assembly → Machine code converter
│   └── api.ts                    # Backend API client
└── hooks/
    └── useCPUSimulator.ts        # CPU state management
```

---

## ⚙️ How It Works

### 1. **Program Loading**
```
User writes assembly → Assembler converts to machine code → Loaded into instruction memory
```

**Example Assembly:**
```assembly
addi x1, x0, 10    # x1 = 0 + 10 = 10
addi x2, x0, 20    # x2 = 0 + 20 = 20
add  x3, x1, x2    # x3 = x1 + x2 = 30
nop                # No operation
```

**Machine Code (hex):**
- `0x00A00093` → `addi x1, x0, 10`
- `0x01400113` → `addi x2, x0, 20`
- `0x002081B3` → `add x3, x1, x2`
- `0x00000013` → `nop`

### 2. **Execution Cycle**

Each clock cycle:
1. **Fetch (IF)**: Fetch instruction from memory at PC address
2. **Decode (ID)**: Decode instruction, read register values
3. **Execute (EX)**: Perform ALU operation
4. **Memory (MEM)**: Access data memory (for load/store)
5. **Write Back (WB)**: Write result back to register

**Pipeline Stages Run in Reverse Order:**
```
WB → MEM → EX → ID → IF
```
This ensures data forwarding works correctly.

### 3. **Data Flow**

```
Cycle 1: [IF: addi x1,x0,10] → [ ] → [ ] → [ ] → [ ]
Cycle 2: [IF: addi x2,x0,20] → [ID: addi x1,x0,10] → [ ] → [ ] → [ ]
Cycle 3: [IF: add x3,x1,x2]  → [ID: addi x2,x0,20] → [EX: addi x1,x0,10] → [ ] → [ ]
Cycle 4: [IF: nop]            → [ID: add x3,x1,x2]  → [EX: addi x2,x0,20] → [MEM: addi x1,x0,10] → [ ]
Cycle 5: [ ]                  → [ID: nop]           → [EX: add x3,x1,x2]  → [MEM: addi x2,x0,20] → [WB: addi x1,x0,10]
...
```

---

## 🧩 Components Explained

### **Assembly Editor**
- **Purpose**: Write RISC-V assembly code
- **Syntax**: Must use proper RISC-V assembly instructions (not pseudo-code like `x1 = 10`)
- **Valid Format**: `addi x1, x0, 10    # x1 = 10` (instruction, then comment)
- **Validation**: Checks for valid register names, opcodes, and syntax
- **Examples**: Comes with built-in examples (Simple, Fibonacci, Factorial, Sum 1-5)

**Common Errors:**
```assembly
# ❌ WRONG - This is not valid RISC-V assembly:
x1 = 10
x2 = 20
x3 = x1 + x2

# ✅ CORRECT - Proper RISC-V assembly:
addi x1, x0, 10    # x1 = 10
addi x2, x0, 20    # x2 = 20
add  x3, x1, x2    # x3 = x1 + x2
```

### **Instruction Memory**
- **Purpose**: Shows all loaded instructions in hexadecimal and assembly
- **Columns**:
  - **Addr**: Memory address (0x0000, 0x0004, 0x0008...)
  - **Hex**: Machine code in hexadecimal (e.g., `0x00A00093`)
  - **Assembly**: Human-readable instruction (e.g., `addi x1, x0, 10`)
  - **Type**: Instruction type (R-type, I-type, S-type, B-type, U-type, J-type)

**Instruction Types:**
- **R-type**: Register operations (add, sub, and, or, xor, sll, srl, sra, slt, sltu)
- **I-type**: Immediate operations (addi, andi, ori, xori, slti, lw, jalr)
- **S-type**: Store operations (sw, sb, sh)
- **B-type**: Branch operations (beq, bne, blt, bge, bltu, bgeu)
- **U-type**: Upper immediate (lui, auipc)
- **J-type**: Jump operations (jal)

### **Pipeline Visualization**
Shows the current state of all 5 pipeline stages:
- **IF**: Currently fetching instruction
- **ID**: Currently decoding instruction
- **EX**: Currently executing in ALU
- **MEM**: Currently accessing memory
- **WB**: Currently writing back to register

Each stage shows:
- Instruction being processed
- Program Counter (PC)
- Relevant register values or results

### **Execution Log** (NEW!)
- **Purpose**: Real-time log showing pipeline activity for each cycle
- **Shows**:
  - Which instruction is in each stage
  - Stage-specific details (PC, register values, ALU results, memory operations)
  - Hazard detection events (forwarding, stalls)
  - Register writes
- **Format**: Color-coded by stage (IF=Blue, ID=Green, EX=Yellow, MEM=Cyan, WB=Purple)

### **Hazard Panel**
Displays detected data hazards:
- **Forward A (rs1)**: Indicates when operand A needs forwarding from EX/MEM or MEM/WB stage
- **Forward B (rs2)**: Indicates when operand B needs forwarding
- **Pipeline Stall**: Shows when pipeline must stall due to load-use hazard

### **Register File**
- **32 Registers**: x0 (always 0) through x31
- **Aliases**: Shows both numeric (x1) and ABI names (ra, sp, t0, etc.)
- **Highlights**: Recently updated registers are highlighted
- **Values**: Displayed in decimal

---

## 🔌 Backend-Frontend Connection

### **API Endpoints**

The Python backend exposes REST API endpoints:

1. **`GET /state`** - Get complete CPU state
   ```json
   {
     "cycle": 5,
     "pc": 20,
     "halted": false,
     "registers": [0, 10, 20, 30, ...],
     "pipeline": {
       "IF_ID": {...},
       "ID_EX": {...},
       "EX_MEM": {...},
       "MEM_WB": {...}
     },
     "alu": {...},
     "hazards": {...},
     "instructionMemory": [...]
   }
   ```

2. **`POST /step`** - Execute one clock cycle
   - Returns updated CPU state after cycle execution

3. **`POST /reset`** - Reset CPU to initial state
   - Clears registers, resets PC to 0, clears pipeline

4. **`POST /load`** - Load new program
   ```json
   {
     "instructions": [0x00A00093, 0x01400113, 0x002081B3]
   }
   ```

### **Connection Flow**

```
Frontend                          Backend
   |                                 |
   | 1. User writes assembly         |
   |    Assemble to machine code     |
   |                                 |
   | 2. POST /load                   |
   |---------------------------------→| Load into instruction memory
   |                                 |
   | 3. User clicks "Step"           |
   |                                 |
   | 4. POST /step                   |
   |---------------------------------→| Execute one cycle
   |                                 | - Fetch instruction
   |                                 | - Decode
   |                                 | - Execute
   |                                 | - Memory access
   |                                 | - Write back
   |                                 | - Log to console
   |                                 |
   | ←---------------------------------| Return updated state
   |                                 |
   | 5. Update UI components         |
   |    - Pipeline visualization     |
   |    - Register file             |
   |    - Execution log             |
   |    - etc.                      |
```

### **Duplicate Values Check**

The backend ensures correct values through:
1. **Register File**: x0 is always 0, writes to x0 are ignored
2. **Data Forwarding**: Correctly forwards values from later stages to earlier stages
3. **Hazard Detection**: Prevents read-after-write (RAW) hazards
4. **Pipeline Registers**: Each stage has its own copy of data

**No duplicate values** - each instruction's result is computed once and forwarded when needed.

---

## 📝 Assembly Editor Deep Dive

### **What is Assembly Code?**

Assembly is a **low-level programming language** that maps closely to machine code. Each assembly instruction corresponds to one machine code instruction.

**NOT assembly (pseudo-code):**
```
x1 = 10
result = x1 + x2
```

**ACTUAL assembly:**
```assembly
addi x1, x0, 10    # Add immediate: x1 = x0 + 10
add x3, x1, x2     # Add: x3 = x1 + x2
```

### **RISC-V Instruction Format**

**R-type** (Register operations):
```assembly
add  rd, rs1, rs2    # rd = rs1 + rs2
sub  rd, rs1, rs2    # rd = rs1 - rs2
and  rd, rs1, rs2    # rd = rs1 & rs2
or   rd, rs1, rs2    # rd = rs1 | rs2
xor  rd, rs1, rs2    # rd = rs1 ^ rs2
sll  rd, rs1, rs2    # rd = rs1 << rs2
srl  rd, rs1, rs2    # rd = rs1 >> rs2 (logical)
sra  rd, rs1, rs2    # rd = rs1 >> rs2 (arithmetic)
```

**I-type** (Immediate operations):
```assembly
addi rd, rs1, imm    # rd = rs1 + imm
lw   rd, imm(rs1)    # rd = memory[rs1 + imm]
jalr rd, rs1, imm    # rd = PC+4, PC = rs1 + imm
```

**S-type** (Store operations):
```assembly
sw   rs2, imm(rs1)   # memory[rs1 + imm] = rs2
```

**B-type** (Branch operations):
```assembly
beq  rs1, rs2, label # if (rs1 == rs2) PC = label
bne  rs1, rs2, label # if (rs1 != rs2) PC = label
blt  rs1, rs2, label # if (rs1 < rs2) PC = label
bge  rs1, rs2, label # if (rs1 >= rs2) PC = label
```

**U-type** (Upper immediate):
```assembly
lui  rd, imm         # rd = imm << 12
```

**J-type** (Jump):
```assembly
jal  rd, label       # rd = PC+4, PC = label
```

### **Why Errors Occur**

**Line 3: Invalid characters in assembly**
- Cause: Using characters not allowed in RISC-V assembly
- Solution: Use proper RISC-V instruction syntax

**Example that causes errors:**
```assembly
# Result will be in x2
addi x1, x0, 5    # n = 5
x2 = 0            # ❌ ERROR: Not valid assembly!
```

**Fixed version:**
```assembly
# Result will be in x2
addi x1, x0, 5    # n = 5
addi x2, x0, 0    # sum = 0 ✅ CORRECT
```

---

## 🔄 Pipeline Stages Explained

### **1. IF (Instruction Fetch)**
- **Purpose**: Fetch next instruction from memory
- **Inputs**: Program Counter (PC)
- **Outputs**: Instruction, PC
- **Operation**:
  1. Read instruction from memory at address PC
  2. Increment PC by 4 (next instruction)
  3. Pass instruction to ID stage

**Backend Log:**
```
🔵 IF STAGE: Fetched instruction 0x00A00093 from PC 0x00000000
   Next PC: 0x00000004
```

### **2. ID (Instruction Decode)**
- **Purpose**: Decode instruction and read operands from registers
- **Inputs**: Instruction from IF stage
- **Outputs**: Control signals, register values, immediate value
- **Operation**:
  1. Decode instruction fields (opcode, rd, rs1, rs2, imm)
  2. Generate control signals (ALU operation, memory read/write, etc.)
  3. Read source registers (rs1, rs2)
  4. Sign-extend immediate value

**Backend Log:**
```
🟢 ID STAGE: Decoding 'addi x1, x0, 10'
   rd=x1, rs1=x0(0), rs2=x0(0)
   imm=10, ALU_OP=ADD
```

### **3. EX (Execute)**
- **Purpose**: Perform ALU operation
- **Inputs**: Operands from ID, control signals
- **Outputs**: ALU result, zero flag
- **Operation**:
  1. Select ALU operands (may use forwarded values)
  2. Perform operation (ADD, SUB, AND, OR, etc.)
  3. Calculate branch target address
  4. Evaluate branch condition

**Backend Log:**
```
🟡 EX STAGE: Executing 'addi x1, x0, 10'
   ALU: 0 ADD 10
   Result: 10, Zero: False
```

### **4. MEM (Memory Access)**
- **Purpose**: Access data memory for load/store instructions
- **Inputs**: ALU result (address), control signals
- **Outputs**: Memory data (for loads)
- **Operation**:
  1. If load: Read data from memory at address
  2. If store: Write data to memory at address
  3. Pass data to WB stage

**Backend Log:**
```
🔵 MEM STAGE: Processing 'addi x1, x0, 10'
   No memory operation
```
or
```
🔵 MEM STAGE: Processing 'lw x3, 0(x1)'
   Memory Read: addr=0x00000010, data=42
```

### **5. WB (Write Back)**
- **Purpose**: Write result back to register file
- **Inputs**: ALU result or memory data
- **Outputs**: Register write
- **Operation**:
  1. Select write data (ALU result or memory data)
  2. Write to destination register (rd)
  3. Update register file

**Backend Log:**
```
🟣 WB STAGE: Processing 'addi x1, x0, 10'
   Writing x1 = 10
```

---

## ⚠️ Hazard Detection

### **Data Hazards**

Occur when an instruction depends on the result of a previous instruction still in the pipeline.

**Example:**
```assembly
addi x1, x0, 10    # Cycle 1: IF, Cycle 2: ID, Cycle 3: EX, Cycle 4: MEM, Cycle 5: WB
add  x2, x1, x1    # Cycle 2: IF, Cycle 3: ID ← Needs x1 but it's not written yet!
```

### **Solutions**

**1. Data Forwarding (Bypassing)**
- Forward data from later stages to earlier stages
- EX/MEM → EX (MEM forwarding)
- MEM/WB → EX (WB forwarding)

**Example:**
```
Cycle 3:
  EX:  addi x1, x0, 10  → result = 10
  ID:  add x2, x1, x1   → needs x1
       Forward 10 from EX to ID ✅
```

**2. Pipeline Stall**
- Insert bubble (NOP) in pipeline
- Required for **load-use hazard**

**Example:**
```assembly
lw   x1, 0(x2)     # Load takes 2 cycles (EX + MEM)
add  x3, x1, x1    # Can't forward from MEM yet!
                   # Must stall 1 cycle
```

**Backend Log:**
```
⚠️  PIPELINE STALL: Bubble inserted in ID/EX stage
```

---

## 📖 Usage Guide

### **Step-by-Step Instructions**

1. **Start Backend**:
   ```bash
   cd backend
   python main.py
   # Server runs at http://localhost:8000
   ```

2. **Start Frontend**:
   ```bash
   cd pipeline-pal-main
   npm install  # First time only
   npm run dev
   # Frontend runs at http://localhost:8080
   ```

3. **Write Assembly Code**:
   - Use the Assembly Editor
   - Or load an example program
   - Click "Assemble & Load"

4. **Execute Program**:
   - **Step**: Execute one cycle at a time
   - **Run**: Execute continuously
   - **Pause**: Stop continuous execution
   - **Reset**: Reset CPU to initial state

5. **Observe**:
   - **Pipeline Visualization**: See instructions flow through stages
   - **Execution Log**: View cycle-by-cycle execution details
   - **Register File**: Watch register values change
   - **Hazard Panel**: See when hazards are detected
   - **Backend Terminal**: View detailed stage logs

### **Terminal Logs**

When backend is running, you'll see detailed logs:

```
================================================================================
🔄 CYCLE 1
================================================================================
PC: 0x00000000

🔵 IF STAGE: Fetched instruction 0x00A00093 from PC 0x00000000
   Next PC: 0x00000004

📋 PIPELINE STAGES:
  IF/ID:  addi x1, x0, 10
  ID/EX:  empty
  EX/MEM: empty
  MEM/WB: empty

📊 REGISTER STATE:
  x1=0          x2=0          x3=0
```

---

## 🎓 Learning Objectives

By using this simulator, you will understand:

1. **How pipelining improves CPU performance** (multiple instructions executing simultaneously)
2. **What hazards are and how they're detected** (data dependencies)
3. **How forwarding works** (bypassing data between stages)
4. **When stalls are necessary** (load-use hazards)
5. **How RISC-V instructions are encoded** (machine code format)
6. **How the 5 pipeline stages work together** (IF→ID→EX→MEM→WB)

---

## 🐛 Troubleshooting

### **Assembly Errors**

**Problem**: "Invalid characters in assembly"
- **Cause**: Using syntax that's not valid RISC-V assembly
- **Solution**: Use proper RISC-V instructions (addi, add, lw, sw, beq, etc.)

**Problem**: "Unknown instruction"
- **Cause**: Typo in instruction name or unsupported instruction
- **Solution**: Check spelling, use supported instructions listed in this guide

### **Backend Not Connecting**

**Problem**: Frontend can't connect to backend
- **Solution**: 
  1. Make sure backend is running (`python main.py`)
  2. Check backend is on port 8000
  3. Try switching to "JavaScript Simulation" mode in frontend

### **Unexpected Register Values**

**Problem**: Registers have unexpected values
- **Cause**: May be due to hazard or incorrect instruction
- **Solution**: 
  1. Use "Step" mode to execute one cycle at a time
  2. Check Execution Log for each cycle
  3. Verify assembly code is correct

---

## 📚 Additional Resources

- [RISC-V Specification](https://riscv.org/technical/specifications/)
- [Computer Organization and Design (Patterson & Hennessy)](https://www.amazon.com/Computer-Organization-Design-RISC-V-Architecture/dp/0128122757)
- [RISC-V Assembly Programmer's Manual](https://github.com/riscv-non-isa/riscv-asm-manual/blob/master/riscv-asm.md)

---

**Made with ❤️ for computer architecture education**

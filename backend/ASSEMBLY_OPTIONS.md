# Assembly Compilation Options

## Two Ways to Assemble RISC-V Code

### Option 1: Local JavaScript Assembler (DEFAULT - Recommended for Windows)

✅ **No installation needed**
✅ **Works on Windows, Mac, Linux**
✅ **Fast, instant feedback**
✅ **Supports common RISC-V instructions: add, addi, sub, and, or, xor, lw, sw, beq, bne, jal**

**How it works:**
1. Frontend runs the JavaScript assembler (`src/lib/riscv-assembler.ts`)
2. Converts assembly to machine code instantly
3. Sends to backend as instruction array
4. Simulator executes

**Best for:** Quick testing, development, Windows users


### Option 2: RISC-V Toolchain Compiler (Advanced)

✅ **Professional-grade compilation**
✅ **Full RISC-V ISA support**
✅ **Uses actual riscv64-unknown-elf-as**
⚠️ **Requires toolchain installation**

**Installation:**

**Linux:**
```bash
sudo apt-get update
sudo apt-get install binutils-riscv64-unknown-elf
```

**macOS:**
```bash
brew install riscv-tools
```

**Windows (WSL2):**
```bash
# Inside WSL2 terminal
sudo apt-get update
sudo apt-get install binutils-riscv64-unknown-elf
```

**Windows (Prebuilt):**
Download from: https://github.com/riscv-collab/riscv-gnu-toolchain/releases
Add `bin/` folder to PATH

**How it works:**
1. Frontend sends assembly code to backend
2. Backend calls compiler.py
3. riscv64-unknown-elf-as converts .S → .o
4. riscv64-unknown-elf-objcopy converts .o → .bin
5. Backend extracts instructions and sends to simulator

**Best for:** Full ISA support, non-Windows systems


## Current Setup

✅ **Local assembler enabled (Windows default)**
✅ **Backend compiler available if toolchain installed**
✅ **Graceful fallback if toolchain missing**
✅ **No dependency on external tools for basic usage**

## Testing

Both methods produce identical results for supported instructions:

```asm
addi x1, x0, 5      # x1 = 5
addi x2, x0, 3      # x2 = 3
add x3, x1, x2      # x3 = 8
```

Works with **both** assemblers!


## Backend API Endpoints

### Load with Local Assembly
```bash
curl -X POST http://localhost:8000/load \
  -H "Content-Type: application/json" \
  -d '{"instructions": [0x00100093, 0x00300113, 0x002084B3]}'
```

### Load with Backend Compilation (requires toolchain)
```bash
curl -X POST http://localhost:8000/load \
  -H "Content-Type: application/json" \
  -d '{"assembly": "addi x1, x0, 5\naddi x2, x0, 3\nadd x3, x1, x2"}'
```

## Recommendation

**Use local assembler** unless you need features beyond its scope.

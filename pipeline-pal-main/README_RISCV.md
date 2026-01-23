# RISC-V 5-Stage Pipelined CPU Simulator

An interactive educational tool for understanding RISC-V CPU pipeline architecture, hazard detection, and instruction execution.

![RISC-V Pipeline Simulator](https://img.shields.io/badge/RISC--V-Pipeline%20Simulator-blue)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6)
![Python](https://img.shields.io/badge/Python-3.8+-3776AB)

## 🎯 Features

- **Interactive Pipeline Visualization**: See instructions flow through IF → ID → EX → MEM → WB stages
- **Assembly Editor**: Write and assemble RISC-V code with syntax highlighting
- **Hazard Detection**: Visualize data hazards, forwarding, and pipeline stalls
- **Register File**: Monitor all 32 RISC-V registers in real-time
- **Execution Timeline**: Track instruction execution cycle by cycle
- **Dual Mode**: JavaScript simulation or Python backend for accuracy
- **Mobile Responsive**: Works on desktop, tablet, and mobile devices

## 🚀 Quick Start

### Frontend Only (Recommended for learning)
```bash
cd pipeline-pal-main
npm install
npm run dev
```

### With Python Backend (Advanced)
```bash
# Terminal 1 - Backend
cd backend
pip install -r requirements.txt
python main.py

# Terminal 2 - Frontend
cd pipeline-pal-main
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## 📚 How to Use

1. **Write Assembly Code**: Use the Assembly Editor to write RISC-V assembly
2. **Assemble & Load**: Click the button to convert to machine code
3. **Execute**: Use Step, Run, or Pause to control execution
4. **Observe**: Watch the pipeline visualization and register changes

### Example Programs

The simulator includes several example programs:
- **Simple Example**: Basic arithmetic operations
- **Sum 1 to 5**: Loop with accumulation
- **Fibonacci**: Recursive sequence calculation
- **Factorial**: Mathematical computation with loops

## 🏗️ Architecture

### Pipeline Stages
1. **IF (Instruction Fetch)**: Fetch instruction from memory
2. **ID (Instruction Decode)**: Decode and read registers
3. **EX (Execute)**: ALU operations and address calculation
4. **MEM (Memory)**: Data memory access
5. **WB (Write Back)**: Write results to registers

### Hazard Handling
- **Data Forwarding**: Direct result forwarding between stages
- **Load-Use Stalls**: Automatic stall insertion for dependencies
- **Branch Prediction**: Simple static branch prediction

## 🛠️ Supported Instructions

### Arithmetic & Logic
- `add`, `addi`, `sub`
- `and`, `andi`, `or`, `ori`, `xor`, `xori`
- `sll`, `srl`, `sra`
- `slt`, `slti`, `sltu`, `sltiu`

### Memory Operations
- `lw` (Load Word)
- `sw` (Store Word)

### Control Flow
- `beq`, `bne`, `blt`, `bge`, `bltu`, `bgeu`
- `jal`, `jalr`

### Other
- `lui`, `auipc`
- `nop`

## 🎓 Educational Value

This simulator helps students understand:
- **Pipeline Architecture**: How modern CPUs execute multiple instructions simultaneously
- **Hazard Detection**: Why and how processors handle data dependencies
- **Performance Impact**: How hazards affect CPU performance
- **Assembly Programming**: Low-level programming concepts
- **Computer Architecture**: Fundamental CPU design principles

## 🔧 Technical Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **shadcn/ui** for components
- **Lucide React** for icons

### Backend (Optional)
- **Python 3.8+**
- **FastAPI** for REST API
- **Pydantic** for data validation

## 📁 Project Structure

```
pipeline-pal-main/
├── src/
│   ├── components/     # React components
│   ├── hooks/         # Custom hooks
│   ├── lib/           # Utilities and assembler
│   ├── pages/         # Page components
│   └── types/         # TypeScript types
├── backend/
│   ├── cpu/           # CPU simulation modules
│   ├── api.py         # FastAPI endpoints
│   └── main.py        # Server entry point
└── public/            # Static assets
```

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for detailed documentation.

## 🐛 Troubleshooting

### Assembly Errors
- **Invalid characters**: Use only letters, numbers, spaces, commas, and basic symbols
- **Unknown instruction**: Check the supported instruction list
- **Invalid register**: Use x0-x31 or valid aliases (ra, sp, t0-t6, etc.)

### Common Issues
- **Backend connection failed**: Make sure Python backend is running on port 8000
- **Assembly won't load**: Check for syntax errors in your code
- **Pipeline not updating**: Try resetting the CPU state

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- RISC-V Foundation for the instruction set architecture
- Educational institutions using this tool for computer architecture courses
- Open source community for the excellent libraries and tools

---

**Made for educational purposes** 📚 **Perfect for computer architecture courses** 🎓
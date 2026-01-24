# RISC-V Pipeline Simulator - Setup Guide

This guide will help you set up and run the RISC-V Pipeline Simulator application.

## Prerequisites

1. **Python 3.8+** - For the backend server
2. **Node.js 16+** - For the frontend React application
3. **Git** - To clone the repository

## Quick Start

### Step 1: Start the Backend Server

The backend server must be running before starting the frontend.

#### On Windows:
```bash
# Double-click the start-backend.bat file, or run in command prompt:
start-backend.bat
```

#### On macOS/Linux:
```bash
# Make the script executable and run:
chmod +x start-backend.sh
./start-backend.sh
```

#### Manual Backend Setup:
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

The backend server will start on `http://localhost:8000`

### Step 2: Start the Frontend

In a new terminal window:

```bash
# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start on `http://localhost:5173`

## Troubleshooting

### Backend Connection Issues

If you see errors like `ERR_CONNECTION_REFUSED` or `Failed to fetch`, it means the backend server is not running:

1. **Check if Python is installed:**
   ```bash
   python --version
   # or
   python3 --version
   ```

2. **Install Python dependencies:**
   ```bash
   cd backend
   pip install fastapi uvicorn pydantic
   ```

3. **Start the backend server:**
   ```bash
   python main.py
   ```

4. **Verify the backend is running:**
   Open `http://localhost:8000` in your browser. You should see a JSON response.

### React Rendering Errors

If you see "Objects are not valid as a React child" errors:

1. **Clear browser cache** and refresh the page
2. **Restart both servers** (backend and frontend)
3. **Check browser console** for specific error details

### Port Conflicts

If port 8000 or 5173 are already in use:

**Backend (port 8000):**
- Edit `backend/main.py` and change the port in the `uvicorn.run()` call
- Update `src/lib/api.ts` to match the new backend port

**Frontend (port 5173):**
- The Vite dev server will automatically find an available port
- Or specify a port: `npm run dev -- --port 3000`

## Application Features

### How to Use

1. **Write Assembly Code:** Use the Assembly Editor to write RISC-V assembly instructions
2. **Load Program:** Click "Assemble & Load" to load your program into the simulator
3. **Execute:** Use the control panel to step through execution or run continuously
4. **Monitor:** Watch the pipeline visualization and register changes in real-time

### Available Views

- **Pipeline Visualization:** Shows instruction flow through IF→ID→EX→MEM→WB stages
- **Register File:** Displays all 32 RISC-V registers with real-time updates
- **Execution Log:** Shows detailed pipeline activity for each cycle
- **Hazard Detection:** Displays data hazards and forwarding information
- **ALU Panel:** Shows ALU operations and results
- **Control Signals:** Displays control unit outputs

### Sample Programs

The simulator comes with a default program that computes the sum of numbers. You can also try:

```assembly
# Simple arithmetic
addi x1, x0, 5      # x1 = 5
addi x2, x0, 10     # x2 = 10
add x3, x1, x2      # x3 = x1 + x2 = 15
sub x4, x2, x1      # x4 = x2 - x1 = 5
```

```assembly
# Loop example
addi x1, x0, 5      # counter = 5
addi x2, x0, 0      # sum = 0
loop:
  add x2, x2, x1    # sum += counter
  addi x1, x1, -1   # counter--
  bne x1, x0, loop  # if counter != 0, goto loop
```

## Architecture

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Python + FastAPI + Custom RISC-V CPU Simulator
- **Communication:** REST API over HTTP

## Development

### Frontend Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run test         # Run tests
```

### Backend Development
```bash
cd backend
python main.py       # Start with auto-reload
```

## Support

If you encounter issues:

1. Check that both backend and frontend servers are running
2. Verify Python and Node.js versions meet requirements
3. Clear browser cache and restart servers
4. Check browser console for error details

## License

This project is for educational purposes. See the original project documentation for license details.
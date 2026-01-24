import { useState, useCallback, useRef, useEffect } from 'react';
import { CPUState, INITIAL_CPU_STATE, Instruction, HazardDetail } from '@/types/cpu';
import { cpuApi, apiStateToFrontend, API_CONFIG, ConfigOptions } from '@/lib/api';

// Detect data hazards and set up forwarding
function detectHazards(state: CPUState): CPUState {
  const hazardDetails: HazardDetail[] = [];
  let forwardA = null;
  let forwardB = null;
  let stallRequired = false;

  const idExRs1 = state.ID_EX.rs1;
  const idExRs2 = state.ID_EX.rs2;

  // Check EX/MEM hazard (forwarding from EX/MEM stage)
  if (state.EX_MEM.valid && state.EX_MEM.rd !== undefined && state.EX_MEM.rd !== 0) {
    const exMemRd = state.EX_MEM.rd;
    
    if (idExRs1 !== undefined && idExRs1 === exMemRd) {
      forwardA = {
        from: 'EX_MEM' as const,
        register: exMemRd,
        value: state.EX_MEM.alu_result ?? 0,
      };
      hazardDetails.push({
        type: 'RAW',
        source: `EX/MEM (x${exMemRd})`,
        destination: `ID/EX rs1`,
        resolution: 'FORWARD',
        description: `Forwarding from EX/MEM to rs1`,
      });
    }
    
    if (idExRs2 !== undefined && idExRs2 === exMemRd) {
      forwardB = {
        from: 'EX_MEM' as const,
        register: exMemRd,
        value: state.EX_MEM.alu_result ?? 0,
      };
      hazardDetails.push({
        type: 'RAW',
        source: `EX/MEM (x${exMemRd})`,
        destination: `ID/EX rs2`,
        resolution: 'FORWARD',
        description: `Forwarding from EX/MEM to rs2`,
      });
    }
  }

  // Check MEM/WB hazard (forwarding from MEM/WB stage)
  if (state.MEM_WB.valid && state.MEM_WB.rd !== undefined && state.MEM_WB.rd !== 0) {
    const memWbRd = state.MEM_WB.rd;
    
    if (idExRs1 !== undefined && idExRs1 === memWbRd && !forwardA) {
      forwardA = {
        from: 'MEM_WB' as const,
        register: memWbRd,
        value: state.MEM_WB.alu_result ?? 0,
      };
      hazardDetails.push({
        type: 'RAW',
        source: `MEM/WB (x${memWbRd})`,
        destination: `ID/EX rs1`,
        resolution: 'FORWARD',
        description: `Forwarding from MEM/WB to rs1`,
      });
    }
    
    if (idExRs2 !== undefined && idExRs2 === memWbRd && !forwardB) {
      forwardB = {
        from: 'MEM_WB' as const,
        register: memWbRd,
        value: state.MEM_WB.alu_result ?? 0,
      };
      hazardDetails.push({
        type: 'RAW',
        source: `MEM/WB (x${memWbRd})`,
        destination: `ID/EX rs2`,
        resolution: 'FORWARD',
        description: `Forwarding from MEM/WB to rs2`,
      });
    }
  }

  // Check for load-use hazard (requires stall)
  if (state.ID_EX.valid && state.ID_EX.control_signals?.memRead) {
    const loadRd = state.ID_EX.rd;
    const ifIdRs1 = state.IF_ID.rs1;
    const ifIdRs2 = state.IF_ID.rs2;

    if (loadRd !== undefined && loadRd !== 0) {
      if ((ifIdRs1 !== undefined && ifIdRs1 === loadRd) ||
          (ifIdRs2 !== undefined && ifIdRs2 === loadRd)) {
        stallRequired = true;
        hazardDetails.push({
          type: 'LOAD-USE',
          source: `ID/EX load (x${loadRd})`,
          destination: `IF/ID`,
          resolution: 'STALL',
          description: `Load-use hazard requires pipeline stall`,
        });
      }
    }
  }

  return {
    ...state,
    hazards: {
      rawHazard: hazardDetails.some(h => h.type === 'RAW'),
      forwardA,
      forwardB,
      stallRequired,
      hazardDetails,
    },
  };
}

// Simulates one clock cycle of the RISC-V pipeline
function simulateCycle(state: CPUState): CPUState {
  let newState = { ...state };
  newState.cycle = state.cycle + 1;
  newState.updatedRegister = null;

  // Apply forwarding values if needed
  const forwardedRs1 = state.hazards?.forwardA?.value ?? state.ID_EX.rs1_value;
  const forwardedRs2 = state.hazards?.forwardB?.value ?? state.ID_EX.rs2_value;

  // WB Stage - Write Back
  if (state.MEM_WB.valid && state.MEM_WB.rd !== undefined && state.MEM_WB.rd !== 0) {
    const writeValue = state.MEM_WB.mem_data ?? state.MEM_WB.alu_result ?? 0;
    newState.registers = [...state.registers];
    newState.registers[state.MEM_WB.rd] = writeValue;
    newState.updatedRegister = state.MEM_WB.rd;
  }

  // MEM Stage - Memory Access
  newState.MEM_WB = {
    ...state.EX_MEM,
    valid: state.EX_MEM.valid,
  };

  // EX Stage - Execute
  if (state.ID_EX.valid) {
    const opA = forwardedRs1 ?? 0;
    const opB = state.ID_EX.control_signals?.aluSrc 
      ? (state.ID_EX.immediate ?? 0) 
      : (forwardedRs2 ?? 0);
    
    let result = 0;
    let operation = "ADD";

    const instr = state.ID_EX.instruction.toLowerCase();
    if (instr.includes("add")) {
      result = opA + opB;
      operation = "ADD";
    } else if (instr.includes("sub")) {
      result = opA - opB;
      operation = "SUB";
    } else if (instr.includes("and")) {
      result = opA & opB;
      operation = "AND";
    } else if (instr.includes("or")) {
      result = opA | opB;
      operation = "OR";
    } else if (instr.includes("xor")) {
      result = opA ^ opB;
      operation = "XOR";
    } else if (instr.includes("sll")) {
      result = opA << (opB & 0x1f);
      operation = "SLL";
    } else if (instr.includes("srl")) {
      result = opA >>> (opB & 0x1f);
      operation = "SRL";
    } else if (instr.includes("slt")) {
      result = opA < opB ? 1 : 0;
      operation = "SLT";
    } else if (instr.includes("blt") || instr.includes("bge") || instr.includes("beq") || instr.includes("bne")) {
      result = opA - opB;
      operation = "CMP";
    } else {
      result = opA + opB;
      operation = "ADD";
    }

    newState.alu = {
      operandA: opA,
      operandB: opB,
      operation,
      result,
      zero: result === 0,
    };

    newState.EX_MEM = {
      ...state.ID_EX,
      alu_result: result,
      valid: true,
    };
  } else {
    newState.EX_MEM = { instruction: "NOP", pc: 0, valid: false };
  }

  // Handle stall - insert bubble
  if (state.hazards?.stallRequired) {
    newState.ID_EX = { instruction: "NOP (bubble)", pc: 0, valid: false };
    // Don't advance PC or IF_ID during stall
    newState.pc = state.pc;
    newState.IF_ID = state.IF_ID;
    newState.stall = true;
  } else {
    // ID Stage - Instruction Decode
    if (state.IF_ID.valid) {
      const instr = state.IF_ID.instruction;
      const parts = instr.match(/(\w+)\s+x(\d+),?\s*(?:x(\d+))?,?\s*(?:x?(-?\d+))?/);
      
      let rd = 0, rs1 = 0, rs2 = 0, imm = 0;
      if (parts) {
        rd = parseInt(parts[2]) || 0;
        rs1 = parseInt(parts[3]) || 0;
        rs2 = parseInt(parts[4]) || 0;
        imm = parseInt(parts[4]) || 0;
      }

      const isImmediateOp = instr.includes("addi") || instr.includes("andi") || 
                            instr.includes("ori") || instr.includes("xori") ||
                            instr.includes("slti");
      const isBranch = instr.includes("blt") || instr.includes("bge") || 
                       instr.includes("beq") || instr.includes("bne");
      const isLoad = instr.includes("lw") || instr.includes("lb") || instr.includes("lh");
      const isStore = instr.includes("sw") || instr.includes("sb") || instr.includes("sh");

      newState.ID_EX = {
        instruction: instr,
        pc: state.IF_ID.pc,
        valid: true,
        rd: isBranch ? undefined : rd,
        rs1,
        rs2: isImmediateOp ? undefined : (isBranch ? rd : rs2),
        rs1_value: state.registers[rs1],
        rs2_value: state.registers[isImmediateOp ? 0 : (isBranch ? rd : rs2)],
        immediate: imm,
        control_signals: {
          regWrite: !isBranch && !isStore && rd !== 0,
          memRead: isLoad,
          memWrite: isStore,
          memToReg: isLoad,
          aluSrc: isImmediateOp || isLoad || isStore,
          branch: isBranch,
          jump: instr.includes("jal") || instr.includes("jalr"),
          aluOp: instr.split(" ")[0].toUpperCase(),
        },
      };
    } else {
      newState.ID_EX = { instruction: "NOP", pc: 0, valid: false };
    }

    // IF Stage - Instruction Fetch
    const instrIndex = state.pc / 4;
    if (instrIndex < state.instructionMemory.length) {
      const fetchedInstr = state.instructionMemory[instrIndex];
      newState.IF_ID = {
        instruction: fetchedInstr.assembly,
        pc: state.pc,
        valid: true,
      };
      newState.pc = state.pc + 4;
    } else {
      newState.IF_ID = { instruction: "NOP", pc: state.pc, valid: false };
      newState.halted = true;
      newState.running = false;
    }
    
    newState.stall = false;
  }

  // Detect hazards for next cycle
  newState = detectHazards(newState);

  return newState;
}

export function useCPUSimulator() {
  const [state, setState] = useState<CPUState>(INITIAL_CPU_STATE);
  const [useBackend] = useState(true); // Always use backend
  const [cycleHistory, setCycleHistory] = useState<CPUState[]>([INITIAL_CPU_STATE]);
  const runIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const step = useCallback(async () => {
    try {
      console.log('Calling backend step...');
      const apiState = await cpuApi.step();
      setState(current => {
        const newState = apiStateToFrontend(apiState, current);
        setCycleHistory(prev => [...prev, newState]);
        return newState;
      });
    } catch (error) {
      console.error('Backend step failed:', error);
    }
  }, []);

  const reset = useCallback(async () => {
    if (runIntervalRef.current) {
      clearInterval(runIntervalRef.current);
      runIntervalRef.current = null;
    }
    
    try {
      const apiState = await cpuApi.reset();
      const newState = apiStateToFrontend(apiState);
      setState(newState);
      setCycleHistory([newState]);
    } catch (error) {
      console.error('Backend reset failed:', error);
      setState(INITIAL_CPU_STATE);
      setCycleHistory([INITIAL_CPU_STATE]);
    }
  }, []);

  const loadProgram = useCallback(async (instructions: Instruction[]) => {
    if (runIntervalRef.current) {
      clearInterval(runIntervalRef.current);
      runIntervalRef.current = null;
    }

    try {
      const apiState = await cpuApi.loadProgram(instructions);
      const newState = apiStateToFrontend(apiState);
      setState(newState);
      setCycleHistory([newState]);
    } catch (error) {
      console.error('Backend load failed:', error);
    }
  }, []);

  const run = useCallback(async () => {
    if (state.halted || state.running) return;
    
    setState(current => ({ ...current, running: true }));
    
    runIntervalRef.current = setInterval(async () => {
      try {
        const apiState = await cpuApi.step();
        setState(current => {
          const newState = apiStateToFrontend(apiState, current);
          setCycleHistory(prev => [...prev, newState]);
          if (newState.halted) {
            if (runIntervalRef.current) {
              clearInterval(runIntervalRef.current);
              runIntervalRef.current = null;
            }
            return { ...newState, running: false };
          }
          return newState;
        });
      } catch (error) {
        console.error('Backend step failed during run:', error);
        if (runIntervalRef.current) {
          clearInterval(runIntervalRef.current);
          runIntervalRef.current = null;
        }
        setState(current => ({ ...current, running: false }));
      }
    }, 500);
  }, [state.halted, state.running]);

  const pause = useCallback(() => {
    if (runIntervalRef.current) {
      clearInterval(runIntervalRef.current);
      runIntervalRef.current = null;
    }
    setState(current => ({ ...current, running: false }));
  }, []);

  const backward = useCallback(() => {
    if (cycleHistory.length > 1) {
      const previousCycle = cycleHistory[cycleHistory.length - 2];
      setState(previousCycle);
      setCycleHistory(prev => prev.slice(0, -1));
    }
  }, [cycleHistory]);

  useEffect(() => {
    return () => {
      if (runIntervalRef.current) {
        clearInterval(runIntervalRef.current);
      }
    };
  }, []);

  // Configuration state
  const [configOptions, setConfigOptions] = useState<ConfigOptions>({
    isas: {},
    cores: {}
  });
  const [currentIsa, setCurrentIsa] = useState<string>('rv32i');
  const [currentCore, setCurrentCore] = useState<string>('inorder_5stage');

  // Fetch config options on mount
  useEffect(() => {
    cpuApi.getConfigOptions()
      .then(options => {
        setConfigOptions(options);
      })
      .catch(err => console.error('Failed to fetch config options:', err));

    cpuApi.getConfig()
      .then(config => {
        setCurrentIsa(config.isa);
        setCurrentCore(config.core);
      })
      .catch(err => console.error('Failed to fetch current config:', err));

    // Load initial state from backend
    cpuApi.getState()
      .then(apiState => {
        setState(apiStateToFrontend(apiState));
      })
      .catch(err => console.error('Failed to fetch initial state:', err));
  }, []);

  const setConfig = useCallback(async (isa: string, core: string) => {
    try {
      const result = await cpuApi.setConfig(isa, core);
      if (result.success) {
        setCurrentIsa(result.isa);
        setCurrentCore(result.core);
        // Fetch updated state
        const apiState = await cpuApi.getState();
        setState(apiStateToFrontend(apiState));
      }
    } catch (error) {
      console.error('Failed to set config:', error);
    }
  }, []);

  return {
    state,
    step,
    reset,
    run,
    pause,
    backward,
    loadProgram,
    useBackend,
    setUseBackend: () => {}, // No-op since we always use backend
    configOptions,
    currentIsa,
    currentCore,
    setConfig,
  };
}

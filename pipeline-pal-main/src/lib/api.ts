// FastAPI Backend API Client
import { CPUState, Instruction } from '@/types/cpu';

// Configuration - can be updated to point to your Python backend
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  enabled: import.meta.env.VITE_API_ENABLED === 'true',
};

export interface APIPipelineRegister {
  instruction: string;
  pc: number;
  valid: boolean;
  rd?: number;
  rs1?: number;
  rs2?: number;
  rs1_value?: number;
  rs2_value?: number;
  immediate?: number;
  alu_result?: number;
}

export interface APIState {
  cycle: number;
  pc: number;
  registers: number[];
  instruction_memory: Array<{
    address: number;
    hex: string;
    assembly: string;
    opcode: string;
  }>;
  IF_ID: APIPipelineRegister;
  ID_EX: APIPipelineRegister;
  EX_MEM: APIPipelineRegister;
  MEM_WB: APIPipelineRegister;
  alu: {
    operandA: number;
    operandB: number;
    operation: string;
    result: number;
    zero: boolean;
  };
  hazards: {
    stall: boolean;
    forward_a: string | null;
    forward_b: string | null;
  };
  running: boolean;
  halted: boolean;
}

class CPUApi {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async step(): Promise<APIState> {
    const response = await fetch(`${this.baseUrl}/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to step CPU');
    return response.json();
  }

  async reset(): Promise<APIState> {
    const response = await fetch(`${this.baseUrl}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to reset CPU');
    return response.json();
  }

  async getState(): Promise<APIState> {
    const response = await fetch(`${this.baseUrl}/state`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to get CPU state');
    return response.json();
  }

  async loadProgram(instructions: Instruction[]): Promise<APIState> {
    const response = await fetch(`${this.baseUrl}/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instructions }),
    });
    if (!response.ok) throw new Error('Failed to load program');
    return response.json();
  }
}

export const cpuApi = new CPUApi(API_CONFIG.baseUrl);

// Convert API response to frontend CPUState format
export function apiStateToFrontend(apiState: APIState, prevState?: CPUState): CPUState {
  const updatedRegister = prevState 
    ? apiState.registers.findIndex((v, i) => v !== prevState.registers[i])
    : null;

  return {
    cycle: apiState.cycle,
    pc: apiState.pc,
    registers: apiState.registers,
    instructionMemory: apiState.instruction_memory.map(i => ({
      address: i.address,
      hex: i.hex,
      assembly: i.assembly,
      opcode: i.opcode,
    })),
    dataMemory: new Map(),
    IF_ID: {
      instruction: apiState.IF_ID.instruction,
      assembly: apiState.IF_ID.instruction,
      pc: apiState.IF_ID.pc,
      valid: apiState.IF_ID.valid,
      rd: apiState.IF_ID.rd,
      rs1: apiState.IF_ID.rs1,
      rs2: apiState.IF_ID.rs2,
    },
    ID_EX: {
      instruction: apiState.ID_EX.instruction,
      assembly: apiState.ID_EX.instruction,
      pc: apiState.ID_EX.pc,
      valid: apiState.ID_EX.valid,
      rd: apiState.ID_EX.rd,
      rs1: apiState.ID_EX.rs1,
      rs2: apiState.ID_EX.rs2,
      rs1_value: apiState.ID_EX.rs1_value,
      rs2_value: apiState.ID_EX.rs2_value,
      immediate: apiState.ID_EX.immediate,
      control_signals: {
        regWrite: true,
        memRead: false,
        memWrite: false,
        memToReg: false,
        aluSrc: false,
        branch: false,
        jump: false,
        aluOp: "ADD"
      }
    },
    EX_MEM: {
      instruction: apiState.EX_MEM.instruction,
      assembly: apiState.EX_MEM.instruction,
      pc: apiState.EX_MEM.pc,
      valid: apiState.EX_MEM.valid,
      rd: apiState.EX_MEM.rd,
      alu_result: apiState.EX_MEM.alu_result,
    },
    MEM_WB: {
      instruction: apiState.MEM_WB.instruction,
      assembly: apiState.MEM_WB.instruction,
      pc: apiState.MEM_WB.pc,
      valid: apiState.MEM_WB.valid,
      rd: apiState.MEM_WB.rd,
      alu_result: apiState.MEM_WB.alu_result,
      mem_data: null,
      reg_write: true,
      mem_to_reg: false,
    },
    alu: apiState.alu,
    hazards: {
      rawHazard: false,
      forwardA: null,
      forwardB: null,
      stallRequired: apiState.hazards.stall,
      hazardDetails: [],
    },
    stall: apiState.hazards.stall,
    flush: false,
    running: apiState.running,
    halted: apiState.halted,
    updatedRegister: updatedRegister !== -1 ? updatedRegister : null,
  };
}

// FastAPI Backend API Client
import { CPUState, Instruction } from '@/types/cpu';

// Configuration - Backend only
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  enabled: true, // Always enabled
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
  statistics?: {
    total_cycles: number;
    execution_time_seconds: number;
    stage_cycles: {
      IF: number;
      ID: number;
      EX: number;
      MEM: number;
      WB: number;
    };
  };
}

export interface ConfigOptions {
  isas: Record<string, { name: string; description: string; xlen: number }>;
  cores: Record<string, { name: string; description: string; stages: number }>;
}

export interface CurrentConfig {
  isa: string;
  core: string;
  isa_info: { name: string; description: string; xlen: number };
  core_info: { name: string; description: string; stages: number };
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
    // Convert Instruction objects to machine code integers
    const machineCode = instructions.map(instr => parseInt(instr.hex, 16));
    
    const response = await fetch(`${this.baseUrl}/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instructions: machineCode }),
    });
    if (!response.ok) throw new Error('Failed to load program');
    return response.json();
  }

  async getConfig(): Promise<CurrentConfig> {
    const response = await fetch(`${this.baseUrl}/config`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to get config');
    return response.json();
  }

  async getConfigOptions(): Promise<ConfigOptions> {
    const response = await fetch(`${this.baseUrl}/config/options`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to get config options');
    return response.json();
  }

  async setConfig(isa?: string, core?: string): Promise<{ success: boolean; isa: string; core: string }> {
    const response = await fetch(`${this.baseUrl}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isa, core }),
    });
    if (!response.ok) throw new Error('Failed to set config');
    return response.json();
  }
}

export const cpuApi = new CPUApi(API_CONFIG.baseUrl);

// Convert API response to frontend CPUState format
export function apiStateToFrontend(apiState: APIState, prevState?: CPUState): CPUState {
  const updatedRegister = prevState 
    ? apiState.registers.findIndex((v, i) => v !== prevState.registers[i])
    : null;

  // Ensure instruction_memory exists and is an array
  const instructionMemory = apiState.instruction_memory || [];

  return {
    cycle: apiState.cycle,
    pc: apiState.pc,
    registers: apiState.registers,
    instructionMemory: instructionMemory.map(i => ({
      address: i.address,
      hex: i.hex,
      assembly: i.assembly,
      opcode: i.opcode,
    })),
    dataMemory: new Map(),
    IF_ID: {
      instruction: apiState.IF_ID?.instruction || "NOP",
      assembly: apiState.IF_ID?.instruction || "NOP",
      pc: apiState.IF_ID?.pc || 0,
      valid: apiState.IF_ID?.valid || false,
      rd: apiState.IF_ID?.rd,
      rs1: apiState.IF_ID?.rs1,
      rs2: apiState.IF_ID?.rs2,
    },
    ID_EX: {
      instruction: apiState.ID_EX?.instruction || "NOP",
      assembly: apiState.ID_EX?.instruction || "NOP",
      pc: apiState.ID_EX?.pc || 0,
      valid: apiState.ID_EX?.valid || false,
      rd: apiState.ID_EX?.rd,
      rs1: apiState.ID_EX?.rs1,
      rs2: apiState.ID_EX?.rs2,
      rs1_value: apiState.ID_EX?.rs1_value,
      rs2_value: apiState.ID_EX?.rs2_value,
      immediate: apiState.ID_EX?.immediate,
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
      instruction: apiState.EX_MEM?.instruction || "NOP",
      assembly: apiState.EX_MEM?.instruction || "NOP",
      pc: apiState.EX_MEM?.pc || 0,
      valid: apiState.EX_MEM?.valid || false,
      rd: apiState.EX_MEM?.rd,
      alu_result: apiState.EX_MEM?.alu_result,
      mem_read: false,
      mem_write: false,
    },
    MEM_WB: {
      instruction: apiState.MEM_WB?.instruction || "NOP",
      assembly: apiState.MEM_WB?.instruction || "NOP",
      pc: apiState.MEM_WB?.pc || 0,
      valid: apiState.MEM_WB?.valid || false,
      rd: apiState.MEM_WB?.rd,
      alu_result: apiState.MEM_WB?.alu_result,
      mem_data: null,
      reg_write: true,
      mem_to_reg: false,
    },
    alu: apiState.alu || {
      operandA: 0,
      operandB: 0,
      operation: "NOP",
      result: 0,
      zero: true
    },
    hazards: {
      rawHazard: false,
      forwardA: null,
      forwardB: null,
      stallRequired: apiState.hazards?.stall || false,
      hazardDetails: [],
    },
    stall: apiState.hazards?.stall || false,
    flush: false,
    running: apiState.running || false,
    halted: apiState.halted || false,
    updatedRegister: updatedRegister !== -1 ? updatedRegister : null,
    statistics: apiState.statistics,
  };
}

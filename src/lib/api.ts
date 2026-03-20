import { CPUState, Instruction } from '@/types/cpu';

// Configuration - Backend only
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  enabled: true,
};

export interface APIPipelineRegister {
  instruction: string;
  assembly?: string;
  pc: number;
  valid: boolean;
  rd?: number;
  rs1?: number;
  rs2?: number;
  rs1_value?: number;
  rs2_value?: number;
  immediate?: number;
  alu_result?: number;
  control_signals?: {
    regWrite: boolean;
    memRead: boolean;
    memWrite: boolean;
    memToReg: boolean;
    aluSrc: boolean;
    branch: boolean;
    jump: boolean;
    aluOp: string;
  };
}

export interface APIHazardDetail {
  type: string;
  source: string;
  destination: string;
  resolution: string;
  description: string;
}

export interface APIForwardPath {
  from: string;
  register: number;
  value: number;
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
  // Phase 1: expanded hazards
  hazards: {
    stall: boolean;
    forward_a: APIForwardPath | null;
    forward_b: APIForwardPath | null;
    raw?: boolean;
    war?: boolean;
    waw?: boolean;
    structural?: boolean;
    memory?: boolean;
    control?: boolean;
    hazard_details?: APIHazardDetail[];
  };
  hazard_stats?: {
    raw_hazards: number;
    war_hazards: number;
    waw_hazards: number;
    structural_hazards: number;
    memory_hazards: number;
    control_hazards: number;
    branch_flushes: number;
    total_stall_cycles: number;
    completed_instructions: number;
  };
  static_dependencies?: Array<{
    type: string;
    producer: number;
    consumer: number;
    register: string | null;
    producer_instr: string;
    consumer_instr: string;
    distance: number;
    producer_pc: string;
    consumer_pc: string;
    control_kind?: string;
  }>;
  // Phase 3: pipeline trace
  pipeline_trace?: Array<{
    cycle: number;
    mode: string;
    IF?: { valid: boolean; instruction: string; mnemonic: string; pc: string };
    ID?: { valid: boolean; instruction: string; mnemonic: string; pc: string };
    EX?: { valid: boolean; instruction: string; mnemonic: string; pc: string };
    MEM?: { valid: boolean; instruction: string; mnemonic: string; pc: string };
    WB?: { valid: boolean; instruction: string; mnemonic: string; pc: string };
    FETCH?:    { valid: boolean; instruction: string; mnemonic: string; pc: string };
    DISPATCH?: { valid: boolean; instruction: string; mnemonic: string; pc: string };
    EXECUTE?:  { valid: boolean; instruction: string; mnemonic: string; pc: string };
    COMMIT?:   { valid: boolean; instruction: string; mnemonic: string; pc: string };
  }>;
  // Phase 4: OoO
  ooo_state?: any | null;
  execution_mode?: string;
  running: boolean;
  halted: boolean;
  statistics?: {
    total_cycles: number;
    execution_time_seconds: number;
    cpi: number;
    instructions_completed: number;
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

  const instructionMemory = apiState.instruction_memory || [];
  const hz = apiState.hazards || {};
  const hs = apiState.hazard_stats;
  const sd = apiState.static_dependencies || [];
  const pt = apiState.pipeline_trace || [];

  // Map forwarding paths
  const mapForward = (fp: APIForwardPath | null | undefined) => {
    if (!fp) return null;
    return { from: fp.from as 'EX_MEM' | 'MEM_WB', register: fp.register, value: fp.value };
  };

  // Map hazard details
  const mapDetails = (details: APIHazardDetail[] | undefined) => {
    if (!details) return [];
    return details.map(d => ({
      type: d.type as any,
      source: d.source,
      destination: d.destination,
      resolution: d.resolution as any,
      description: d.description,
    }));
  };

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
      instruction: apiState.IF_ID?.instruction || 'NOP',
      assembly: apiState.IF_ID?.assembly || apiState.IF_ID?.instruction || 'NOP',
      pc: apiState.IF_ID?.pc || 0,
      valid: apiState.IF_ID?.valid || false,
      rd: apiState.IF_ID?.rd,
      rs1: apiState.IF_ID?.rs1,
      rs2: apiState.IF_ID?.rs2,
    },
    ID_EX: {
      instruction: apiState.ID_EX?.instruction || 'NOP',
      assembly: apiState.ID_EX?.assembly || apiState.ID_EX?.instruction || 'NOP',
      pc: apiState.ID_EX?.pc || 0,
      valid: apiState.ID_EX?.valid || false,
      rd: apiState.ID_EX?.rd,
      rs1: apiState.ID_EX?.rs1,
      rs2: apiState.ID_EX?.rs2,
      rs1_value: apiState.ID_EX?.rs1_value,
      rs2_value: apiState.ID_EX?.rs2_value,
      immediate: apiState.ID_EX?.immediate,
      control_signals: apiState.ID_EX?.control_signals || {
        regWrite: false, memRead: false, memWrite: false, memToReg: false,
        aluSrc: false, branch: false, jump: false, aluOp: 'NOP',
      },
    },
    EX_MEM: {
      instruction: apiState.EX_MEM?.instruction || 'NOP',
      assembly: apiState.EX_MEM?.assembly || apiState.EX_MEM?.instruction || 'NOP',
      pc: apiState.EX_MEM?.pc || 0,
      valid: apiState.EX_MEM?.valid || false,
      rd: apiState.EX_MEM?.rd,
      rs1: apiState.EX_MEM?.rs1,
      rs2: apiState.EX_MEM?.rs2,
      alu_result: apiState.EX_MEM?.alu_result,
      mem_read: false,
      mem_write: false,
    },
    MEM_WB: {
      instruction: apiState.MEM_WB?.instruction || 'NOP',
      assembly: apiState.MEM_WB?.assembly || apiState.MEM_WB?.instruction || 'NOP',
      pc: apiState.MEM_WB?.pc || 0,
      valid: apiState.MEM_WB?.valid || false,
      rd: apiState.MEM_WB?.rd,
      alu_result: apiState.MEM_WB?.alu_result,
      mem_data: null,
      reg_write: true,
      mem_to_reg: false,
    },

    alu: apiState.alu || { operandA: 0, operandB: 0, operation: 'NOP', result: 0, zero: true },

    // Phase 1: full hazard state
    hazards: {
      rawHazard:        hz.raw        || false,
      warHazard:        hz.war        || false,
      wawHazard:        hz.waw        || false,
      structuralHazard: hz.structural || false,
      memoryHazard:     hz.memory     || false,
      controlHazard:    hz.control    || false,
      stallRequired:    hz.stall      || false,
      forwardA: mapForward(hz.forward_a),
      forwardB: mapForward(hz.forward_b),
      hazardDetails: mapDetails(hz.hazard_details),
    },

    // Phase 1: cumulative stats
    hazardStats: hs ? {
      raw_hazards:          hs.raw_hazards,
      war_hazards:          hs.war_hazards,
      waw_hazards:          hs.waw_hazards,
      structural_hazards:   hs.structural_hazards,
      memory_hazards:       hs.memory_hazards,
      control_hazards:      hs.control_hazards,
      branch_flushes:       hs.branch_flushes,
      total_stall_cycles:   hs.total_stall_cycles,
      completed_instructions: hs.completed_instructions,
    } : undefined,

    // Phase 1: static dependencies
    staticDependencies: sd.map(d => ({
      type: d.type as any,
      producer: d.producer,
      consumer: d.consumer,
      register: d.register,
      producer_instr: d.producer_instr,
      consumer_instr: d.consumer_instr,
      distance: d.distance,
      producer_pc: d.producer_pc,
      consumer_pc: d.consumer_pc,
      control_kind: d.control_kind,
    })),

    // Phase 3: pipeline trace
    pipelineTrace: pt as any,

    // Phase 4: OoO state
    oooState: apiState.ooo_state || null,
    executionMode: (apiState.execution_mode as 'inorder' | 'ooo') || 'inorder',

    stall: hz.stall || false,
    flush: false,
    running: apiState.running || false,
    halted: apiState.halted || false,
    updatedRegister: (updatedRegister !== null && updatedRegister !== -1) ? updatedRegister : null,

    statistics: apiState.statistics,
  };
}

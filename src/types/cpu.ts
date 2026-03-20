// RISC-V CPU Simulator Types — v4.0 (Phases 1-4)

export interface Instruction {
  address: number;
  hex: string;
  assembly: string;
  opcode: string;
  rd?: number;
  rs1?: number;
  rs2?: number;
  funct3?: number;
  funct7?: number;
  immediate?: number;
}

export interface PipelineRegister {
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
  mem_data?: number | null;
  control_signals?: ControlSignals;
  mem_read?: boolean;
  mem_write?: boolean;
  reg_write?: boolean;
  mem_to_reg?: boolean;
}

export interface ControlSignals {
  regWrite: boolean;
  memRead: boolean;
  memWrite: boolean;
  memToReg: boolean;
  aluSrc: boolean;
  branch: boolean;
  jump: boolean;
  aluOp: string;
}

export interface ALUState {
  operandA: number;
  operandB: number;
  operation: string;
  result: number;
  zero: boolean;
}

// ── Phase 1: Expanded Hazard Types ──────────────────────────────────────────

export interface HazardDetail {
  type: 'RAW' | 'LOAD-USE' | 'CONTROL' | 'WAR' | 'WAW' | 'STRUCTURAL' | 'MEMORY';
  source: string;
  destination: string;
  resolution: 'FORWARD' | 'STALL' | 'FLUSH' | 'TRACKED';
  description: string;
}

export interface ForwardPath {
  from: 'EX_MEM' | 'MEM_WB';
  register: number;
  value: number;
}

export interface HazardState {
  // Current-cycle flags
  rawHazard: boolean;
  warHazard: boolean;
  wawHazard: boolean;
  structuralHazard: boolean;
  memoryHazard: boolean;
  controlHazard: boolean;
  stallRequired: boolean;

  // Forwarding paths
  forwardA: ForwardPath | null;
  forwardB: ForwardPath | null;

  // Detail list for display
  hazardDetails: HazardDetail[];
}

// ── Phase 1: Cumulative hazard counters ────────────────────────────────────

export interface HazardStats {
  raw_hazards: number;
  war_hazards: number;
  waw_hazards: number;
  structural_hazards: number;
  memory_hazards: number;
  control_hazards: number;
  branch_flushes: number;
  total_stall_cycles: number;
  completed_instructions: number;
}

// ── Phase 1: Static dependency analysis entry ──────────────────────────────

export interface StaticDependency {
  type: 'RAW' | 'WAR' | 'WAW' | 'CONTROL';
  producer: number;
  consumer: number;
  register: string | null;
  producer_instr: string;
  consumer_instr: string;
  distance: number;
  producer_pc: string;
  consumer_pc: string;
  control_kind?: string;
}

// ── Phase 3: Pipeline trace entry ─────────────────────────────────────────

export interface PipelineTraceStage {
  valid: boolean;
  instruction: string;
  mnemonic: string;
  pc: string;
}

export interface PipelineTraceEntry {
  cycle: number;
  mode: 'inorder' | 'ooo';
  // In-order stages
  IF?: PipelineTraceStage;
  ID?: PipelineTraceStage;
  EX?: PipelineTraceStage;
  MEM?: PipelineTraceStage;
  WB?: PipelineTraceStage;
  // OoO stages
  FETCH?:    PipelineTraceStage;
  DISPATCH?: PipelineTraceStage;
  EXECUTE?:  PipelineTraceStage;
  COMMIT?:   PipelineTraceStage;
}

// ── Phase 4: OoO hardware state ────────────────────────────────────────────

export interface ROBEntry {
  id: number;
  instruction: string;
  pc: string;
  state: 'DISPATCH' | 'EXECUTE' | 'WRITEBACK' | 'COMMIT';
  ready: boolean;
  result: number | null;
  dst_preg: number | null;
}

export interface RSEntry {
  id: number;
  instruction: string;
  fu_type: string;
  src1_ready: boolean;
  src1_val: number | null;
  src2_ready: boolean;
  src2_val: number | null;
  executing: boolean;
  rob_id: number;
}

export interface RenameEntry {
  physical: number;
  ready: boolean;
  value: number | null;
  renamed: boolean;
}

export interface FunctionalUnit {
  busy: boolean;
  instruction: string | null;
  remaining_cycles: number;
  latency: number;
}

export interface OoOState {
  mode: 'ooo';
  cycle: number;
  fetch_ptr: number;
  total_instructions: number;
  rob_size: number;
  rs_size: number;
  rob_used: number;
  rs_used: number;
  free_regs: number;
  rob: ROBEntry[];
  reservation_station: RSEntry[];
  rename_table: Record<string, RenameEntry>;
  functional_units: Record<string, FunctionalUnit>;
  cdb_active: number;
  statistics: {
    issued: number;
    committed: number;
    raw_stalls: number;
    structural_stalls: number;
    waw_renames: number;
    cpi: number;
  };
}

// ── Main CPU State ─────────────────────────────────────────────────────────

export interface CPUState {
  cycle: number;
  pc: number;
  registers: number[];
  instructionMemory: Instruction[];
  dataMemory: Map<number, number>;

  // Pipeline registers
  IF_ID:  PipelineRegister;
  ID_EX:  PipelineRegister;
  EX_MEM: PipelineRegister;
  MEM_WB: PipelineRegister;

  alu: ALUState;

  // Phase 1: expanded hazards
  hazards?: HazardState;
  hazardStats?: HazardStats;
  staticDependencies?: StaticDependency[];

  // Phase 3: trace
  pipelineTrace?: PipelineTraceEntry[];

  // Phase 4: OoO
  oooState?: OoOState | null;
  executionMode?: 'inorder' | 'ooo';

  stall: boolean;
  flush: boolean;
  running: boolean;
  halted: boolean;
  updatedRegister: number | null;

  statistics?: {
    total_cycles: number;
    execution_time_seconds: number;
    cpi: number;
    instructions_completed: number;
    stage_cycles: { IF: number; ID: number; EX: number; MEM: number; WB: number };
  };
}

// ── Sample program & initial state ────────────────────────────────────────

export const SAMPLE_PROGRAM: Instruction[] = [
  { address: 0x00, hex: "00500093", assembly: "addi x1, x0, 5",  opcode: "I-type" },
  { address: 0x04, hex: "00000113", assembly: "addi x2, x0, 0",  opcode: "I-type" },
  { address: 0x08, hex: "00000193", assembly: "addi x3, x0, 0",  opcode: "I-type" },
  { address: 0x0C, hex: "00118193", assembly: "addi x3, x3, 1",  opcode: "I-type" },
  { address: 0x10, hex: "00310133", assembly: "add x2, x2, x3",  opcode: "R-type" },
  { address: 0x14, hex: "FE30C8E3", assembly: "blt x1, x3, -16", opcode: "B-type" },
  { address: 0x18, hex: "00000013", assembly: "nop",              opcode: "I-type" },
  { address: 0x1C, hex: "00000013", assembly: "nop",              opcode: "I-type" },
];

export const INITIAL_CPU_STATE: CPUState = {
  cycle: 0,
  pc: 0,
  registers: new Array(32).fill(0),
  instructionMemory: SAMPLE_PROGRAM,
  dataMemory: new Map(),

  IF_ID:  { instruction: "NOP", pc: 0, valid: false },
  ID_EX:  { instruction: "NOP", pc: 0, valid: false },
  EX_MEM: { instruction: "NOP", pc: 0, valid: false },
  MEM_WB: { instruction: "NOP", pc: 0, valid: false },

  alu: { operandA: 0, operandB: 0, operation: "NOP", result: 0, zero: true },

  hazards: {
    rawHazard: false, warHazard: false, wawHazard: false,
    structuralHazard: false, memoryHazard: false, controlHazard: false,
    stallRequired: false, forwardA: null, forwardB: null,
    hazardDetails: [],
  },

  hazardStats: {
    raw_hazards: 0, war_hazards: 0, waw_hazards: 0,
    structural_hazards: 0, memory_hazards: 0,
    control_hazards: 0, branch_flushes: 0,
    total_stall_cycles: 0, completed_instructions: 0,
  },

  staticDependencies: [],
  pipelineTrace: [],
  oooState: null,
  executionMode: 'inorder',

  stall: false,
  flush: false,
  running: false,
  halted: false,
  updatedRegister: null,
};

export const REGISTER_NAMES = [
  "zero", "ra", "sp", "gp", "tp", "t0", "t1", "t2",
  "s0",   "s1", "a0", "a1", "a2", "a3", "a4", "a5",
  "a6",   "a7", "s2", "s3", "s4", "s5", "s6", "s7",
  "s8",   "s9", "s10","s11","t3", "t4", "t5", "t6",
];

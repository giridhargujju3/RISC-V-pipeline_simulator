// RISC-V CPU Simulator Types

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
  // Decoded fields
  rd?: number;
  rs1?: number;
  rs2?: number;
  rs1_value?: number;
  rs2_value?: number;
  immediate?: number;
  alu_result?: number;
  mem_data?: number | null;
  control_signals?: ControlSignals;
  // Memory and Write Back stage properties
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

export interface HazardState {
  // Data hazard detection
  rawHazard: boolean;  // Read-After-Write
  // Forwarding paths
  forwardA: ForwardPath | null;
  forwardB: ForwardPath | null;
  // Stall required
  stallRequired: boolean;
  // Hazard details for display
  hazardDetails: HazardDetail[];
}

export interface ForwardPath {
  from: 'EX_MEM' | 'MEM_WB';
  register: number;
  value: number;
}

export interface HazardDetail {
  type: 'RAW' | 'LOAD-USE' | 'CONTROL';
  source: string;
  destination: string;
  resolution: 'FORWARD' | 'STALL' | 'FLUSH';
  description: string;
}

export interface CPUState {
  cycle: number;
  pc: number;
  registers: number[];
  instructionMemory: Instruction[];
  dataMemory: Map<number, number>;
  
  // Pipeline registers
  IF_ID: PipelineRegister;
  ID_EX: PipelineRegister;
  EX_MEM: PipelineRegister;
  MEM_WB: PipelineRegister;
  
  // ALU state
  alu: ALUState;
  
  // Hazard detection
  hazards?: HazardState;
  
  // Pipeline control
  stall: boolean;
  flush: boolean;
  
  // Execution state
  running: boolean;
  halted: boolean;
  
  // Updated register tracking
  updatedRegister: number | null;
  
  // Statistics
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

// Sample RISC-V program: Compute sum of 1 to 5
export const SAMPLE_PROGRAM: Instruction[] = [
  { address: 0x00, hex: "00500093", assembly: "addi x1, x0, 5", opcode: "I-type" },
  { address: 0x04, hex: "00000113", assembly: "addi x2, x0, 0", opcode: "I-type" },
  { address: 0x08, hex: "00000193", assembly: "addi x3, x0, 0", opcode: "I-type" },
  { address: 0x0C, hex: "00118193", assembly: "addi x3, x3, 1", opcode: "I-type" },
  { address: 0x10, hex: "00310133", assembly: "add x2, x2, x3", opcode: "R-type" },
  { address: 0x14, hex: "FE30C8E3", assembly: "blt x1, x3, -16", opcode: "B-type" },
  { address: 0x18, hex: "00000013", assembly: "nop", opcode: "I-type" },
  { address: 0x1C, hex: "00000013", assembly: "nop", opcode: "I-type" },
];

export const INITIAL_CPU_STATE: CPUState = {
  cycle: 0,
  pc: 0,
  registers: new Array(32).fill(0),
  instructionMemory: SAMPLE_PROGRAM,
  dataMemory: new Map(),
  
  IF_ID: { instruction: "NOP", pc: 0, valid: false },
  ID_EX: { instruction: "NOP", pc: 0, valid: false },
  EX_MEM: { instruction: "NOP", pc: 0, valid: false },
  MEM_WB: { instruction: "NOP", pc: 0, valid: false },
  
  alu: {
    operandA: 0,
    operandB: 0,
    operation: "NOP",
    result: 0,
    zero: true,
  },

  hazards: {
    rawHazard: false,
    forwardA: null,
    forwardB: null,
    stallRequired: false,
    hazardDetails: [],
  },
  
  stall: false,
  flush: false,
  running: false,
  halted: false,
  updatedRegister: null,
};

// Register ABI names
export const REGISTER_NAMES = [
  "zero", "ra", "sp", "gp", "tp", "t0", "t1", "t2",
  "s0", "s1", "a0", "a1", "a2", "a3", "a4", "a5",
  "a6", "a7", "s2", "s3", "s4", "s5", "s6", "s7",
  "s8", "s9", "s10", "s11", "t3", "t4", "t5", "t6"
];

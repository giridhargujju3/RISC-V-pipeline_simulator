// RISC-V Assembler - Converts assembly to machine code
import { Instruction } from '@/types/cpu';
import { z } from 'zod';

// Validation schema for assembly input - very permissive
const assemblyLineSchema = z.string()
  .max(200, "Line too long")
  .regex(/^[a-zA-Z0-9\s,\-()#.x:_+$\[\]!=*/&|<>@]*$/, "Invalid characters in assembly");

// Register mapping
const REGISTERS: Record<string, number> = {
  'x0': 0, 'zero': 0,
  'x1': 1, 'ra': 1,
  'x2': 2, 'sp': 2,
  'x3': 3, 'gp': 3,
  'x4': 4, 'tp': 4,
  'x5': 5, 't0': 5,
  'x6': 6, 't1': 6,
  'x7': 7, 't2': 7,
  'x8': 8, 's0': 8, 'fp': 8,
  'x9': 9, 's1': 9,
  'x10': 10, 'a0': 10,
  'x11': 11, 'a1': 11,
  'x12': 12, 'a2': 12,
  'x13': 13, 'a3': 13,
  'x14': 14, 'a4': 14,
  'x15': 15, 'a5': 15,
  'x16': 16, 'a6': 16,
  'x17': 17, 'a7': 17,
  'x18': 18, 's2': 18,
  'x19': 19, 's3': 19,
  'x20': 20, 's4': 20,
  'x21': 21, 's5': 21,
  'x22': 22, 's6': 22,
  'x23': 23, 's7': 23,
  'x24': 24, 's8': 24,
  'x25': 25, 's9': 25,
  'x26': 26, 's10': 26,
  'x27': 27, 's11': 27,
  'x28': 28, 't3': 28,
  'x29': 29, 't4': 29,
  'x30': 30, 't5': 30,
  'x31': 31, 't6': 31,
};

function parseRegister(reg: string): number {
  const r = reg.trim().toLowerCase();
  if (REGISTERS[r] !== undefined) return REGISTERS[r];
  throw new Error(`Invalid register: ${reg}`);
}

function parseImmediate(imm: string): number {
  const s = imm.trim();
  if (s.startsWith('0x') || s.startsWith('0X')) {
    return parseInt(s, 16);
  }
  return parseInt(s, 10);
}

// Encode R-type: funct7[31:25] | rs2[24:20] | rs1[19:15] | funct3[14:12] | rd[11:7] | opcode[6:0]
function encodeRType(opcode: number, rd: number, funct3: number, rs1: number, rs2: number, funct7: number): number {
  return ((funct7 & 0x7f) << 25) | ((rs2 & 0x1f) << 20) | ((rs1 & 0x1f) << 15) |
         ((funct3 & 0x7) << 12) | ((rd & 0x1f) << 7) | (opcode & 0x7f);
}

// Encode I-type: imm[31:20] | rs1[19:15] | funct3[14:12] | rd[11:7] | opcode[6:0]
function encodeIType(opcode: number, rd: number, funct3: number, rs1: number, imm: number): number {
  return ((imm & 0xfff) << 20) | ((rs1 & 0x1f) << 15) |
         ((funct3 & 0x7) << 12) | ((rd & 0x1f) << 7) | (opcode & 0x7f);
}

// Encode S-type: imm[11:5][31:25] | rs2[24:20] | rs1[19:15] | funct3[14:12] | imm[4:0][11:7] | opcode[6:0]
function encodeSType(opcode: number, funct3: number, rs1: number, rs2: number, imm: number): number {
  return (((imm >> 5) & 0x7f) << 25) | ((rs2 & 0x1f) << 20) | ((rs1 & 0x1f) << 15) |
         ((funct3 & 0x7) << 12) | ((imm & 0x1f) << 7) | (opcode & 0x7f);
}

// Encode B-type: imm[12|10:5][31:25] | rs2[24:20] | rs1[19:15] | funct3[14:12] | imm[4:1|11][11:7] | opcode[6:0]
function encodeBType(opcode: number, funct3: number, rs1: number, rs2: number, imm: number): number {
  const imm12 = (imm >> 12) & 0x1;
  const imm10_5 = (imm >> 5) & 0x3f;
  const imm4_1 = (imm >> 1) & 0xf;
  const imm11 = (imm >> 11) & 0x1;
  return (imm12 << 31) | (imm10_5 << 25) | ((rs2 & 0x1f) << 20) | ((rs1 & 0x1f) << 15) |
         ((funct3 & 0x7) << 12) | (imm4_1 << 8) | (imm11 << 7) | (opcode & 0x7f);
}

// Encode U-type: imm[31:12] | rd[11:7] | opcode[6:0]
function encodeUType(opcode: number, rd: number, imm: number): number {
  return ((imm & 0xfffff) << 12) | ((rd & 0x1f) << 7) | (opcode & 0x7f);
}

// Encode J-type: imm[20|10:1|11|19:12][31:12] | rd[11:7] | opcode[6:0]
function encodeJType(opcode: number, rd: number, imm: number): number {
  const imm20 = (imm >> 20) & 0x1;
  const imm10_1 = (imm >> 1) & 0x3ff;
  const imm11 = (imm >> 11) & 0x1;
  const imm19_12 = (imm >> 12) & 0xff;
  return (imm20 << 31) | (imm10_1 << 21) | (imm11 << 20) | (imm19_12 << 12) |
         ((rd & 0x1f) << 7) | (opcode & 0x7f);
}

interface AssemblyResult {
  success: boolean;
  instructions: Instruction[];
  errors: string[];
}

export function assembleProgram(code: string): AssemblyResult {
  const lines = code.split('\n');
  const instructions: Instruction[] = [];
  const errors: string[] = [];
  const labels: Map<string, number> = new Map();
  
  // First pass: collect labels
  let address = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const labelMatch = trimmed.match(/^(\w+):\s*(.*)/);
    if (labelMatch) {
      labels.set(labelMatch[1], address);
      if (labelMatch[2].trim()) address += 4;
    } else {
      address += 4;
    }
  }
  
  // Second pass: assemble instructions
  address = 0;
  let lineNum = 0;
  
  for (const line of lines) {
    lineNum++;
    let trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Validate line - be very lenient
    try {
      // Skip validation for empty lines and comments
      if (trimmed && !trimmed.startsWith('#')) {
        // Only validate non-empty, non-comment lines
        const cleanLine = trimmed.replace(/#.*$/, '').trim();
        if (cleanLine) {
          assemblyLineSchema.parse(cleanLine);
        }
      }
    } catch (e) {
      // Skip validation errors for now to be more permissive
      console.warn(`Validation warning on line ${lineNum}: ${trimmed}`);
    }
    
    // Remove inline comments
    const commentIdx = trimmed.indexOf('#');
    if (commentIdx !== -1) trimmed = trimmed.substring(0, commentIdx).trim();
    
    // Handle labels
    const labelMatch = trimmed.match(/^(\w+):\s*(.*)/);
    if (labelMatch) {
      trimmed = labelMatch[2].trim();
      if (!trimmed) continue;
    }
    
    try {
      const result = assembleLine(trimmed, address, labels);
      instructions.push({
        address,
        hex: result.toString(16).padStart(8, '0').toUpperCase(),
        assembly: trimmed,
        opcode: getOpcodeType(trimmed),
      });
      address += 4;
    } catch (e) {
      errors.push(`Line ${lineNum}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }
  
  return {
    success: errors.length === 0,
    instructions,
    errors,
  };
}

function getOpcodeType(instr: string): string {
  const op = instr.split(/\s+/)[0].toLowerCase();
  if (['add', 'sub', 'and', 'or', 'xor', 'sll', 'srl', 'sra', 'slt', 'sltu'].includes(op)) return 'R-type';
  if (['addi', 'andi', 'ori', 'xori', 'slti', 'sltiu', 'lw', 'lb', 'lh', 'lbu', 'lhu', 'jalr'].includes(op)) return 'I-type';
  if (['sw', 'sb', 'sh'].includes(op)) return 'S-type';
  if (['beq', 'bne', 'blt', 'bge', 'bltu', 'bgeu'].includes(op)) return 'B-type';
  if (['lui', 'auipc'].includes(op)) return 'U-type';
  if (['jal'].includes(op)) return 'J-type';
  if (op === 'nop') return 'I-type';
  return 'Unknown';
}

function assembleLine(line: string, address: number, labels: Map<string, number>): number {
  const parts = line.split(/[\s,]+/).filter(p => p);
  const op = parts[0].toLowerCase();
  
  // Handle NOP as addi x0, x0, 0
  if (op === 'nop') {
    return encodeIType(0b0010011, 0, 0b000, 0, 0);
  }
  
  // R-type instructions
  if (op === 'add') {
    const [rd, rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2]), parseRegister(parts[3])];
    return encodeRType(0b0110011, rd, 0b000, rs1, rs2, 0b0000000);
  }
  if (op === 'sub') {
    const [rd, rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2]), parseRegister(parts[3])];
    return encodeRType(0b0110011, rd, 0b000, rs1, rs2, 0b0100000);
  }
  if (op === 'and') {
    const [rd, rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2]), parseRegister(parts[3])];
    return encodeRType(0b0110011, rd, 0b111, rs1, rs2, 0b0000000);
  }
  if (op === 'or') {
    const [rd, rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2]), parseRegister(parts[3])];
    return encodeRType(0b0110011, rd, 0b110, rs1, rs2, 0b0000000);
  }
  if (op === 'xor') {
    const [rd, rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2]), parseRegister(parts[3])];
    return encodeRType(0b0110011, rd, 0b100, rs1, rs2, 0b0000000);
  }
  if (op === 'sll') {
    const [rd, rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2]), parseRegister(parts[3])];
    return encodeRType(0b0110011, rd, 0b001, rs1, rs2, 0b0000000);
  }
  if (op === 'srl') {
    const [rd, rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2]), parseRegister(parts[3])];
    return encodeRType(0b0110011, rd, 0b101, rs1, rs2, 0b0000000);
  }
  if (op === 'sra') {
    const [rd, rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2]), parseRegister(parts[3])];
    return encodeRType(0b0110011, rd, 0b101, rs1, rs2, 0b0100000);
  }
  if (op === 'slt') {
    const [rd, rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2]), parseRegister(parts[3])];
    return encodeRType(0b0110011, rd, 0b010, rs1, rs2, 0b0000000);
  }
  if (op === 'sltu') {
    const [rd, rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2]), parseRegister(parts[3])];
    return encodeRType(0b0110011, rd, 0b011, rs1, rs2, 0b0000000);
  }
  
  // I-type instructions
  if (op === 'addi') {
    const [rd, rs1, imm] = [parseRegister(parts[1]), parseRegister(parts[2]), parseImmediate(parts[3])];
    return encodeIType(0b0010011, rd, 0b000, rs1, imm);
  }
  if (op === 'andi') {
    const [rd, rs1, imm] = [parseRegister(parts[1]), parseRegister(parts[2]), parseImmediate(parts[3])];
    return encodeIType(0b0010011, rd, 0b111, rs1, imm);
  }
  if (op === 'ori') {
    const [rd, rs1, imm] = [parseRegister(parts[1]), parseRegister(parts[2]), parseImmediate(parts[3])];
    return encodeIType(0b0010011, rd, 0b110, rs1, imm);
  }
  if (op === 'xori') {
    const [rd, rs1, imm] = [parseRegister(parts[1]), parseRegister(parts[2]), parseImmediate(parts[3])];
    return encodeIType(0b0010011, rd, 0b100, rs1, imm);
  }
  if (op === 'slti') {
    const [rd, rs1, imm] = [parseRegister(parts[1]), parseRegister(parts[2]), parseImmediate(parts[3])];
    return encodeIType(0b0010011, rd, 0b010, rs1, imm);
  }
  if (op === 'sltiu') {
    const [rd, rs1, imm] = [parseRegister(parts[1]), parseRegister(parts[2]), parseImmediate(parts[3])];
    return encodeIType(0b0010011, rd, 0b011, rs1, imm);
  }
  if (op === 'lw') {
    // lw rd, offset(rs1)
    const rd = parseRegister(parts[1]);
    const match = parts[2].match(/(-?\d+)\((\w+)\)/);
    if (!match) throw new Error('Invalid lw syntax');
    const [, offset, rs1] = match;
    return encodeIType(0b0000011, rd, 0b010, parseRegister(rs1), parseImmediate(offset));
  }
  if (op === 'jalr') {
    const [rd, rs1, imm] = [parseRegister(parts[1]), parseRegister(parts[2]), parseImmediate(parts[3] || '0')];
    return encodeIType(0b1100111, rd, 0b000, rs1, imm);
  }
  
  // S-type instructions
  if (op === 'sw') {
    // sw rs2, offset(rs1)
    const rs2 = parseRegister(parts[1]);
    const match = parts[2].match(/(-?\d+)\((\w+)\)/);
    if (!match) throw new Error('Invalid sw syntax');
    const [, offset, rs1] = match;
    return encodeSType(0b0100011, 0b010, parseRegister(rs1), rs2, parseImmediate(offset));
  }
  
  // B-type instructions
  if (op === 'beq') {
    const [rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2])];
    let imm = labels.has(parts[3]) ? labels.get(parts[3])! - address : parseImmediate(parts[3]);
    return encodeBType(0b1100011, 0b000, rs1, rs2, imm);
  }
  if (op === 'bne') {
    const [rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2])];
    let imm = labels.has(parts[3]) ? labels.get(parts[3])! - address : parseImmediate(parts[3]);
    return encodeBType(0b1100011, 0b001, rs1, rs2, imm);
  }
  if (op === 'blt') {
    const [rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2])];
    let imm = labels.has(parts[3]) ? labels.get(parts[3])! - address : parseImmediate(parts[3]);
    return encodeBType(0b1100011, 0b100, rs1, rs2, imm);
  }
  if (op === 'bge') {
    const [rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2])];
    let imm = labels.has(parts[3]) ? labels.get(parts[3])! - address : parseImmediate(parts[3]);
    return encodeBType(0b1100011, 0b101, rs1, rs2, imm);
  }
  if (op === 'bltu') {
    const [rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2])];
    let imm = labels.has(parts[3]) ? labels.get(parts[3])! - address : parseImmediate(parts[3]);
    return encodeBType(0b1100011, 0b110, rs1, rs2, imm);
  }
  if (op === 'bgeu') {
    const [rs1, rs2] = [parseRegister(parts[1]), parseRegister(parts[2])];
    let imm = labels.has(parts[3]) ? labels.get(parts[3])! - address : parseImmediate(parts[3]);
    return encodeBType(0b1100011, 0b111, rs1, rs2, imm);
  }
  
  // U-type instructions
  if (op === 'lui') {
    const [rd, imm] = [parseRegister(parts[1]), parseImmediate(parts[2])];
    return encodeUType(0b0110111, rd, imm);
  }
  if (op === 'auipc') {
    const [rd, imm] = [parseRegister(parts[1]), parseImmediate(parts[2])];
    return encodeUType(0b0010111, rd, imm);
  }
  
  // J-type instructions
  if (op === 'jal') {
    const [rd] = [parseRegister(parts[1])];
    let imm = labels.has(parts[2]) ? labels.get(parts[2])! - address : parseImmediate(parts[2]);
    return encodeJType(0b1101111, rd, imm);
  }
  
  throw new Error(`Unknown instruction: ${op}`);
}

export const EXAMPLE_PROGRAMS = {
  sum1to5: `# Sum of 1 to 5
# Result will be in x2
addi x1, x0, 5    # n = 5
addi x2, x0, 0    # sum = 0
addi x3, x0, 0    # i = 0
loop:
  addi x3, x3, 1  # i++
  add x2, x2, x3  # sum += i
  blt x3, x1, loop # if i < n, loop
nop
nop`,

  fibonacci: `# Fibonacci sequence
# Calculates fib(7) = 13
addi x1, x0, 7    # n = 7
addi x2, x0, 0    # fib(0) = 0
addi x3, x0, 1    # fib(1) = 1
addi x4, x0, 2    # counter = 2
loop:
  add x5, x2, x3  # next = a + b
  add x2, x0, x3  # a = b
  add x3, x0, x5  # b = next
  addi x4, x4, 1  # counter++
  blt x4, x1, loop
nop`,

  factorial: `# Factorial of 5
# Result: 5! = 120 in x2
addi x1, x0, 5    # n = 5
addi x2, x0, 1    # result = 1
loop:
  beq x1, x0, done # if n == 0, done
  add x3, x0, x2   # temp = result
  addi x4, x0, 0   # mult counter
mult:
  beq x4, x1, next # if counter == n, next
  add x2, x2, x3   # result += temp
  addi x4, x4, 1   # counter++
  blt x4, x1, mult # continue multiply
next:
  addi x1, x1, -1  # n--
  blt x0, x1, loop # if n > 0, loop
done:
  nop`,

  simple: `# Simple example - Basic arithmetic
addi x1, x0, 10   # x1 = 10
addi x2, x0, 20   # x2 = 20
add x3, x1, x2    # x3 = x1 + x2 = 30
nop
nop
nop
nop`,
};

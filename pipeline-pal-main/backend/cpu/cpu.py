# RISC-V 5-Stage Pipelined CPU Simulator
# Main CPU class that orchestrates all components

from typing import List, Optional
from .registers import RegisterFile
from .memory import InstructionMemory, DataMemory
from .decoder import decode_instruction
from .control import generate_control_signals
from .alu import alu_execute, branch_evaluate
from .pipeline_regs import (
    IF_ID_Register, ID_EX_Register, 
    EX_MEM_Register, MEM_WB_Register
)
from .hazard import HazardUnit, HazardState


class CPU:
    """RISC-V 5-Stage Pipelined CPU"""
    
    def __init__(self):
        # Core components
        self.registers = RegisterFile()
        self.instr_mem = InstructionMemory()
        self.data_mem = DataMemory()
        self.hazard_unit = HazardUnit()
        
        # Pipeline registers
        self.if_id = IF_ID_Register()
        self.id_ex = ID_EX_Register()
        self.ex_mem = EX_MEM_Register()
        self.mem_wb = MEM_WB_Register()
        
        # CPU state
        self.pc = 0
        self.cycle = 0
        self.halted = False
        self.stall = False
        self.flush = False
        
        # Current hazard state
        self.hazard_state = HazardState()
        
        # ALU state for visualization
        self.alu_state = {
            "operandA": 0,
            "operandB": 0,
            "operation": "NOP",
            "result": 0,
            "zero": True
        }
        
        # Statistics tracking
        self.stage_cycles = {
            "IF": 0,
            "ID": 0,
            "EX": 0,
            "MEM": 0,
            "WB": 0
        }
        self.clock_frequency = 1e9  # 1 GHz in Hz
    
    def load_program(self, instructions: List[int]):
        """Load machine code program into instruction memory"""
        print(f"\n=== Loading Program ===")
        print(f"Instructions: {[hex(i) for i in instructions]}")
        self.reset()
        self.instr_mem.load_program(instructions)
    
    def reset(self):
        """Reset CPU to initial state"""
        self.registers.reset()
        self.data_mem.reset()
        
        self.if_id = IF_ID_Register()
        self.id_ex = ID_EX_Register()
        self.ex_mem = EX_MEM_Register()
        self.mem_wb = MEM_WB_Register()
        
        self.pc = 0
        self.cycle = 0
        self.halted = False
        self.stall = False
        self.flush = False
        self.hazard_state = HazardState()
        
        self.alu_state = {
            "operandA": 0,
            "operandB": 0,
            "operation": "NOP",
            "result": 0,
            "zero": True
        }
        
        # Reset statistics
        self.stage_cycles = {
            "IF": 0,
            "ID": 0,
            "EX": 0,
            "MEM": 0,
            "WB": 0
        }
    
    def step(self):
        """Execute one clock cycle"""
        if self.halted:
            return
        
        self.cycle += 1
        self.registers.updated_reg = None
        
        # Debug logging with detailed pipeline stage information
        print(f"\n{'='*80}")
        print(f"🔄 CYCLE {self.cycle}")
        print(f"{'='*80}")
        print(f"PC: 0x{self.pc:08X}")
        
        # Detect hazards before executing
        self._detect_hazards()
        
        # Execute stages in reverse order (WB first, then MEM, EX, ID, IF)
        # This ensures proper forwarding of values
        self._writeback_stage()
        self._memory_stage()
        self._execute_stage()
        
        if self.stall:
            # Insert bubble in ID/EX
            self._insert_bubble()
            print("\n⚠️  PIPELINE STALL: Bubble inserted in ID/EX stage")
        else:
            self._decode_stage()
            self._fetch_stage()
        
        # Track statistics for active stages
        if self.if_id.valid:
            self.stage_cycles["IF"] += 1
        if self.id_ex.valid:
            self.stage_cycles["ID"] += 1
        if self.ex_mem.valid:
            self.stage_cycles["EX"] += 1
        if self.mem_wb.valid:
            self.stage_cycles["MEM"] += 1
        # WB is counted if mem_wb has valid instruction that commits a result
        if self.mem_wb.valid and hasattr(self.mem_wb, 'reg_write') and self.mem_wb.reg_write:
            self.stage_cycles["WB"] += 1
        
        # Print detailed stage information
        print(f"\n📋 PIPELINE STAGES:")
        print(f"  IF/ID:  {self.if_id.assembly if self.if_id.valid else 'empty'}")
        print(f"  ID/EX:  {self.id_ex.assembly if self.id_ex.valid else 'empty'}")
        print(f"  EX/MEM: {self.ex_mem.assembly if self.ex_mem.valid else 'empty'}")
        print(f"  MEM/WB: {self.mem_wb.assembly if self.mem_wb.valid else 'empty'}")
        
        # Print register values
        print(f"\n📊 REGISTER STATE:")
        print(f"  x1={self.registers.read(1):<10} x2={self.registers.read(2):<10} x3={self.registers.read(3):<10}")
    
    def _detect_hazards(self):
        """Detect data hazards"""
        # Get rs1/rs2 from IF/ID for load-use detection
        if self.if_id.valid:
            decoded = decode_instruction(self.if_id.instruction)
            if_id_rs1 = decoded.rs1
            if_id_rs2 = decoded.rs2
        else:
            if_id_rs1 = 0
            if_id_rs2 = 0
        
        self.hazard_state = self.hazard_unit.detect_hazards(
            if_id_rs1, if_id_rs2,
            self.id_ex, self.ex_mem, self.mem_wb
        )
        
        self.stall = self.hazard_state.stall_required
    
    def _fetch_stage(self):
        """IF Stage: Fetch instruction from memory"""
        instr_index = self.pc // 4
        
        if instr_index >= len(self.instr_mem.memory):
            # No more instructions
            self.if_id = IF_ID_Register(valid=False)
            self.halted = True
            print("\n🛑 IF STAGE: No more instructions, CPU halted")
            return
        
        instruction = self.instr_mem.fetch(self.pc)
        print(f"\n🔵 IF STAGE: Fetched instruction 0x{instruction:08X} from PC 0x{self.pc:08X}")
        
        self.if_id = IF_ID_Register(
            instruction=instruction,
            pc=self.pc,
            valid=True
        )
        
        # Update PC (may be overwritten by branch/jump)
        if not self.flush:
            self.pc += 4
            print(f"   Next PC: 0x{self.pc:08X}")
    
    def _decode_stage(self):
        """ID Stage: Decode instruction and read registers"""
        if not self.if_id.valid:
            self.id_ex = ID_EX_Register(valid=False)
            return
        
        decoded = decode_instruction(self.if_id.instruction)
        signals = generate_control_signals(decoded.opcode, decoded.funct3, decoded.funct7)
        
        print(f"\n🟢 ID STAGE: Decoding '{decoded.assembly}'")
        print(f"   rd=x{decoded.rd}, rs1=x{decoded.rs1}({self.registers.read(decoded.rs1)}), rs2=x{decoded.rs2}({self.registers.read(decoded.rs2)})")
        print(f"   imm={decoded.imm}, ALU_OP={signals.alu_op}")
        
        self.id_ex = ID_EX_Register(
            instruction=self.if_id.instruction,
            pc=self.if_id.pc,
            valid=True,
            rd=decoded.rd,
            rs1=decoded.rs1,
            rs2=decoded.rs2,
            rs1_value=self.registers.read(decoded.rs1),
            rs2_value=self.registers.read(decoded.rs2),
            immediate=decoded.imm,
            funct3=decoded.funct3,
            funct7=decoded.funct7,
            reg_write=signals.reg_write,
            mem_read=signals.mem_read,
            mem_write=signals.mem_write,
            mem_to_reg=signals.mem_to_reg,
            alu_src=signals.alu_src,
            branch=signals.branch,
            jump=signals.jump,
            alu_op=signals.alu_op,
            assembly=decoded.assembly
        )
    
    def _execute_stage(self):
        """EX Stage: ALU operations"""
        if not self.id_ex.valid:
            self.ex_mem = EX_MEM_Register(valid=False)
            return
        
        # Apply forwarding
        op_a = self.id_ex.rs1_value
        forward_a_msg = ""
        if self.hazard_state.forward_a:
            op_a = self.hazard_state.forward_a.value
            forward_a_msg = f" (forwarded: {self.hazard_state.forward_a.source})"
        
        op_b_reg = self.id_ex.rs2_value
        forward_b_msg = ""
        if self.hazard_state.forward_b:
            op_b_reg = self.hazard_state.forward_b.value
            forward_b_msg = f" (forwarded: {self.hazard_state.forward_b.source})"
        
        # Select ALU operand B
        op_b = self.id_ex.immediate if self.id_ex.alu_src else op_b_reg
        
        print(f"\n🟡 EX STAGE: Executing '{self.id_ex.assembly}'")
        print(f"   ALU: {op_a}{forward_a_msg} {self.id_ex.alu_op} {op_b}{forward_b_msg}")
        
        # Execute ALU operation
        alu_result = alu_execute(
            op_a, op_b, 
            self.id_ex.alu_op,
            self.id_ex.pc,
            self.id_ex.immediate
        )
        
        print(f"   Result: {alu_result.result}, Zero: {alu_result.zero}")
        
        # Update ALU state for visualization
        self.alu_state = {
            "operandA": op_a,
            "operandB": op_b,
            "operation": self.id_ex.alu_op,
            "result": alu_result.result,
            "zero": alu_result.zero
        }
        
        # Calculate branch target
        branch_target = self.id_ex.pc + self.id_ex.immediate
        
        # Evaluate branch condition
        branch_taken = False
        if self.id_ex.branch:
            branch_taken = branch_evaluate(op_a, op_b_reg, self.id_ex.funct3)
        
        # Handle jumps
        if self.id_ex.jump:
            if self.id_ex.alu_op == "JAL":
                self.pc = (self.id_ex.pc + self.id_ex.immediate) & 0xFFFFFFFF
                self.flush = True
            elif self.id_ex.alu_op == "JALR":
                self.pc = (op_a + self.id_ex.immediate) & 0xFFFFFFFE
                self.flush = True
        elif branch_taken:
            self.pc = branch_target & 0xFFFFFFFF
            self.flush = True
        else:
            self.flush = False
        
        self.ex_mem = EX_MEM_Register(
            instruction=self.id_ex.instruction,
            pc=self.id_ex.pc,
            valid=True,
            rd=self.id_ex.rd,
            rs2_value=op_b_reg,
            alu_result=alu_result.result,
            zero=alu_result.zero,
            branch_target=branch_target,
            branch_taken=branch_taken,
            reg_write=self.id_ex.reg_write,
            mem_read=self.id_ex.mem_read,
            mem_write=self.id_ex.mem_write,
            mem_to_reg=self.id_ex.mem_to_reg,
            branch=self.id_ex.branch,
            jump=self.id_ex.jump,
            assembly=self.id_ex.assembly
        )
    
    def _memory_stage(self):
        """MEM Stage: Memory access"""
        if not self.ex_mem.valid:
            self.mem_wb = MEM_WB_Register(valid=False)
            return
        
        mem_data = None
        
        print(f"\n🔵 MEM STAGE: Processing '{self.ex_mem.assembly}'")
        
        if self.ex_mem.mem_read:
            # Load instruction
            mem_data = self.data_mem.read_word(self.ex_mem.alu_result)
            print(f"   Memory Read: addr=0x{self.ex_mem.alu_result:08X}, data={mem_data}")
        
        if self.ex_mem.mem_write:
            # Store instruction
            self.data_mem.write_word(self.ex_mem.alu_result, self.ex_mem.rs2_value)
            print(f"   Memory Write: addr=0x{self.ex_mem.alu_result:08X}, data={self.ex_mem.rs2_value}")
        
        if not self.ex_mem.mem_read and not self.ex_mem.mem_write:
            print(f"   No memory operation")
        
        self.mem_wb = MEM_WB_Register(
            instruction=self.ex_mem.instruction,
            pc=self.ex_mem.pc,
            valid=True,
            rd=self.ex_mem.rd,
            alu_result=self.ex_mem.alu_result,
            mem_data=mem_data,
            reg_write=self.ex_mem.reg_write,
            mem_to_reg=self.ex_mem.mem_to_reg,
            assembly=self.ex_mem.assembly
        )
    
    def _writeback_stage(self):
        """WB Stage: Write back to register file"""
        if not self.mem_wb.valid or not self.mem_wb.reg_write:
            if self.mem_wb.valid:
                print(f"\n🟣 WB STAGE: Processing '{self.mem_wb.assembly}' (no writeback)")
            return
        
        if self.mem_wb.rd == 0:
            print(f"\n🟣 WB STAGE: Processing '{self.mem_wb.assembly}' (writing to x0, ignored)")
            return
        
        # Select write data
        write_data = self.mem_wb.mem_data if self.mem_wb.mem_to_reg else self.mem_wb.alu_result
        
        print(f"\n🟣 WB STAGE: Processing '{self.mem_wb.assembly}'")
        print(f"   Writing x{self.mem_wb.rd} = {write_data}")
        
        # Write to register file
        self.registers.write(self.mem_wb.rd, write_data)
    
    def _insert_bubble(self):
        """Insert bubble (NOP) due to stall"""
        self.id_ex = ID_EX_Register(
            instruction=0x00000013,
            assembly="nop (bubble)",
            valid=False
        )
    
    def get_state(self) -> dict:
        """Return complete CPU state for API"""
        # Calculate execution time (in seconds)
        execution_time = self.cycle / self.clock_frequency if self.clock_frequency > 0 else 0
        
        return {
            "cycle": self.cycle,
            "pc": self.pc,
            "halted": self.halted,
            "stall": self.stall,
            "flush": self.flush,
            "registers": self.registers.get_state(),
            "pipeline": {
                "IF_ID": self.if_id.to_dict(),
                "ID_EX": self.id_ex.to_dict(),
                "EX_MEM": self.ex_mem.to_dict(),
                "MEM_WB": self.mem_wb.to_dict()
            },
            "alu": self.alu_state,
            "hazards": self.hazard_state.to_dict(),
            "instructionMemory": self.instr_mem.get_all(),
            "statistics": {
                "total_cycles": self.cycle,
                "execution_time_seconds": execution_time,
                "stage_cycles": self.stage_cycles
            }
        }

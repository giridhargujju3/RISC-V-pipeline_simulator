# RISC-V Hazard Detection and Forwarding Unit

from dataclasses import dataclass
from typing import Optional, List
from .pipeline_regs import ID_EX_Register, EX_MEM_Register, MEM_WB_Register

@dataclass
class ForwardPath:
    """Forwarding path information"""
    source: str  # "EX_MEM" or "MEM_WB"
    register: int
    value: int


@dataclass
class HazardInfo:
    """Information about detected hazards"""
    type: str  # "RAW", "LOAD-USE", "CONTROL"
    source: str
    destination: str
    resolution: str  # "FORWARD", "STALL", "FLUSH"
    description: str


@dataclass
class HazardState:
    """Current hazard detection state"""
    raw_hazard: bool = False
    forward_a: Optional[ForwardPath] = None
    forward_b: Optional[ForwardPath] = None
    stall_required: bool = False
    flush_required: bool = False
    hazard_details: List[HazardInfo] = None
    
    def __post_init__(self):
        if self.hazard_details is None:
            self.hazard_details = []
    
    def to_dict(self) -> dict:
        return {
            "rawHazard": self.raw_hazard,
            "forwardA": {
                "from": self.forward_a.source,
                "register": self.forward_a.register,
                "value": self.forward_a.value
            } if self.forward_a else None,
            "forwardB": {
                "from": self.forward_b.source,
                "register": self.forward_b.register,
                "value": self.forward_b.value
            } if self.forward_b else None,
            "stallRequired": self.stall_required,
            "hazardDetails": [
                {
                    "type": h.type,
                    "source": h.source,
                    "destination": h.destination,
                    "resolution": h.resolution,
                    "description": h.description
                }
                for h in self.hazard_details
            ]
        }


class HazardUnit:
    """Hazard detection and forwarding unit"""
    
    def detect_hazards(
        self,
        if_id_rs1: int,
        if_id_rs2: int,
        id_ex: ID_EX_Register,
        ex_mem: EX_MEM_Register,
        mem_wb: MEM_WB_Register
    ) -> HazardState:
        """Detect data hazards and determine forwarding/stalling"""
        
        hazard_state = HazardState()
        
        # Check for load-use hazard (requires stall)
        if id_ex.valid and id_ex.mem_read and id_ex.rd != 0:
            if if_id_rs1 == id_ex.rd or if_id_rs2 == id_ex.rd:
                hazard_state.stall_required = True
                hazard_state.hazard_details.append(HazardInfo(
                    type="LOAD-USE",
                    source=f"ID/EX load (x{id_ex.rd})",
                    destination="IF/ID",
                    resolution="STALL",
                    description=f"Load-use hazard: waiting for load to x{id_ex.rd}"
                ))
                return hazard_state
        
        # Forwarding from EX/MEM
        if ex_mem.valid and ex_mem.reg_write and ex_mem.rd != 0:
            if id_ex.rs1 == ex_mem.rd:
                hazard_state.forward_a = ForwardPath(
                    source="EX_MEM",
                    register=ex_mem.rd,
                    value=ex_mem.alu_result
                )
                hazard_state.raw_hazard = True
                hazard_state.hazard_details.append(HazardInfo(
                    type="RAW",
                    source=f"EX/MEM (x{ex_mem.rd})",
                    destination="ID/EX rs1",
                    resolution="FORWARD",
                    description=f"Forwarding x{ex_mem.rd} = {ex_mem.alu_result} from EX/MEM to rs1"
                ))
            
            if id_ex.rs2 == ex_mem.rd:
                hazard_state.forward_b = ForwardPath(
                    source="EX_MEM",
                    register=ex_mem.rd,
                    value=ex_mem.alu_result
                )
                hazard_state.raw_hazard = True
                hazard_state.hazard_details.append(HazardInfo(
                    type="RAW",
                    source=f"EX/MEM (x{ex_mem.rd})",
                    destination="ID/EX rs2",
                    resolution="FORWARD",
                    description=f"Forwarding x{ex_mem.rd} = {ex_mem.alu_result} from EX/MEM to rs2"
                ))
        
        # Forwarding from MEM/WB (lower priority than EX/MEM)
        if mem_wb.valid and mem_wb.reg_write and mem_wb.rd != 0:
            wb_value = mem_wb.mem_data if mem_wb.mem_to_reg else mem_wb.alu_result
            
            if id_ex.rs1 == mem_wb.rd and hazard_state.forward_a is None:
                hazard_state.forward_a = ForwardPath(
                    source="MEM_WB",
                    register=mem_wb.rd,
                    value=wb_value
                )
                hazard_state.raw_hazard = True
                hazard_state.hazard_details.append(HazardInfo(
                    type="RAW",
                    source=f"MEM/WB (x{mem_wb.rd})",
                    destination="ID/EX rs1",
                    resolution="FORWARD",
                    description=f"Forwarding x{mem_wb.rd} = {wb_value} from MEM/WB to rs1"
                ))
            
            if id_ex.rs2 == mem_wb.rd and hazard_state.forward_b is None:
                hazard_state.forward_b = ForwardPath(
                    source="MEM_WB",
                    register=mem_wb.rd,
                    value=wb_value
                )
                hazard_state.raw_hazard = True
                hazard_state.hazard_details.append(HazardInfo(
                    type="RAW",
                    source=f"MEM/WB (x{mem_wb.rd})",
                    destination="ID/EX rs2",
                    resolution="FORWARD",
                    description=f"Forwarding x{mem_wb.rd} = {wb_value} from MEM/WB to rs2"
                ))
        
        return hazard_state

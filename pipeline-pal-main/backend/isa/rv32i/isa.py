from isa.rv32i.decoder import decode
from isa.rv32i.semantics import execute
from isa.rv32i.registers import RegisterFile

class ISA:
    ISA_NAME = "rv32i"
    XLEN = 32

    def decode(self, bits):
        return decode(bits)

    def execute(self, instr, regs):
        return execute(instr, regs)

    def create_register_file(self):
        return RegisterFile()

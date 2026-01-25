from isa.rv64i.decoder import decode
from isa.rv64i.semantics import execute
from isa.rv64i.registers import RegisterFile

class ISA:
    ISA_NAME = "rv64i"
    XLEN = 64

    def decode(self, bits):
        return decode(bits)

    def execute(self, instr, regs):
        return execute(instr, regs)

    def create_register_file(self):
        return RegisterFile()

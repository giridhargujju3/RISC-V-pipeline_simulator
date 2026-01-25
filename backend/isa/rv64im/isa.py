from isa.rv64im.decoder import decode
from isa.rv64im.semantics import execute
from isa.rv64im.registers import RegisterFile

class ISA:
    ISA_NAME = "rv64im"
    XLEN = 64

    def decode(self, bits):
        return decode(bits)

    def execute(self, instr, regs):
        return execute(instr, regs)

    def create_register_file(self):
        return RegisterFile()

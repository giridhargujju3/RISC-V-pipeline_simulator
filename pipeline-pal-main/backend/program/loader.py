class Program:
    def __init__(self, instructions_list=None):
        self.mem = {}
        self.end = 0
        if instructions_list:
            self._load_from_list(instructions_list)
    
    def _load_from_list(self, instructions):
        """Load instructions from list of integers"""
        addr = 0
        for instr in instructions:
            self.mem[addr] = instr & 0xFFFFFFFF
            addr += 4
        self.end = addr
    
    def load_from_file(self, filename):
        """Load instructions from binary file"""
        with open(filename, "rb") as f:
            addr = 0
            while True:
                word = f.read(4)
                if len(word) < 4:
                    break
                self.mem[addr] = int.from_bytes(word, "little")
                addr += 4
        self.end = addr

    def load_word(self, addr):
        return self.mem.get(addr, 0)
    
    def get_all_instructions(self):
        """Get all instructions as list"""
        result = []
        addr = 0
        while addr < self.end:
            result.append(self.mem.get(addr, 0))
            addr += 4
        return result

class Program:
    """
    Program loader for RISC-V binary machine code
    Stores instructions in memory dictionary indexed by address
    """
    
    def __init__(self, instructions_list=None, binary_data=None):
        self.mem = {}
        self.end = 0
        
        if binary_data is not None:
            self._load_from_binary(binary_data)
        elif instructions_list:
            self._load_from_list(instructions_list)
    
    def _load_from_binary(self, binary_data):
        """
        Load program from binary data
        
        Args:
            binary_data: Raw bytes from compiled binary
        """
        addr = 0
        
        # Read 4 bytes at a time (32-bit instructions)
        for i in range(0, len(binary_data), 4):
            if i + 4 <= len(binary_data):
                word = binary_data[i:i+4]
                # Convert from little-endian bytes to 32-bit integer
                instr = int.from_bytes(word, byteorder='little')
                self.mem[addr] = instr
                addr += 4
        
        self.end = addr
    
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
        """Load 32-bit instruction from memory at address"""
        return self.mem.get(addr, 0)
    
    def get_instructions(self):
        """Get list of all loaded instructions in order"""
        instructions = []
        for addr in sorted(self.mem.keys()):
            instructions.append(self.mem[addr])
        return instructions
    
    def get_size(self):
        """Get program size in bytes"""
        return self.end
    
    def get_instruction_count(self):
        """Get number of instructions"""
        return len(self.mem)
    
    def get_all_instructions(self):
        """Get all instructions as list"""
        result = []
        addr = 0
        while addr < self.end:
            result.append(self.mem.get(addr, 0))
            addr += 4
        return result

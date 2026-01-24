class RegisterFile:
    def __init__(self):
        self.regs = [0] * 32

    def read(self, idx):
        return 0 if idx == 0 else self.regs[idx]

    def write(self, idx, val):
        if idx != 0:
            self.regs[idx] = val & 0xFFFFFFFF
    
    def get_all(self):
        """Get all register values"""
        return self.regs.copy()

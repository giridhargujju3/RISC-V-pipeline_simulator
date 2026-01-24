class CoreBase:
    SUPPORTED_ISA = []
    XLEN = None

    def __init__(self, config, stats, program, isa, regs):
        self.config = config
        self.stats = stats
        self.program = program
        self.isa = isa
        self.regs = regs
        self.cycle = 0

    def tick(self):
        raise NotImplementedError

    def is_done(self):
        raise NotImplementedError

    def report_activity(self):
        return {}

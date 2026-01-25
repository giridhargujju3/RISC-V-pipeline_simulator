class Clock:
    def __init__(self, core, stats):
        self.core = core
        self.stats = stats

    def run(self):
        while not self.core.is_done():
            self.core.tick()
            self.stats.tick(self.core.report_activity())

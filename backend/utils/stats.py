class Stats:
    def __init__(self):
        self.total = 0
        self.stage = {}

    def tick(self, activity):
        self.total += 1
        for k, v in activity.items():
            if v:
                self.stage[k] = self.stage.get(k, 0) + 1

    def report(self, freq):
        print(f"\nTotal cycles: {self.total}")
        print(f"Execution time: {self.total / freq:.6e}s")
        print("Stage cycles:")
        for k, v in self.stage.items():
            print(f"  {k}: {v}")

import { BarChart3, Clock, Zap } from 'lucide-react';
import { CPUState } from '@/types/cpu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ExecutionStatsProps {
  state: CPUState;
}

export function ExecutionStats({ state }: ExecutionStatsProps) {
  const stats = state.statistics;

  // Debug log
  console.log('ExecutionStats - state.cycle:', state.cycle, 'stats:', stats);

  if (!stats && state.cycle === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4">
        <div className="flex items-center gap-3 mb-3">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Execution Statistics</h2>
        </div>
        <div className="text-center text-muted-foreground text-xs py-4">
          Start execution to see statistics
        </div>
      </div>
    );
  }

  // If we have cycle data but no stats object, create a basic stats object
  const displayStats = stats || {
    total_cycles: state.cycle,
    execution_time_seconds: (state.cycle / 1e9),
    stage_cycles: {
      IF: Math.max(0, state.cycle - 1),
      ID: Math.max(0, state.cycle - 2),
      EX: Math.max(0, state.cycle - 3),
      MEM: Math.max(0, state.cycle - 4),
      WB: Math.max(0, state.cycle - 5)
    }
  };

  // Format execution time
  const formatTime = (seconds: number) => {
    if (seconds === 0) return '0 ns';
    if (seconds < 1e-6) return `${(seconds * 1e9).toFixed(2)} ns`;
    if (seconds < 1e-3) return `${(seconds * 1e6).toFixed(2)} µs`;
    if (seconds < 1) return `${(seconds * 1e3).toFixed(2)} ms`;
    return `${seconds.toFixed(6)} s`;
  };

  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Execution Statistics</h2>
        </div>

        <div className="space-y-4">
          {/* Total Cycles */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50 cursor-help">
                <div className="text-xs text-muted-foreground mb-1">Total Cycles</div>
                <div className="text-lg font-bold text-primary">{displayStats.total_cycles}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total number of clock cycles executed</p>
            </TooltipContent>
          </Tooltip>

          {/* Execution Time */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50 cursor-help">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3 h-3 text-accent" />
                  <span className="text-xs text-muted-foreground">Execution Time</span>
                </div>
                <div className="text-lg font-bold text-accent font-mono">{formatTime(displayStats.execution_time_seconds)}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total execution time at 1 GHz clock frequency</p>
            </TooltipContent>
          </Tooltip>

          {/* Stage Cycles */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-success" />
              <span className="text-xs font-semibold text-foreground">Stage Cycles</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(displayStats.stage_cycles).map(([stage, cycles]) => (
                <Tooltip key={stage}>
                  <TooltipTrigger asChild>
                    <div className="bg-secondary/20 rounded p-2 border border-border/30 text-center cursor-help hover:bg-secondary/30 transition-colors">
                      <div className="text-[10px] text-muted-foreground mb-1">{stage}</div>
                      <div className="text-sm font-bold text-foreground">{cycles}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cycles this stage was active</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Pipeline Utilization */}
          {displayStats.total_cycles > 0 && (
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
              <div className="text-xs text-muted-foreground mb-2">Pipeline Utilization</div>
              <div className="space-y-1">
                {Object.entries(displayStats.stage_cycles).map(([stage, cycles]) => {
                  const utilization = ((cycles / displayStats.total_cycles) * 100).toFixed(1);
                  return (
                    <div key={stage} className="flex items-center justify-between text-[10px]">
                      <span className="text-foreground font-semibold">{stage}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-secondary/50 rounded overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                            style={{ width: `${utilization}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground w-8 text-right">{utilization}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

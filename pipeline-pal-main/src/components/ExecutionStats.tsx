import { BarChart3, Clock, ChevronRight } from 'lucide-react';
import { CPUState } from '@/types/cpu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ExecutionStatsProps {
  state: CPUState;
  onDetails?: () => void;
}

export function ExecutionStats({ state, onDetails }: ExecutionStatsProps) {
  const stats = state.statistics;

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

  // Create display stats
  const displayStats = stats || {
    total_cycles: state.cycle,
    execution_time_seconds: (state.cycle / 1e9),
    stage_cycles: {
      IF: Math.max(0, state.cycle - 0),
      ID: Math.max(0, state.cycle - 1),
      EX: Math.max(0, state.cycle - 2),
      MEM: Math.max(0, state.cycle - 3),
      WB: Math.max(0, state.cycle - 4)
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Execution Statistics</h2>
          </div>
          {onDetails && (
            <button
              onClick={onDetails}
              className="p-1.5 hover:bg-secondary rounded transition-colors group"
              aria-label="View detailed statistics"
              title="View detailed statistics"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Total Cycles - Summary */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-secondary/30 rounded-lg p-2 sm:p-3 border border-border/50 cursor-help">
                <div className="text-xs text-muted-foreground">Total Cycles</div>
                <div className="text-xl sm:text-2xl font-bold text-primary">{displayStats.total_cycles}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total number of clock cycles executed</p>
            </TooltipContent>
          </Tooltip>

          {/* Execution Time - Summary */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-secondary/30 rounded-lg p-2 sm:p-3 border border-border/50 cursor-help">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-accent" />
                  <span className="text-xs text-muted-foreground">Execution Time</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-accent font-mono mt-1">{formatTime(displayStats.execution_time_seconds)}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total execution time at 1 GHz clock frequency</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

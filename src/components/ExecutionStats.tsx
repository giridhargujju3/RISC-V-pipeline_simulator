import { BarChart3, Clock, ChevronRight, Cpu, AlertTriangle, CheckCircle } from 'lucide-react';
import { CPUState } from '@/types/cpu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ExpandModal } from '@/components/ExpandModal';

interface ExecutionStatsProps {
  state: CPUState;
  onDetails?: () => void;
}

export function ExecutionStats({ state, onDetails }: ExecutionStatsProps) {
  const stats = state.statistics;
  const hs = state.hazardStats;

  if (!stats && state.cycle === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Execution Statistics</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
          Start execution to see statistics
        </div>
      </div>
    );
  }

  const displayStats = stats || {
    total_cycles: state.cycle,
    execution_time_seconds: state.cycle / 1e9,
    cpi: 0,
    instructions_completed: 0,
    stage_cycles: {
      IF: Math.max(0, state.cycle),
      ID: Math.max(0, state.cycle - 1),
      EX: Math.max(0, state.cycle - 2),
      MEM: Math.max(0, state.cycle - 3),
      WB: Math.max(0, state.cycle - 4),
    },
  };

  const formatTime = (seconds: number) => {
    if (seconds === 0) return '0 ns';
    if (seconds < 1e-6) return `${(seconds * 1e9).toFixed(2)} ns`;
    if (seconds < 1e-3) return `${(seconds * 1e6).toFixed(2)} µs`;
    if (seconds < 1) return `${(seconds * 1e3).toFixed(2)} ms`;
    return `${seconds.toFixed(6)} s`;
  };

  const cpi = displayStats.cpi ?? 0;
  const cpiColor =
    cpi === 0 ? 'text-muted-foreground' :
    cpi <= 1.2 ? 'text-success' :
    cpi <= 2.0 ? 'text-warning' : 'text-destructive';

  const totalHazards = hs
    ? hs.raw_hazards + hs.war_hazards + hs.waw_hazards +
      hs.structural_hazards + hs.memory_hazards + hs.control_hazards
    : 0;

  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4 h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Execution Statistics</h2>
          </div>
          <div className="flex items-center gap-1">
            {onDetails && (
              <button
                onClick={onDetails}
                className="p-1.5 hover:bg-secondary rounded transition-colors group"
                aria-label="View detailed statistics"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            )}
            <ExpandModal title="Execution Statistics">
              <div className="h-full overflow-y-auto space-y-4 pr-1">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                    <div className="text-xs text-muted-foreground">Total Cycles</div>
                    <div className="text-3xl font-bold text-primary font-mono mt-1">{displayStats.total_cycles}</div>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                    <div className="text-xs text-muted-foreground">Execution Time</div>
                    <div className="text-3xl font-bold text-accent font-mono mt-1">{formatTime(displayStats.execution_time_seconds)}</div>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                    <div className="text-xs text-muted-foreground">CPI</div>
                    <div className={cn("text-3xl font-bold font-mono mt-1", cpiColor)}>{cpi > 0 ? cpi.toFixed(3) : '—'}</div>
                    <div className="text-xs text-muted-foreground mt-1">{cpi <= 1.2 ? 'Excellent' : cpi <= 2.0 ? 'Good' : cpi > 0 ? 'High stalls' : ''}</div>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                    <div className="text-xs text-muted-foreground">Instructions Completed</div>
                    <div className="text-3xl font-bold text-success font-mono mt-1">{displayStats.instructions_completed ?? 0}</div>
                  </div>
                </div>
                {hs && (
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'RAW Hazards',        value: hs.raw_hazards,        color: 'text-warning' },
                      { label: 'WAR Hazards',        value: hs.war_hazards,        color: 'text-orange-400' },
                      { label: 'WAW Hazards',        value: hs.waw_hazards,        color: 'text-purple-400' },
                      { label: 'Structural',         value: hs.structural_hazards, color: 'text-blue-400' },
                      { label: 'Memory Hazards',     value: hs.memory_hazards,     color: 'text-cyan-400' },
                      { label: 'Control Hazards',    value: hs.control_hazards,    color: 'text-primary' },
                      { label: 'Total Stall Cycles', value: hs.total_stall_cycles, color: 'text-destructive' },
                      { label: 'Total Hazards',      value: totalHazards,          color: 'text-warning' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                        <div className="text-xs text-muted-foreground">{label}</div>
                        <div className={cn("text-2xl font-bold font-mono mt-1", color)}>{value}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-foreground">Stage Cycle Breakdown</div>
                  <div className="grid grid-cols-5 gap-3">
                    {(['IF', 'ID', 'EX', 'MEM', 'WB'] as const).map(stage => {
                      const val = displayStats.stage_cycles?.[stage] ?? 0;
                      const pct = displayStats.total_cycles > 0 ? Math.min(100, Math.round((val / displayStats.total_cycles) * 100)) : 0;
                      return (
                        <div key={stage} className="bg-secondary/30 rounded-lg p-3 border border-border/50 text-center">
                          <div className="text-sm font-bold text-foreground">{stage}</div>
                          <div className="text-2xl font-mono text-primary mt-1">{val}</div>
                          <div className="bg-secondary/50 rounded h-2 mt-2 overflow-hidden">
                            <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{pct}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </ExpandModal>
          </div>
        </div>

        {/* Top row: Cycles + Time */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-secondary/30 rounded-lg p-2 border border-border/50 cursor-help">
                <div className="text-[10px] text-muted-foreground">Total Cycles</div>
                <div className="text-xl font-bold text-primary font-mono">{displayStats.total_cycles}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent><p>Total number of clock cycles executed</p></TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-secondary/30 rounded-lg p-2 border border-border/50 cursor-help">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-accent" />
                  <span className="text-[10px] text-muted-foreground">Exec Time</span>
                </div>
                <div className="text-xl font-bold text-accent font-mono mt-0.5">
                  {formatTime(displayStats.execution_time_seconds)}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent><p>Total execution time at 1 GHz clock frequency</p></TooltipContent>
          </Tooltip>
        </div>

        {/* Second row: CPI + Instructions */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-secondary/30 rounded-lg p-2 border border-border/50 cursor-help">
                <div className="flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">CPI</span>
                </div>
                <div className={cn("text-xl font-bold font-mono mt-0.5", cpiColor)}>
                  {cpi > 0 ? cpi.toFixed(2) : '—'}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {cpi <= 1.2 ? 'Excellent' : cpi <= 2.0 ? 'Good' : cpi > 0 ? 'High stalls' : ''}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cycles Per Instruction. Lower is better. 1.0 = perfect pipeline.</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-secondary/30 rounded-lg p-2 border border-border/50 cursor-help">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-success" />
                  <span className="text-[10px] text-muted-foreground">Completed</span>
                </div>
                <div className="text-xl font-bold text-success font-mono mt-0.5">
                  {displayStats.instructions_completed ?? 0}
                </div>
                <div className="text-[9px] text-muted-foreground">instructions</div>
              </div>
            </TooltipTrigger>
            <TooltipContent><p>Instructions that have completed the WB stage</p></TooltipContent>
          </Tooltip>
        </div>

        {/* Stall + Hazard summary */}
        {hs && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-secondary/30 rounded-lg p-2 border border-border/50 cursor-help">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-warning" />
                    <span className="text-[10px] text-muted-foreground">Total Hazards</span>
                  </div>
                  <div className="text-xl font-bold text-warning font-mono mt-0.5">{totalHazards}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-0.5">
                  <div>RAW: {hs.raw_hazards}</div>
                  <div>WAR: {hs.war_hazards}</div>
                  <div>WAW: {hs.waw_hazards}</div>
                  <div>Structural: {hs.structural_hazards}</div>
                  <div>Memory: {hs.memory_hazards}</div>
                  <div>Control: {hs.control_hazards}</div>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-secondary/30 rounded-lg p-2 border border-border/50 cursor-help">
                  <div className="text-[10px] text-muted-foreground">Stall Cycles</div>
                  <div className="text-xl font-bold text-destructive font-mono mt-0.5">
                    {hs.total_stall_cycles}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent><p>Total cycles lost to pipeline stalls (load-use hazards)</p></TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Stage utilization bar */}
        <div className="space-y-1">
          <div className="text-[10px] text-muted-foreground">Stage Cycles</div>
          <div className="grid grid-cols-5 gap-1">
            {(['IF', 'ID', 'EX', 'MEM', 'WB'] as const).map(stage => {
              const val = displayStats.stage_cycles?.[stage] ?? 0;
              const pct = displayStats.total_cycles > 0
                ? Math.min(100, Math.round((val / displayStats.total_cycles) * 100))
                : 0;
              return (
                <div key={stage} className="text-center">
                  <div className="text-[9px] text-muted-foreground mb-0.5">{stage}</div>
                  <div className="bg-secondary/50 rounded h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[9px] font-mono text-foreground mt-0.5">{val}</div>
                </div>
              );
            })}
          </div>
        </div>
        </div>{/* end scrollable content */}
      </div>{/* end outer card */}
    </TooltipProvider>
  );
}

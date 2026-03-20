import { AlertTriangle, ArrowRight, Pause, Zap, HelpCircle, GitMerge, Layers, MemoryStick, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CPUState, HazardStats } from '@/types/cpu';
import { ExpandModal } from '@/components/ExpandModal';

interface HazardPanelProps {
  state: CPUState;
}

const HAZARD_TYPE_COLORS: Record<string, string> = {
  RAW:        'bg-warning/20 text-warning',
  'LOAD-USE': 'bg-destructive/20 text-destructive',
  CONTROL:    'bg-primary/20 text-primary',
  WAR:        'bg-orange-500/20 text-orange-400',
  WAW:        'bg-purple-500/20 text-purple-400',
  STRUCTURAL: 'bg-blue-500/20 text-blue-400',
  MEMORY:     'bg-cyan-500/20 text-cyan-400',
};

const RESOLUTION_COLORS: Record<string, string> = {
  FORWARD: 'bg-success/20 text-success',
  STALL:   'bg-destructive/20 text-destructive',
  FLUSH:   'bg-primary/20 text-primary',
  TRACKED: 'bg-muted text-muted-foreground',
};

export function HazardPanel({ state }: HazardPanelProps) {
  const hazards = state.hazards;
  const hs: HazardStats | undefined = state.hazardStats;

  const hasActiveHazard =
    hazards?.rawHazard || hazards?.warHazard || hazards?.wawHazard ||
    hazards?.structuralHazard || hazards?.memoryHazard || hazards?.controlHazard ||
    hazards?.stallRequired;
  const hasForwarding = hazards?.forwardA || hazards?.forwardB;

  const anyHazardThisCycle =
    hazards?.rawHazard || hazards?.warHazard || hazards?.wawHazard ||
    hazards?.structuralHazard || hazards?.memoryHazard || hazards?.controlHazard;

  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4 h-[300px] flex flex-col">
        <div className="panel-header mb-2">
          <AlertTriangle className={cn(
            "w-4 h-4",
            hasActiveHazard ? "text-warning" : "text-muted-foreground"
          )} />
          <h2 className="panel-title">Hazard Detection Unit</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help ml-1" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                Detects all 6 hazard types: RAW, WAR, WAW, Structural, Memory, Control.<br />
                <strong>Forwarding</strong>: Pass data between stages.<br />
                <strong>Stalling</strong>: Insert bubble for load-use.<br />
                <strong>Tracked</strong>: In-order safe, counted for analysis.
              </p>
            </TooltipContent>
          </Tooltip>
          {hasActiveHazard && (
            <span className="ml-auto text-[10px] font-semibold text-warning bg-warning/20 px-2 py-0.5 rounded animate-pulse">
              HAZARD DETECTED
            </span>
          )}
          <ExpandModal title="Hazard Detection Unit — Full Details">
            <ScrollArea className="h-full">
              <div className="space-y-4 pr-2">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'rawHazard',        label: 'RAW',        color: 'text-warning',     desc: 'Read After Write' },
                    { key: 'warHazard',        label: 'WAR',        color: 'text-orange-400',  desc: 'Write After Read' },
                    { key: 'wawHazard',        label: 'WAW',        color: 'text-purple-400',  desc: 'Write After Write' },
                    { key: 'structuralHazard', label: 'STRUCTURAL', color: 'text-blue-400',    desc: 'Resource conflict' },
                    { key: 'memoryHazard',     label: 'MEMORY',     color: 'text-cyan-400',    desc: 'Memory port conflict' },
                    { key: 'controlHazard',    label: 'CONTROL',    color: 'text-primary',     desc: 'Branch/jump flush' },
                  ] as const).map(({ key, label, color, desc }) => {
                    const active = !!(hazards as any)?.[key];
                    return (
                      <div key={key} className={cn(
                        "p-3 rounded-lg border transition-all",
                        active ? `border-warning/40 bg-warning/10` : "border-border/30 bg-secondary/20"
                      )}>
                        <div className={cn("text-sm font-bold mb-0.5", active ? color : "text-muted-foreground")}>{label}</div>
                        <div className="text-xs text-muted-foreground">{desc}</div>
                        <div className={cn("text-xs font-mono font-bold mt-1", active ? color : "text-muted-foreground/50")}>{active ? 'ACTIVE' : 'NONE'}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ForwardingIndicator label="Forward A (rs1)" forward={hazards?.forwardA} rs={state.ID_EX.rs1} />
                  <ForwardingIndicator label="Forward B (rs2)" forward={hazards?.forwardB} rs={state.ID_EX.rs2} />
                </div>

                {hs && (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">Cumulative Statistics</div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      {[
                        { label: 'RAW Hazards',        value: hs.raw_hazards,            color: 'text-warning' },
                        { label: 'WAR Hazards',        value: hs.war_hazards,            color: 'text-orange-400' },
                        { label: 'WAW Hazards',        value: hs.waw_hazards,            color: 'text-purple-400' },
                        { label: 'Structural',         value: hs.structural_hazards,     color: 'text-blue-400' },
                        { label: 'Memory',             value: hs.memory_hazards,         color: 'text-cyan-400' },
                        { label: 'Control',            value: hs.control_hazards,        color: 'text-primary' },
                        { label: 'Branch Flushes',     value: hs.branch_flushes,         color: 'text-destructive' },
                        { label: 'Stall Cycles',       value: hs.total_stall_cycles,     color: 'text-destructive' },
                        { label: 'Completed Instrs',   value: hs.completed_instructions, color: 'text-success' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-secondary/30 rounded-lg p-2 border border-border/30">
                          <div className="text-xs text-muted-foreground">{label}</div>
                          <div className={cn("text-base font-bold font-mono", color)}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hazards?.hazardDetails && hazards.hazardDetails.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">Active Hazard Details</div>
                    {hazards.hazardDetails.map((detail, i) => (
                      <div key={i} className="flex flex-wrap items-start gap-2 p-3 bg-warning/10 rounded-lg border border-warning/30 text-sm">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", HAZARD_TYPE_COLORS[detail.type] || 'bg-muted text-foreground')}>{detail.type}</span>
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground mb-0.5">{detail.source} → {detail.destination}</div>
                          <div className="text-xs text-foreground">{detail.description}</div>
                        </div>
                        <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", RESOLUTION_COLORS[detail.resolution] || '')}>{detail.resolution}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </ExpandModal>
        </div>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="space-y-2 pr-2">

            {/* Current-cycle hazard flags row */}
            <div className="grid grid-cols-3 gap-1">
              {([
                { key: 'rawHazard',        label: 'RAW',        color: 'text-warning' },
                { key: 'warHazard',        label: 'WAR',        color: 'text-orange-400' },
                { key: 'wawHazard',        label: 'WAW',        color: 'text-purple-400' },
                { key: 'structuralHazard', label: 'STRUCT',     color: 'text-blue-400' },
                { key: 'memoryHazard',     label: 'MEM',        color: 'text-cyan-400' },
                { key: 'controlHazard',    label: 'CTRL',       color: 'text-primary' },
              ] as const).map(({ key, label, color }) => {
                const active = !!(hazards as any)?.[key];
                return (
                  <div key={key} className={cn(
                    "flex items-center justify-between px-2 py-1 rounded border text-[10px] font-mono transition-all",
                    active
                      ? `border-warning/40 bg-warning/10 ${color}`
                      : "border-border/30 bg-secondary/20 text-muted-foreground"
                  )}>
                    <span>{label}</span>
                    <span className="font-bold">{active ? '●' : '○'}</span>
                  </div>
                );
              })}
            </div>

            {/* Forwarding paths */}
            <div className="grid grid-cols-2 gap-2">
              <ForwardingIndicator
                label="Forward A (rs1)"
                forward={hazards?.forwardA}
                rs={state.ID_EX.rs1}
              />
              <ForwardingIndicator
                label="Forward B (rs2)"
                forward={hazards?.forwardB}
                rs={state.ID_EX.rs2}
              />
            </div>

            {/* Stall indicator */}
            <div className={cn(
              "flex items-center justify-between p-2 rounded-lg border transition-all",
              hazards?.stallRequired
                ? "bg-destructive/10 border-destructive/50"
                : "bg-secondary/30 border-border/50"
            )}>
              <div className="flex items-center gap-2">
                <Pause className={cn("w-3 h-3", hazards?.stallRequired ? "text-destructive" : "text-muted-foreground")} />
                <span className="text-xs font-medium">Pipeline Stall</span>
              </div>
              <span className={cn(
                "text-[10px] font-mono px-2 py-0.5 rounded",
                hazards?.stallRequired ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"
              )}>
                {hazards?.stallRequired ? 'STALLING' : 'CLEAR'}
              </span>
            </div>

            {/* Cumulative hazard stats */}
            {hs && (
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">Cumulative Counts</span>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <StatBadge label="RAW"    value={hs.raw_hazards}        color="text-warning" />
                  <StatBadge label="WAR"    value={hs.war_hazards}        color="text-orange-400" />
                  <StatBadge label="WAW"    value={hs.waw_hazards}        color="text-purple-400" />
                  <StatBadge label="Struct" value={hs.structural_hazards} color="text-blue-400" />
                  <StatBadge label="Mem"    value={hs.memory_hazards}     color="text-cyan-400" />
                  <StatBadge label="Ctrl"   value={hs.control_hazards}    color="text-primary" />
                  <StatBadge label="Stalls" value={hs.total_stall_cycles} color="text-destructive" />
                  <StatBadge label="Done"   value={hs.completed_instructions} color="text-success" />
                </div>
              </div>
            )}

            {/* Active hazard details list */}
            {hazards?.hazardDetails && hazards.hazardDetails.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Active This Cycle:</span>
                {hazards.hazardDetails.map((detail, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center gap-1 text-[10px] p-1.5 bg-warning/10 rounded border border-warning/30"
                  >
                    <span className={cn("px-1 py-0.5 rounded text-[9px] font-semibold", HAZARD_TYPE_COLORS[detail.type] || 'bg-muted text-foreground')}>
                      {detail.type}
                    </span>
                    <span className="text-muted-foreground truncate max-w-[80px]">{detail.source}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-foreground truncate max-w-[80px]">{detail.destination}</span>
                    <span className={cn("ml-auto px-1 py-0.5 rounded text-[9px] font-semibold shrink-0", RESOLUTION_COLORS[detail.resolution] || '')}>
                      {detail.resolution}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!anyHazardThisCycle && !hasForwarding && (
              <div className="text-center py-3 text-[10px] text-muted-foreground">
                No hazards detected in current cycle
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}

interface ForwardingIndicatorProps {
  label: string;
  forward: { from: string; register: number; value: number } | null | undefined;
  rs: number | undefined;
}

function ForwardingIndicator({ label, forward, rs }: ForwardingIndicatorProps) {
  const isActive = !!forward;

  return (
    <div className={cn(
      "p-2 rounded-lg border transition-all",
      isActive ? "bg-success/10 border-success/50" : "bg-secondary/30 border-border/50"
    )}>
      <div className="flex items-center gap-1 mb-1">
        <Zap className={cn("w-3 h-3", isActive ? "text-success" : "text-muted-foreground")} />
        <span className="text-[10px] font-medium">{label}</span>
      </div>
      {isActive ? (
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">From:</span>
            <span className="font-mono text-success">{forward.from}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Reg:</span>
            <span className="font-mono text-foreground">x{forward.register}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Val:</span>
            <span className="font-mono text-foreground">{forward.value}</span>
          </div>
        </div>
      ) : (
        <div className="text-[10px] text-muted-foreground">
          {rs !== undefined ? `Reading x${rs}` : 'No source'}
        </div>
      )}
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between bg-secondary/30 rounded px-1.5 py-0.5 border border-border/30">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono font-bold", color)}>{value}</span>
    </div>
  );
}

import { HazardState, CPUState } from '@/types/cpu';
import { AlertTriangle, ArrowRight, Pause, Zap, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HazardPanelProps {
  state: CPUState;
}

export function HazardPanel({ state }: HazardPanelProps) {
  const hazards = state.hazards;
  const hasActiveHazard = hazards?.rawHazard || hazards?.stallRequired;
  const hasForwarding = hazards?.forwardA || hazards?.forwardB;

  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4">
        <div className="panel-header">
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
                Detects data hazards (RAW) and resolves them via: <br />
                <strong>Forwarding</strong>: Pass data directly between stages <br />
                <strong>Stalling</strong>: Insert bubble for load-use hazards
              </p>
            </TooltipContent>
          </Tooltip>
          {hasActiveHazard && (
            <span className="ml-auto text-[10px] sm:text-xs font-semibold text-warning bg-warning/20 px-2 py-0.5 rounded animate-pulse">
              HAZARD DETECTED
            </span>
          )}
        </div>

        <div className="space-y-3">
          {/* Forwarding Paths */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
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

          {/* Stall Indicator */}
          <div className={cn(
            "flex items-center justify-between p-2 sm:p-3 rounded-lg border transition-all duration-300",
            hazards?.stallRequired
              ? "bg-destructive/10 border-destructive/50"
              : "bg-secondary/30 border-border/50"
          )}>
            <div className="flex items-center gap-2">
              <Pause className={cn(
                "w-4 h-4",
                hazards?.stallRequired ? "text-destructive" : "text-muted-foreground"
              )} />
              <span className="text-xs font-medium">Pipeline Stall</span>
            </div>
            <span className={cn(
              "text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded",
              hazards?.stallRequired
                ? "bg-destructive/20 text-destructive"
                : "bg-secondary text-muted-foreground"
            )}>
              {hazards?.stallRequired ? 'STALLING' : 'CLEAR'}
            </span>
          </div>

          {/* Hazard Details */}
          {hazards?.hazardDetails && hazards.hazardDetails.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] sm:text-xs text-muted-foreground">Active Hazards:</span>
              {hazards.hazardDetails.map((detail, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs p-2 bg-warning/10 rounded border border-warning/30"
                >
                  <span className={cn(
                    "px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold",
                    detail.type === 'RAW' && "bg-warning/20 text-warning",
                    detail.type === 'LOAD-USE' && "bg-destructive/20 text-destructive",
                    detail.type === 'CONTROL' && "bg-primary/20 text-primary"
                  )}>
                    {detail.type}
                  </span>
                  <span className="text-muted-foreground">{detail.source}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-foreground">{detail.destination}</span>
                  <span className={cn(
                    "ml-auto px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold",
                    detail.resolution === 'FORWARD' && "bg-success/20 text-success",
                    detail.resolution === 'STALL' && "bg-destructive/20 text-destructive",
                    detail.resolution === 'FLUSH' && "bg-primary/20 text-primary"
                  )}>
                    {detail.resolution}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!hasActiveHazard && !hasForwarding && (
            <div className="text-center py-3 sm:py-4 text-[10px] sm:text-xs text-muted-foreground">
              No hazards detected in current cycle
            </div>
          )}
        </div>
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
      "p-2 sm:p-3 rounded-lg border transition-all duration-300",
      isActive
        ? "bg-success/10 border-success/50 glow-success"
        : "bg-secondary/30 border-border/50"
    )}>
      <div className="flex items-center gap-2 mb-1 sm:mb-2">
        <Zap className={cn(
          "w-3 h-3",
          isActive ? "text-success" : "text-muted-foreground"
        )} />
        <span className="text-[10px] sm:text-xs font-medium">{label}</span>
      </div>
      
      {isActive ? (
        <div className="space-y-0.5 sm:space-y-1">
          <div className="flex justify-between text-[10px] sm:text-xs">
            <span className="text-muted-foreground">From:</span>
            <span className="font-mono text-success">{forward.from}</span>
          </div>
          <div className="flex justify-between text-[10px] sm:text-xs">
            <span className="text-muted-foreground">Register:</span>
            <span className="font-mono text-foreground">x{forward.register}</span>
          </div>
          <div className="flex justify-between text-[10px] sm:text-xs">
            <span className="text-muted-foreground">Value:</span>
            <span className="font-mono text-foreground">{forward.value}</span>
          </div>
        </div>
      ) : (
        <div className="text-[10px] sm:text-xs text-muted-foreground">
          {rs !== undefined ? `Reading x${rs}` : 'No source'}
        </div>
      )}
    </div>
  );
}

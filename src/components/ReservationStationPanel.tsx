import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OoOState, RSEntry } from '@/types/cpu';

interface ReservationStationPanelProps {
  oooState: OoOState | null | undefined;
}

const FU_COLORS: Record<string, string> = {
  ALU:    'bg-blue-500/20 text-blue-300',
  MEM:    'bg-orange-500/20 text-orange-300',
  BRANCH: 'bg-primary/20 text-primary',
};

export function ReservationStationPanel({ oooState }: ReservationStationPanelProps) {
  const rs: RSEntry[] = oooState?.reservation_station || [];
  const rsSize = oooState?.rs_size ?? 16;
  const used = oooState?.rs_used ?? rs.length;
  const fillPct = Math.round((used / rsSize) * 100);

  const fus = oooState?.functional_units || {};
  const fuKeys = Object.keys(fus);

  return (
    <div className="bg-card rounded-xl border border-border p-3 sm:p-4 flex flex-col h-[280px]">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <Layers className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Reservation Station</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">{used}/{rsSize}</span>
      </div>

      {/* RS fill bar */}
      <div className="mb-2 shrink-0">
        <div className="bg-secondary/50 rounded-full h-1.5 overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              fillPct > 80 ? "bg-destructive" : fillPct > 50 ? "bg-warning" : "bg-primary"
            )}
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <div className="text-[9px] text-muted-foreground mt-0.5">{fillPct}% full</div>
      </div>

      {/* Functional unit status row */}
      {fuKeys.length > 0 && (
        <div className="flex gap-1 mb-2 shrink-0 flex-wrap">
          {fuKeys.map(fuName => {
            const fu = fus[fuName];
            return (
              <div
                key={fuName}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px]",
                  fu.busy
                    ? "border-warning/40 bg-warning/10 text-warning"
                    : "border-border/30 bg-secondary/20 text-muted-foreground"
                )}
              >
                <span className="font-semibold">{fuName}</span>
                {fu.busy && fu.instruction && (
                  <span className="font-mono truncate max-w-[60px]">{fu.instruction}</span>
                )}
                {fu.busy && (
                  <span className="text-muted-foreground">[{fu.remaining_cycles}]</span>
                )}
                {!fu.busy && <span>idle</span>}
              </div>
            );
          })}
        </div>
      )}

      {rs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[11px] text-muted-foreground">
          RS is empty — all instructions dispatched
        </div>
      ) : (
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="space-y-0.5 pr-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-1 text-[9px] text-muted-foreground font-semibold mb-1">
              <div className="col-span-1">ID</div>
              <div className="col-span-3">Instr</div>
              <div className="col-span-2">FU</div>
              <div className="col-span-2">src1</div>
              <div className="col-span-2">src2</div>
              <div className="col-span-2">Status</div>
            </div>
            {rs.map((entry) => {
              const ready = entry.src1_ready && entry.src2_ready;
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "grid grid-cols-12 gap-1 text-[9px] rounded px-1 py-0.5 border",
                    entry.executing
                      ? "border-warning/30 bg-warning/5"
                      : ready
                      ? "border-success/30 bg-success/5"
                      : "border-border/20 bg-secondary/10"
                  )}
                >
                  <div className="col-span-1 font-mono text-muted-foreground">{entry.id}</div>
                  <div className="col-span-3 font-mono text-foreground truncate" title={entry.instruction}>
                    {entry.instruction}
                  </div>
                  <div className="col-span-2">
                    <span className={cn(
                      "px-1 py-0.5 rounded text-[8px] font-semibold",
                      FU_COLORS[entry.fu_type] || 'bg-muted text-muted-foreground'
                    )}>
                      {entry.fu_type}
                    </span>
                  </div>
                  <div className={cn("col-span-2 font-mono", entry.src1_ready ? "text-success" : "text-destructive")}>
                    {entry.src1_ready
                      ? (entry.src1_val !== null ? entry.src1_val : '✓')
                      : `p${entry.src1_val ?? '?'}`}
                  </div>
                  <div className={cn("col-span-2 font-mono", entry.src2_ready ? "text-success" : "text-destructive")}>
                    {entry.src2_ready
                      ? (entry.src2_val !== null ? entry.src2_val : '✓')
                      : `p${entry.src2_val ?? '?'}`}
                  </div>
                  <div className="col-span-2 text-[8px]">
                    {entry.executing
                      ? <span className="text-warning">EXEC</span>
                      : ready
                      ? <span className="text-success">READY</span>
                      : <span className="text-muted-foreground">WAIT</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

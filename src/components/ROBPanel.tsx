import { Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OoOState, ROBEntry } from '@/types/cpu';

interface ROBPanelProps {
  oooState: OoOState | null | undefined;
}

const STATE_COLORS: Record<string, string> = {
  DISPATCH:  'bg-blue-500/20 text-blue-300',
  EXECUTE:   'bg-warning/20 text-yellow-300',
  WRITEBACK: 'bg-orange-500/20 text-orange-300',
  COMMIT:    'bg-success/20 text-green-300',
};

export function ROBPanel({ oooState }: ROBPanelProps) {
  const rob: ROBEntry[] = oooState?.rob || [];
  const robSize = oooState?.rob_size ?? 32;
  const used = oooState?.rob_used ?? rob.length;
  const fillPct = Math.round((used / robSize) * 100);

  return (
    <div className="bg-card rounded-xl border border-border p-3 sm:p-4 flex flex-col h-[280px]">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <Database className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Reorder Buffer (ROB)</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">{used}/{robSize}</span>
      </div>

      {/* Fill bar */}
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

      {rob.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[11px] text-muted-foreground">
          ROB is empty — OoO engine idle
        </div>
      ) : (
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="space-y-0.5 pr-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-1 text-[9px] text-muted-foreground font-semibold mb-1">
              <div className="col-span-1">ID</div>
              <div className="col-span-4">Instruction</div>
              <div className="col-span-3">State</div>
              <div className="col-span-2">pReg</div>
              <div className="col-span-2">Result</div>
            </div>
            {rob.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "grid grid-cols-12 gap-1 text-[9px] rounded px-1 py-0.5 border",
                  entry.ready
                    ? "border-success/30 bg-success/5"
                    : "border-border/20 bg-secondary/10"
                )}
              >
                <div className="col-span-1 font-mono text-muted-foreground">{entry.id}</div>
                <div className="col-span-4 font-mono text-foreground truncate" title={entry.instruction}>
                  {entry.instruction}
                </div>
                <div className="col-span-3">
                  <span className={cn(
                    "px-1 py-0.5 rounded text-[8px] font-semibold",
                    STATE_COLORS[entry.state] || 'bg-muted text-muted-foreground'
                  )}>
                    {entry.state}
                  </span>
                </div>
                <div className="col-span-2 font-mono text-muted-foreground">
                  {entry.dst_preg !== null ? `p${entry.dst_preg}` : '—'}
                </div>
                <div className="col-span-2 font-mono text-foreground">
                  {entry.result !== null ? entry.result : '—'}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

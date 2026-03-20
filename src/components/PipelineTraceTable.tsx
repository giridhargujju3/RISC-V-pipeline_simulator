import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PipelineTraceEntry } from '@/types/cpu';
import { ExpandModal } from '@/components/ExpandModal';

interface PipelineTraceTableProps {
  trace: PipelineTraceEntry[];
  mode?: 'inorder' | 'ooo';
}

const INORDER_STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'] as const;
const OOO_STAGES     = ['FETCH', 'DISPATCH', 'EXECUTE', 'COMMIT'] as const;

const STAGE_COLORS: Record<string, string> = {
  IF:       'bg-blue-500/20 text-blue-300 border-blue-500/30',
  ID:       'bg-purple-500/20 text-purple-300 border-purple-500/30',
  EX:       'bg-warning/20 text-yellow-300 border-yellow-500/30',
  MEM:      'bg-orange-500/20 text-orange-300 border-orange-500/30',
  WB:       'bg-success/20 text-green-300 border-green-500/30',
  FETCH:    'bg-blue-500/20 text-blue-300 border-blue-500/30',
  DISPATCH: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  EXECUTE:  'bg-warning/20 text-yellow-300 border-yellow-500/30',
  COMMIT:   'bg-success/20 text-green-300 border-green-500/30',
};

type Stage = typeof INORDER_STAGES[number] | typeof OOO_STAGES[number];

interface TraceGridProps {
  visible: PipelineTraceEntry[];
  stages: readonly Stage[];
  textSize?: string;
}

function TraceGrid({ visible, stages, textSize = 'text-[9px]' }: TraceGridProps) {
  const cols = stages.length + 1;
  return (
    <div className="pr-2">
      <div className={cn(`grid gap-1 mb-1 ${textSize} font-semibold text-muted-foreground sticky top-0 bg-card pb-1`)}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        <div className="text-center">Cycle</div>
        {stages.map(s => <div key={s} className="text-center">{s}</div>)}
      </div>
      <div className="space-y-0.5">
        {visible.map((entry) => (
          <div key={entry.cycle} className={cn(`grid gap-1 ${textSize}`)}
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            <div className="text-center font-mono text-muted-foreground py-0.5">{entry.cycle}</div>
            {stages.map(stage => {
              const stageData = (entry as any)[stage];
              const active = stageData?.valid && stageData?.mnemonic && stageData.mnemonic !== 'NOP' && stageData.mnemonic !== '---';
              return (
                <div
                  key={stage}
                  title={stageData?.instruction || ''}
                  className={cn(
                    "rounded px-1 py-0.5 text-center font-mono truncate border transition-all",
                    active
                      ? STAGE_COLORS[stage] || 'bg-primary/20 text-primary border-primary/30'
                      : "bg-secondary/20 text-muted-foreground/40 border-border/20"
                  )}
                >
                  {active ? (stageData.mnemonic || '?') : '—'}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PipelineTraceTable({ trace, mode = 'inorder' }: PipelineTraceTableProps) {
  const stages = mode === 'ooo' ? OOO_STAGES : INORDER_STAGES;
  const visible = trace.slice(-30).reverse();
  const allVisible = trace.slice().reverse();

  return (
    <div className="bg-card rounded-xl border border-border p-3 sm:p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <Activity className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Pipeline Trace</h2>
        <span className="text-[10px] text-muted-foreground">{trace.length} cycles</span>
        <ExpandModal title="Pipeline Trace — Full History">
          <ScrollArea className="h-full">
            <TraceGrid visible={allVisible} stages={stages} textSize="text-xs" />
          </ScrollArea>
        </ExpandModal>
      </div>

      {trace.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[11px] text-muted-foreground">
          Run the simulation to see the pipeline trace
        </div>
      ) : (
        <ScrollArea className="flex-1 overflow-hidden">
          <TraceGrid visible={visible} stages={stages} />
        </ScrollArea>
      )}
    </div>
  );
}

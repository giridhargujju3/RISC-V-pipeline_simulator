import { CPUState } from '@/types/cpu';
import { cn } from '@/lib/utils';

interface ExecutionTimelineProps {
  state: CPUState;
}

export function ExecutionTimeline({ state }: ExecutionTimelineProps) {
  const stages = [
    { name: 'IF', register: state.IF_ID, color: 'bg-stage-fetch' },
    { name: 'ID', register: state.ID_EX, color: 'bg-stage-decode' },
    { name: 'EX', register: state.EX_MEM, color: 'bg-stage-execute' },
    { name: 'MEM', register: state.MEM_WB, color: 'bg-stage-memory' },
    { name: 'WB', register: state.MEM_WB?.valid && state.MEM_WB?.rd !== undefined ? state.MEM_WB : null, color: 'bg-stage-writeback' },
  ];

  return (
    <div className="bg-card rounded-xl border border-border p-4 h-full flex flex-col">
      <div className="panel-header">
        <div className="w-2 h-2 rounded-full bg-dataflow" />
        <h2 className="panel-title">Execution Timeline</h2>
        <span className="text-xs text-muted-foreground ml-auto">
          Cycle {state.cycle}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        {stages.map((stage, idx) => (
          <div key={stage.name} className="flex-1">
            <div className={cn(
              "h-8 rounded flex items-center justify-center text-xs font-semibold transition-all duration-300",
              stage.register?.valid 
                ? `${stage.color} text-white shadow-lg` 
                : "bg-secondary/50 text-muted-foreground"
            )}>
              {stage.name}
            </div>
            <div className="text-[10px] text-center mt-1 text-muted-foreground font-mono truncate px-1">
              {stage.register?.valid && stage.register?.instruction ? 
                (typeof stage.register.instruction === 'string' ? 
                  stage.register.instruction.split(' ')[0] : '---') 
                : '---'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

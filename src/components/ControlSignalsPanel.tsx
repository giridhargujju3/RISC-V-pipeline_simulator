import { ControlSignals } from '@/types/cpu';
import { cn } from '@/lib/utils';

interface ControlSignalsPanelProps {
  signals?: ControlSignals;
}

export function ControlSignalsPanel({ signals }: ControlSignalsPanelProps) {
  const signalList = [
    { name: 'RegWrite', value: signals?.regWrite },
    { name: 'MemRead', value: signals?.memRead },
    { name: 'MemWrite', value: signals?.memWrite },
    { name: 'MemToReg', value: signals?.memToReg },
    { name: 'ALUSrc', value: signals?.aluSrc },
    { name: 'Branch', value: signals?.branch },
    { name: 'Jump', value: signals?.jump },
  ];

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="panel-header">
        <div className="w-2 h-2 rounded-full bg-control" />
        <h2 className="panel-title">Control Signals</h2>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {signalList.map((signal) => (
          <div
            key={signal.name}
            className={cn(
              "text-xs p-2 rounded text-center transition-all duration-200",
              signal.value
                ? "bg-control/20 text-control border border-control/50"
                : "bg-secondary/30 text-muted-foreground border border-transparent"
            )}
          >
            <div className="font-medium">{signal.name}</div>
            <div className="font-mono mt-0.5">{signal.value ? '1' : '0'}</div>
          </div>
        ))}
        
        <div className="text-xs p-2 rounded text-center bg-alu/20 text-alu border border-alu/50">
          <div className="font-medium">ALUOp</div>
          <div className="font-mono mt-0.5">{signals?.aluOp || '---'}</div>
        </div>
      </div>
    </div>
  );
}

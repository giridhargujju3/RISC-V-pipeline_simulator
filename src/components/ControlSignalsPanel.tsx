import { ControlSignals } from '@/types/cpu';
import { cn } from '@/lib/utils';
import { HelpCircle, Cpu, CheckCircle2, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ControlSignalsPanelProps {
  signals?: ControlSignals;
}

export function ControlSignalsPanel({ signals }: ControlSignalsPanelProps) {
  const hasSignals = signals !== undefined && signals !== null;
  const hasActiveSignals = signals && (
    signals.regWrite || signals.memRead || signals.memWrite || 
    signals.memToReg || signals.aluSrc || signals.branch || signals.jump
  );

  const getInstructionType = (): string => {
    if (!signals) return 'Unknown';
    if (signals.jump) return 'J-type';
    if (signals.branch) return 'B-type';
    if (signals.memRead) return 'Load';
    if (signals.memWrite) return 'Store';
    if (signals.aluSrc) return 'I-type';
    if (signals.regWrite && !signals.aluSrc) return 'R-type';
    return 'NOP';
  };

  const getSignalExplanation = (signalName: string, value: boolean): string => {
    const explanations: Record<string, { active: string; inactive: string }> = {
      RegWrite: {
        active: 'Write result to destination register',
        inactive: 'No register write'
      },
      MemRead: {
        active: 'Read data from memory',
        inactive: 'No memory read'
      },
      MemWrite: {
        active: 'Write data to memory',
        inactive: 'No memory write'
      },
      MemToReg: {
        active: 'Use memory data for register',
        inactive: 'Use ALU result for register'
      },
      ALUSrc: {
        active: 'Use immediate as ALU operand',
        inactive: 'Use register as ALU operand'
      },
      Branch: {
        active: 'Branch instruction detected',
        inactive: 'Not a branch'
      },
      Jump: {
        active: 'Jump instruction detected',
        inactive: 'Not a jump'
      }
    };
    return value ? explanations[signalName]?.active : explanations[signalName]?.inactive;
  };

  const signalList = [
    { name: 'RegWrite', value: signals?.regWrite, category: 'Register' },
    { name: 'MemToReg', value: signals?.memToReg, category: 'Register' },
    { name: 'MemRead', value: signals?.memRead, category: 'Memory' },
    { name: 'MemWrite', value: signals?.memWrite, category: 'Memory' },
    { name: 'ALUSrc', value: signals?.aluSrc, category: 'ALU' },
    { name: 'Branch', value: signals?.branch, category: 'Control' },
    { name: 'Jump', value: signals?.jump, category: 'Control' },
  ];

  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4 relative overflow-hidden h-full flex flex-col">
        {hasActiveSignals && (
          <div className="absolute inset-0 bg-gradient-to-r from-control/5 via-control/10 to-control/5 animate-pulse" />
        )}
        
        <div className="relative z-10 flex-shrink-0">
          <div className="panel-header">
            <div className={`w-2 h-2 rounded-full ${hasActiveSignals ? 'bg-control animate-pulse' : 'bg-control/30'}`} />
            <h2 className="panel-title">Control Unit <span className="text-[10px] text-muted-foreground">(ID Stage)</span></h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help ml-1" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Generates control signals from instruction opcode</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto pr-1 mt-3 space-y-3 custom-scrollbar">
          {!hasSignals ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
              <div className="text-center space-y-2">
                <Cpu className="w-8 h-8 mx-auto opacity-30" />
                <p>No instruction decoded</p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-control/10 border border-control/30 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Type:</span>
                  <span className="font-mono text-xs text-control font-semibold">{getInstructionType()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {signalList.map((signal) => (
                  <Tooltip key={signal.name}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "p-2 rounded-lg border transition-all duration-200 cursor-help",
                          signal.value
                            ? "bg-control/20 text-control border-control/50"
                            : "bg-secondary/30 text-muted-foreground border-border/50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            {signal.value ? (
                              <CheckCircle2 className="w-3 h-3 text-success" />
                            ) : (
                              <XCircle className="w-3 h-3 text-muted-foreground/50" />
                            )}
                            <span className="font-semibold text-xs">{signal.name}</span>
                          </div>
                          <span className="font-mono text-xs font-bold">{signal.value ? '1' : '0'}</span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{getSignalExplanation(signal.name, signal.value || false)}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              <div className="p-2 rounded-lg border-2 border-alu/50 bg-alu/10">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-alu">ALU Operation</span>
                  <span className="font-mono text-xs font-bold text-alu">{signals?.aluOp || 'NOP'}</span>
                </div>
              </div>

              <div className="bg-secondary/30 border border-border/50 rounded-lg p-2">
                <div className="text-[9px] text-muted-foreground font-semibold mb-1.5">How Control Works:</div>
                <div className="space-y-1 text-[9px] text-muted-foreground/90">
                  <div>• Opcode decoded in ID stage</div>
                  <div>• Signals control datapath components</div>
                  <div>• Different types = different signals</div>
                </div>
              </div>
            </>
          )}
        </div>

        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: hsl(var(--control) / 0.4);
            border-radius: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: hsl(var(--control) / 0.6);
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
}

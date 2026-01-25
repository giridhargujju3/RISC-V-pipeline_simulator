import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Info, ChevronRight } from 'lucide-react';
import { CPUState } from '@/types/cpu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';
import { CycleDetailsSidebar } from './CycleDetailsSidebar';

interface ExecutionLogProps {
  state: CPUState;
}

interface CycleRecord {
  cycle: number;
  state: CPUState;
}

interface LogEntry {
  cycle: number;
  stage: 'IF' | 'ID' | 'EX' | 'MEM' | 'WB';
  instruction: string;
  details: string;
}

export function ExecutionLog({ state }: ExecutionLogProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cycleHistory, setCycleHistory] = useState<CycleRecord[]>([]);

  // Track cycle changes and accumulate history
  useEffect(() => {
    if (state.cycle > 0) {
      setCycleHistory((prev) => {
        // Check if we already have this cycle recorded
        if (prev.length > 0 && prev[prev.length - 1].cycle === state.cycle) {
          // Update the last cycle's state
          return [...prev.slice(0, -1), { cycle: state.cycle, state }];
        }
        // Add new cycle
        return [...prev, { cycle: state.cycle, state }];
      });
    }
  }, [state.cycle, state]);

  const generateLogEntries = (): LogEntry[] => {
    const logs: LogEntry[] = [];
    const cycle = state.cycle;

    // IF Stage
    if (state.IF_ID.valid) {
      logs.push({
        cycle,
        stage: 'IF',
        instruction: state.IF_ID.assembly || 'nop',
        details: `PC: 0x${state.pc.toString(16).padStart(8, '0')}`
      });
    }

    // ID Stage
    if (state.ID_EX.valid) {
      logs.push({
        cycle,
        stage: 'ID',
        instruction: state.ID_EX.assembly || 'nop',
        details: `rd=x${state.ID_EX.rd || 0}, rs1=x${state.ID_EX.rs1 || 0}, rs2=x${state.ID_EX.rs2 || 0}`
      });
    }

    // EX Stage
    if (state.EX_MEM.valid) {
      logs.push({
        cycle,
        stage: 'EX',
        instruction: state.EX_MEM.assembly || 'nop',
        details: `ALU Result: ${state.EX_MEM.alu_result || 0}`
      });
    }

    // MEM Stage
    if (state.MEM_WB.valid) {
      logs.push({
        cycle,
        stage: 'MEM',
        instruction: state.MEM_WB.assembly || 'nop',
        details: state.MEM_WB.mem_data !== null && state.MEM_WB.mem_data !== undefined 
          ? `Mem: ${state.MEM_WB.mem_data}` 
          : 'No mem access'
      });
    }

    // WB Stage
    if (state.MEM_WB.valid && state.MEM_WB.reg_write && state.MEM_WB.rd !== 0) {
      const writeData = state.MEM_WB.mem_to_reg ? state.MEM_WB.mem_data : state.MEM_WB.alu_result;
      logs.push({
        cycle,
        stage: 'WB',
        instruction: state.MEM_WB.assembly || 'nop',
        details: `x${state.MEM_WB.rd} ← ${writeData}`
      });
    }

    return logs;
  };

  const logs = generateLogEntries();
  const stageColors = {
    IF: 'text-blue-500',
    ID: 'text-green-500',
    EX: 'text-yellow-500',
    MEM: 'text-cyan-500',
    WB: 'text-purple-500'
  };

  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4 h-[250px] sm:h-[300px] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="panel-header flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <h2 className="panel-title">Execution Log</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Real-time log showing which instructions are in each pipeline stage during the current cycle. 
                  Each entry shows the stage, instruction, and relevant details.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 hover:bg-secondary rounded transition-colors group"
            aria-label="Open cycle details"
            title="View detailed cycle information"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </div>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="space-y-2 pr-3">
            {state.cycle === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-8">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Start execution to see pipeline activity</p>
              </div>
            ) : (
              <>
                <div className="text-xs font-semibold text-foreground mb-2 pb-1 border-b border-border">
                  Cycle {state.cycle} - Pipeline Activity
                </div>
                {logs.length === 0 ? (
                  <div className="space-y-3">
                    {state.halted ? (
                      // Execution Complete Summary
                      <div className="space-y-3">
                        <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
                          <div className="text-xl font-bold text-success mb-2">✅ Execution Complete!</div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Pipeline flushed successfully</div>
                            <div className="font-semibold text-foreground">Total Cycles: {state.cycle}</div>
                          </div>
                        </div>

                        {/* Final Register Values */}
                        {Object.keys(state.registers).some(key => state.registers[key] !== 0) && (
                          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                            <div className="text-xs font-semibold text-primary mb-2">📋 Final Register State</div>
                            <div className="text-xs font-mono text-muted-foreground space-y-1">
                              {Object.entries(state.registers)
                                .filter(([, value]) => value !== 0)
                                .map(([reg, value]) => {
                                  const regName = reg.startsWith('x') ? reg : `x${reg}`;
                                  return (
                                    <div key={reg} className="flex justify-between">
                                      <span className="text-foreground font-semibold">{regName}:</span>
                                      <span>{value}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        {/* Summary Stats */}
                        <div className="bg-secondary/30 border border-border/50 rounded-lg p-3 space-y-1 text-[10px]">
                          <div className="text-xs font-semibold text-foreground mb-2">📊 Execution Summary</div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Final PC:</span>
                            <span className="font-mono text-foreground">0x{state.pc.toString(16).padStart(8, '0').toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Status:</span>
                            <span className="text-success font-semibold">Halted</span>
                          </div>
                        </div>

                        <div className="text-center pt-2">
                          <p className="text-[10px] text-muted-foreground italic">
                            View complete execution details in the sidebar →
                          </p>
                        </div>
                      </div>
                    ) : (
                      // Pipeline empty but still running
                      <div className="text-xs text-muted-foreground italic">Pipeline empty or flushed</div>
                    )}
                  </div>
                ) : (
                  logs.map((log, idx) => (
                    <div
                      key={idx}
                      className="text-[10px] sm:text-xs font-mono bg-secondary/30 rounded p-2 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold ${stageColors[log.stage]} min-w-[32px]`}>
                          {log.stage}
                        </span>
                        <span className="text-foreground font-semibold">{log.instruction}</span>
                      </div>
                      <div className="text-muted-foreground pl-9">{log.details}</div>
                    </div>
                  ))
                )}
                
                {/* Show hazard information if present */}
                {(state.hazards?.forwardA || state.hazards?.forwardB || state.hazards?.stallRequired) && logs.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border">
                    <div className="text-xs font-semibold text-orange-500 mb-1">⚠️ Hazards Detected:</div>
                    {state.hazards?.stallRequired && (
                      <div className="text-[10px] text-orange-400 ml-2">• Pipeline stall inserted</div>
                    )}
                    {state.hazards?.forwardA && (
                      <div className="text-[10px] text-blue-400 ml-2">
                        • Forward A: {state.hazards.forwardA.from} (x{state.hazards.forwardA.register}) → {state.hazards.forwardA.value}
                      </div>
                    )}
                    {state.hazards?.forwardB && (
                      <div className="text-[10px] text-blue-400 ml-2">
                        • Forward B: {state.hazards.forwardB.from} (x{state.hazards.forwardB.register}) → {state.hazards.forwardB.value}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <div className="mt-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Total Cycles: {state.cycle}</span>
            <span className={state.halted ? 'text-destructive' : 'text-success'}>
              {state.halted ? '⏸ Halted' : '▶ Running'}
            </span>
          </div>
        </div>
      </div>
      
      <CycleDetailsSidebar 
        cycleHistory={cycleHistory} 
        currentState={state} 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
    </TooltipProvider>
  );
}

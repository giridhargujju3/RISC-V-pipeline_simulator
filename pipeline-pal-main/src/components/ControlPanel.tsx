import { Play, Pause, RotateCcw, StepForward, Cpu, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ControlPanelProps {
  cycle: number;
  pc: number;
  running: boolean;
  halted: boolean;
  onStep: () => void;
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
}

export function ControlPanel({
  cycle,
  pc,
  running,
  halted,
  onStep,
  onRun,
  onPause,
  onReset,
}: ControlPanelProps) {
  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Cpu className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-semibold text-foreground">RISC-V Pipeline Simulator</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">5-Stage Pipelined CPU</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    <span className="text-xs text-muted-foreground">Cycle:</span>
                    <span className="font-mono text-base sm:text-lg font-bold text-primary glow-primary px-2 sm:px-3 py-1 bg-primary/10 rounded">
                      {cycle}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Current clock cycle count</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    <span className="text-xs text-muted-foreground">PC:</span>
                    <span className="font-mono text-xs sm:text-sm text-foreground bg-secondary px-2 py-1 rounded">
                      0x{pc.toString(16).padStart(8, '0').toUpperCase()}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Program Counter - Address of next instruction to fetch</p>
                </TooltipContent>
              </Tooltip>
              
              {halted && (
                <span className="text-xs font-semibold text-warning bg-warning/20 px-2 py-1 rounded flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  HALTED
                </span>
              )}
              
              {running && (
                <span className="text-xs font-semibold text-success bg-success/20 px-2 py-1 rounded animate-pulse flex items-center gap-1">
                  <div className="w-2 h-2 bg-success rounded-full" />
                  RUNNING
                </span>
              )}
            </div>
          </div>
          
          {/* Control Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onStep}
                  disabled={running || halted}
                  className="control-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none justify-center"
                >
                  <StepForward className="w-4 h-4" />
                  <span className="hidden sm:inline">Step</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Execute one clock cycle</p>
              </TooltipContent>
            </Tooltip>
            
            {running ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onPause} className="control-btn-primary flex-1 sm:flex-none justify-center">
                    <Pause className="w-4 h-4" />
                    <span className="hidden sm:inline">Pause</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pause continuous execution</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onRun}
                    disabled={halted}
                    className="control-btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none justify-center"
                  >
                    <Play className="w-4 h-4" />
                    <span className="hidden sm:inline">Run</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Run continuously (auto-step)</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onReset} className="control-btn-destructive flex-1 sm:flex-none justify-center">
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset CPU to initial state</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

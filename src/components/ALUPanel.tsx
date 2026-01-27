import { ALUState, PipelineRegister, HazardState } from '@/types/cpu';
import { HelpCircle, Zap, ArrowRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ALUPanelProps {
  alu: ALUState;
  idEx: PipelineRegister;
  exMem: PipelineRegister;
  hazards?: HazardState;
}

export function ALUPanel({ alu, idEx, exMem, hazards }: ALUPanelProps) {
  // Get operation symbol for visual display
  const getOperationSymbol = (op: string): string => {
    const opLower = op.toLowerCase();
    if (opLower.includes('add')) return '+';
    if (opLower.includes('sub')) return '-';
    if (opLower.includes('and')) return '&';
    if (opLower.includes('or')) return '|';
    if (opLower.includes('xor')) return '^';
    if (opLower.includes('sll')) return '<<';
    if (opLower.includes('srl')) return '>>';
    if (opLower.includes('sra')) return '>>>';
    if (opLower.includes('slt')) return '<';
    return op;
  };

  // The instruction that WAS JUST executed (now in EX/MEM stage)
  // ALU state reflects this instruction's execution
  const executedInstruction = exMem.valid && exMem.assembly && exMem.assembly !== 'NOP' ? exMem : null;
  
  // The instruction CURRENTLY in EX stage (about to execute)
  const currentInstruction = idEx.valid && idEx.assembly && idEx.assembly !== 'NOP' ? idEx : null;
  
  // For display: use the instruction that matches the ALU state (the one that was just executed)
  const displayInstruction = executedInstruction;
  const hasInstruction = displayInstruction !== null;
  
  // Get forwarding info (for the CURRENT instruction in EX stage)
  const forwardA = hazards?.forwardA;
  const forwardB = hazards?.forwardB;

  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4 relative overflow-hidden">
        {/* Animated background when active */}
        {hasInstruction && (
          <div className="absolute inset-0 bg-gradient-to-r from-alu/5 via-alu/10 to-alu/5 animate-pulse" />
        )}
        
        <div className="relative z-10">
          <div className="panel-header">
            <div className={`w-2 h-2 rounded-full ${hasInstruction ? 'bg-alu animate-pulse' : 'bg-alu/30'}`} />
            <h2 className="panel-title">ALU Unit <span className="text-[10px] text-muted-foreground">(EX Stage)</span></h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help ml-1" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Arithmetic Logic Unit - performs calculations in Execute stage</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {!hasInstruction ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              <div className="text-center space-y-2">
                <Zap className="w-8 h-8 mx-auto opacity-30" />
                <p>No instruction executed yet</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Executed Instruction */}
              <div className="bg-alu/10 border border-alu/30 rounded-lg p-2">
                <div className="text-[10px] text-muted-foreground mb-1">Just Executed:</div>
                <div className="font-mono text-xs sm:text-sm text-alu font-semibold">
                  {displayInstruction!.assembly}
                </div>
              </div>

              {/* Calculation Breakdown */}
              <div className="bg-secondary/50 border border-border rounded-lg p-3">
                <div className="text-[10px] text-muted-foreground mb-2">Calculation:</div>
                <div className="flex items-center justify-center gap-2 font-mono text-sm sm:text-base">
                  <span className="px-2 py-1 rounded bg-card">
                    {alu.operandA}
                  </span>
                  <span className="text-alu font-bold text-lg">
                    {getOperationSymbol(alu.operation)}
                  </span>
                  <span className="px-2 py-1 rounded bg-card">
                    {alu.operandB}
                  </span>
                  <ArrowRight className="w-4 h-4 text-accent" />
                  <span className="px-2 py-1 rounded bg-success/20 text-success font-bold border border-success/50">
                    {alu.result}
                  </span>
                </div>
              </div>

              {/* Operand Details */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground">Operand A (rs1)</div>
                  <div className="bg-card border border-border rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">Register:</span>
                      <span className="font-mono text-xs">x{displayInstruction!.rs1 ?? '?'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Value:</span>
                      <span className="font-mono text-xs font-semibold">{alu.operandA}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground">Operand B (rs2/imm)</div>
                  <div className="bg-card border border-border rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">Register:</span>
                      <span className="font-mono text-xs">x{displayInstruction!.rs2 ?? 'imm'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Value:</span>
                      <span className="font-mono text-xs font-semibold">{alu.operandB}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operation & Result Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-card border border-border rounded p-2">
                  <div className="text-[10px] text-muted-foreground mb-1">Operation</div>
                  <div className="font-mono text-xs text-alu font-semibold">{alu.operation}</div>
                </div>
                <div className="bg-card border border-border rounded p-2">
                  <div className="text-[10px] text-muted-foreground mb-1">Destination</div>
                  <div className="font-mono text-xs font-semibold">x{displayInstruction!.rd ?? '?'}</div>
                </div>
                <div className="bg-card border border-border rounded p-2">
                  <div className="text-[10px] text-muted-foreground mb-1">Zero Flag</div>
                  <div className={`text-xs font-mono font-semibold ${alu.zero ? 'text-success' : 'text-muted-foreground'}`}>
                    {alu.zero ? '1 (TRUE)' : '0 (FALSE)'}
                  </div>
                </div>
              </div>

              {/* Next Instruction Info */}
              {currentInstruction && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <div className="text-[9px] text-muted-foreground mb-1">Next in EX stage:</div>
                  <div className="font-mono text-[10px] text-accent">
                    {currentInstruction.assembly}
                    {(forwardA || forwardB) && (
                      <span className="ml-2 text-success">
                        ⚡ {forwardA && forwardB ? 'Double' : 'Single'} forwarding
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

import { ALUState } from '@/types/cpu';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ALUPanelProps {
  alu: ALUState;
}

export function ALUPanel({ alu }: ALUPanelProps) {
  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4">
        <div className="panel-header">
          <div className="w-2 h-2 rounded-full bg-alu" />
          <h2 className="panel-title">ALU Unit</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help ml-1" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Arithmetic Logic Unit - performs calculations</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-muted-foreground">Operand A</span>
              <span className="font-mono text-xs sm:text-sm text-foreground bg-secondary px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                {alu.operandA}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-muted-foreground">Operand B</span>
              <span className="font-mono text-xs sm:text-sm text-foreground bg-secondary px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                {alu.operandB}
              </span>
            </div>
          </div>
          
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-muted-foreground">Operation</span>
              <span className="font-mono text-xs sm:text-sm text-alu bg-alu/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-semibold">
                {alu.operation}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-muted-foreground">Result</span>
              <span className="font-mono text-xs sm:text-sm text-success bg-success/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-semibold">
                {alu.result}
              </span>
            </div>
          </div>
        </div>
        
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50 flex items-center justify-between">
          <span className="text-[10px] sm:text-xs text-muted-foreground">Zero Flag</span>
          <span className={`text-[10px] sm:text-xs font-mono px-1.5 sm:px-2 py-0.5 rounded ${
            alu.zero ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
          }`}>
            {alu.zero ? '1 (TRUE)' : '0 (FALSE)'}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}

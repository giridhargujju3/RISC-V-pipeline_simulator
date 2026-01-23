import { Instruction } from '@/types/cpu';
import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InstructionMemoryProps {
  instructions: Instruction[];
  currentPC: number;
}

export function InstructionMemory({ instructions, currentPC }: InstructionMemoryProps) {
  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4">
        <div className="panel-header">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <h2 className="panel-title">Instruction Memory</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help ml-1" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Machine code instructions loaded in memory. Highlighted = current PC.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
          {instructions.map((instr) => {
            const isActive = instr.address === currentPC;
            return (
              <div
                key={instr.address}
                className={cn(
                  "instruction-row flex items-center gap-2 p-2 rounded border",
                  isActive ? "active border-primary bg-primary/10" : "border-border/50 bg-secondary/30"
                )}
              >
                <span className="text-muted-foreground w-8 text-[10px] font-mono">
                  0x{instr.address.toString(16).padStart(2, '0').toUpperCase()}
                </span>
                <span className="text-primary/70 w-16 text-[10px] font-mono truncate">
                  {instr.hex}
                </span>
                <span className={cn(
                  "flex-1 text-[10px] truncate",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {instr.assembly}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

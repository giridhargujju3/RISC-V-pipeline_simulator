import { Instruction } from '@/types/cpu';
import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InstructionMemoryProps {
  instructions: Instruction[];
  currentPC: number;
}

export function InstructionMemory({ instructions, currentPC }: InstructionMemoryProps) {
  // Safety check for instructions array
  const safeInstructions = Array.isArray(instructions) ? instructions : [];
  
  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4 h-full flex flex-col">
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
        
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 overflow-y-auto min-h-0 content-start">
          {safeInstructions.length > 0 ? safeInstructions.map((instr, index) => {
            if (!instr || typeof instr !== 'object') return null;
            
            const address = instr.address || (index * 4);
            const hex = instr.hex || '00000000';
            const assembly = instr.assembly || 'nop';
            const isActive = address === currentPC;
            
            return (
              <div
                key={`instr-${address}-${index}`}
                className={cn(
                  "instruction-row flex items-center gap-2 p-2 rounded border",
                  isActive ? "active border-primary bg-primary/10" : "border-border/50 bg-secondary/30"
                )}
              >
                <span className="text-muted-foreground w-8 text-[10px] font-mono">
                  0x{address.toString(16).padStart(2, '0').toUpperCase()}
                </span>
                <span className="text-primary/70 w-16 text-[10px] font-mono truncate">
                  {hex}
                </span>
                <span className={cn(
                  "flex-1 text-[10px] truncate",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {assembly}
                </span>
              </div>
            );
          }) : (
            <div className="col-span-full text-center text-muted-foreground text-xs py-4">
              No instructions loaded
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

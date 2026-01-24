import { PipelineRegister } from '@/types/cpu';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PipelineStageProps {
  name: string;
  shortName: string;
  register: PipelineRegister;
  color: 'fetch' | 'decode' | 'execute' | 'memory' | 'writeback';
  compact?: boolean;
  description?: string;
}

const colorMap = {
  fetch: 'bg-stage-fetch/20 border-stage-fetch',
  decode: 'bg-stage-decode/20 border-stage-decode',
  execute: 'bg-stage-execute/20 border-stage-execute',
  memory: 'bg-stage-memory/20 border-stage-memory',
  writeback: 'bg-stage-writeback/20 border-stage-writeback',
};

const glowMap = {
  fetch: 'shadow-[0_0_15px_hsl(35_100%_50%/0.3)]',
  decode: 'shadow-[0_0_15px_hsl(210_100%_55%/0.3)]',
  execute: 'shadow-[0_0_15px_hsl(280_80%_55%/0.3)]',
  memory: 'shadow-[0_0_15px_hsl(160_70%_45%/0.3)]',
  writeback: 'shadow-[0_0_15px_hsl(340_80%_55%/0.3)]',
};

const badgeMap = {
  fetch: 'bg-stage-fetch text-white',
  decode: 'bg-stage-decode text-white',
  execute: 'bg-stage-execute text-white',
  memory: 'bg-stage-memory text-white',
  writeback: 'bg-stage-writeback text-white',
};

export function PipelineStage({ name, shortName, register, color, compact, description }: PipelineStageProps) {
  const content = (
    <div 
      className={cn(
        "rounded-lg border-2 transition-all duration-300",
        compact ? "p-2 sm:p-3" : "p-3 sm:p-4",
        colorMap[color],
        register.valid && glowMap[color]
      )}
    >
      <div className={cn(
        "flex items-center justify-between",
        compact ? "mb-1.5" : "mb-3"
      )}>
        <span className={cn(
          "stage-badge",
          badgeMap[color],
          compact && "text-[10px] px-2 py-0.5"
        )}>
          {shortName}
        </span>
        <span className={cn(
          "text-muted-foreground hidden sm:block",
          compact ? "text-[10px]" : "text-xs"
        )}>
          {name}
        </span>
        {!register.valid && (
          <span className="text-[10px] text-muted-foreground/50 px-1.5 py-0.5 bg-muted/30 rounded">
            idle
          </span>
        )}
      </div>
      
      <div className={cn("space-y-1", compact && "space-y-0.5")}>
        <div className={cn(
          "font-mono text-foreground truncate",
          compact ? "text-xs" : "text-sm"
        )}>
          {register.valid && register.instruction ? 
            (typeof register.instruction === 'string' ? register.instruction : 
             typeof register.instruction === 'object' && register.instruction.assembly ? register.instruction.assembly :
             'NOP') 
            : "---"}
        </div>
        
        <div className={cn(
          "flex items-center gap-2 text-muted-foreground",
          compact ? "text-[10px]" : "text-xs"
        )}>
          <span>PC:</span>
          <span className="font-mono text-foreground">
            {register.valid && register.pc !== undefined ? 
              `0x${register.pc.toString(16).padStart(8, '0').toUpperCase()}` : "---"}
          </span>
        </div>

        {register.valid && register.rd !== undefined && (
          <div className={cn(
            "flex items-center gap-2",
            compact ? "text-[10px]" : "text-xs"
          )}>
            <span className="text-muted-foreground">rd:</span>
            <span className="font-mono text-register">x{register.rd}</span>
          </div>
        )}

        {register.valid && register.alu_result !== undefined && (
          <div className={cn(
            "flex items-center gap-2",
            compact ? "text-[10px]" : "text-xs"
          )}>
            <span className="text-muted-foreground">ALU:</span>
            <span className="font-mono text-alu">{register.alu_result}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (description) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

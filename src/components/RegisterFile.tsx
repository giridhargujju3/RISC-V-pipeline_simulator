import { REGISTER_NAMES } from '@/types/cpu';
import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RegisterFileProps {
  registers: number[];
  updatedRegister: number | null;
}

export function RegisterFile({ registers, updatedRegister }: RegisterFileProps) {
  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4">
        <div className="panel-header">
          <div className="w-2 h-2 rounded-full bg-register" />
          <h2 className="panel-title">Register File (x0-x31)</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help ml-1" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                RISC-V has 32 general-purpose registers (x0-x31). <br />
                <strong>x0</strong> is always zero. <br />
                Highlighted registers were recently updated.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        {/* Desktop: 8 columns */}
        <div className="hidden lg:grid grid-cols-8 gap-1.5">
          {registers.map((value, index) => (
            <RegisterCell
              key={index}
              index={index}
              value={value}
              isUpdated={updatedRegister === index}
            />
          ))}
        </div>

        {/* Tablet: 4 columns */}
        <div className="hidden md:grid lg:hidden grid-cols-4 gap-1.5">
          {registers.map((value, index) => (
            <RegisterCell
              key={index}
              index={index}
              value={value}
              isUpdated={updatedRegister === index}
            />
          ))}
        </div>

        {/* Mobile: 4 columns, compact */}
        <div className="grid md:hidden grid-cols-4 gap-1">
          {registers.map((value, index) => (
            <RegisterCell
              key={index}
              index={index}
              value={value}
              isUpdated={updatedRegister === index}
              compact
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

interface RegisterCellProps {
  index: number;
  value: number;
  isUpdated: boolean;
  compact?: boolean;
}

function RegisterCell({ index, value, isUpdated, compact }: RegisterCellProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "register-cell text-center cursor-help transition-all",
            isUpdated && "updated",
            compact && "p-1"
          )}
        >
          <div className={cn(
            "text-muted-foreground mb-0.5",
            compact ? "text-[8px]" : "text-[10px]"
          )}>
            x{index}
          </div>
          <div className={cn(
            "text-muted-foreground/70 mb-0.5 hidden sm:block",
            compact ? "text-[7px]" : "text-[10px]"
          )}>
            {REGISTER_NAMES[index]}
          </div>
          <div className={cn(
            value !== 0 ? "text-foreground" : "text-muted-foreground/50",
            compact ? "text-[10px]" : "text-xs"
          )}>
            {value}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <p className="font-semibold">x{index} ({REGISTER_NAMES[index]})</p>
          <p>Value: {value} (0x{(value >>> 0).toString(16).toUpperCase()})</p>
          {index === 0 && <p className="text-muted-foreground">Hardwired to 0</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

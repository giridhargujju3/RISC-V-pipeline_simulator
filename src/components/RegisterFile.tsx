import { REGISTER_NAMES } from '@/types/cpu';
import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExpandModal } from '@/components/ExpandModal';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RegisterFileProps {
  registers: number[];
  updatedRegister: number | null;
}

export function RegisterFile({ registers, updatedRegister }: RegisterFileProps) {
  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4 h-full flex flex-col">
        <div className="panel-header flex-shrink-0">
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
          <ExpandModal title="Register File — All 32 Registers (x0–x31)">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 pr-2">
                {registers.map((value, index) => (
                  <div
                    key={index}
                    className={cn(
                      "rounded-lg border p-2 text-center transition-all",
                      updatedRegister === index
                        ? "border-register bg-register/20"
                        : "border-border bg-secondary/20"
                    )}
                  >
                    <div className="text-[10px] text-muted-foreground">x{index}</div>
                    <div className="text-[9px] text-muted-foreground/60">{REGISTER_NAMES[index]}</div>
                    <div className={cn(
                      "text-xs font-mono font-semibold mt-0.5",
                      value !== 0 ? "text-foreground" : "text-muted-foreground/40"
                    )}>
                      {value}
                    </div>
                    <div className="text-[8px] text-muted-foreground/50 font-mono">
                      0x{(value >>> 0).toString(16).toUpperCase().padStart(4, '0')}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </ExpandModal>
        </div>
        
        <div className="flex-1 overflow-y-auto mt-3">
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

import { Settings, Info, Cpu, Layers } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ConfigPanelProps {
  currentIsa: string;
  currentCore: string;
  availableIsas: Record<string, { name: string; description: string; xlen: number }>;
  availableCores: Record<string, { name: string; description: string; stages: number }>;
  onConfigChange: (isa: string, core: string) => void;
  disabled?: boolean;
}

export function ConfigPanel({
  currentIsa,
  currentCore,
  availableIsas,
  availableCores,
  onConfigChange,
  disabled = false
}: ConfigPanelProps) {
  const handleIsaChange = (isa: string) => {
    onConfigChange(isa, currentCore);
  };

  const handleCoreChange = (core: string) => {
    onConfigChange(currentIsa, core);
  };

  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Configuration</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                Select the ISA (instruction set architecture) and core microarchitecture.
                Configuration changes will reset the simulator.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* ISA Selector */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-3 h-3 text-muted-foreground" />
              <label className="text-xs font-medium text-foreground">ISA</label>
            </div>
            <Select value={currentIsa} onValueChange={handleIsaChange} disabled={disabled}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select ISA" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(availableIsas).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{info.name}</span>
                      <span className="text-xs text-muted-foreground">({info.xlen}-bit)</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableIsas[currentIsa] && (
              <p className="text-[10px] text-muted-foreground">
                {availableIsas[currentIsa].description}
              </p>
            )}
          </div>

          {/* Core Selector */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Layers className="w-3 h-3 text-muted-foreground" />
              <label className="text-xs font-medium text-foreground">Core</label>
            </div>
            <Select value={currentCore} onValueChange={handleCoreChange} disabled={disabled}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Core" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(availableCores).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{info.name}</span>
                      <span className="text-xs text-muted-foreground">({info.stages} stages)</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableCores[currentCore] && (
              <p className="text-[10px] text-muted-foreground">
                {availableCores[currentCore].description}
              </p>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

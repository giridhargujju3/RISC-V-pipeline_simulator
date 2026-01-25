import { useState } from 'react';
import { assembleProgram, EXAMPLE_PROGRAMS } from '@/lib/riscv-assembler';
import { Instruction } from '@/types/cpu';
import { Code2, Play, AlertCircle, CheckCircle, ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface AssemblyEditorProps {
  onLoad: (instructions: Instruction[]) => void;
}

export function AssemblyEditor({ onLoad }: AssemblyEditorProps) {
  const [code, setCode] = useState(EXAMPLE_PROGRAMS.simple);
  const [errors, setErrors] = useState<string[]>([]);
  const [assembled, setAssembled] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const { toast } = useToast();

  const handleAssemble = () => {
    try {
      const result = assembleProgram(code);
      setErrors(result.errors);
      setAssembled(result.success);
      
      if (result.success && result.instructions.length > 0) {
        onLoad(result.instructions);
        toast({
          title: "✅ Assembly Successful",
          description: `Assembled ${result.instructions.length} instructions`,
        });
      } else if (result.instructions.length === 0) {
        setErrors(["No valid instructions found. Please check your assembly code."]);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setErrors([`Assembly failed: ${msg}`]);
      setAssembled(false);
      toast({
        title: "❌ Assembly Failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const loadExample = (name: keyof typeof EXAMPLE_PROGRAMS) => {
    setCode(EXAMPLE_PROGRAMS[name]);
    setErrors([]);
    setAssembled(false);
    setShowExamples(false);
  };

  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4 h-full flex flex-col">
        <div className="panel-header">
          <Code2 className="w-4 h-4 text-primary" />
          <h2 className="panel-title">Assembly Editor</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help ml-1" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                Write RISC-V assembly code here. <br />
                Supports: add, addi, sub, and, or, xor, sll, srl, sra, slt, sltu, lw, sw, beq, bne, blt, bge, lui, jal, jalr <br />
                Use registers: x0-x31 or aliases (ra, sp, t0-t6, s0-s11, a0-a7) <br />
                Click "Assemble & Load" to convert to machine code.
              </p>
            </TooltipContent>
          </Tooltip>
          
          <div className="ml-auto relative">
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded bg-secondary/50"
            >
              Examples <ChevronDown className={cn("w-3 h-3 transition-transform", showExamples && "rotate-180")} />
            </button>
            
            {showExamples && (
              <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 min-w-[150px]">
                <button
                  onClick={() => loadExample('simple')}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-secondary/50 rounded-t-lg"
                >
                  Simple Example
                </button>
                <button
                  onClick={() => loadExample('sum1to5')}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-secondary/50"
                >
                  Sum 1 to 5
                </button>
                <button
                  onClick={() => loadExample('fibonacci')}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-secondary/50"
                >
                  Fibonacci
                </button>
                <button
                  onClick={() => loadExample('factorial')}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-secondary/50 rounded-b-lg"
                >
                  Factorial
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-[150px] sm:min-h-[200px] mb-3">
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setAssembled(false);
              setErrors([]);
            }}
            className="w-full h-full bg-background/50 border border-border rounded-lg p-2 sm:p-3 font-mono text-[11px] sm:text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Enter RISC-V assembly code..."
            spellCheck={false}
          />
        </div>

        {errors.length > 0 && (
          <div className="mb-3 p-2 bg-destructive/10 border border-destructive/30 rounded-lg">
            <div className="flex items-center gap-2 text-destructive text-xs font-medium mb-1">
              <AlertCircle className="w-3 h-3" />
              Assembly Errors
            </div>
            <ul className="text-[10px] sm:text-xs text-destructive/80 space-y-0.5 font-mono">
              {errors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {errors.length > 5 && <li>...and {errors.length - 5} more errors</li>}
            </ul>
          </div>
        )}

        {assembled && errors.length === 0 && (
          <div className="mb-3 p-2 bg-success/10 border border-success/30 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-success" />
            <span className="text-[10px] sm:text-xs text-success">Program assembled and loaded!</span>
          </div>
        )}

        <button
          onClick={handleAssemble}
          className="w-full control-btn-primary justify-center text-sm"
        >
          <Play className="w-4 h-4" />
          Assemble & Load
        </button>
      </div>
    </TooltipProvider>
  );
}

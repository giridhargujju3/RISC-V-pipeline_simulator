import { useState } from 'react';
import { assembleProgram, EXAMPLE_PROGRAMS } from '@/lib/riscv-assembler';
import { Instruction } from '@/types/cpu';
import { Code2, Play, AlertCircle, CheckCircle, ChevronDown, HelpCircle, Cpu, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { API_CONFIG } from '@/lib/api';

interface AssemblyEditorProps {
  onLoad: (instructions: Instruction[]) => void;
  onArchApplied?: () => void;
  onArchState?: (state: any) => void;
}

const DEFAULT_MICROARCH = `"""
Microarchitecture Specification
--------------------------------
In-Order 5-Stage CPU Pipeline
"""

MICROARCH = {
    "name": "inorder_5stage",
    "description": "Classic 5-stage in-order RISC pipeline",
    "pipeline_stages": ["IF", "ID", "EX", "MEM", "WB"],
    "issue_width": 1,
    "forwarding": True,
    "branch_penalty": 3,
    "memory_latency": 2,
    "functional_units": {
        "ALU":    {"latency": 1, "instances": 1},
        "MEM":    {"latency": 2, "instances": 1},
        "BRANCH": {"latency": 1, "instances": 1},
        "JUMP":   {"latency": 1, "instances": 1}
    },
    "pipeline_capacity": 5,
    "pipelined_execution": True,
    "control": {
        "branch_resolution_stage": "EX",
        "branch_prediction": False
    },
    "debug": {
        "trace_pipeline": False,
        "trace_stalls": False
    }
}
`;

export function AssemblyEditor({ onLoad, onArchApplied, onArchState }: AssemblyEditorProps) {
  const [mode, setMode] = useState<'assembly' | 'architecture'>('assembly');
  const [code, setCode] = useState(EXAMPLE_PROGRAMS.simple);
  const [archCode, setArchCode] = useState(DEFAULT_MICROARCH);
  const [errors, setErrors] = useState<string[]>([]);
  const [assembled, setAssembled] = useState(false);
  const [archStatus, setArchStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [applyingArch, setApplyingArch] = useState(false);
  const { toast } = useToast();

  const handleAssemble = () => {
    try {
      const result = assembleProgram(code);
      setErrors(result.errors);
      setAssembled(result.success);
      if (result.success && result.instructions.length > 0) {
        onLoad(result.instructions);
        toast({ title: "✅ Assembly Successful", description: `Assembled ${result.instructions.length} instructions` });
      } else if (result.instructions.length === 0) {
        setErrors(["No valid instructions found. Please check your assembly code."]);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setErrors([`Assembly failed: ${msg}`]);
      setAssembled(false);
      toast({ title: "❌ Assembly Failed", description: msg, variant: "destructive" });
    }
  };

  const handleApplyArch = async () => {
    setApplyingArch(true);
    setArchStatus(null);
    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/microarch/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: archCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail || 'Unknown error';
        setArchStatus({ ok: false, msg: detail });
        toast({ title: "❌ Architecture Error", description: detail, variant: "destructive" });
      } else {
        const spec = data.spec || {};
        const msg = `Applied: ${spec.name || 'unknown'} | forwarding=${spec.forwarding} | branch_penalty=${spec.branch_penalty} | mem_latency=${spec.memory_latency}`;
        setArchStatus({ ok: true, msg });
        toast({ title: "✅ Architecture Applied", description: data.message });
        // Sync state from backend response if available
        if (data.state && onArchState) {
          onArchState(data.state);
        } else {
          onArchApplied?.();
        }
      }
    } catch (e) {
      const msg = 'Backend not reachable. Start the backend server first.';
      setArchStatus({ ok: false, msg });
      toast({ title: "❌ Connection Error", description: msg, variant: "destructive" });
    } finally {
      setApplyingArch(false);
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

        {/* Header */}
        <div className="panel-header mb-2">
          {mode === 'assembly'
            ? <Code2 className="w-4 h-4 text-primary" />
            : <Cpu className="w-4 h-4 text-accent" />
          }
          <h2 className="panel-title">
            {mode === 'assembly' ? 'Assembly Editor' : 'Architecture Config'}
          </h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help ml-1" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {mode === 'assembly' ? (
                <p className="text-xs">
                  Write RISC-V assembly code here.<br />
                  Supports: add, addi, sub, and, or, xor, lw, sw, beq, bne, jal, jalr, lui, auipc…<br />
                  Use x0–x31 or ABI names (ra, sp, t0–t6, a0–a7, s0–s11).
                </p>
              ) : (
                <p className="text-xs">
                  Define the CPU microarchitecture using Python.<br />
                  Paste or edit the MICROARCH dictionary.<br />
                  Click "Apply Architecture" to update the running simulator.
                </p>
              )}
            </TooltipContent>
          </Tooltip>

          <div className="ml-auto flex items-center gap-1">
            {/* Mode toggle */}
            <div className="flex rounded-md border border-border overflow-hidden text-[10px] font-medium">
              <button
                onClick={() => { setMode('assembly'); setShowExamples(false); }}
                className={cn(
                  "px-2 py-1 transition-colors",
                  mode === 'assembly' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/50"
                )}
              >
                Assembly
              </button>
              <button
                onClick={() => { setMode('architecture'); setShowExamples(false); }}
                className={cn(
                  "px-2 py-1 transition-colors",
                  mode === 'architecture' ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary/50"
                )}
              >
                Architecture
              </button>
            </div>

            {/* Examples dropdown — only in assembly mode */}
            {mode === 'assembly' && (
              <div className="relative">
                <button
                  onClick={() => setShowExamples(!showExamples)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded bg-secondary/50"
                >
                  Examples <ChevronDown className={cn("w-3 h-3 transition-transform", showExamples && "rotate-180")} />
                </button>
                {showExamples && (
                  <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 min-w-[150px]">
                    {(['simple', 'sum1to5', 'fibonacci', 'factorial'] as const).map((name, i, arr) => (
                      <button
                        key={name}
                        onClick={() => loadExample(name)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs hover:bg-secondary/50",
                          i === 0 && "rounded-t-lg",
                          i === arr.length - 1 && "rounded-b-lg"
                        )}
                      >
                        {name === 'simple' ? 'Simple Example' : name === 'sum1to5' ? 'Sum 1 to 5' : name.charAt(0).toUpperCase() + name.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── ASSEMBLY MODE ── */}
        {mode === 'assembly' && (
          <>
            <div className="flex-1 min-h-[150px] sm:min-h-[200px] mb-3">
              <textarea
                value={code}
                onChange={(e) => { setCode(e.target.value); setAssembled(false); setErrors([]); }}
                className="w-full h-full bg-background/50 border border-border rounded-lg p-2 sm:p-3 font-mono text-[11px] sm:text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter RISC-V assembly code..."
                spellCheck={false}
              />
            </div>

            {errors.length > 0 && (
              <div className="mb-3 p-2 bg-destructive/10 border border-destructive/30 rounded-lg">
                <div className="flex items-center gap-2 text-destructive text-xs font-medium mb-1">
                  <AlertCircle className="w-3 h-3" /> Assembly Errors
                </div>
                <ul className="text-[10px] sm:text-xs text-destructive/80 space-y-0.5 font-mono">
                  {errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
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

            <button onClick={handleAssemble} className="w-full control-btn-primary justify-center text-sm">
              <Play className="w-4 h-4" />
              Assemble & Load
            </button>
          </>
        )}

        {/* ── ARCHITECTURE MODE ── */}
        {mode === 'architecture' && (
          <>
            <div className="mb-2 p-2 bg-accent/10 border border-accent/30 rounded-lg text-[10px] text-accent/90">
              Define the <span className="font-mono font-semibold">MICROARCH</span> dict in Python. Changes apply live to the running simulator and persist across restarts.
            </div>

            <div className="flex-1 min-h-[150px] sm:min-h-[200px] mb-3">
              <textarea
                value={archCode}
                onChange={(e) => { setArchCode(e.target.value); setArchStatus(null); }}
                className="w-full h-full bg-background/50 border border-border rounded-lg p-2 sm:p-3 font-mono text-[11px] sm:text-xs text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Paste your MICROARCH Python dict here..."
                spellCheck={false}
              />
            </div>

            {archStatus && (
              <div className={cn(
                "mb-3 p-2 rounded-lg border flex items-start gap-2 text-[10px] sm:text-xs",
                archStatus.ok
                  ? "bg-success/10 border-success/30 text-success"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              )}>
                {archStatus.ok
                  ? <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" />
                  : <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                }
                <span>{archStatus.msg}</span>
              </div>
            )}

            <button
              onClick={handleApplyArch}
              disabled={applyingArch}
              className={cn(
                "w-full justify-center text-sm flex items-center gap-2 py-2 px-4 rounded-lg font-medium transition-all",
                applyingArch
                  ? "bg-accent/40 text-accent-foreground/60 cursor-not-allowed"
                  : "bg-accent hover:bg-accent/90 text-accent-foreground"
              )}
            >
              <Upload className="w-4 h-4" />
              {applyingArch ? 'Applying…' : 'Apply Architecture'}
            </button>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

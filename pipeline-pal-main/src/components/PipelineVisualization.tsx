import { CPUState } from '@/types/cpu';
import { PipelineStage } from './PipelineStage';
import { ArrowRight, ArrowDown, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PipelineVisualizationProps {
  state: CPUState;
}

export function PipelineVisualization({ state }: PipelineVisualizationProps) {
  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
        <div className="panel-header">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h2 className="panel-title">Pipeline Stages</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help ml-1" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                The 5-stage pipeline processes instructions through: <br />
                <strong>IF</strong> (Fetch) → <strong>ID</strong> (Decode) → <strong>EX</strong> (Execute) → <strong>MEM</strong> (Memory) → <strong>WB</strong> (Write Back)
              </p>
            </TooltipContent>
          </Tooltip>
          
          {/* Legend */}
          <div className="ml-auto hidden lg:flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">Legend:</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-stage-fetch" />
              <span>Fetch</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-stage-decode" />
              <span>Decode</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-stage-execute" />
              <span>Execute</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-stage-memory" />
              <span>Memory</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded bg-stage-writeback" />
              <span>WriteBack</span>
            </div>
          </div>
        </div>
        
        {/* Desktop: Horizontal layout */}
        <div className="hidden lg:flex items-stretch gap-2">
          <div className="flex-1">
            <PipelineStage
              name="Instruction Fetch"
              shortName="IF"
              register={state.IF_ID}
              color="fetch"
              description="Fetches instruction from memory at PC address"
            />
          </div>
          
          <div className="flex items-center">
            <ArrowRight className="w-5 h-5 text-data-flow animate-pulse" />
          </div>
          
          <div className="flex-1">
            <PipelineStage
              name="Instruction Decode"
              shortName="ID"
              register={state.ID_EX}
              color="decode"
              description="Decodes instruction and reads register values"
            />
          </div>
          
          <div className="flex items-center">
            <ArrowRight className="w-5 h-5 text-data-flow animate-pulse" />
          </div>
          
          <div className="flex-1">
            <PipelineStage
              name="Execute"
              shortName="EX"
              register={state.EX_MEM}
              color="execute"
              description="ALU performs arithmetic/logic operations"
            />
          </div>
          
          <div className="flex items-center">
            <ArrowRight className="w-5 h-5 text-data-flow animate-pulse" />
          </div>
          
          <div className="flex-1">
            <PipelineStage
              name="Memory Access"
              shortName="MEM"
              register={state.MEM_WB}
              color="memory"
              description="Load/Store data from/to memory"
            />
          </div>
          
          <div className="flex items-center">
            <ArrowRight className="w-5 h-5 text-data-flow animate-pulse" />
          </div>
          
          <div className="flex-1">
            <PipelineStage
              name="Write Back"
              shortName="WB"
              register={{
                instruction: state.MEM_WB.instruction,
                pc: state.MEM_WB.pc,
                valid: state.MEM_WB.valid && state.MEM_WB.rd !== undefined,
                rd: state.MEM_WB.rd,
                alu_result: state.MEM_WB.alu_result,
              }}
              color="writeback"
              description="Writes result back to register file"
            />
          </div>
        </div>
        
        {/* Tablet: 2x3 Grid layout */}
        <div className="hidden md:grid lg:hidden grid-cols-3 gap-3">
          <PipelineStage
            name="Instruction Fetch"
            shortName="IF"
            register={state.IF_ID}
            color="fetch"
            compact
            description="Fetches instruction from memory"
          />
          <PipelineStage
            name="Instruction Decode"
            shortName="ID"
            register={state.ID_EX}
            color="decode"
            compact
            description="Decodes instruction"
          />
          <PipelineStage
            name="Execute"
            shortName="EX"
            register={state.EX_MEM}
            color="execute"
            compact
            description="ALU operations"
          />
          <PipelineStage
            name="Memory Access"
            shortName="MEM"
            register={state.MEM_WB}
            color="memory"
            compact
            description="Memory access"
          />
          <PipelineStage
            name="Write Back"
            shortName="WB"
            register={{
              instruction: state.MEM_WB.instruction,
              pc: state.MEM_WB.pc,
              valid: state.MEM_WB.valid && state.MEM_WB.rd !== undefined,
              rd: state.MEM_WB.rd,
              alu_result: state.MEM_WB.alu_result,
            }}
            color="writeback"
            compact
            description="Write to register"
          />
        </div>
        
        {/* Mobile: Vertical layout */}
        <div className="flex md:hidden flex-col gap-2">
          {[
            { name: "Instruction Fetch", short: "IF", reg: state.IF_ID, color: "fetch" as const },
            { name: "Instruction Decode", short: "ID", reg: state.ID_EX, color: "decode" as const },
            { name: "Execute", short: "EX", reg: state.EX_MEM, color: "execute" as const },
            { name: "Memory Access", short: "MEM", reg: state.MEM_WB, color: "memory" as const },
            { name: "Write Back", short: "WB", reg: {
              instruction: state.MEM_WB.instruction,
              pc: state.MEM_WB.pc,
              valid: state.MEM_WB.valid && state.MEM_WB.rd !== undefined,
              rd: state.MEM_WB.rd,
              alu_result: state.MEM_WB.alu_result,
            }, color: "writeback" as const },
          ].map((stage, index, arr) => (
            <div key={stage.short}>
              <PipelineStage
                name={stage.name}
                shortName={stage.short}
                register={stage.reg}
                color={stage.color}
                compact
              />
              {index < arr.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="w-4 h-4 text-data-flow animate-pulse" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

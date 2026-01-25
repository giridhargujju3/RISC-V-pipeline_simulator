import { useCPUSimulator } from '@/hooks/useCPUSimulator';
import { ControlPanel } from '@/components/ControlPanel';
import { PipelineVisualization } from '@/components/PipelineVisualization';
import { RegisterFile } from '@/components/RegisterFile';
import { InstructionMemory } from '@/components/InstructionMemory';
import { ALUPanel } from '@/components/ALUPanel';
import { ExecutionTimeline } from '@/components/ExecutionTimeline';
import { ControlSignalsPanel } from '@/components/ControlSignalsPanel';
import { AssemblyEditor } from '@/components/AssemblyEditor';
import { HazardPanel } from '@/components/HazardPanel';
import { BackendStatus } from '@/components/BackendStatus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code2, Cpu, Activity, AlertTriangle, Settings2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Index = () => {
  const { state, step, reset, run, pause, loadProgram, useBackend, setUseBackend } = useCPUSimulator();

  return (
    <div className="min-h-screen bg-background grid-pattern p-2 sm:p-4">
      <div className="max-w-[1800px] mx-auto space-y-3 sm:space-y-4">
        {/* Application Header */}
        <div className="text-center py-4 border-b border-border/30">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">
            RISC-V 5-Stage Pipelined CPU Simulator
          </h1>
          <p className="text-sm text-muted-foreground">
            Educational tool for understanding CPU pipeline architecture and hazard detection
          </p>
        </div>

        {/* Quick Help */}
        <Alert className="bg-card/50 border-primary/30">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>How to use:</strong> Write RISC-V assembly in the editor → Click "Assemble & Load" → Use controls to step through execution.
            The pipeline visualization shows instruction flow through IF→ID→EX→MEM→WB stages.
          </AlertDescription>
        </Alert>
        {/* Control Panel with Backend Status */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4">
          <div className="flex-1">
            <ControlPanel
              cycle={state.cycle}
              pc={state.pc}
              running={state.running}
              halted={state.halted}
              onStep={step}
              onRun={run}
              onPause={pause}
              onReset={reset}
            />
          </div>
          <BackendStatus
            useBackend={useBackend}
            onToggleMode={setUseBackend}
          />
        </div>

        {/* Pipeline Visualization */}
        <PipelineVisualization state={state} />

        {/* Mobile/Tablet: Tabbed interface */}
        <div className="lg:hidden">
          <Tabs defaultValue="code" className="w-full">
            <TabsList className="w-full grid grid-cols-5 h-auto">
              <TabsTrigger value="code" className="flex flex-col gap-1 py-2">
                <Code2 className="w-4 h-4" />
                <span className="text-[10px]">Code</span>
              </TabsTrigger>
              <TabsTrigger value="cpu" className="flex flex-col gap-1 py-2">
                <Cpu className="w-4 h-4" />
                <span className="text-[10px]">CPU</span>
              </TabsTrigger>
              <TabsTrigger value="hazards" className="flex flex-col gap-1 py-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-[10px]">Hazards</span>
              </TabsTrigger>
              <TabsTrigger value="registers" className="flex flex-col gap-1 py-2">
                <Activity className="w-4 h-4" />
                <span className="text-[10px]">Regs</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex flex-col gap-1 py-2">
                <Settings2 className="w-4 h-4" />
                <span className="text-[10px]">Timeline</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="code" className="mt-3 space-y-3">
              <AssemblyEditor onLoad={loadProgram} />
              <InstructionMemory
                instructions={state.instructionMemory}
                currentPC={state.pc}
              />
            </TabsContent>
            
            <TabsContent value="cpu" className="mt-3 space-y-3">
              <ALUPanel alu={state.alu} />
              <ControlSignalsPanel signals={state.ID_EX.control_signals} />
            </TabsContent>
            
            <TabsContent value="timeline" className="mt-3">
              <ExecutionTimeline state={state} />
            </TabsContent>
            
            <TabsContent value="hazards" className="mt-3">
              <HazardPanel state={state} />
            </TabsContent>
            
            <TabsContent value="registers" className="mt-3">
              <RegisterFile
                registers={state.registers}
                updatedRegister={state.updatedRegister}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop: Full grid layout */}
        <div className="hidden lg:grid grid-cols-12 gap-4">
          {/* Left Column - Assembly Editor */}
          <div className="col-span-4 space-y-4">
            <AssemblyEditor onLoad={loadProgram} />
          </div>

          {/* Middle Column - Pipeline & Controls */}
          <div className="col-span-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ALUPanel alu={state.alu} />
              <ControlSignalsPanel signals={state.ID_EX.control_signals} />
            </div>
            <HazardPanel state={state} />
            <ExecutionTimeline state={state} />
          </div>

          {/* Right Column - Memory & Registers */}
          <div className="col-span-3 space-y-4">
            <InstructionMemory
              instructions={state.instructionMemory}
              currentPC={state.pc}
            />
            <RegisterFile
              registers={state.registers}
              updatedRegister={state.updatedRegister}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] sm:text-xs text-muted-foreground pt-3 sm:pt-4 border-t border-border/30">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
            <div>
              <p className="font-semibold">Pipeline Stages</p>
              <p>IF → ID → EX → MEM → WB</p>
            </div>
            <div>
              <p className="font-semibold">Features</p>
              <p>Hazard Detection • Forwarding • Stalls</p>
            </div>
            <div>
              <p className="font-semibold">Mode</p>
              <p>{useBackend ? 'Python Backend' : 'JavaScript Simulation'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

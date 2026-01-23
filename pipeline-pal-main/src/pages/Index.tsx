import { useCPUSimulator } from '@/hooks/useCPUSimulator';
import { ControlPanel } from '@/components/ControlPanel';
import { PipelineVisualization } from '@/components/PipelineVisualization';
import { RegisterFile } from '@/components/RegisterFile';
import { InstructionMemory } from '@/components/InstructionMemory';
import { ALUPanel } from '@/components/ALUPanel';
import { ExecutionTimeline } from '@/components/ExecutionTimeline';
import { ExecutionLog } from '@/components/ExecutionLog';
import { ControlSignalsPanel } from '@/components/ControlSignalsPanel';
import { AssemblyEditor } from '@/components/AssemblyEditor';
import { HazardPanel } from '@/components/HazardPanel';
import { BackendStatus } from '@/components/BackendStatus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code2, Cpu, Activity, AlertTriangle, Settings2, Info, Zap, Layers, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Custom RISC-V CPU Logo Component
const RiscVLogo = () => (
  <div className="relative">
    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary via-accent to-primary rounded-xl border border-primary/30 shadow-lg glow-primary">
      <div className="relative">
        {/* CPU Core */}
        <div className="w-8 h-8 bg-primary/20 rounded border border-primary/50 flex items-center justify-center">
          <div className="w-4 h-4 bg-primary rounded-sm flex items-center justify-center">
            <div className="w-2 h-2 bg-primary-foreground rounded-xs animate-pulse" />
          </div>
        </div>
        {/* Pipeline Indicators */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse" />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-success rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
    </div>
    {/* Glow Effect */}
    <div className="absolute inset-0 w-12 h-12 bg-primary/20 rounded-xl blur-md animate-pulse" />
  </div>
);

const Index = () => {
  const { state, step, reset, run, pause, loadProgram, useBackend, setUseBackend } = useCPUSimulator();

  return (
    <div className="min-h-screen bg-background grid-pattern">
      <div className="max-w-[1800px] mx-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
        {/* Enhanced Application Header */}
        <div className="relative overflow-hidden">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 rounded-2xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/50 to-card rounded-2xl" />
          
          {/* Header Content */}
          <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Logo and Title Section */}
              <div className="flex items-center gap-6">
                <RiscVLogo />
                
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                      RISC-V Pipeline Simulator
                    </h1>
                    <div className="hidden sm:flex items-center gap-1 px-3 py-1 bg-primary/20 rounded-full border border-primary/30">
                      <Layers className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-primary">5-Stage</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-accent" />
                      <span>Educational CPU Architecture Tool</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1">
                      <span>IF</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>ID</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>EX</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>MEM</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>WB</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Status and Backend Toggle */}
              <div className="flex items-center gap-4">
                <BackendStatus useBackend={useBackend} onToggleMode={setUseBackend} />
                
                <div className="hidden lg:block text-right">
                  <div className="text-sm font-medium text-foreground">
                    Cycle <span className="font-mono text-primary">{state.cycle}</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    PC: 0x{state.pc.toString(16).padStart(8, '0').toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl" />
            <div className="absolute bottom-4 left-4 w-24 h-24 bg-gradient-to-tr from-accent/10 to-primary/10 rounded-full blur-2xl" />
          </div>
        </div>

        {/* Quick Help */}
        <Alert className="bg-card/50 border-primary/30">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>How to use:</strong> Write RISC-V assembly in the editor → Click "Assemble & Load" → Use controls to step through execution.
            The pipeline visualization shows instruction flow through IF→ID→EX→MEM→WB stages.
          </AlertDescription>
        </Alert>

        {/* Control Panel */}
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
            </TabsContent>
            
            <TabsContent value="cpu" className="mt-3 space-y-3">
              <ALUPanel alu={state.alu} />
              <ControlSignalsPanel signals={state.ID_EX.control_signals} />
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
            
            <TabsContent value="timeline" className="mt-3 space-y-3">
              <ExecutionLog state={state} />
              <ExecutionTimeline state={state} />
              <InstructionMemory
                instructions={state.instructionMemory}
                currentPC={state.pc}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop: Perfect Dashboard Layout */}
        <div className="hidden lg:block">
          {/* Top Row: Assembly Editor + ALU/Control + Register File */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            {/* Assembly Editor */}
            <div className="col-span-3">
              <AssemblyEditor onLoad={loadProgram} />
            </div>
            
            {/* ALU + Control Signals */}
            <div className="col-span-6 grid grid-cols-2 gap-4">
              <ALUPanel alu={state.alu} />
              <ControlSignalsPanel signals={state.ID_EX.control_signals} />
            </div>
            
            {/* Register File */}
            <div className="col-span-3">
              <RegisterFile
                registers={state.registers}
                updatedRegister={state.updatedRegister}
              />
            </div>
          </div>

          {/* Middle Row: Hazard Detection + Execution Log */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-6">
              <HazardPanel state={state} />
            </div>
            <div className="col-span-6">
              <ExecutionLog state={state} />
            </div>
          </div>

          {/* Bottom Row: Execution Timeline + Instruction Memory */}
          <div className="grid grid-cols-2 gap-4">
            <ExecutionTimeline state={state} />
            <InstructionMemory
              instructions={state.instructionMemory}
              currentPC={state.pc}
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
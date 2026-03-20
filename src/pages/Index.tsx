import { useState } from 'react';
import { useCPUSimulator } from '@/hooks/useCPUSimulator';
import { ControlPanel } from '@/components/ControlPanel';
import { PipelineVisualization } from '@/components/PipelineVisualization';
import { RegisterFile } from '@/components/RegisterFile';
import { InstructionMemory } from '@/components/InstructionMemory';
import { ALUPanel } from '@/components/ALUPanel';
import { ExecutionTimeline } from '@/components/ExecutionTimeline';
import { ExecutionLog } from '@/components/ExecutionLog';
import { ExecutionStats } from '@/components/ExecutionStats';
import { StatisticsDetailsSidebarDesktop } from '@/components/StatisticsDetailsSidebar';
import { ControlSignalsPanel } from '@/components/ControlSignalsPanel';
import { AssemblyEditor } from '@/components/AssemblyEditor';
import { HazardPanel } from '@/components/HazardPanel';
import { BackendStatus } from '@/components/BackendStatus';
import { ConfigPanel } from '@/components/ConfigPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PipelineTraceTable } from '@/components/PipelineTraceTable';
import { StaticDepsPanel } from '@/components/StaticDepsPanel';
import { ROBPanel } from '@/components/ROBPanel';
import { ReservationStationPanel } from '@/components/ReservationStationPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code2, Cpu, Activity, AlertTriangle, Settings2, Info, Zap, Layers, ArrowRight, BarChart3, GitMerge, Database } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const RiscVLogo = () => (
  <div className="relative">
    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary via-accent to-primary rounded-xl border border-primary/30 shadow-lg glow-primary">
      <div className="relative">
        <div className="w-8 h-8 bg-primary/20 rounded border border-primary/50 flex items-center justify-center">
          <div className="w-4 h-4 bg-primary rounded-sm flex items-center justify-center">
            <div className="w-2 h-2 bg-primary-foreground rounded-xs animate-pulse" />
          </div>
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse" />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-success rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
    </div>
    <div className="absolute inset-0 w-12 h-12 bg-primary/20 rounded-xl blur-md animate-pulse" />
  </div>
);

const Index = () => {
  const [statsDetailsOpen, setStatsDetailsOpen] = useState(false);
  
  const { 
    state, 
    step, 
    reset, 
    run, 
    pause,
    backward,
    loadProgram,
    applyArchState,
    useBackend, 
    setUseBackend,
    configOptions,
    currentIsa,
    currentCore,
    setConfig
  } = useCPUSimulator();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background grid-pattern">
        <div className="max-w-[2000px] mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Enhanced Header */}
          <div className="relative overflow-hidden rounded-2xl shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/60 to-card/90" />
            
            <div className="relative bg-card/90 backdrop-blur-md border-2 border-primary/30 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-6">
                  <RiscVLogo />
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-lg">
                        RISC-V Pipeline Simulator
                      </h1>
                      <div className="flex items-center gap-1 px-4 py-1.5 bg-primary/20 rounded-full border border-primary/40 shadow-lg">
                        <Layers className="w-5 h-5 text-primary" />
                        <span className="text-sm font-bold text-primary">5-Stage Pipeline</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-accent" />
                        <span className="font-medium">Educational CPU Architecture Simulator</span>
                      </div>
                      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg border border-border/50">
                        <span className="font-semibold">IF</span>
                        <ArrowRight className="w-4 h-4 text-accent" />
                        <span className="font-semibold">ID</span>
                        <ArrowRight className="w-4 h-4 text-accent" />
                        <span className="font-semibold">EX</span>
                        <ArrowRight className="w-4 h-4 text-accent" />
                        <span className="font-semibold">MEM</span>
                        <ArrowRight className="w-4 h-4 text-accent" />
                        <span className="font-semibold">WB</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <BackendStatus />
                  
                  <div className="hidden lg:flex flex-col gap-2 p-4 bg-secondary/50 rounded-xl border border-border/50 shadow-lg">
                    <div className="text-sm font-semibold text-foreground">
                      Cycle <span className="font-mono text-xl text-primary ml-2">{state.cycle}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      PC: <span className="text-foreground font-semibold">0x{state.pc.toString(16).padStart(8, '0').toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="absolute top-4 right-4 w-40 h-40 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl animate-pulse-slow" />
              <div className="absolute bottom-4 left-4 w-32 h-32 bg-gradient-to-tr from-accent/20 to-primary/20 rounded-full blur-3xl animate-pulse-slow" />
            </div>
          </div>

          {/* Info Alert */}
          <Alert className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/40 shadow-lg">
            <Info className="h-5 w-5 text-primary" />
            <AlertDescription className="text-sm font-medium">
              <strong className="text-primary">Quick Start:</strong> Write RISC-V assembly in the editor → Click "Assemble & Load" → Use control buttons to step through execution.
              Watch instructions flow through the 5-stage pipeline (IF→ID→EX→MEM→WB).
            </AlertDescription>
          </Alert>

          {/* Config Panel */}
          {Object.keys(configOptions.isas).length > 0 && (
            <ConfigPanel
              currentIsa={currentIsa}
              currentCore={currentCore}
              availableIsas={configOptions.isas}
              availableCores={configOptions.cores}
              onConfigChange={setConfig}
              disabled={state.running}
            />
          )}

          {/* Control Panel */}
          <div className="bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-sm rounded-xl border-2 border-primary/20 shadow-xl">
            <ControlPanel
              cycle={state.cycle}
              pc={state.pc}
              running={state.running}
              halted={state.halted}
              onStep={step}
              onBackward={backward}
              onRun={run}
              onPause={pause}
              onReset={reset}
            />
          </div>

          {/* Pipeline Visualization - Featured Section */}
          <div className="bg-gradient-to-br from-card via-card/95 to-card/90 rounded-xl border-2 border-accent/30 shadow-2xl p-1">
            <PipelineVisualization state={state} />
          </div>

          {/* Mobile/Tablet Layout - Enhanced Tabs */}
          <div className="lg:hidden">
            <Tabs defaultValue="code" className="w-full">
              <TabsList className="w-full grid grid-cols-6 h-auto bg-card/80 border-2 border-primary/20 rounded-xl p-1 shadow-lg">
                <TabsTrigger value="code" className="flex flex-col gap-1 py-3 data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg">
                  <Code2 className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">Code</span>
                </TabsTrigger>
                <TabsTrigger value="cpu" className="flex flex-col gap-1 py-3 data-[state=active]:bg-warning/20 data-[state=active]:text-warning rounded-lg">
                  <Cpu className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">CPU</span>
                </TabsTrigger>
                <TabsTrigger value="hazards" className="flex flex-col gap-1 py-3 data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">Hazards</span>
                </TabsTrigger>
                <TabsTrigger value="registers" className="flex flex-col gap-1 py-3 data-[state=active]:bg-success/20 data-[state=active]:text-success rounded-lg">
                  <Activity className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">Regs</span>
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex flex-col gap-1 py-3 data-[state=active]:bg-accent/20 data-[state=active]:text-accent rounded-lg">
                  <Settings2 className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">Timeline</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex flex-col gap-1 py-3 data-[state=active]:bg-accent/20 data-[state=active]:text-accent rounded-lg">
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">Stats</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="code" className="mt-4 space-y-4">
                <div className="bg-gradient-to-br from-card to-card/80 rounded-xl border-2 border-primary/20 shadow-xl p-1">
                  <AssemblyEditor onLoad={loadProgram} onArchApplied={reset} onArchState={applyArchState} />
                </div>
              </TabsContent>
              
              <TabsContent value="cpu" className="mt-4 space-y-4">
                <div className="bg-gradient-to-br from-card to-card/80 rounded-xl border-2 border-warning/20 shadow-xl p-1">
                  <ALUPanel alu={state.alu} idEx={state.ID_EX} exMem={state.EX_MEM} hazards={state.hazards} />
                </div>
                <div className="bg-gradient-to-br from-card to-card/80 rounded-xl border-2 border-primary/20 shadow-xl p-1">
                  <ControlSignalsPanel signals={state.ID_EX.control_signals} />
                </div>
              </TabsContent>
              
              <TabsContent value="hazards" className="mt-4">
                <div className="bg-gradient-to-br from-card to-card/80 rounded-xl border-2 border-destructive/20 shadow-xl p-3">
                  <HazardPanel state={state} />
                </div>
              </TabsContent>
              
              <TabsContent value="registers" className="mt-4">
                <div className="bg-gradient-to-br from-card to-card/80 rounded-xl border-2 border-success/20 shadow-xl p-3">
                  <RegisterFile
                    registers={state.registers}
                    updatedRegister={state.updatedRegister}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="timeline" className="mt-4 space-y-4">
                <div className="bg-gradient-to-br from-card to-card/80 rounded-xl border-2 border-accent/20 shadow-xl p-1">
                  <ExecutionLog state={state} />
                </div>
                <div className="bg-gradient-to-br from-card to-card/80 rounded-xl border-2 border-accent/20 shadow-xl p-1">
                  <ExecutionTimeline state={state} />
                </div>
                <div className="bg-gradient-to-br from-card to-card/80 rounded-xl border-2 border-primary/20 shadow-xl p-1">
                  <InstructionMemory
                    instructions={state.instructionMemory}
                    currentPC={state.pc}
                  />
                </div>
              </TabsContent>

              <TabsContent value="stats" className="mt-4 space-y-4">
                <div className="bg-gradient-to-br from-card to-card/80 rounded-xl border-2 border-accent/20 shadow-xl p-1">
                  <ExecutionStats state={state} onDetails={() => setStatsDetailsOpen(true)} />
                </div>
                <div className="bg-gradient-to-br from-card to-card/80 rounded-xl border-2 border-primary/20 shadow-xl p-1">
                  <PipelineTraceTable
                    trace={state.pipelineTrace || []}
                    mode={state.executionMode || 'inorder'}
                  />
                </div>
                <div className="bg-gradient-to-br from-card to-card/80 rounded-xl border-2 border-primary/20 shadow-xl p-1">
                  <StaticDepsPanel deps={state.staticDependencies || []} />
                </div>
                {state.executionMode === 'ooo' && state.oooState && (
                  <>
                    <div className="bg-gradient-to-br from-card to-card/80 rounded-xl border-2 border-primary/20 shadow-xl p-1">
                      <ROBPanel oooState={state.oooState} />
                    </div>
                    <div className="bg-gradient-to-br from-card to-card/80 rounded-xl border-2 border-primary/20 shadow-xl p-1">
                      <ReservationStationPanel oooState={state.oooState} />
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="hidden lg:block">
            {/* Row 1: Assembly Editor | ALU + Control | Register File — fixed 480px */}
            <div className="grid grid-cols-12 gap-4 mb-4" style={{ height: '480px' }}>
              <div className="col-span-3 h-full overflow-hidden">
                <AssemblyEditor onLoad={loadProgram} onArchApplied={reset} onArchState={applyArchState} />
              </div>
              <div className="col-span-6 grid grid-cols-2 gap-4 h-full">
                <div className="h-full overflow-hidden">
                  <ALUPanel alu={state.alu} idEx={state.ID_EX} exMem={state.EX_MEM} hazards={state.hazards} />
                </div>
                <div className="h-full overflow-hidden">
                  <ControlSignalsPanel signals={state.ID_EX.control_signals} />
                </div>
              </div>
              <div className="col-span-3 h-full overflow-hidden">
                <RegisterFile registers={state.registers} updatedRegister={state.updatedRegister} />
              </div>
            </div>

            {/* Row 2: Hazard Panel | Execution Log — fixed 320px */}
            <div className="grid grid-cols-12 gap-4 mb-4" style={{ height: '320px' }}>
              <div className="col-span-6 h-full overflow-hidden">
                <HazardPanel state={state} />
              </div>
              <div className="col-span-6 h-full overflow-hidden">
                <ExecutionLog state={state} />
              </div>
            </div>

            {/* Row 3: Stats | Pipeline Trace | Static Deps — fixed 400px */}
            <div className="grid grid-cols-12 gap-4 mb-4" style={{ height: '400px' }}>
              <div className="col-span-4 h-full overflow-hidden">
                <ExecutionStats state={state} onDetails={() => setStatsDetailsOpen(true)} />
              </div>
              <div className="col-span-4 h-full overflow-hidden">
                <PipelineTraceTable
                  trace={state.pipelineTrace || []}
                  mode={state.executionMode || 'inorder'}
                />
              </div>
              <div className="col-span-4 h-full overflow-hidden">
                <StaticDepsPanel deps={state.staticDependencies || []} />
              </div>
            </div>

            {/* Row 4: Execution Timeline — fixed 220px */}
            <div className="mb-4" style={{ height: '220px' }}>
              <ExecutionTimeline state={state} />
            </div>

            {/* Row 5 (OoO only): ROB | Reservation Station — fixed 360px */}
            {state.executionMode === 'ooo' && state.oooState && (
              <div className="grid grid-cols-12 gap-4 mb-4" style={{ height: '360px' }}>
                <div className="col-span-6 h-full overflow-hidden">
                  <ROBPanel oooState={state.oooState} />
                </div>
                <div className="col-span-6 h-full overflow-hidden">
                  <ReservationStationPanel oooState={state.oooState} />
                </div>
              </div>
            )}

            {/* Row 6: Instruction Memory — fixed 280px */}
            <div style={{ height: '280px' }}>
              <InstructionMemory instructions={state.instructionMemory} currentPC={state.pc} />
            </div>
          </div>

          {/* Enhanced Footer */}
          <div className="mt-8 pt-6 border-t-2 border-primary/20">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div className="p-4 bg-card/50 rounded-xl border border-border/50 shadow-lg">
                <p className="font-bold text-primary mb-2 text-sm">Pipeline Stages</p>
                <p className="text-xs text-muted-foreground">IF → ID → EX → MEM → WB</p>
              </div>
              <div className="p-4 bg-card/50 rounded-xl border border-border/50 shadow-lg">
                <p className="font-bold text-accent mb-2 text-sm">Hazard Detection</p>
                <p className="text-xs text-muted-foreground">RAW • WAR • WAW • Structural • Memory • Control</p>
              </div>
              <div className="p-4 bg-card/50 rounded-xl border border-border/50 shadow-lg">
                <p className="font-bold text-success mb-2 text-sm">Architecture</p>
                <p className="text-xs text-muted-foreground">In-Order Pipeline • OoO Tomasulo • Trace History</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Details Sidebar - Desktop Only */}
        <StatisticsDetailsSidebarDesktop
          state={state}
          isOpen={statsDetailsOpen}
          onClose={() => setStatsDetailsOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
};

export default Index;
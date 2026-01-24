import { X, ChevronRight } from 'lucide-react';
import { CPUState } from '@/types/cpu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef, useState } from 'react';

interface CycleRecord {
  cycle: number;
  state: CPUState;
}

interface CycleDetailsSidebarProps {
  cycleHistory: CycleRecord[];
  currentState: CPUState;
  isOpen: boolean;
  onClose: () => void;
}

export function CycleDetailsSidebar({ cycleHistory, currentState, isOpen, onClose }: CycleDetailsSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsResizing(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < 800) {
        setWidth(newWidth);
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Auto-scroll to bottom when new cycles are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        setTimeout(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }, 0);
      }
    }
  }, [cycleHistory.length]);

  const stageEmojis = {
    IF: '🔵',
    ID: '🟢',
    EX: '🟡',
    MEM: '🔵',
    WB: '🟣'
  };

  const getStageDetails = (state: CPUState) => {
    const details = [];

    if (state.MEM_WB.valid && state.MEM_WB.reg_write && state.MEM_WB.rd !== 0) {
      const writeData = state.MEM_WB.mem_to_reg ? state.MEM_WB.mem_data : state.MEM_WB.alu_result;
      details.push(
        `${stageEmojis.WB} WB STAGE: Writing x${state.MEM_WB.rd} = ${writeData} ('${state.MEM_WB.assembly || 'nop'}')`
      );
    }

    if (state.EX_MEM.valid) {
      details.push(
        `${stageEmojis.MEM} MEM STAGE: Processing '${state.EX_MEM.assembly || 'nop'}' (${
          state.EX_MEM.mem_read || state.EX_MEM.mem_write ? 'memory operation' : 'no memory operation'
        })`
      );
    }

    if (state.ID_EX.valid) {
      details.push(
        `${stageEmojis.EX} EX STAGE: Executing '${state.ID_EX.assembly || 'nop'}' -> result = ${state.ID_EX.alu_result || 0}`
      );
    }

    if (state.IF_ID.valid) {
      details.push(
        `${stageEmojis.ID} ID STAGE: Decoding '${state.IF_ID.assembly || 'nop'}' (rd=x${state.IF_ID.rd || 0}, rs1=x${state.IF_ID.rs1 || 0}, rs2=x${state.IF_ID.rs2 || 0})`
      );
    }

    return details;
  };

  const getPipelineStages = (state: CPUState) => {
    return {
      'IF/ID': state.IF_ID.valid ? state.IF_ID.assembly || 'empty' : 'empty',
      'ID/EX': state.ID_EX.valid ? state.ID_EX.assembly || 'empty' : 'empty',
      'EX/MEM': state.EX_MEM.valid ? state.EX_MEM.assembly || 'empty' : 'empty',
      'MEM/WB': state.MEM_WB.valid ? state.MEM_WB.assembly || 'empty' : 'empty'
    };
  };

  const getRegisterState = (state: CPUState) => {
    const nonZeroRegs = Object.entries(state.registers)
      .filter(([, value]) => value !== 0)
      .map(([reg, value]) => {
        const regName = reg.startsWith('x') ? reg : `x${reg}`;
        return `${regName}=${value}`;
      })
      .join(', ');
    return nonZeroRegs || '(all registers zero)';
  };

  const formatNumber = (num: number) => {
    return '0x' + num.toString(16).padStart(8, '0').toUpperCase();
  };

  const renderCycleDetail = (record: CycleRecord, index: number) => {
    const { cycle, state } = record;
    const stageDetails = getStageDetails(state);
    const pipelineStages = getPipelineStages(state);
    const registerState = getRegisterState(state);

    return (
      <div key={`cycle-${index}-${cycle}`} className="mb-8 pb-8 border-b border-border/50 last:border-b-0">
        {/* Cycle Header */}
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-4">
          <div className="text-sm font-bold text-primary mb-2">
            🔄 CYCLE {cycle}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>PC: {formatNumber(state.pc)}</div>
            <div>Status: {state.halted ? '⏸ Halted' : '▶ Running'}</div>
          </div>
        </div>

        {/* Stage Activity Paragraph */}
        {stageDetails.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground leading-relaxed font-mono bg-secondary/20 rounded p-3 border border-border/50">
              {stageDetails.join(' • ')}
            </p>
          </div>
        )}

        {/* Pipeline Stages */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-foreground mb-2">📋 Pipeline Stages</h4>
          <div className="bg-secondary/30 rounded p-3 space-y-1 text-xs font-mono text-muted-foreground border border-border/50">
            {Object.entries(pipelineStages).map(([stage, instruction]) => (
              <div key={stage} className="flex justify-between">
                <span className="text-foreground font-semibold">{stage}:</span>
                <span className="text-right">{instruction}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Register State */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-foreground mb-2">📊 Register State</h4>
          <div className="bg-secondary/30 rounded p-3 text-xs font-mono text-muted-foreground border border-border/50">
            {registerState}
          </div>
        </div>

        {/* Hazards if any */}
        {(state.hazards?.forwardA || state.hazards?.forwardB || state.hazards?.stallRequired) && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-orange-500 mb-2">⚠️ Hazards Detected</h4>
            <div className="bg-orange-500/10 rounded p-3 space-y-1 text-xs text-orange-400 border border-orange-500/30">
              {state.hazards?.stallRequired && <div>• Pipeline stall inserted</div>}
              {state.hazards?.forwardA && (
                <div>• Forward A: {state.hazards.forwardA.from} (x{state.hazards.forwardA.register}) → {state.hazards.forwardA.value}</div>
              )}
              {state.hazards?.forwardB && (
                <div>• Forward B: {state.hazards.forwardB.from} (x{state.hazards.forwardB.register}) → {state.hazards.forwardB.value}</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        style={{ width }}
        className={`fixed top-0 right-0 h-screen bg-card border-l border-border flex flex-col z-50 transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <ChevronRight className="w-4 h-4" />
            Cycle Details
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="p-4 space-y-2">
            {cycleHistory.length === 0 ? (
              <div className="text-center text-muted-foreground text-xs py-8">
                <p>Start execution to see cycle details</p>
              </div>
            ) : (
              <>
                {cycleHistory.map((record, index) => renderCycleDetail(record, index))}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`absolute left-0 top-0 w-1 h-full cursor-col-resize bg-border hover:bg-primary/50 transition-colors ${
            isResizing ? 'bg-primary' : ''
          }`}
        />
      </div>
    </>
  );
}

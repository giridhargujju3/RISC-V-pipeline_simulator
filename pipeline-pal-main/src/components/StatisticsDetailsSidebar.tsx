import { X, ChevronLeft, Zap } from 'lucide-react';
import { CPUState } from '@/types/cpu';
import { useRef, useEffect } from 'react';

interface StatisticsDetailsSidebarProps {
  state: CPUState;
  isOpen: boolean;
  onClose: () => void;
}

export function StatisticsDetailsSidebar({ state, isOpen, onClose }: StatisticsDetailsSidebarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const stats = state.statistics;

  // Create display stats
  const displayStats = stats || {
    total_cycles: state.cycle,
    execution_time_seconds: (state.cycle / 1e9),
    stage_cycles: {
      IF: Math.max(0, state.cycle - 0),
      ID: Math.max(0, state.cycle - 1),
      EX: Math.max(0, state.cycle - 2),
      MEM: Math.max(0, state.cycle - 3),
      WB: Math.max(0, state.cycle - 4)
    }
  };

  // Format execution time
  const formatTime = (seconds: number) => {
    if (seconds === 0) return '0 ns';
    if (seconds < 1e-6) return `${(seconds * 1e9).toFixed(2)} ns`;
    if (seconds < 1e-3) return `${(seconds * 1e6).toFixed(2)} µs`;
    if (seconds < 1) return `${(seconds * 1e3).toFixed(2)} ms`;
    return `${seconds.toFixed(6)} s`;
  };

  // Handle mouse down on resizer
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    startXRef.current = e.clientX;
    startWidthRef.current = containerRef.current.offsetWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;

      const delta = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(300, Math.min(800, startWidthRef.current - delta));
      containerRef.current.style.width = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-40 sm:hidden" onClick={onClose} />
  );
}

// Desktop version
export function StatisticsDetailsSidebarDesktop({ state, isOpen, onClose }: StatisticsDetailsSidebarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const stats = state.statistics;

  // Create display stats
  const displayStats = stats || {
    total_cycles: state.cycle,
    execution_time_seconds: (state.cycle / 1e9),
    stage_cycles: {
      IF: Math.max(0, state.cycle - 0),
      ID: Math.max(0, state.cycle - 1),
      EX: Math.max(0, state.cycle - 2),
      MEM: Math.max(0, state.cycle - 3),
      WB: Math.max(0, state.cycle - 4)
    }
  };

  // Format execution time
  const formatTime = (seconds: number) => {
    if (seconds === 0) return '0 ns';
    if (seconds < 1e-6) return `${(seconds * 1e9).toFixed(2)} ns`;
    if (seconds < 1e-3) return `${(seconds * 1e6).toFixed(2)} µs`;
    if (seconds < 1) return `${(seconds * 1e3).toFixed(2)} ms`;
    return `${seconds.toFixed(6)} s`;
  };

  // Handle mouse down on resizer
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    startXRef.current = e.clientX;
    startWidthRef.current = containerRef.current.offsetWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;

      const delta = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(300, Math.min(800, startWidthRef.current - delta));
      containerRef.current.style.width = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 hidden sm:block" onClick={onClose} />

      <div
        ref={containerRef}
        className="fixed right-0 top-0 h-screen bg-card border-l border-border z-50 flex flex-col w-96 hidden sm:flex"
        style={{ width: '400px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Detailed Statistics</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded transition-colors"
            aria-label="Close statistics"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Stage Cycles Table */}
          <div>
            <div className="text-sm font-semibold text-foreground mb-3">Stage Cycle Counts</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(displayStats.stage_cycles).map(([stage, cycles]) => (
                <div key={stage} className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">{stage}</div>
                  <div className="text-xl font-bold text-primary">{cycles}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline Utilization */}
          {displayStats.total_cycles > 0 && (
            <div>
              <div className="text-sm font-semibold text-foreground mb-3">Pipeline Utilization</div>
              <div className="space-y-3">
                {Object.entries(displayStats.stage_cycles).map(([stage, cycles]) => {
                  const utilization = ((cycles / displayStats.total_cycles) * 100).toFixed(1);
                  return (
                    <div key={stage}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">{stage}</span>
                        <span className="text-xs text-muted-foreground">{utilization}%</span>
                      </div>
                      <div className="w-full h-2 bg-secondary/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                          style={{ width: `${utilization}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Utilization Summary */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <div className="text-xs font-semibold text-foreground mb-2">Utilization Summary</div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Average Utilization:</span>
                <span className="text-foreground font-semibold">
                  {displayStats.total_cycles > 0
                    ? ((Object.values(displayStats.stage_cycles).reduce((a, b) => a + b, 0) / (displayStats.total_cycles * 5)) * 100).toFixed(1)
                    : '0'}
                  %
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Instructions:</span>
                <span className="text-foreground font-semibold">{displayStats.total_cycles}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Execution Time:</span>
                <span className="text-foreground font-semibold font-mono">{formatTime(displayStats.execution_time_seconds)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resizer */}
        <div
          ref={resizerRef}
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-1 hover:bg-primary/50 cursor-col-resize hover:shadow-md transition-all"
          aria-label="Resize statistics sidebar"
        />
      </div>
    </>
  );
}

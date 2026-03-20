import { GitMerge, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StaticDependency } from '@/types/cpu';
import { ExpandModal } from '@/components/ExpandModal';

interface StaticDepsPanelProps {
  deps: StaticDependency[];
}

const TYPE_COLORS: Record<string, string> = {
  RAW:     'bg-warning/20 text-warning border-warning/30',
  WAR:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  WAW:     'bg-purple-500/20 text-purple-400 border-purple-500/30',
  CONTROL: 'bg-primary/20 text-primary border-primary/30',
};

function DepsList({ deps, textSize = 'text-[10px]' }: { deps: StaticDependency[]; textSize?: string }) {
  return (
    <div className="space-y-1 pr-2">
      {deps.map((dep, i) => (
        <div
          key={i}
          className={cn("flex items-start gap-1.5 p-1.5 rounded border border-border/30 bg-secondary/20", textSize)}
        >
          <span className={cn(
            "px-1 py-0.5 rounded text-[9px] font-semibold border shrink-0 mt-0.5",
            TYPE_COLORS[dep.type] || 'bg-muted text-foreground border-border'
          )}>
            {dep.type}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-foreground">
              <span className="font-mono truncate text-[9px] text-muted-foreground">
                #{dep.producer}
              </span>
              <span className="font-mono text-warning truncate max-w-[70px]">
                {dep.producer_instr}
              </span>
              <ArrowRight className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
              <span className="font-mono text-[9px] text-muted-foreground">
                #{dep.consumer}
              </span>
              <span className="font-mono text-primary truncate max-w-[70px]">
                {dep.consumer_instr}
              </span>
            </div>
            {dep.register && (
              <div className="text-muted-foreground text-[9px]">
                via <span className="font-mono text-foreground">{dep.register}</span>
                {' '}· dist {dep.distance}
              </div>
            )}
            {dep.type === 'CONTROL' && dep.control_kind && (
              <div className="text-muted-foreground text-[9px]">{dep.control_kind}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StaticDepsPanel({ deps }: StaticDepsPanelProps) {
  const counts = deps.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-card rounded-xl border border-border p-3 sm:p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <GitMerge className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Static Dependencies</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">{deps.length} total</span>
        <ExpandModal title="Static Dependencies — Full Analysis">
          <div className="flex gap-2 mb-3 flex-wrap">
            {Object.entries(counts).map(([type, count]) => (
              <span key={type} className={cn(
                "px-2 py-0.5 rounded text-xs font-semibold border",
                TYPE_COLORS[type] || 'bg-muted text-foreground border-border'
              )}>
                {type}: {count}
              </span>
            ))}
          </div>
          <ScrollArea className="h-full">
            <DepsList deps={deps} textSize="text-xs" />
          </ScrollArea>
        </ExpandModal>
      </div>

      {deps.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[11px] text-muted-foreground">
          Load a program to see static dependency analysis
        </div>
      ) : (
        <>
          <div className="flex gap-1 mb-2 flex-wrap shrink-0">
            {Object.entries(counts).map(([type, count]) => (
              <span key={type} className={cn(
                "px-2 py-0.5 rounded text-[10px] font-semibold border",
                TYPE_COLORS[type] || 'bg-muted text-foreground border-border'
              )}>
                {type}: {count}
              </span>
            ))}
          </div>

          <ScrollArea className="flex-1 overflow-hidden">
            <DepsList deps={deps} />
          </ScrollArea>
        </>
      )}
    </div>
  );
}

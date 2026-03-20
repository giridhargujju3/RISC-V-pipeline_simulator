import { useState, ReactNode } from 'react';
import { Maximize2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ExpandModalProps {
  title: string;
  children: ReactNode;
}

export function ExpandModal({ title, children }: ExpandModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ml-auto p-1 hover:bg-secondary rounded transition-colors group"
        aria-label="Expand panel"
        title="Expand"
      >
        <Maximize2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl flex flex-col"
            style={{ width: '90vw', height: '85vh', maxWidth: '1200px' }}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-secondary rounded transition-colors group"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              {children}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

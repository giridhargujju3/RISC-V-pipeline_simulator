import { useState, useEffect } from 'react';
import { API_CONFIG } from '@/lib/api';
import { Wifi, WifiOff, Monitor, Server } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackendStatusProps {
  onToggleMode: (useBackend: boolean) => void;
  useBackend: boolean;
}

export function BackendStatus({ onToggleMode, useBackend }: BackendStatusProps) {
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkBackend = async () => {
    setChecking(true);
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/state`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      setBackendAvailable(response.ok);
    } catch {
      setBackendAvailable(false);
    }
    setChecking(false);
  };

  useEffect(() => {
    checkBackend();
  }, []);

  return (
    <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-lg">
      {/* Local Simulation Button */}
      <button
        onClick={() => onToggleMode(false)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
          !useBackend
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        )}
      >
        <Monitor className="w-4 h-4" />
        <span className="hidden sm:inline">Local</span>
      </button>

      {/* Python Backend Button */}
      <button
        onClick={() => {
          if (backendAvailable) {
            onToggleMode(true);
          }
        }}
        disabled={!backendAvailable}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all relative",
          useBackend && backendAvailable
            ? "bg-success text-success-foreground shadow-sm"
            : backendAvailable
              ? "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              : "text-muted-foreground/50 cursor-not-allowed"
        )}
      >
        {backendAvailable ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Backend</span>
        
        {/* Status Indicator */}
        <div className={cn(
          "absolute -top-1 -right-1 w-2 h-2 rounded-full",
          backendAvailable ? "bg-success animate-pulse" : "bg-destructive"
        )} />
      </button>
    </div>
  );
}

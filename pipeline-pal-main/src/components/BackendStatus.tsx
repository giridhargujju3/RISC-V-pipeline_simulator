import { useState, useEffect } from 'react';
import { API_CONFIG } from '@/lib/api';
import { Server } from 'lucide-react';

export function BackendStatus() {
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [checking, setChecking] = useState(true);

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
    // Check every 10 seconds
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg">
      <Server className="w-4 h-4" />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Backend</span>
          {checking ? (
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          ) : backendAvailable ? (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          ) : (
            <div className="w-2 h-2 bg-red-500 rounded-full" />
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {checking ? 'Checking...' : backendAvailable ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  );
}

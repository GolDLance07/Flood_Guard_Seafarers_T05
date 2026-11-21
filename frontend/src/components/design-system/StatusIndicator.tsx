import React from 'react';

interface StatusIndicatorProps {
  status: 'LIVE' | 'ACTIVE' | 'NORMAL' | 'STANDBY' | 'ENGAGED' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  label?: string;
  pulse?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  pulse = true,
}) => {
  const config = {
    LIVE: { dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-600/40', bg: 'bg-emerald-950/60' },
    ACTIVE: { dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-600/40', bg: 'bg-emerald-950/60' },
    NORMAL: { dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-600/40', bg: 'bg-emerald-950/60' },
    STANDBY: { dot: 'bg-cyan-400', text: 'text-cyan-300', border: 'border-cyan-600/40', bg: 'bg-cyan-950/60' },
    ENGAGED: { dot: 'bg-blue-400', text: 'text-blue-300', border: 'border-blue-600/40', bg: 'bg-blue-950/60' },
    WARNING: { dot: 'bg-amber-400', text: 'text-amber-300', border: 'border-amber-600/40', bg: 'bg-amber-950/60' },
    CRITICAL: { dot: 'bg-rose-500', text: 'text-rose-300', border: 'border-rose-600/40', bg: 'bg-rose-950/60' },
    OFFLINE: { dot: 'bg-slate-500', text: 'text-slate-400', border: 'border-slate-700/60', bg: 'bg-slate-900/60' },
  }[status] || { dot: 'bg-slate-500', text: 'text-slate-400', border: 'border-slate-700/60', bg: 'bg-slate-900/60' };

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${config.bg} ${config.border} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${pulse ? 'animate-pulse' : ''}`} />
      <span>{label || status}</span>
    </span>
  );
};

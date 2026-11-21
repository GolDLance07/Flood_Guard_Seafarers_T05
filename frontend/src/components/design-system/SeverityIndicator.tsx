import React from 'react';

interface SeverityIndicatorProps {
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  size?: 'sm' | 'md';
}

export const SeverityIndicator: React.FC<SeverityIndicatorProps> = ({
  severity,
  size = 'md',
}) => {
  const sev = (severity || 'medium').toLowerCase();

  const styles = {
    critical: 'bg-rose-950/80 text-rose-300 border-rose-600/60',
    high: 'bg-amber-950/80 text-amber-300 border-amber-600/60',
    medium: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60',
    low: 'bg-slate-900/80 text-slate-300 border-slate-700/60',
  }[sev] || 'bg-slate-900/80 text-slate-300 border-slate-700/60';

  const sizeClass = size === 'sm' ? 'px-1.5 py-0.2 text-[9px]' : 'px-2 py-0.5 text-[10px]';

  return (
    <span className={`rounded font-mono font-bold uppercase tracking-wider border ${styles} ${sizeClass}`}>
      {sev}
    </span>
  );
};

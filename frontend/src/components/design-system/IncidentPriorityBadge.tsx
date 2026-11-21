import React from 'react';

export type IncidentLifecycleStatus =
  | 'UNVERIFIED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | string;

interface IncidentPriorityBadgeProps {
  status: IncidentLifecycleStatus;
  severity?: 'critical' | 'high' | 'medium' | 'low' | string;
  size?: 'sm' | 'md';
}

export const IncidentPriorityBadge: React.FC<IncidentPriorityBadgeProps> = ({
  status,
  severity,
  size = 'md',
}) => {
  const normStatus = (status || 'UNVERIFIED').toUpperCase();
  const normSeverity = (severity || 'medium').toLowerCase();

  const statusConfig: Record<string, { label: string; style: string; dot: string }> = {
    UNVERIFIED: {
      label: 'UNVERIFIED',
      style: 'bg-slate-900/90 text-slate-300 border-slate-700/80',
      dot: 'bg-amber-400 animate-pulse',
    },
    UNDER_REVIEW: {
      label: 'UNDER REVIEW',
      style: 'bg-amber-950/80 text-amber-300 border-amber-600/70',
      dot: 'bg-amber-400',
    },
    VERIFIED: {
      label: 'GROUND VERIFIED',
      style: 'bg-teal-950/80 text-teal-300 border-teal-600/70',
      dot: 'bg-teal-400',
    },
    DISPATCHED: {
      label: 'TEAM DISPATCHED',
      style: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/70',
      dot: 'bg-cyan-400 animate-ping',
    },
    IN_PROGRESS: {
      label: 'IN PROGRESS',
      style: 'bg-blue-950/80 text-blue-300 border-blue-600/70',
      dot: 'bg-blue-400',
    },
    RESOLVED: {
      label: 'RESOLVED',
      style: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/70',
      dot: 'bg-emerald-400',
    },
  };

  const config = statusConfig[normStatus] || statusConfig.UNVERIFIED;

  const severityStyle = {
    critical: 'text-rose-400 border-rose-600/70 bg-rose-950/60',
    high: 'text-amber-400 border-amber-600/70 bg-amber-950/60',
    medium: 'text-cyan-400 border-cyan-600/70 bg-cyan-950/60',
    low: 'text-slate-400 border-slate-600/70 bg-slate-900/60',
  }[normSeverity] || 'text-slate-400 border-slate-600/70 bg-slate-900/60';

  const sizeClasses = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';

  return (
    <div className="inline-flex items-center space-x-1.5 font-mono">
      {/* Lifecycle Status Pill */}
      <span className={`inline-flex items-center space-x-1 rounded font-bold uppercase tracking-wider border ${config.style} ${sizeClasses}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        <span>{config.label}</span>
      </span>

      {/* Severity Tag if provided */}
      {severity && (
        <span className={`rounded font-bold uppercase tracking-wider border ${severityStyle} ${sizeClasses}`}>
          {normSeverity}
        </span>
      )}
    </div>
  );
};

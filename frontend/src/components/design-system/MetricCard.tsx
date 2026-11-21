import React from 'react';
import { Loader2 } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  badgeText?: string;
  badgeVariant?: 'cyan' | 'teal' | 'emerald' | 'amber' | 'rose' | 'slate';
  icon?: React.ComponentType<{ className?: string }>;
  accent?: 'cyan' | 'teal' | 'emerald' | 'amber' | 'rose';
  loading?: boolean;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subtext,
  badgeText,
  badgeVariant = 'cyan',
  icon: Icon,
  accent = 'cyan',
  loading = false,
  className = '',
}) => {
  const accentBorder = {
    cyan: 'border-[#1E3550] hover:border-cyan-500/50',
    teal: 'border-[#1E3550] hover:border-teal-500/50',
    emerald: 'border-[#1E3550] hover:border-emerald-500/50',
    amber: 'border-[#1E3550] hover:border-amber-500/50',
    rose: 'border-[#1E3550] hover:border-rose-500/50',
  }[accent];

  const iconColor = {
    cyan: 'text-cyan-400',
    teal: 'text-teal-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
  }[accent];

  const badgeBg = {
    cyan: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60',
    teal: 'bg-teal-950/80 text-teal-300 border-teal-800/60',
    emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
    rose: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
    slate: 'bg-slate-900/80 text-slate-300 border-slate-700/60',
  }[badgeVariant];

  return (
    <div
      className={`bg-[#10243A]/90 backdrop-blur-md border ${accentBorder} rounded-xl p-3 shadow-lg transition-all duration-200 select-none ${className}`}
    >
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="flex items-center gap-1.5 text-slate-300 font-semibold tracking-tight text-[11px] uppercase">
          {Icon && <Icon className={`w-3.5 h-3.5 ${iconColor}`} />}
          {label}
        </span>
        {badgeText && (
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${badgeBg}`}>
            {badgeText}
          </span>
        )}
      </div>

      <div className="flex items-baseline space-x-1.5">
        {loading ? (
          <div className="flex items-center space-x-2 py-1">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span className="text-xs text-slate-500 font-mono">Syncing...</span>
          </div>
        ) : (
          <>
            <span className="text-2xl font-extrabold tracking-tight text-white font-mono tabular-nums">
              {value}
            </span>
            {unit && <span className="text-xs text-slate-400 font-bold">{unit}</span>}
          </>
        )}
      </div>

      {subtext && !loading && (
        <div className="text-[11px] text-slate-400 mt-1 line-clamp-1 font-mono">
          {subtext}
        </div>
      )}
    </div>
  );
};

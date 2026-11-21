import React from 'react';
import { Card } from './Card';
import { Badge, type BadgeVariant } from './Badge';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  badgeText?: string;
  badgeVariant?: BadgeVariant;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'cyan' | 'emerald' | 'amber' | 'rose';
  loading?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  subtext,
  badgeText,
  badgeVariant = 'cyan',
  icon: Icon,
  accent = 'cyan',
  loading = false,
}) => {
  const iconColors = {
    cyan: 'text-cyan-400 bg-cyan-950/50 border-cyan-800/40',
    emerald: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/40',
    amber: 'text-amber-400 bg-amber-950/50 border-amber-800/40',
    rose: 'text-rose-400 bg-rose-950/50 border-rose-800/40',
  }[accent];

  return (
    <Card
      borderAccent={accent}
      className="p-3.5 shadow-xl hover:shadow-cyan-950/20"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${iconColors}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
            {label}
          </span>
        </div>
        {badgeText && (
          <Badge variant={badgeVariant} size="sm">
            {badgeText}
          </Badge>
        )}
      </div>

      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-extrabold tracking-tight text-white tabular-nums">
          {loading ? '...' : value}
        </span>
        {unit && <span className="text-xs font-semibold text-slate-400">{unit}</span>}
      </div>

      {subtext && (
        <p className="text-[11px] text-slate-400 mt-1 leading-snug truncate">
          {loading ? 'Loading geospatial metrics...' : subtext}
        </p>
      )}
    </Card>
  );
};

import React from 'react';

export type BadgeVariant = 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  size = 'sm',
  pulse = false,
  className = '',
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    cyan: 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60',
    emerald: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
    amber: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
    rose: 'bg-rose-950/70 text-rose-300 border-rose-800/60',
    slate: 'bg-slate-900/80 text-slate-300 border-slate-700/60',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded border ${variantStyles[variant]} ${sizeStyles} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              variant === 'emerald'
                ? 'bg-emerald-400'
                : variant === 'amber'
                ? 'bg-amber-400'
                : variant === 'rose'
                ? 'bg-rose-400'
                : 'bg-cyan-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
              variant === 'emerald'
                ? 'bg-emerald-500'
                : variant === 'amber'
                ? 'bg-amber-500'
                : variant === 'rose'
                ? 'bg-rose-500'
                : 'bg-cyan-500'
            }`}
          />
        </span>
      )}
      {children}
    </span>
  );
};

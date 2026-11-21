import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  borderAccent?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'none';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  elevated = false,
  borderAccent = 'none',
  onClick,
}) => {
  const accentClasses = {
    none: 'border-[#1E2D4A]',
    cyan: 'border-cyan-500/40 hover:border-cyan-400/70',
    emerald: 'border-emerald-500/40 hover:border-emerald-400/70',
    amber: 'border-amber-500/40 hover:border-amber-400/70',
    rose: 'border-rose-500/40 hover:border-rose-400/70',
  }[borderAccent];

  const bgClass = elevated ? 'bg-[#16243A]' : 'bg-[#0D1626]';

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border ${bgClass} ${accentClasses} backdrop-blur-md transition-all duration-200 ${className} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {children}
    </div>
  );
};

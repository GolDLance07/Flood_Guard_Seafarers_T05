import React from 'react';
import { ShieldAlert, Info } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  notice?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  notice,
  icon: Icon = ShieldAlert,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
      <div className="p-3 bg-[#10243A] border border-[#1E3550] rounded-2xl text-cyan-400 mb-3 shadow-lg">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
      
      {notice && (
        <div className="mt-4 p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl text-left flex items-start space-x-2 text-[11px] text-cyan-300">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-cyan-950/50 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

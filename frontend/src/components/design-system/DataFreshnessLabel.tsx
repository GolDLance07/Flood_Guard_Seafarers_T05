import React from 'react';
import { Database, Clock } from 'lucide-react';

interface DataFreshnessLabelProps {
  provider: string;
  timestamp?: string;
  isLive?: boolean;
}

export const DataFreshnessLabel: React.FC<DataFreshnessLabelProps> = ({
  provider,
  timestamp,
  isLive = true,
}) => {
  return (
    <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
      <span className="flex items-center space-x-1">
        <Database className="w-3 h-3 text-cyan-400" />
        <span className="text-slate-300">{provider}</span>
      </span>
      <span>•</span>
      <span className="flex items-center space-x-1">
        <Clock className="w-3 h-3 text-slate-500" />
        <span className={isLive ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
          {timestamp || 'Live Stream'}
        </span>
      </span>
    </div>
  );
};

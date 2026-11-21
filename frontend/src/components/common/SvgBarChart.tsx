import React from 'react';

export interface BarChartRow {
  label: string;
  value: number;
  max?: number;
  formattedValue?: string;
  color?: string;
}

interface SvgBarChartProps {
  data: BarChartRow[];
  className?: string;
}

export const SvgBarChart: React.FC<SvgBarChartProps> = ({
  data,
  className = '',
}) => {
  const maxValue = Math.max(...data.map((d) => d.max || d.value), 1);

  return (
    <div className={`space-y-3 ${className}`}>
      {data.map((row, idx) => {
        const percent = Math.min(100, Math.round((row.value / (row.max || maxValue)) * 100));
        const color = row.color || '#06B6D4';

        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium truncate max-w-[200px]">
                {row.label}
              </span>
              <span className="font-mono text-white font-bold">
                {row.formattedValue || row.value}
              </span>
            </div>
            {/* Progress track */}
            <div className="h-2 w-full bg-[#111E30] border border-[#1E2D4A] rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${percent}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

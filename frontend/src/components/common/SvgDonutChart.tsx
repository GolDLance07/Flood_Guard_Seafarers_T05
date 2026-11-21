import React from 'react';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface SvgDonutChartProps {
  data: DonutSlice[];
  totalLabel?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const SvgDonutChart: React.FC<SvgDonutChartProps> = ({
  data,
  totalLabel = 'Total',
  size = 140,
  strokeWidth = 22,
  className = '',
}) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-6 ${className}`}>
      {/* SVG Donut */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1E2D4A"
            strokeWidth={strokeWidth}
          />
          {/* Slices */}
          {total > 0 &&
            data.map((slice, idx) => {
              const slicePercent = slice.value / total;
              const strokeDasharray = `${slicePercent * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedPercent * circumference;
              accumulatedPercent += slicePercent;

              return (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500 ease-out hover:opacity-85"
                />
              );
            })}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-extrabold text-white tracking-tight tabular-nums">
            {total}
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
            {totalLabel}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col space-y-2 flex-1 w-full">
        {data.map((item, idx) => {
          const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-300 font-medium truncate max-w-[160px]">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center space-x-2 font-mono">
                <span className="text-white font-bold">{item.value}</span>
                <span className="text-slate-400 text-[11px]">({percent}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';

interface ChartPoint {
  label: string;
  value: number;
}

interface IntelligenceChartProps {
  title: string;
  subtitle?: string;
  data: ChartPoint[];
  unit?: string;
  color?: 'cyan' | 'teal' | 'amber' | 'rose';
  dangerThreshold?: number;
  warningThreshold?: number;
  height?: number;
  badge?: string;
}

export const IntelligenceChart: React.FC<IntelligenceChartProps> = ({
  title,
  subtitle,
  data,
  unit = '',
  color = 'cyan',
  dangerThreshold,
  warningThreshold,
  height = 120,
  badge,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-3 bg-[#091522] border border-[#203A52] rounded flex items-center justify-center text-xs text-[#8DA3B8] font-mono">
        No telemetry stream available
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(...values, dangerThreshold || 0, warningThreshold || 0, 10) * 1.15;

  const colorConfig = {
    cyan: {
      stroke: '#16B8D4',
      fillStart: 'rgba(22, 184, 212, 0.20)',
      fillEnd: 'rgba(22, 184, 212, 0.01)',
      text: 'text-[#16B8D4]',
    },
    teal: {
      stroke: '#18A58B',
      fillStart: 'rgba(24, 165, 139, 0.20)',
      fillEnd: 'rgba(24, 165, 139, 0.01)',
      text: 'text-[#18A58B]',
    },
    amber: {
      stroke: '#F0A83B',
      fillStart: 'rgba(240, 168, 59, 0.20)',
      fillEnd: 'rgba(240, 168, 59, 0.01)',
      text: 'text-[#F0A83B]',
    },
    rose: {
      stroke: '#E45555',
      fillStart: 'rgba(228, 85, 85, 0.20)',
      fillEnd: 'rgba(228, 85, 85, 0.01)',
      text: 'text-[#E45555]',
    },
  };

  const activeColor = colorConfig[color];

  const width = 400;
  const paddingX = 20;
  const paddingY = 14;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  const getX = (index: number) => paddingX + (index / (data.length - 1)) * usableWidth;
  const getY = (val: number) => height - paddingY - ((val - minVal) / (maxVal - minVal)) * usableHeight;

  // Build SVG path
  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`);
  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${getX(data.length - 1)},${height - paddingY} L ${getX(0)},${height - paddingY} Z`;

  const lastPoint = data[data.length - 1];

  return (
    <div className="p-3 bg-[#091522] border border-[#203A52] rounded select-none font-sans relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-[#E8F0F7] tracking-tight">{title}</span>
            {badge && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase bg-[#10243A] border border-[#203A52] text-[#16B8D4]">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[10px] text-[#8DA3B8] font-mono mt-0.5">{subtitle}</p>}
        </div>
        <div className="text-right">
          <span className={`text-sm font-bold font-mono tracking-tight ${activeColor.text}`}>
            {lastPoint.value} {unit}
          </span>
          <span className="text-[9px] text-[#8DA3B8] font-mono block">Current reading</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full" style={{ height }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeColor.fillStart} />
              <stop offset="100%" stopColor={activeColor.fillEnd} />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#203A52" strokeWidth="1" />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#142B42" strokeDasharray="3 3" strokeWidth="1" />

          {/* Danger threshold line */}
          {dangerThreshold && (
            <>
              <line
                x1={paddingX}
                y1={getY(dangerThreshold)}
                x2={width - paddingX}
                y2={getY(dangerThreshold)}
                stroke="#E45555"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text x={width - paddingX - 4} y={getY(dangerThreshold) - 3} fill="#E45555" fontSize="8" fontFamily="monospace" textAnchor="end">
                DANGER {dangerThreshold}{unit}
              </text>
            </>
          )}

          {/* Warning threshold line */}
          {warningThreshold && (
            <>
              <line
                x1={paddingX}
                y1={getY(warningThreshold)}
                x2={width - paddingX}
                y2={getY(warningThreshold)}
                stroke="#F0A83B"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text x={width - paddingX - 4} y={getY(warningThreshold) - 3} fill="#F0A83B" fontSize="8" fontFamily="monospace" textAnchor="end">
                WARN {warningThreshold}{unit}
              </text>
            </>
          )}

          {/* Area Fill */}
          <path d={areaPath} fill={`url(#grad-${color})`} />

          {/* Line Stroke */}
          <path d={linePath} fill="none" stroke={activeColor.stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

          {/* Current / Last Value Dot */}
          <circle
            cx={getX(data.length - 1)}
            cy={getY(lastPoint.value)}
            r="3.5"
            fill={activeColor.stroke}
            stroke="#07111F"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* X-Axis Labels */}
      <div className="flex justify-between text-[9px] text-[#8DA3B8] font-mono mt-0.5 px-1">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span className="text-[#E8F0F7] font-semibold">{lastPoint?.label}</span>
      </div>
    </div>
  );
};

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
  height = 130,
  badge,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 bg-[#091522]/90 border border-[#142B42] rounded-xl flex items-center justify-center text-xs text-slate-500 font-mono">
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
      fillStart: 'rgba(22, 184, 212, 0.35)',
      fillEnd: 'rgba(22, 184, 212, 0.0)',
      glow: 'rgba(22, 184, 212, 0.3)',
      text: 'text-cyan-400',
    },
    teal: {
      stroke: '#18A58B',
      fillStart: 'rgba(24, 165, 139, 0.35)',
      fillEnd: 'rgba(24, 165, 139, 0.0)',
      glow: 'rgba(24, 165, 139, 0.3)',
      text: 'text-teal-400',
    },
    amber: {
      stroke: '#F0A83B',
      fillStart: 'rgba(240, 168, 59, 0.35)',
      fillEnd: 'rgba(240, 168, 59, 0.0)',
      glow: 'rgba(240, 168, 59, 0.3)',
      text: 'text-amber-400',
    },
    rose: {
      stroke: '#E45555',
      fillStart: 'rgba(228, 85, 85, 0.35)',
      fillEnd: 'rgba(228, 85, 85, 0.0)',
      glow: 'rgba(228, 85, 85, 0.3)',
      text: 'text-rose-400',
    },
  };

  const activeColor = colorConfig[color];

  const width = 400;
  const paddingX = 20;
  const paddingY = 16;
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
    <div className="p-3.5 bg-[#091522]/90 border border-[#142B42] rounded-xl select-none font-sans relative overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-white tracking-tight">{title}</span>
            {badge && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase bg-[#10243A] border border-[#203A52] text-cyan-300">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{subtitle}</p>}
        </div>
        <div className="text-right">
          <span className={`text-base font-bold font-mono tracking-tight ${activeColor.text}`}>
            {lastPoint.value} {unit}
          </span>
          <span className="text-[9px] text-slate-500 font-mono block">Current reading</span>
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
            <filter id={`glow-${color}`} x1="-20%" y1="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={activeColor.stroke} floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Gridlines */}
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#1A344B" strokeWidth="1" />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#10243A" strokeDasharray="3 3" strokeWidth="1" />

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
                strokeWidth="1.2"
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
                strokeWidth="1.2"
              />
              <text x={width - paddingX - 4} y={getY(warningThreshold) - 3} fill="#F0A83B" fontSize="8" fontFamily="monospace" textAnchor="end">
                WARN {warningThreshold}{unit}
              </text>
            </>
          )}

          {/* Area Fill */}
          <path d={areaPath} fill={`url(#grad-${color})`} />

          {/* Line Stroke */}
          <path d={linePath} fill="none" stroke={activeColor.stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Current / Last Value Dot */}
          <circle
            cx={getX(data.length - 1)}
            cy={getY(lastPoint.value)}
            r="4.5"
            fill={activeColor.stroke}
            stroke="#060D17"
            strokeWidth="2"
            filter={`url(#glow-${color})`}
          />
        </svg>
      </div>

      {/* X-Axis Labels */}
      <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1 px-1">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span className="text-slate-400 font-semibold">{lastPoint?.label}</span>
      </div>
    </div>
  );
};

import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface RiskDialProps {
  score: number; // 0 to 100
  classification: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL' | string;
  contributingFactors?: {
    precipitationScore?: number;
    riverStageScore?: number;
    historicFloodScore?: number;
    populationExposureScore?: number;
  };
  missingInputs?: string[];
  limitations?: string[];
  size?: 'sm' | 'md' | 'lg';
}

export const RiskDial: React.FC<RiskDialProps> = ({
  score = 0,
  classification = 'NORMAL',
  contributingFactors,
  missingInputs = [],
  limitations = [],
  size = 'md',
}) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Arc meter calculation
  const radius = size === 'sm' ? 40 : size === 'lg' ? 70 : 54;
  const strokeWidth = size === 'sm' ? 7 : size === 'lg' ? 12 : 9;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI; // Half-circle
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const colorConfig: Record<string, { stroke: string; text: string; bg: string }> = {
    LOW: { stroke: '#18A58B', text: 'text-teal-400', bg: 'bg-teal-950/60 border-teal-800/70' },
    MODERATE: { stroke: '#16B8D4', text: 'text-cyan-400', bg: 'bg-cyan-950/60 border-cyan-800/70' },
    ELEVATED: { stroke: '#F0A83B', text: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-800/70' },
    HIGH: { stroke: '#F97316', text: 'text-orange-400', bg: 'bg-orange-950/60 border-orange-800/70' },
    CRITICAL: { stroke: '#E45555', text: 'text-rose-400', bg: 'bg-rose-950/60 border-rose-800/70' },
  };

  const normClass = (classification || 'MODERATE').toUpperCase();
  const config = colorConfig[normClass] || colorConfig.MODERATE;

  return (
    <div className="p-4 bg-[#0A1828] border border-[#203A52] rounded-2xl select-none font-sans space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">
            Multi-Hazard Threat Level
          </span>
          <h3 className="text-sm font-bold text-white tracking-tight">Environmental Risk Engine</h3>
        </div>
        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider border ${config.bg} ${config.text}`}>
          {normClass}
        </span>
      </div>

      {/* Radial Semi-Circle Meter */}
      <div className="flex flex-col items-center justify-center pt-2">
        <div className="relative flex items-center justify-center">
          <svg
            height={radius + strokeWidth * 2}
            width={radius * 2 + strokeWidth * 2}
            className="overflow-visible"
          >
            {/* Background Arc */}
            <path
              d={`M ${strokeWidth} ${radius + strokeWidth} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + strokeWidth} ${radius + strokeWidth}`}
              fill="none"
              stroke="#142B42"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Value Arc */}
            <path
              d={`M ${strokeWidth} ${radius + strokeWidth} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 + strokeWidth} ${radius + strokeWidth}`}
              fill="none"
              stroke={config.stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Centered Score */}
          <div className="absolute bottom-1 text-center">
            <span className={`font-mono font-extrabold text-2xl tracking-tighter ${config.text}`}>
              {clampedScore}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block">/ 100</span>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 font-mono mt-2 text-center">
          Calibrated Composite Inundation Index
        </p>
      </div>

      {/* Contributing Factor Sliders */}
      {contributingFactors && (
        <div className="space-y-2 pt-2 border-t border-[#203A52]/70 text-xs font-mono">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            Contributing Factor Indices
          </span>

          <div className="space-y-1.5">
            {[
              { label: 'IMD Precipitation Weight', val: contributingFactors.precipitationScore ?? 35, color: 'bg-cyan-500' },
              { label: 'CWC River Gauge Hydrograph', val: contributingFactors.riverStageScore ?? 25, color: 'bg-blue-500' },
              { label: 'Historical Susceptibility (2018)', val: contributingFactors.historicFloodScore ?? 65, color: 'bg-amber-500' },
              { label: 'Demographic Exposure Exposure', val: contributingFactors.populationExposureScore ?? 40, color: 'bg-teal-500' },
            ].map((factor, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-slate-300">
                  <span className="truncate">{factor.label}</span>
                  <span className="text-white font-bold">{factor.val}%</span>
                </div>
                <div className="h-1 w-full bg-[#142B42] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${factor.color} rounded-full`}
                    style={{ width: `${Math.min(100, factor.val)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Inputs Warning */}
      {missingInputs.length > 0 && (
        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-700/60 text-[10px] text-amber-200 font-mono space-y-1">
          <div className="flex items-center space-x-1 text-amber-400 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Missing Telemetry Inputs Detected:</span>
          </div>
          <ul className="list-disc pl-4 space-y-0.5 text-slate-300">
            {missingInputs.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Scientific Limitation Disclaimer */}
      <div className="p-2 rounded bg-[#07111F] border border-[#203A52] text-[10px] text-slate-400 flex items-start space-x-1.5 leading-relaxed font-mono">
        <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <span>
          {limitations.length > 0
            ? limitations.join(' ')
            : 'Operational synthesis indicator. Modelled estimate requires ground hydrologic validation before issuing mandatory evacuation orders.'}
        </span>
      </div>
    </div>
  );
};

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
    LOW: { stroke: '#18A58B', text: 'text-[#18A58B]', bg: 'bg-[#18A58B]/10 border-[#18A58B]/40' },
    NORMAL: { stroke: '#18A58B', text: 'text-[#18A58B]', bg: 'bg-[#18A58B]/10 border-[#18A58B]/40' },
    MODERATE: { stroke: '#16B8D4', text: 'text-[#16B8D4]', bg: 'bg-[#16B8D4]/10 border-[#16B8D4]/40' },
    ELEVATED: { stroke: '#F0A83B', text: 'text-[#F0A83B]', bg: 'bg-[#F0A83B]/10 border-[#F0A83B]/40' },
    HIGH: { stroke: '#F0A83B', text: 'text-[#F0A83B]', bg: 'bg-[#F0A83B]/10 border-[#F0A83B]/40' },
    CRITICAL: { stroke: '#E45555', text: 'text-[#E45555]', bg: 'bg-[#E45555]/10 border-[#E45555]/40' },
  };

  const normClass = (classification || 'MODERATE').toUpperCase();
  const config = colorConfig[normClass] || colorConfig.MODERATE;

  return (
    <div className="p-3 bg-[#091522] border border-[#203A52] rounded select-none font-sans space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] text-[#8DA3B8] font-mono uppercase tracking-wider block">
            Multi-Hazard Threat Level
          </span>
          <h3 className="text-xs font-bold text-[#E8F0F7] tracking-tight">Environmental Risk Engine</h3>
        </div>
        <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider border ${config.bg} ${config.text}`}>
          {normClass}
        </span>
      </div>

      {/* Radial Semi-Circle Meter */}
      <div className="flex flex-col items-center justify-center pt-1">
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
            <span className="text-[10px] text-[#8DA3B8] font-mono block">/ 100</span>
          </div>
        </div>

        <p className="text-[10px] text-[#8DA3B8] font-mono mt-1.5 text-center">
          Calibrated Composite Inundation Index
        </p>
      </div>

      {/* Contributing Factor Weights Table */}
      {contributingFactors && (
        <div className="space-y-1.5 pt-1 border-t border-[#203A52]">
          <span className="text-[9px] font-mono text-[#8DA3B8] uppercase block">
            Contributing Factor Indices
          </span>
          <div className="space-y-1 text-[10px] font-mono">
            {contributingFactors.precipitationScore !== undefined && (
              <div className="flex justify-between items-center text-[#8DA3B8]">
                <span>IMD Precipitation Weight</span>
                <span className="text-[#E8F0F7] font-bold">{contributingFactors.precipitationScore}%</span>
              </div>
            )}
            {contributingFactors.riverStageScore !== undefined && (
              <div className="flex justify-between items-center text-[#8DA3B8]">
                <span>CWC River Gauge Hydrograph</span>
                <span className="text-[#E8F0F7] font-bold">{contributingFactors.riverStageScore}%</span>
              </div>
            )}
            {contributingFactors.historicFloodScore !== undefined && (
              <div className="flex justify-between items-center text-[#8DA3B8]">
                <span>Historical Susceptibility (2018)</span>
                <span className="text-[#E8F0F7] font-bold">{contributingFactors.historicFloodScore}%</span>
              </div>
            )}
            {contributingFactors.populationExposureScore !== undefined && (
              <div className="flex justify-between items-center text-[#8DA3B8]">
                <span>Demographic Exposure Exposure</span>
                <span className="text-[#E8F0F7] font-bold">{contributingFactors.populationExposureScore}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Missing Inputs Alert */}
      {missingInputs.length > 0 && (
        <div className="p-2 bg-[#F0A83B]/10 rounded border border-[#F0A83B]/30 text-[10px] text-[#F0A83B] flex items-start space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-[#F0A83B] flex-shrink-0 mt-0.5" />
          <p className="leading-tight">Uncalibrated sensors: {missingInputs.join(', ')}</p>
        </div>
      )}

      {/* Sensor Limitations Note */}
      {limitations.length > 0 && (
        <div className="p-2 bg-[#07111F] rounded border border-[#203A52] text-[10px] text-[#8DA3B8] flex items-start space-x-1.5">
          <Info className="w-3.5 h-3.5 text-[#16B8D4] flex-shrink-0 mt-0.5" />
          <p className="leading-tight">{limitations[0]}</p>
        </div>
      )}
    </div>
  );
};

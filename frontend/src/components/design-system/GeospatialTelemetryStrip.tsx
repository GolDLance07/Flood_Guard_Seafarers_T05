import React from 'react';
import {
  CloudRain,
  Waves,
  Satellite,
  AlertTriangle,
  Radio,
  Clock
} from 'lucide-react';

interface GeospatialTelemetryStripProps {
  rainfallMm?: number | null;
  rainfallSource?: string;
  rainfallFreshness?: string;
  riverStageM?: number | null;
  riverWarningM?: number | null;
  riverSource?: string;
  satelliteMission?: string;
  satelliteOrbit?: string;
  activeAlertCount?: number;
  alertSource?: string;
  incidentCount?: number;
  unverifiedCount?: number;
  compact?: boolean;
}

export const GeospatialTelemetryStrip: React.FC<GeospatialTelemetryStripProps> = ({
  rainfallMm,
  rainfallSource = 'IMD Auto-Station',
  rainfallFreshness = 'Live',
  riverStageM,
  riverWarningM,
  riverSource = 'CWC Hydrometric',
  satelliteMission = 'Sentinel-1A C-SAR',
  satelliteOrbit = 'Orbit 56 Asc',
  activeAlertCount = 0,
  alertSource = 'NDMA SACHET',
  incidentCount = 0,
  unverifiedCount = 0,
  compact = false,
}) => {
  return (
    <div className={`w-full bg-[#091522]/95 border-y border-[#203A52] px-3 sm:px-4 ${compact ? 'py-1.5' : 'py-2'} backdrop-blur-md select-none font-sans text-xs`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        {/* Section Marker */}
        <div className="flex items-center space-x-1.5 text-cyan-400 font-mono text-[10px] tracking-wider uppercase font-bold flex-shrink-0">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>LIVE TELEMETRY</span>
        </div>

        {/* Telemetry Cells */}
        <div className="flex items-center space-x-4 sm:space-x-6 text-[11px] font-mono text-[#8DA3B8] flex-1 justify-around">
          {/* 1. Precipitation */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="p-1 rounded bg-cyan-950/70 border border-cyan-800/60 text-cyan-400">
              <CloudRain className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-white font-bold tracking-tight">
                {rainfallMm !== null && rainfallMm !== undefined ? `${rainfallMm} mm` : '18.4 mm'}
                <span className="text-[10px] font-normal text-slate-400 ml-1">/ 24h</span>
              </div>
              <div className="text-[9px] text-slate-400 flex items-center space-x-1">
                <span>{rainfallSource}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{rainfallFreshness}</span>
              </div>
            </div>
          </div>

          {/* 2. Hydrology / River Gauge */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="p-1 rounded bg-blue-950/70 border border-blue-800/60 text-blue-400">
              <Waves className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-white font-bold tracking-tight">
                {riverStageM !== null && riverStageM !== undefined ? `${riverStageM.toFixed(2)} m` : '2.84 m'}
                {riverWarningM && (
                  <span className="text-[10px] font-normal text-amber-400 ml-1">
                    (Warn: {riverWarningM.toFixed(1)}m)
                  </span>
                )}
              </div>
              <div className="text-[9px] text-slate-400">
                <span>{riverSource}</span>
              </div>
            </div>
          </div>

          {/* 3. SAR Satellite Pass */}
          <div className="hidden md:flex items-center space-x-2 flex-shrink-0">
            <div className="p-1 rounded bg-teal-950/70 border border-teal-800/60 text-teal-400">
              <Satellite className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-white font-bold tracking-tight">{satelliteMission}</div>
              <div className="text-[9px] text-teal-400 font-semibold">{satelliteOrbit}</div>
            </div>
          </div>

          {/* 4. Official Early Warning Notices */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className={`p-1 rounded ${activeAlertCount > 0 ? 'bg-amber-950/80 border-amber-600/70 text-amber-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className={activeAlertCount > 0 ? 'text-amber-300 font-bold' : 'text-slate-300 font-semibold'}>
                {activeAlertCount} Active CAP Alert{activeAlertCount === 1 ? '' : 's'}
              </div>
              <div className="text-[9px] text-slate-400">{alertSource}</div>
            </div>
          </div>

          {/* 5. Incident Queue Status */}
          <div className="hidden sm:flex items-center space-x-2 flex-shrink-0">
            <div className="p-1 rounded bg-purple-950/70 border border-purple-800/60 text-purple-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-white font-bold tracking-tight">
                {incidentCount} Incident{incidentCount === 1 ? '' : 's'}
                {unverifiedCount > 0 && (
                  <span className="text-amber-400 text-[10px] ml-1">({unverifiedCount} unverified)</span>
                )}
              </div>
              <div className="text-[9px] text-slate-400">Tactical Response Queue</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

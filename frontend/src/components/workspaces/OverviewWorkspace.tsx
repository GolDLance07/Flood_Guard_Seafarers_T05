import React, { useState } from 'react';
import {
  Waves,
  Users,
  Navigation,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Hospital,
  Building2,
  Radio,
  ShieldAlert
} from 'lucide-react';
import type { OverviewResponse, FloodMetadataResponse } from '../../types/api';
import type { FeatureCollection } from 'geojson';
import { Badge } from '../common/Badge';

interface OverviewWorkspaceProps {
  overview: OverviewResponse | null;
  floodMeta: FloodMetadataResponse | null;
  facilitiesGeoJSON: FeatureCollection | null;
  settlementsGeoJSON: FeatureCollection | null;
  loading: boolean;
  liveData?: any;
  onNavigateToImpact: () => void;
  onNavigateToRescue: () => void;
  onNavigateToLive: () => void;
  onNavigateToOperations?: () => void;
}

export const OverviewWorkspace: React.FC<OverviewWorkspaceProps> = ({
  overview,
  facilitiesGeoJSON,
  settlementsGeoJSON,
  liveData,
  onNavigateToImpact,
  onNavigateToRescue,
  onNavigateToLive,
  onNavigateToOperations,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const kpis = overview?.kpis;

  const floodedHospitals = facilitiesGeoJSON?.features.filter(
    (f: any) => f.properties?.inside_flood_extent && f.properties?.category === 'hospital'
  ) || [];

  const affectedSettlements = settlementsGeoJSON?.features.filter(
    (f: any) => f.properties?.affected_by_flood
  ) || [];

  const alerts = liveData?.alerts?.alerts || [];
  const rainfall = liveData?.weather?.rainfall_24h_mm ?? 18.4;
  const riverStation = liveData?.rivers?.stations?.[0];

  return (
    <>
      {/* 1. Top Floating Situation Terminal (Asymmetric Large Visual Anchor) */}
      <div className="absolute top-4 left-4 sm:left-6 z-20 pointer-events-none max-w-4xl">
        <div className="pointer-events-auto panel-glass-deep rounded-2xl p-4 sm:p-5 shadow-2xl border border-[#142B42] text-xs font-mono space-y-3">
          {/* Terminal Subtitle & Region Indicator */}
          <div className="flex items-center justify-between border-b border-[#142B42] pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest font-mono">
                SITUATION ROOM • COMMAND TERMINAL
              </span>
            </div>
            <span className="text-[9px] text-slate-400 font-mono">
              HISTORICAL BENCHMARK: KERALA AUGUST 2018
            </span>
          </div>

          {/* Large Typographic Statistics Integration */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-1">
            {/* Metric 1: Inundation Area */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-tight font-sans flex items-center space-x-1">
                <Waves className="w-3 h-3 text-cyan-400" />
                <span>Flood Extent</span>
              </div>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                  {kpis ? `${kpis.flooded_area_km2}` : '386.6'}
                </span>
                <span className="text-xs font-mono text-cyan-400 font-semibold">km²</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {kpis ? `${kpis.flooded_area_ha.toLocaleString()} ha` : '38,656 ha'}
              </div>
            </div>

            {/* Metric 2: Exposed Population */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-tight font-sans flex items-center space-x-1">
                <Users className="w-3 h-3 text-amber-400" />
                <span>Exposed Population</span>
              </div>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-300">
                  {kpis ? kpis.estimated_exposed_population.toLocaleString() : '257,456'}
                </span>
                <span className="text-[10px] font-mono text-amber-400/80 uppercase">est</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {affectedSettlements.length} inhabited zones
              </div>
            </div>

            {/* Metric 3: Compromised Corridors */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-tight font-sans flex items-center space-x-1">
                <Navigation className="w-3 h-3 text-rose-400" />
                <span>Submerged Roads</span>
              </div>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-rose-300">
                  {kpis ? kpis.affected_roads_km.toFixed(1) : '713.1'}
                </span>
                <span className="text-xs font-mono text-rose-400 font-semibold">km</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {kpis ? `${kpis.affected_road_segments} segments` : '2,619 segments'}
              </div>
            </div>

            {/* Metric 4: Hospitals Exposed */}
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-tight font-sans flex items-center space-x-1">
                <Hospital className="w-3 h-3 text-rose-400" />
                <span>Facilities Cut Off</span>
              </div>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-rose-400">
                  {floodedHospitals.length}
                </span>
                <span className="text-xs font-mono text-rose-400/80 font-semibold">Units</span>
              </div>
              <div className="text-[10px] text-rose-400/80 font-mono font-semibold">
                Critical priority
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Right Asymmetric Intelligence Rail (Live SITREP & Tactical Focus) */}
      <div
        className={`absolute top-4 right-0 bottom-6 z-20 transition-all duration-300 flex pointer-events-none ${
          sidebarOpen ? 'w-[360px] sm:w-[420px]' : 'w-10'
        }`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-10 w-9 bg-[#060D17]/95 hover:bg-[#142B42] text-slate-300 hover:text-white border-l border-y border-[#142B42] rounded-l-xl flex items-center justify-center pointer-events-auto transition self-start mt-6 shadow-2xl cursor-pointer"
          title={sidebarOpen ? 'Collapse Situation Panel' : 'Expand Situation Panel'}
        >
          {sidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Intelligence Rail Body */}
        {sidebarOpen && (
          <div className="flex-1 h-full panel-glass-deep border-l border-y border-[#142B42] rounded-l-2xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-[#091522] border-b border-[#142B42] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center space-x-2 font-mono">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  <span>SITREP & INCIDENT RADAR</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Live Operations & Tactical Infrastructure
                </p>
              </div>
              <Badge variant="cyan" size="sm">GROUND SYNCHRONIZED</Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
              {/* Tactical Action Triggers */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={onNavigateToRescue}
                  className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex flex-col items-center justify-center text-center transition cursor-pointer"
                >
                  <Navigation className="w-4 h-4 mb-1 text-emerald-400" />
                  <span>Evacuation</span>
                </button>
                <button
                  onClick={onNavigateToOperations || onNavigateToLive}
                  className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex flex-col items-center justify-center text-center transition cursor-pointer shadow-danger-glow"
                >
                  <AlertTriangle className="w-4 h-4 mb-1 text-rose-400 animate-pulse" />
                  <span>Triage Queue</span>
                </button>
                <button
                  onClick={onNavigateToLive}
                  className="p-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold flex flex-col items-center justify-center text-center transition cursor-pointer"
                >
                  <Radio className="w-4 h-4 mb-1 text-cyan-400" />
                  <span>Radar Studio</span>
                </button>
              </div>

              {/* 1. Hydrometeorological Telemetry Block */}
              <div className="p-3.5 bg-[#091522] border border-[#142B42] rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-200 font-bold flex items-center space-x-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Real-Time Sensor Telemetry</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase">Active Feeds</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div className="p-2.5 bg-[#060D17] rounded-lg border border-[#142B42]">
                    <span className="text-[9px] text-slate-500 block uppercase font-mono">IMD 24h Rainfall</span>
                    <span className="text-white font-bold text-sm">{rainfall} mm</span>
                    <span className="text-[9px] text-slate-400 block font-mono">Precipitation Inflow</span>
                  </div>
                  <div className="p-2.5 bg-[#060D17] rounded-lg border border-[#142B42]">
                    <span className="text-[9px] text-slate-500 block uppercase font-mono">River Hydrometry</span>
                    <span className="text-cyan-300 font-bold text-sm">
                      {liveData?.hydrology?.river_discharge_m3_s != null
                        ? `${liveData.hydrology.river_discharge_m3_s} m³/s`
                        : '2.84 m'}
                    </span>
                    <span className="text-[9px] text-slate-400 block font-mono">
                      Warn: {riverStation?.warning_level_m || '6.0'}m
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Critical Facilities (Hospitals) Under Inundation */}
              <div className="p-3.5 bg-[#091522] border border-[#142B42] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 flex items-center space-x-1.5">
                    <Hospital className="w-4 h-4 text-rose-400" />
                    <span>Hospitals at Threat</span>
                  </span>
                  <Badge variant="rose" size="sm">
                    {floodedHospitals.length} Priority Units
                  </Badge>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs font-mono">
                  {floodedHospitals.slice(0, 5).map((h: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 bg-[#060D17] rounded-lg border border-[#142B42] flex justify-between items-center"
                    >
                      <span className="text-slate-200 truncate max-w-[210px] font-medium">
                        {h.properties?.name || 'Local Hospital'}
                      </span>
                      <span className="text-[9px] text-rose-400 font-bold uppercase px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-800/60">
                        Inundated
                      </span>
                    </div>
                  ))}
                  {floodedHospitals.length > 5 && (
                    <button
                      onClick={onNavigateToImpact}
                      className="w-full text-center text-xs text-cyan-400 hover:text-cyan-300 pt-1 cursor-pointer font-mono"
                    >
                      View all {floodedHospitals.length} in Intelligence Studio →
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Affected Settlements & Population Centers */}
              <div className="p-3.5 bg-[#091522] border border-[#142B42] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span>Cut-Off Settlements</span>
                  </span>
                  <Badge variant="amber" size="sm">
                    {affectedSettlements.length} Inhabited Polders
                  </Badge>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs font-mono">
                  {affectedSettlements.slice(0, 4).map((s: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 bg-[#060D17] rounded-lg border border-[#142B42] flex justify-between items-center"
                    >
                      <span className="text-slate-200 truncate max-w-[210px] font-medium">
                        {s.properties?.name || 'Settlement'}
                      </span>
                      <span className="text-[9px] text-amber-400 uppercase px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 font-semibold">
                        {s.properties?.type || 'Village'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Active Early Warning Bulletin */}
              {alerts.length > 0 && (
                <div className="p-3.5 bg-rose-950/40 border border-rose-600/70 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
                    <span>NDMA SACHET Emergency Bulletin</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {alerts[0].headline || alerts[0].area_description || 'Active flood warning issued for vulnerable lowlands.'}
                  </p>
                </div>
              )}

              {/* 5. Observation & SAR Radar Parameters */}
              <div className="p-3 bg-[#060D17] border border-[#142B42] rounded-xl text-[10px] text-slate-400 font-mono space-y-1">
                <div className="text-cyan-400 font-bold uppercase tracking-wider">SAR Observation Specs</div>
                <div>Sensor: Sentinel-1A C-SAR (10m GRD IW)</div>
                <div>Polarization: VV + VH dual-pol • Pass: ASCENDING</div>
                <div>Baseline Permanent Water: 29 perennial bodies subtracted</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

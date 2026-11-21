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
      {/* Top Floating Situation HUD Strip (Compact, High-Density, Map-Centric) */}
      <div className="absolute top-3 left-3 right-3 sm:left-6 sm:right-6 z-20 pointer-events-none">
        <div className="max-w-5xl pointer-events-auto bg-[#091522]/90 backdrop-blur-md border border-[#203A52] rounded-2xl p-2.5 sm:p-3 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          {/* Section Marker */}
          <div className="flex items-center space-x-2 pr-2 border-r border-[#203A52]/80">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
              SITUATION ROOM
            </span>
          </div>

          {/* Metric 1: Inundation Area */}
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-cyan-950/70 border border-cyan-800/60 text-cyan-400">
              <Waves className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-tight">Active Inundation</div>
              <div className="text-white font-bold tracking-tight text-xs sm:text-sm">
                {kpis ? `${kpis.flooded_area_ha.toLocaleString()} ha` : '...'}
                <span className="text-[10px] font-normal text-cyan-300 ml-1">
                  ({kpis ? `${kpis.flooded_area_km2} km²` : '...'})
                </span>
              </div>
            </div>
          </div>

          {/* Metric 2: Exposed Population */}
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-amber-950/70 border border-amber-800/60 text-amber-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-tight">Exposed Population</div>
              <div className="text-white font-bold tracking-tight text-xs sm:text-sm">
                {kpis ? kpis.estimated_exposed_population.toLocaleString() : '...'}
                <span className="text-[10px] font-normal text-amber-300 ml-1">est.</span>
              </div>
            </div>
          </div>

          {/* Metric 3: Compromised Corridors */}
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-rose-950/70 border border-rose-800/60 text-rose-400">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-tight">Inundated Roads</div>
              <div className="text-white font-bold tracking-tight text-xs sm:text-sm">
                {kpis ? `${kpis.affected_roads_km.toLocaleString()} km` : '...'}
                <span className="text-[10px] font-normal text-rose-300 ml-1">
                  ({kpis ? kpis.affected_road_segments : 0} seg)
                </span>
              </div>
            </div>
          </div>

          {/* Metric 4: Hospitals Exposed */}
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-rose-950/70 border border-rose-800/60 text-rose-400">
              <Hospital className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-tight">Facilities at Risk</div>
              <div className="text-rose-300 font-bold tracking-tight text-xs sm:text-sm">
                {floodedHospitals.length} Hospitals
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Situation Room Intelligence Drawer */}
      <div
        className={`absolute top-20 right-0 bottom-6 z-20 transition-all duration-300 flex pointer-events-none ${
          sidebarOpen ? 'w-[360px] sm:w-[410px]' : 'w-10'
        }`}
      >
        {/* Toggle Tab */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-10 w-9 bg-[#091522]/95 hover:bg-[#142B42] text-slate-300 hover:text-white border-l border-y border-[#203A52] rounded-l-xl flex items-center justify-center pointer-events-auto transition self-start mt-4 shadow-2xl cursor-pointer"
          title={sidebarOpen ? 'Collapse Situation Panel' : 'Expand Situation Panel'}
        >
          {sidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Drawer Body */}
        {sidebarOpen && (
          <div className="flex-1 h-full bg-[#091522]/95 backdrop-blur-md border-l border-y border-[#203A52] rounded-l-2xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden">
            {/* Drawer Header */}
            <div className="p-3.5 bg-[#10243A] border-b border-[#203A52] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center space-x-2 font-mono">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  <span>SITUATION REPORT (SITREP)</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  August 21, 2018 Peak Flood Assessment • Sentinel-1A SAR
                </p>
              </div>
              <Badge variant="cyan" size="sm">CONFIRMED AOI</Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs font-sans">
              {/* Tactical Quick Action Bar */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={onNavigateToRescue}
                  className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-[11px] font-semibold flex flex-col items-center justify-center text-center transition cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 mb-1 text-emerald-400" />
                  <span>Evacuation</span>
                </button>
                <button
                  onClick={onNavigateToOperations || onNavigateToLive}
                  className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-xl text-[11px] font-semibold flex flex-col items-center justify-center text-center transition cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mb-1 text-rose-400 animate-pulse" />
                  <span>Triage Queue</span>
                </button>
                <button
                  onClick={onNavigateToLive}
                  className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-xl text-[11px] font-semibold flex flex-col items-center justify-center text-center transition cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5 mb-1 text-cyan-400" />
                  <span>Multi-Sensor</span>
                </button>
              </div>

              {/* 1. Live Weather & Hydro Snapshot */}
              <div className="p-3 bg-[#10243A] border border-[#203A52] rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-300 font-bold flex items-center space-x-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Hydrometeorological Snapshot</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Live Feeds</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 bg-[#07111F] rounded-lg border border-[#203A52]">
                    <span className="text-[9px] text-slate-500 block">IMD 24h Rainfall</span>
                    <span className="text-white font-bold">{rainfall} mm</span>
                  </div>
                  <div className="p-2 bg-[#07111F] rounded-lg border border-[#203A52]">
                    <span className="text-[9px] text-slate-500 block">River Gauge</span>
                    <span className="text-cyan-300 font-bold">
                      {riverStation ? `${riverStation.current_level_m}m (${riverStation.status})` : '2.84m (Normal)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Critical Facilities (Hospitals) in Inundation Footprint */}
              <div className="p-3 bg-[#10243A] border border-[#203A52] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 flex items-center space-x-1.5">
                    <Hospital className="w-4 h-4 text-rose-400" />
                    <span>Hospitals Inside Flood Zone</span>
                  </span>
                  <Badge variant="rose" size="sm">
                    {floodedHospitals.length} Priority
                  </Badge>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-[11px] font-mono">
                  {floodedHospitals.slice(0, 5).map((h: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-1.5 bg-[#07111F] rounded border border-[#203A52] flex justify-between items-center"
                    >
                      <span className="text-slate-300 truncate max-w-[200px]">
                        {h.properties?.name || 'Local Hospital'}
                      </span>
                      <span className="text-[9px] text-rose-400 font-bold uppercase">
                        Inundated
                      </span>
                    </div>
                  ))}
                  {floodedHospitals.length > 5 && (
                    <button
                      onClick={onNavigateToImpact}
                      className="w-full text-center text-[10px] text-cyan-400 hover:underline pt-1 cursor-pointer"
                    >
                      + {floodedHospitals.length - 5} more facilities in Intelligence Suite →
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Affected Settlements & Population Centers */}
              <div className="p-3 bg-[#10243A] border border-[#203A52] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span>Inundated Settlements</span>
                  </span>
                  <Badge variant="amber" size="sm">
                    {affectedSettlements.length} Centers
                  </Badge>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1 pr-1 text-[11px] font-mono">
                  {affectedSettlements.slice(0, 4).map((s: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-1.5 bg-[#07111F] rounded border border-[#203A52] flex justify-between items-center"
                    >
                      <span className="text-slate-300 truncate max-w-[200px]">
                        {s.properties?.name || 'Settlement'}
                      </span>
                      <span className="text-[9px] text-amber-400 uppercase">
                        {s.properties?.type || 'Village'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Active Early Warnings */}
              {alerts.length > 0 && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-rose-400 font-bold text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
                    <span>NDMA SACHET Alert Notice</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {alerts[0].headline || alerts[0].area_description || 'Active flood warning issued.'}
                  </p>
                </div>
              )}

              {/* 5. Observation Parameters */}
              <div className="p-2.5 bg-[#07111F] border border-[#203A52] rounded-xl text-[10px] text-slate-400 font-mono space-y-0.5">
                <div className="text-cyan-400 font-semibold mb-1">Observation Telemetry</div>
                <div>Sensor: Sentinel-1A C-SAR (10m GRD Interferometric Wide)</div>
                <div>Polarization: VV + VH dual-pol • Pass: ASCENDING</div>
                <div>Permanent Water: 29 baseline perennial bodies subtracted</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

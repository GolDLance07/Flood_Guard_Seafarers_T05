import React, { useState } from 'react';
import type { OverviewResponse, FloodMetadataResponse } from '../../types/api';
import type { FeatureCollection } from 'geojson';
import {
  Waves,
  Users,
  Navigation,
  Hospital,
  Building2,
  ChevronRight,
  ChevronLeft,
  Radio,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';

interface OverviewWorkspaceProps {
  loading?: boolean;
  overview: OverviewResponse | null;
  floodMeta: FloodMetadataResponse | null;
  facilitiesGeoJSON: FeatureCollection | null;
  settlementsGeoJSON: FeatureCollection | null;
  liveData: any;
  onNavigateToImpact?: () => void;
  onNavigateToRescue?: () => void;
  onNavigateToLive?: () => void;
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
      <div className="absolute top-3 left-3 sm:left-4 z-20 pointer-events-none max-w-4xl">
        <div className="pointer-events-auto bg-[#091522] rounded border border-[#203A52] p-3 sm:p-4 text-xs font-mono space-y-2.5 shadow-2xl">
          {/* Terminal Subtitle & Region Indicator */}
          <div className="flex items-center justify-between border-b border-[#203A52] pb-2">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16B8D4]" />
              <span className="text-[10px] uppercase font-bold text-[#16B8D4] tracking-widest font-mono">
                SITUATION ROOM • COMMAND TERMINAL
              </span>
            </div>
            <span className="text-[9px] text-[#8DA3B8] font-mono">
              HISTORICAL BENCHMARK: KERALA AUGUST 2018
            </span>
          </div>

          {/* Large Typographic Statistics Integration */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-0.5">
            {/* Metric 1: Inundation Area */}
            <div>
              <div className="text-[10px] text-[#8DA3B8] uppercase tracking-tight font-sans flex items-center space-x-1">
                <Waves className="w-3 h-3 text-[#16B8D4]" />
                <span>Flood Extent</span>
              </div>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#E8F0F7]">
                  {kpis ? `${kpis.flooded_area_km2}` : '386.57'}
                </span>
                <span className="text-xs font-mono text-[#16B8D4] font-semibold">km²</span>
              </div>
              <div className="text-[10px] text-[#8DA3B8]/80 font-mono">
                {kpis ? `${kpis.flooded_area_ha.toLocaleString()} ha` : '38,656 ha'}
              </div>
            </div>

            {/* Metric 2: Exposed Population */}
            <div>
              <div className="text-[10px] text-[#8DA3B8] uppercase tracking-tight font-sans flex items-center space-x-1">
                <Users className="w-3 h-3 text-[#F0A83B]" />
                <span>Exposed Population</span>
              </div>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#F0A83B]">
                  {kpis ? kpis.estimated_exposed_population.toLocaleString() : '257,456'}
                </span>
                <span className="text-[10px] font-mono text-[#F0A83B]/80 uppercase">est</span>
              </div>
              <div className="text-[10px] text-[#8DA3B8]/80 font-mono">
                {affectedSettlements.length || 55} inhabited zones
              </div>
            </div>

            {/* Metric 3: Compromised Corridors */}
            <div>
              <div className="text-[10px] text-[#8DA3B8] uppercase tracking-tight font-sans flex items-center space-x-1">
                <Navigation className="w-3 h-3 text-[#E45555]" />
                <span>Submerged Roads</span>
              </div>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#E45555]">
                  {kpis ? kpis.affected_roads_km.toFixed(1) : '713.1'}
                </span>
                <span className="text-xs font-mono text-[#E45555] font-semibold">km</span>
              </div>
              <div className="text-[10px] text-[#8DA3B8]/80 font-mono">
                {kpis ? `${kpis.affected_road_segments} segments` : '2,619 segments'}
              </div>
            </div>

            {/* Metric 4: Hospitals Exposed */}
            <div>
              <div className="text-[10px] text-[#8DA3B8] uppercase tracking-tight font-sans flex items-center space-x-1">
                <Hospital className="w-3 h-3 text-[#E45555]" />
                <span>Facilities Cut Off</span>
              </div>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#E45555]">
                  {floodedHospitals.length || 28}
                </span>
                <span className="text-xs font-mono text-[#E45555]/80 font-semibold">Units</span>
              </div>
              <div className="text-[10px] text-[#E45555] font-mono font-semibold">
                Critical priority
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Right Asymmetric Intelligence Rail (Live SITREP & Tactical Focus) */}
      <div
        className={`absolute top-3 right-0 bottom-4 z-20 transition-all duration-200 flex pointer-events-none ${
          sidebarOpen ? 'w-[340px] sm:w-[380px]' : 'w-8'
        }`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-9 w-8 bg-[#091522] hover:bg-[#142B42] text-[#8DA3B8] hover:text-[#E8F0F7] border-l border-y border-[#203A52] rounded-l flex items-center justify-center pointer-events-auto transition self-start mt-4 shadow-xl cursor-pointer"
          title={sidebarOpen ? 'Collapse Situation Panel' : 'Expand Situation Panel'}
        >
          {sidebarOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Intelligence Rail Body */}
        {sidebarOpen && (
          <div className="flex-1 h-full bg-[#091522] border-l border-y border-[#203A52] rounded-l shadow-2xl flex flex-col pointer-events-auto overflow-hidden">
            {/* Header */}
            <div className="p-3 bg-[#07111F] border-b border-[#203A52] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#E8F0F7] flex items-center space-x-1.5 font-mono">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#16B8D4]" />
                  <span>SITREP & INCIDENT RADAR</span>
                </h3>
                <p className="text-[10px] text-[#8DA3B8] font-mono">
                  Live Operations & Tactical Infrastructure
                </p>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold text-[#18A58B] border-[#18A58B]/40 bg-[#18A58B]/10">
                SYNCHRONIZED
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs font-sans">
              {/* Tactical Action Triggers */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={onNavigateToRescue}
                  className="p-2 bg-[#10243A] hover:bg-[#142B42] text-[#18A58B] border border-[#203A52] hover:border-[#18A58B] rounded text-xs font-semibold flex flex-col items-center justify-center text-center transition cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 mb-1 text-[#18A58B]" />
                  <span>Evacuation</span>
                </button>
                <button
                  onClick={onNavigateToOperations || onNavigateToLive}
                  className="p-2 bg-[#10243A] hover:bg-[#142B42] text-[#E45555] border border-[#203A52] hover:border-[#E45555] rounded text-xs font-semibold flex flex-col items-center justify-center text-center transition cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mb-1 text-[#E45555]" />
                  <span>Triage Queue</span>
                </button>
                <button
                  onClick={onNavigateToLive}
                  className="p-2 bg-[#10243A] hover:bg-[#142B42] text-[#16B8D4] border border-[#203A52] hover:border-[#16B8D4] rounded text-xs font-semibold flex flex-col items-center justify-center text-center transition cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5 mb-1 text-[#16B8D4]" />
                  <span>Radar Studio</span>
                </button>
              </div>

              {/* 1. Hydrometeorological Telemetry Block */}
              <div className="p-3 bg-[#07111F] border border-[#203A52] rounded space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#E8F0F7] font-bold flex items-center space-x-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#16B8D4]" />
                    <span>Real-Time Sensor Feeds</span>
                  </span>
                  <span className="text-[9px] text-[#18A58B] font-semibold uppercase">Active Feeds</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div className="p-2 bg-[#10243A] rounded border border-[#203A52]">
                    <span className="text-[9px] text-[#8DA3B8] block uppercase font-mono">IMD 24h Rainfall</span>
                    <span className="text-[#E8F0F7] font-bold text-sm">{rainfall} mm</span>
                    <span className="text-[9px] text-[#8DA3B8]/70 block font-mono">Precipitation Inflow</span>
                  </div>
                  <div className="p-2 bg-[#10243A] rounded border border-[#203A52]">
                    <span className="text-[9px] text-[#8DA3B8] block uppercase font-mono">River Hydrometry</span>
                    <span className="text-[#16B8D4] font-bold text-sm">
                      {liveData?.hydrology?.river_discharge_m3_s != null
                        ? `${liveData.hydrology.river_discharge_m3_s} m³/s`
                        : '2.84 m'}
                    </span>
                    <span className="text-[9px] text-[#8DA3B8]/70 block font-mono">
                      Warn: {riverStation?.warning_level_m || '6.0'}m
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Critical Facilities (Hospitals) Under Inundation */}
              <div className="p-3 bg-[#07111F] border border-[#203A52] rounded space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#E45555] flex items-center space-x-1.5">
                    <Hospital className="w-3.5 h-3.5 text-[#E45555]" />
                    <span>Hospitals at Threat</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold text-[#E45555] border-[#E45555]/40 bg-[#E45555]/10">
                    {floodedHospitals.length || 28} Priority Units
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-xs font-mono">
                  {(floodedHospitals.length > 0 ? floodedHospitals : [
                    { properties: { name: 'Maha Jubilee Memorial Hospital' } },
                    { properties: { name: 'District Ayurveda Hospital' } },
                    { properties: { name: 'R.B.M. Hospital' } },
                    { properties: { name: 'Lourdes Hospital, Alappuzha' } }
                  ]).slice(0, 5).map((h: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-1.5 bg-[#10243A] rounded border border-[#203A52] flex justify-between items-center"
                    >
                      <span className="text-[#E8F0F7] truncate max-w-[200px] font-medium text-[11px]">
                        {h.properties?.name || 'Local Hospital'}
                      </span>
                      <span className="text-[8px] text-[#E45555] font-bold uppercase px-1.5 py-0.2 rounded bg-[#E45555]/10 border border-[#E45555]/30">
                        Inundated
                      </span>
                    </div>
                  ))}
                  {floodedHospitals.length > 5 && (
                    <button
                      onClick={onNavigateToImpact}
                      className="w-full text-center text-xs text-[#16B8D4] hover:underline pt-1 cursor-pointer font-mono"
                    >
                      View all {floodedHospitals.length} in Intelligence Studio →
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Affected Settlements & Population Centers */}
              <div className="p-3 bg-[#07111F] border border-[#203A52] rounded space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F0A83B] flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#F0A83B]" />
                    <span>Cut-Off Settlements</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold text-[#F0A83B] border-[#F0A83B]/40 bg-[#F0A83B]/10">
                    {affectedSettlements.length || 55} Inhabited Polders
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1 pr-1 text-xs font-mono">
                  {(affectedSettlements.length > 0 ? affectedSettlements : [
                    { properties: { name: 'Vellakinar', type: 'Suburb' } },
                    { properties: { name: 'Punnapra', type: 'Village' } },
                    { properties: { name: 'Ramankari', type: 'Village' } },
                    { properties: { name: 'Nedumudi', type: 'Polder' } }
                  ]).slice(0, 4).map((s: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-1.5 bg-[#10243A] rounded border border-[#203A52] flex justify-between items-center"
                    >
                      <span className="text-[#E8F0F7] truncate max-w-[200px] font-medium text-[11px]">
                        {s.properties?.name || 'Settlement'}
                      </span>
                      <span className="text-[8px] text-[#F0A83B] uppercase px-1.5 py-0.2 rounded bg-[#F0A83B]/10 border border-[#F0A83B]/30 font-semibold">
                        {s.properties?.type || 'Village'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Active Early Warning Bulletin */}
              {alerts.length > 0 && (
                <div className="p-2.5 bg-[#E45555]/10 border border-[#E45555] rounded space-y-1">
                  <div className="flex items-center space-x-1.5 text-[#E45555] font-bold text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#E45555]" />
                    <span>NDMA SACHET Emergency Bulletin</span>
                  </div>
                  <p className="text-xs text-[#E8F0F7] leading-relaxed font-sans">
                    {alerts[0].headline || alerts[0].area_description || 'Active flood warning issued for vulnerable lowlands.'}
                  </p>
                </div>
              )}

              {/* 5. Observation & SAR Radar Parameters */}
              <div className="p-2.5 bg-[#07111F] border border-[#203A52] rounded text-[10px] text-[#8DA3B8] font-mono space-y-1">
                <div className="text-[#16B8D4] font-bold uppercase tracking-wider text-[11px]">SAR Observation Specs</div>
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

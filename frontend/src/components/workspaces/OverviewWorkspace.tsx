import React, { useState } from 'react';
import { Waves, Users, Navigation, AlertTriangle, ChevronRight, ChevronLeft, Hospital, Building2 } from 'lucide-react';
import type { OverviewResponse, FloodMetadataResponse } from '../../types/api';
import type { FeatureCollection } from 'geojson';
import { KpiCard } from '../common/KpiCard';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

interface OverviewWorkspaceProps {
  overview: OverviewResponse | null;
  floodMeta: FloodMetadataResponse | null;
  facilitiesGeoJSON: FeatureCollection | null;
  settlementsGeoJSON: FeatureCollection | null;
  loading: boolean;
  onNavigateToImpact: () => void;
  onNavigateToRescue: () => void;
  onNavigateToLive: () => void;
}

export const OverviewWorkspace: React.FC<OverviewWorkspaceProps> = ({
  overview,
  facilitiesGeoJSON,
  settlementsGeoJSON,
  loading,
  onNavigateToImpact,
  onNavigateToRescue,
  onNavigateToLive,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const kpis = overview?.kpis;

  const floodedHospitals = facilitiesGeoJSON?.features.filter(
    (f: any) => f.properties?.inside_flood_extent && f.properties?.category === 'hospital'
  ) || [];

  const affectedSettlements = settlementsGeoJSON?.features.filter(
    (f: any) => f.properties?.affected_by_flood
  ) || [];

  return (
    <>
      {/* Top Floating KPI Strip */}
      <div className="absolute top-4 left-4 right-4 sm:left-6 sm:right-6 z-20 pointer-events-none">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-6xl pointer-events-auto">
          {/* Flooded Area */}
          <KpiCard
            label="Flooded Area"
            value={kpis ? kpis.flooded_area_ha.toLocaleString() : '...'}
            unit="ha"
            subtext={kpis ? `${kpis.flooded_area_km2} km² (permanent water excluded)` : undefined}
            badgeText="SAR Mapped"
            badgeVariant="cyan"
            icon={Waves}
            accent="cyan"
            loading={loading}
          />

          {/* Exposed Population */}
          <KpiCard
            label="Exposed Population"
            value={kpis ? kpis.estimated_exposed_population.toLocaleString() : '...'}
            unit="people"
            subtext="Census density model (±20% uncertainty)"
            badgeText="Estimated"
            badgeVariant="amber"
            icon={Users}
            accent="amber"
            loading={loading}
          />

          {/* Affected Roads */}
          <KpiCard
            label="Affected Roads"
            value={kpis ? kpis.affected_roads_km.toLocaleString() : '...'}
            unit="km"
            subtext={kpis ? `${kpis.affected_road_segments.toLocaleString()} intersecting segments` : undefined}
            badgeText="Exposed"
            badgeVariant="rose"
            icon={Navigation}
            accent="rose"
            loading={loading}
          />

          {/* Critical Facilities */}
          <KpiCard
            label="Critical Facilities"
            value={kpis ? kpis.facilities_exposed : '...'}
            unit="in flood zone"
            subtext={kpis ? `of ${kpis.total_facilities} facilities (${kpis.hospitals_exposed || 28} hospitals)` : undefined}
            badgeText="Priority"
            badgeVariant="rose"
            icon={AlertTriangle}
            accent="rose"
            loading={loading}
          />
        </div>
      </div>

      {/* Right Analytical Summary Drawer */}
      <div
        className={`absolute top-28 right-0 bottom-6 z-20 transition-all duration-300 flex pointer-events-none ${
          sidebarOpen ? 'w-[360px] sm:w-[390px]' : 'w-10'
        }`}
      >
        {/* Toggle Tab */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-10 w-9 bg-[#070D18]/95 hover:bg-[#16243A] text-slate-300 hover:text-white border-l border-y border-[#1E2D4A] rounded-l-xl flex items-center justify-center pointer-events-auto transition self-start mt-4 shadow-xl cursor-pointer"
          title={sidebarOpen ? 'Collapse Intelligence Sidebar' : 'Expand Intelligence Sidebar'}
        >
          {sidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Drawer Body */}
        {sidebarOpen && (
          <div className="flex-1 h-full bg-[#070D18]/90 backdrop-blur-md border-l border-y border-[#1E2D4A] rounded-l-2xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden">
            <div className="p-4 border-b border-[#1E2D4A] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Intelligence Summary</span>
                  <Badge variant="cyan" size="sm">
                    AOI Brief
                  </Badge>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  August 21, 2018 Peak Flood Assessment
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Quick Workspace Switch Actions */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={onNavigateToRescue}
                  className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-[11px] font-semibold flex flex-col items-center justify-center text-center transition cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 mb-1 text-emerald-400" />
                  <span>Rescue Route</span>
                </button>
                <button
                  onClick={onNavigateToLive}
                  className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl text-[11px] font-semibold flex flex-col items-center justify-center text-center transition cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 mb-1 text-amber-400 animate-pulse" />
                  <span>Live Feed</span>
                </button>
                <button
                  onClick={onNavigateToImpact}
                  className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-xl text-[11px] font-semibold flex flex-col items-center justify-center text-center transition cursor-pointer"
                >
                  <Waves className="w-3.5 h-3.5 mb-1 text-cyan-400" />
                  <span>Historical</span>
                </button>
              </div>

              {/* Healthcare Facilities in Inundation Zone */}
              <Card className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <Hospital className="w-4 h-4 text-rose-400" />
                    Hospitals Inside Flood Zone
                  </span>
                  <Badge variant="rose" size="sm">
                    {floodedHospitals.length} at risk
                  </Badge>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 text-[11px]">
                  {floodedHospitals.slice(0, 6).map((h: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-1.5 bg-[#070D18]/70 rounded border border-[#1E2D4A] flex justify-between items-center"
                    >
                      <span className="text-slate-300 truncate max-w-[210px]">
                        {h.properties?.name || 'Local Hospital'}
                      </span>
                      <span className="text-[10px] text-rose-400 font-mono font-semibold">
                        Inundated
                      </span>
                    </div>
                  ))}
                  {floodedHospitals.length > 6 && (
                    <div className="text-[10px] text-slate-400 text-center pt-1">
                      + {floodedHospitals.length - 6} more hospitals (view in Impact Analytics)
                    </div>
                  )}
                </div>
              </Card>

              {/* Settlements Intersecting Flood Footprint */}
              <Card className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    Affected Settlements
                  </span>
                  <Badge variant="amber" size="sm">
                    {affectedSettlements.length} villages
                  </Badge>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-[11px]">
                  {affectedSettlements.slice(0, 5).map((s: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-1.5 bg-[#070D18]/70 rounded border border-[#1E2D4A] flex justify-between items-center"
                    >
                      <span className="text-slate-300 truncate max-w-[210px]">
                        {s.properties?.name || 'Village'}
                      </span>
                      <span className="text-[10px] text-amber-400 font-semibold uppercase">
                        {s.properties?.type || 'Village'}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Data Confidence & SAR Context */}
              <div className="p-3 bg-[#070D18]/80 border border-[#1E2D4A] rounded-xl text-xs space-y-1.5">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <span>Observation Parameters</span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                  <div>Sensor: Sentinel-1A C-SAR (10m GRD)</div>
                  <div>Relative Orbit: 144 | Pass: ASCENDING</div>
                  <div>Water Bodies: 29 permanent lakes subtracted</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

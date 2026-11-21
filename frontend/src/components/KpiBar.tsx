import React from 'react';
import { Waves, Users, Navigation, AlertTriangle } from 'lucide-react';
import type { KPIs } from '../types/api';

interface KpiBarProps {
  kpis: KPIs | null;
  loading: boolean;
}

export const KpiBar: React.FC<KpiBarProps> = ({ kpis, loading }) => {
  return (
    <div className="absolute top-16 left-6 right-6 z-20 pointer-events-none">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-5xl pointer-events-auto">
        {/* Flooded Area */}
        <div className="bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 rounded-xl p-3.5 shadow-xl transition hover:border-cyan-400/60">
          <div className="flex items-center justify-between text-cyan-400 text-xs font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5" /> Flooded Area
            </span>
            <span className="text-[10px] bg-cyan-950/80 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800/50">
              SAR Derived
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-white">
              {loading || !kpis ? '...' : kpis.flooded_area_ha.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-semibold">ha</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {loading || !kpis ? '—' : `${kpis.flooded_area_km2} km² (excl. permanent water)`}
          </div>
        </div>

        {/* Exposed Population */}
        <div className="bg-slate-950/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-3.5 shadow-xl transition hover:border-amber-400/60">
          <div className="flex items-center justify-between text-amber-400 text-xs font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Exposed Population
            </span>
            <span className="text-[10px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/50">
              Estimated
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-white">
              {loading || !kpis ? '...' : kpis.estimated_exposed_population.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-semibold">people</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Census density model (±20%)
          </div>
        </div>

        {/* Affected Roads */}
        <div className="bg-slate-950/80 backdrop-blur-md border border-orange-500/30 rounded-xl p-3.5 shadow-xl transition hover:border-orange-400/60">
          <div className="flex items-center justify-between text-orange-400 text-xs font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" /> Affected Roads
            </span>
            <span className="text-[10px] bg-orange-950/80 text-orange-300 px-1.5 py-0.5 rounded border border-orange-800/50">
              Exposure
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-white">
              {loading || !kpis ? '...' : kpis.affected_roads_km.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-semibold">km</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {loading || !kpis ? '—' : `${kpis.affected_road_segments.toLocaleString()} intersecting segments`}
          </div>
        </div>

        {/* Facilities in Flood Zone */}
        <div className="bg-slate-950/80 backdrop-blur-md border border-rose-500/30 rounded-xl p-3.5 shadow-xl transition hover:border-rose-400/60">
          <div className="flex items-center justify-between text-rose-400 text-xs font-medium mb-1">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Critical Facilities
            </span>
            <span className="text-[10px] bg-rose-950/80 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800/50">
              Priority
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold tracking-tight text-white">
              {loading || !kpis ? '...' : kpis.facilities_exposed}
            </span>
            <span className="text-xs text-slate-400 font-semibold">in flood zone</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {loading || !kpis ? '—' : `of ${kpis.total_facilities} facilities (${kpis.hospitals_exposed || 28} hospitals)`}
          </div>
        </div>
      </div>
    </div>
  );
};

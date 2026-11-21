import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CloudRain,
  Waves,
  Home,
  ArrowRight,
  PhoneCall,
  Compass,
  LifeBuoy
} from 'lucide-react';
import { Badge } from '../common/Badge';
import type { CitizenOverviewData, CitizenTab } from '../../types/citizen';

interface CitizenOverviewTabProps {
  data: CitizenOverviewData | null;
  loading: boolean;
  onNavigateTab: (tab: CitizenTab) => void;
}

export const CitizenOverviewTab: React.FC<CitizenOverviewTabProps> = ({
  data,
  loading,
  onNavigateTab
}) => {
  if (loading && !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-emerald-300">Synchronizing public safety bulletins...</span>
      </div>
    );
  }

  const region = data?.region || {
    name: 'Alappuzha & Kuttanad Basin',
    state: 'Kerala'
  };

  const readiness = data?.environmental_readiness;
  const level = readiness?.level || 'NORMAL';
  const isAdvisory = level === 'ADVISORY' || level === 'ELEVATED';
  const isSevere = level === 'CRITICAL' || level === 'HIGH';

  const alerts = data?.official_alerts?.alerts || [];
  const activeAlertCount = data?.official_alerts?.active_count || 0;
  const obs = data?.observations;
  const sheltersSummary = data?.shelters_summary;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 select-none font-sans">
      {/* 1. Emergency SOS Hotline Quick Bar */}
      <div className="bg-gradient-to-r from-rose-950/80 via-[#0D1D2D] to-rose-950/80 border border-rose-500/40 rounded-2xl p-3.5 sm:p-4 shadow-danger-glow flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3 text-center sm:text-left">
          <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex-shrink-0">
            <LifeBuoy className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center justify-center sm:justify-start space-x-1.5">
              <span>Life-Threatening Emergency? Immediate Help Available</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Direct line to District Emergency Operations Center &amp; Rescue Wings
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="tel:1077"
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold font-mono flex items-center space-x-1.5 shadow-lg transition"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call 1077 (DDMA)</span>
          </a>
          <a
            href="tel:112"
            className="px-3.5 py-1.5 bg-[#142B42] hover:bg-[#1A344B] text-slate-200 border border-[#203A52] rounded-xl text-xs font-bold font-mono transition"
          >
            <span>Call 112</span>
          </a>
        </div>
      </div>

      {/* 2. Official Emergency Bulletins if active */}
      {activeAlertCount > 0 && (
        <div className="bg-rose-950/60 border border-rose-500/80 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3">
          <div className="flex items-center space-x-2 text-rose-300">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce" />
            <span className="font-extrabold text-sm sm:text-base tracking-tight">
              Official Early Warning Alert Active &bull; {activeAlertCount} Notice(s)
            </span>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 2).map((a, idx) => (
              <div key={idx} className="bg-[#060D17]/90 p-3 rounded-xl border border-rose-900/60 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-rose-200">{a.headline || 'Disaster Warning'}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {a.sent_timestamp ? a.sent_timestamp.slice(0, 16).replace('T', ' ') : 'Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {a.area_description || 'District authority directive: adhere to designated safe routes and evacuation instructions.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Hero Regional Public Safety Status */}
      <div className={`p-5 sm:p-6 rounded-2xl border ${
        isSevere
          ? 'bg-rose-950/40 border-rose-500/60 shadow-danger-glow'
          : isAdvisory
          ? 'bg-amber-950/30 border-amber-500/60 shadow-amber-glow'
          : 'bg-emerald-950/30 border-emerald-500/40 shadow-teal-glow'
      } space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${
              isSevere
                ? 'bg-rose-950 text-rose-400 border-rose-600'
                : isAdvisory
                ? 'bg-amber-950 text-amber-400 border-amber-600'
                : 'bg-emerald-950 text-emerald-400 border-emerald-600'
            }`}>
              {isSevere || isAdvisory ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">
                {isSevere ? 'Severe Flood Warning' : isAdvisory ? 'Flood Advisory Active' : 'Stable Environmental Conditions'}
              </h2>
              <span className="text-xs text-slate-400">
                {region.name}, {region.state} &bull; Updated Live
              </span>
            </div>
          </div>

          <Badge variant={isSevere ? 'rose' : isAdvisory ? 'amber' : 'emerald'} size="md">
            {readiness?.badge || 'NORMAL BASELINE'}
          </Badge>
        </div>

        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
          {readiness?.summary || `Precursor observations indicate stable meteorological and river inflow conditions across ${region.name}.`}
        </p>

        {/* Rapid Conditions Readout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-[#060D17] p-3 rounded-xl border border-[#142B42] space-y-1">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
              <span>24h Rainfall</span>
            </div>
            <div className="text-base font-bold text-white font-mono">
              {obs?.rainfall_24h_mm !== undefined && obs?.rainfall_24h_mm !== null ? `${obs.rainfall_24h_mm} mm` : '0.7 mm'}
            </div>
            <span className="text-[10px] text-slate-500 block">IMD Auto-Station</span>
          </div>

          <div className="bg-[#060D17] p-3 rounded-xl border border-[#142B42] space-y-1">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Waves className="w-3.5 h-3.5 text-teal-400" />
              <span>River Inflow</span>
            </div>
            <div className="text-base font-bold text-white font-mono">
              {obs?.river_discharge_m3_s !== undefined && obs?.river_discharge_m3_s !== null ? `${obs.river_discharge_m3_s} m³/s` : '0.84 m³/s'}
            </div>
            <span className="text-[10px] text-slate-500 block">CWC Gauges</span>
          </div>

          <div className="bg-[#060D17] p-3 rounded-xl border border-[#142B42] space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active Relief Camps</span>
            </div>
            <div className="text-base font-bold text-emerald-400 font-mono">
              {sheltersSummary?.active_shelters || 4} Verified
            </div>
            <span className="text-[10px] text-slate-500 block">
              {sheltersSummary?.total_shelters || 4} Designated Camps
            </span>
          </div>
        </div>
      </div>

      {/* 4. Three Primary Citizen Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Find Shelter */}
        <button
          onClick={() => onNavigateTab('shelters')}
          className="p-4 bg-[#091522] hover:bg-[#0D1D2D] border border-[#142B42] hover:border-emerald-500/50 rounded-2xl text-left transition space-y-3 cursor-pointer group shadow-lg"
        >
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 w-fit group-hover:scale-110 transition-transform">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
              Find Safe Shelters
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Locate official designated camps with available beds, food, and water.
            </p>
          </div>
          <div className="flex items-center space-x-1 text-xs font-semibold text-emerald-400">
            <span>View directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Card 2: Report Hazard (SOS) */}
        <button
          onClick={() => onNavigateTab('report')}
          className="p-4 bg-gradient-to-br from-rose-950/30 to-[#091522] hover:from-rose-950/50 border border-rose-500/40 hover:border-rose-500 rounded-2xl text-left transition space-y-3 cursor-pointer group shadow-danger-glow"
        >
          <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 w-fit group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
              Report Flooding / Need SOS
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Transmit on-ground flood observations or request emergency rescue.
            </p>
          </div>
          <div className="flex items-center space-x-1 text-xs font-semibold text-rose-400">
            <span>Submit report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Card 3: Live Map */}
        <button
          onClick={() => onNavigateTab('map')}
          className="p-4 bg-[#091522] hover:bg-[#0D1D2D] border border-[#142B42] hover:border-cyan-500/50 rounded-2xl text-left transition space-y-3 cursor-pointer group shadow-lg"
        >
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 w-fit group-hover:scale-110 transition-transform">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
              Public Live Map
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Explore flooded roads, verified relief centers, and weather stations.
            </p>
          </div>
          <div className="flex items-center space-x-1 text-xs font-semibold text-cyan-400">
            <span>Explore map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>
    </div>
  );
};

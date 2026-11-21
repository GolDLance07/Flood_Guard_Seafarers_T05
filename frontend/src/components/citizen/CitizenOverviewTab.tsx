import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CloudRain,
  Waves,
  Home,
  Info,
  ArrowRight,
  PhoneCall
} from 'lucide-react';
import { Card } from '../common/Card';
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
      <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Loading regional public safety telemetry...</span>
      </div>
    );
  }

  const region = data?.region || {
    name: 'Regional Area',
    state: 'India'
  };

  const readiness = data?.environmental_readiness;
  const level = readiness?.level || 'NORMAL';
  const isInsufficient = level === 'INSUFFICIENT_DATA';
  const isAdvisory = level === 'ADVISORY';
  const isElevated = level === 'ELEVATED' || level === 'PARTIAL_DATA';

  const readinessVariant: 'rose' | 'amber' | 'emerald' | 'slate' =
    isAdvisory ? 'rose' : isElevated ? 'amber' : isInsufficient ? 'slate' : 'emerald';

  const alerts = data?.official_alerts?.alerts || [];
  const activeAlertCount = data?.official_alerts?.active_count || 0;
  const obs = data?.observations;
  const sheltersSummary = data?.shelters_summary;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
      {/* 1. Official NDMA Emergency Alerts Callout */}
      {activeAlertCount > 0 ? (
        <div className="bg-rose-950/60 border border-rose-600/70 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center space-x-2.5 text-rose-300">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce" />
            <span className="font-extrabold text-sm sm:text-base tracking-tight">
              Official Early Warning Alert Active • {activeAlertCount} Notice(s)
            </span>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 3).map((a, idx) => (
              <div key={idx} className="bg-[#070D18]/80 p-3 rounded-xl border border-rose-900/60 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-rose-200">{a.headline || 'Disaster Alert'}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {a.sent_timestamp ? a.sent_timestamp.slice(0, 16).replace('T', ' ') : 'Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {a.area_description || 'Official safety instructions issued for this area.'}
                </p>
                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1">
                  <span>Source: {a.source || a.sender || 'NDMA SACHET'}</span>
                  <span className="text-rose-400 font-bold uppercase">{a.severity || 'Advisory'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[#0D1626] border border-[#1E2D4A] rounded-2xl p-4 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>No active emergency weather or flood alerts currently issued by NDMA SACHET for {region.name}.</span>
          </div>
          <Badge variant="emerald" size="sm">CLEAR</Badge>
        </div>
      )}

      {/* 2. Environmental Precursor Risk Overview Card */}
      <Card
        borderAccent={readinessVariant}
        className="p-5 sm:p-6 shadow-2xl relative overflow-hidden"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E2D4A]">
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-xl border ${
                readinessVariant === 'rose'
                  ? 'bg-rose-950/70 border-rose-500/50 text-rose-400'
                  : readinessVariant === 'amber'
                  ? 'bg-amber-950/70 border-amber-500/50 text-amber-400'
                  : readinessVariant === 'slate'
                  ? 'bg-slate-900/80 border-slate-700/60 text-slate-300'
                  : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-400'
              }`}>
                {readinessVariant === 'emerald' ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Environmental Readiness Status
                </h2>
                <span className="text-xs text-slate-400">
                  {region.name}, {region.state}
                </span>
              </div>
            </div>

            <Badge variant={readinessVariant} size="md">
              {readiness?.badge || 'Normal Baseline'}
            </Badge>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {readiness?.summary || `Stable meteorological and river inflow conditions observed across ${region.name}.`}
          </p>

          {/* Meteorological & Hydrological Observations Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {/* 24h Rainfall */}
            <div className="bg-[#070D18] p-3 rounded-xl border border-[#1E2D4A] space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                <span>24h Rainfall</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono">
                {obs?.rainfall_24h_mm !== null && obs?.rainfall_24h_mm !== undefined
                  ? `${obs.rainfall_24h_mm.toFixed(1)} mm`
                  : <span className="text-slate-500 text-xs font-normal">Unavailable</span>}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                Source: {obs?.weather_provider || 'IMD / Open-Meteo'}
              </div>
            </div>

            {/* River Inflow Status */}
            <div className="bg-[#070D18] p-3 rounded-xl border border-[#1E2D4A] space-y-1">
              <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                <Waves className="w-3.5 h-3.5 text-emerald-400" />
                <span>River Discharge</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-white font-mono">
                {obs?.river_discharge_m3_s !== null && obs?.river_discharge_m3_s !== undefined
                  ? `${obs.river_discharge_m3_s.toFixed(2)} m³/s`
                  : <span className="text-slate-500 text-xs font-normal">Unmonitored</span>}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                Flow: {obs?.river_flow_status || 'Normal'}
              </div>
            </div>

            {/* Current Weather Condition */}
            <div className="bg-[#070D18] p-3 rounded-xl border border-[#1E2D4A] space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Weather</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-white">
                {obs?.condition || 'Fair'}
              </div>
              <div className="text-[10px] text-slate-500">
                Temp: {obs?.temperature_c ? `${obs.temperature_c}°C` : '—'}
              </div>
            </div>
          </div>

          {/* Strict Safety Disclaimer */}
          <div className="p-3 bg-amber-950/30 border border-amber-700/40 rounded-xl text-[11px] text-amber-200/90 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="leading-snug">
              <strong>Public Safety Notice:</strong> Precursor indicators track meteorological potential, not physical water inundation.
              <strong> Never describe or assume a lower estimated risk location as safe.</strong> In high-water situations, immediately follow official district disaster directives.
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Find Safe Shelters Card */}
        <div
          onClick={() => onNavigateTab('shelters')}
          className="bg-[#0D1626] hover:bg-[#16243A] border border-[#1E2D4A] hover:border-emerald-500/50 rounded-2xl p-5 cursor-pointer transition shadow-xl space-y-3 group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Home className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Official Safe Shelters
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {sheltersSummary?.has_verified_data
                ? `${sheltersSummary.active_shelters} verified relief camps actively open in ${region.name}.`
                : `View shelter registry status and verified relief points for ${region.name}.`}
            </p>
          </div>
          <span className="inline-flex items-center text-xs font-semibold text-emerald-400">
            Open Shelter Finder &rarr;
          </span>
        </div>

        {/* Report Emergency Observation Card */}
        <div
          onClick={() => onNavigateTab('report')}
          className="bg-[#0D1626] hover:bg-[#16243A] border border-[#1E2D4A] hover:border-amber-500/50 rounded-2xl p-5 cursor-pointer transition shadow-xl space-y-3 group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Report Emergency Incident
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Report waterlogging, flooded roads, stranded people, or infrastructure damage to response teams.
            </p>
          </div>
          <span className="inline-flex items-center text-xs font-semibold text-amber-400">
            Submit Incident Report &rarr;
          </span>
        </div>
      </div>

      {/* 4. Emergency Helpline Banner */}
      <div className="p-4 bg-[#0D1626] border border-[#1E2D4A] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5">
          <PhoneCall className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <div>
            <span className="font-bold text-white">District Emergency Helpline: </span>
            <span className="text-slate-300">National Disaster Control: <strong>1077</strong> • Police: <strong>112</strong> • Ambulance: <strong>108</strong></span>
          </div>
        </div>
        <button
          onClick={() => onNavigateTab('map')}
          className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer text-left sm:text-right"
        >
          View Live Risk Map &rarr;
        </button>
      </div>
    </div>
  );
};

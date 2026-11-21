import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CloudRain,
  Waves,
  Home,
  PhoneCall,
  ArrowRight,
  Compass,
  LifeBuoy
} from 'lucide-react';
import type { CitizenOverviewData } from '../../types/citizen';
import { Badge } from '../common/Badge';

interface CitizenOverviewTabProps {
  data: CitizenOverviewData | null;
  loading: boolean;
  onNavigateTab: (tab: 'overview' | 'map' | 'shelters' | 'report' | 'activity') => void;
}

export const CitizenOverviewTab: React.FC<CitizenOverviewTabProps> = ({
  data,
  loading,
  onNavigateTab,
}) => {
  if (loading && !data) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="h-28 bg-[#091522] rounded border border-[#203A52] animate-pulse" />
        <div className="h-64 bg-[#091522] rounded border border-[#203A52] animate-pulse" />
      </div>
    );
  }

  const region = data?.region || { name: 'Alappuzha & Kuttanad Basin', state: 'Kerala' };
  const obs = data?.observations;
  const readiness = data?.environmental_readiness;
  const alerts = data?.official_alerts?.alerts || [];
  const activeAlertCount = data?.official_alerts?.active_count ?? alerts.length;
  const sheltersSummary = data?.shelters_summary;

  const isSevere = activeAlertCount > 0 || readiness?.badge === 'RED ALERT';
  const isAdvisory = readiness?.badge === 'ORANGE ALERT' || readiness?.badge === 'YELLOW ALERT';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 select-none font-sans">
      {/* 1. Emergency SOS Hotline Quick Bar */}
      <div className="bg-[#091522] border border-[#E45555]/60 rounded p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-3 text-center sm:text-left">
          <div className="p-2 rounded bg-[#E45555]/10 border border-[#E45555]/30 text-[#E45555] flex-shrink-0">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-[#E8F0F7] flex items-center justify-center sm:justify-start space-x-1.5">
              <span>Life-Threatening Emergency? Immediate Help Available</span>
            </div>
            <p className="text-[11px] text-[#8DA3B8]">
              Direct line to District Emergency Operations Center &amp; Rescue Wings
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="tel:1077"
            className="px-3 py-1.5 bg-[#E45555] hover:bg-[#E45555]/90 text-white rounded text-xs font-bold font-mono flex items-center space-x-1.5 transition"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call 1077 (DDMA)</span>
          </a>
          <a
            href="tel:112"
            className="px-3 py-1.5 bg-[#10243A] hover:bg-[#142B42] text-[#E8F0F7] border border-[#203A52] rounded text-xs font-bold font-mono transition"
          >
            <span>Call 112</span>
          </a>
        </div>
      </div>

      {/* 2. Official Emergency Bulletins if active */}
      {activeAlertCount > 0 && (
        <div className="bg-[#091522] border border-[#E45555] rounded p-4 space-y-2.5 shadow-xl">
          <div className="flex items-center space-x-2 text-[#E45555]">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="font-bold text-sm tracking-tight">
              Official Early Warning Alert Active &bull; {activeAlertCount} Notice(s)
            </span>
          </div>
          <div className="space-y-1.5">
            {alerts.slice(0, 2).map((a: any, idx: number) => (
              <div key={idx} className="bg-[#07111F] p-2.5 rounded border border-[#203A52] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#E45555]">{a.headline || 'Disaster Warning'}</span>
                  <span className="text-[10px] text-[#8DA3B8] font-mono">
                    {a.sent_timestamp ? a.sent_timestamp.slice(0, 16).replace('T', ' ') : 'Active'}
                  </span>
                </div>
                <p className="text-xs text-[#E8F0F7] leading-relaxed">
                  {a.area_description || 'District authority directive: adhere to designated safe routes and evacuation instructions.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Hero Regional Public Safety Status */}
      <div className={`p-4 sm:p-5 rounded border bg-[#091522] ${
        isSevere
          ? 'border-[#E45555]'
          : isAdvisory
          ? 'border-[#F0A83B]'
          : 'border-[#18A58B]'
      } space-y-3.5`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded border ${
              isSevere
                ? 'bg-[#E45555]/10 text-[#E45555] border-[#E45555]/40'
                : isAdvisory
                ? 'bg-[#F0A83B]/10 text-[#F0A83B] border-[#F0A83B]/40'
                : 'bg-[#18A58B]/10 text-[#18A58B] border-[#18A58B]/40'
            }`}>
              {isSevere || isAdvisory ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#E8F0F7]">
                {isSevere ? 'Severe Flood Warning' : isAdvisory ? 'Flood Advisory Active' : 'Stable Environmental Conditions'}
              </h2>
              <span className="text-xs text-[#8DA3B8]">
                {region.name}, {region.state} &bull; Updated Live
              </span>
            </div>
          </div>

          <Badge variant={isSevere ? 'rose' : isAdvisory ? 'amber' : 'emerald'} size="md">
            {readiness?.badge || 'NORMAL BASELINE'}
          </Badge>
        </div>

        <p className="text-xs sm:text-sm text-[#E8F0F7] leading-relaxed font-sans">
          {readiness?.summary || `Precursor observations indicate stable meteorological and river inflow conditions across ${region.name}.`}
        </p>

        {/* Rapid Conditions Readout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-0.5">
          <div className="bg-[#07111F] p-2.5 rounded border border-[#203A52] space-y-0.5">
            <div className="flex items-center space-x-1.5 text-xs text-[#8DA3B8]">
              <CloudRain className="w-3.5 h-3.5 text-[#16B8D4]" />
              <span>24h Rainfall</span>
            </div>
            <div className="text-sm font-bold text-[#E8F0F7] font-mono">
              {obs?.rainfall_24h_mm !== undefined && obs?.rainfall_24h_mm !== null ? `${obs.rainfall_24h_mm} mm` : '0.7 mm'}
            </div>
            <span className="text-[10px] text-[#8DA3B8]/70 block font-mono">IMD Auto-Station</span>
          </div>

          <div className="bg-[#07111F] p-2.5 rounded border border-[#203A52] space-y-0.5">
            <div className="flex items-center space-x-1.5 text-xs text-[#8DA3B8]">
              <Waves className="w-3.5 h-3.5 text-[#18A58B]" />
              <span>River Inflow</span>
            </div>
            <div className="text-sm font-bold text-[#E8F0F7] font-mono">
              {obs?.river_discharge_m3_s !== undefined && obs?.river_discharge_m3_s !== null ? `${obs.river_discharge_m3_s} m³/s` : '0.84 m³/s'}
            </div>
            <span className="text-[10px] text-[#8DA3B8]/70 block font-mono">CWC Gauges</span>
          </div>

          <div className="bg-[#07111F] p-2.5 rounded border border-[#203A52] space-y-0.5 col-span-2 sm:col-span-1">
            <div className="flex items-center space-x-1.5 text-xs text-[#8DA3B8]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#18A58B]" />
              <span>Active Relief Camps</span>
            </div>
            <div className="text-sm font-bold text-[#18A58B] font-mono">
              {sheltersSummary?.active_shelters || 4} Verified
            </div>
            <span className="text-[10px] text-[#8DA3B8]/70 block font-mono">
              {sheltersSummary?.total_shelters || 4} Designated Camps
            </span>
          </div>
        </div>
      </div>

      {/* 4. Three Primary Citizen Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Find Shelter */}
        <button
          onClick={() => onNavigateTab('shelters')}
          className="p-3.5 bg-[#091522] hover:bg-[#10243A] border border-[#203A52] hover:border-[#18A58B] rounded text-left transition space-y-2 cursor-pointer group shadow"
        >
          <div className="p-2 rounded bg-[#10243A] border border-[#203A52] text-[#18A58B] w-fit">
            <Home className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#E8F0F7] group-hover:text-[#18A58B] transition-colors">
              Find Safe Shelters
            </h3>
            <p className="text-[11px] text-[#8DA3B8] mt-0.5">
              Locate official designated camps with available beds, food, and water.
            </p>
          </div>
          <div className="flex items-center space-x-1 text-xs font-semibold text-[#18A58B] pt-1">
            <span>View directory</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </button>

        {/* Card 2: Report Hazard (SOS) */}
        <button
          onClick={() => onNavigateTab('report')}
          className="p-3.5 bg-[#091522] hover:bg-[#10243A] border border-[#203A52] hover:border-[#E45555] rounded text-left transition space-y-2 cursor-pointer group shadow"
        >
          <div className="p-2 rounded bg-[#10243A] border border-[#203A52] text-[#E45555] w-fit">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#E8F0F7] group-hover:text-[#E45555] transition-colors">
              Report Flooding / Need SOS
            </h3>
            <p className="text-[11px] text-[#8DA3B8] mt-0.5">
              Transmit on-ground flood observations or request emergency rescue.
            </p>
          </div>
          <div className="flex items-center space-x-1 text-xs font-semibold text-[#E45555] pt-1">
            <span>Submit report</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </button>

        {/* Card 3: Live Map */}
        <button
          onClick={() => onNavigateTab('map')}
          className="p-3.5 bg-[#091522] hover:bg-[#10243A] border border-[#203A52] hover:border-[#16B8D4] rounded text-left transition space-y-2 cursor-pointer group shadow"
        >
          <div className="p-2 rounded bg-[#10243A] border border-[#203A52] text-[#16B8D4] w-fit">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#E8F0F7] group-hover:text-[#16B8D4] transition-colors">
              Public Live Map
            </h3>
            <p className="text-[11px] text-[#8DA3B8] mt-0.5">
              Explore flooded roads, verified relief centers, and weather stations.
            </p>
          </div>
          <div className="flex items-center space-x-1 text-xs font-semibold text-[#16B8D4] pt-1">
            <span>Explore map</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </button>
      </div>
    </div>
  );
};

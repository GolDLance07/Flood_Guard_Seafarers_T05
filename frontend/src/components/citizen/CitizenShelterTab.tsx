import React, { useState } from 'react';
import {
  Home,
  Search,
  MapPin,
  Phone,
  Navigation2,
  Info
} from 'lucide-react';
import { Badge } from '../common/Badge';
import type { SheltersResponse } from '../../types/citizen';

interface CitizenShelterTabProps {
  sheltersData: SheltersResponse | null;
  loading: boolean;
  currentRegionName: string;
}

export const CitizenShelterTab: React.FC<CitizenShelterTabProps> = ({
  sheltersData,
  loading,
  currentRegionName
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'STANDBY'>('ALL');

  if (loading && !sheltersData) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400 select-none font-sans">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-emerald-300">Accessing verified district shelter registry...</span>
      </div>
    );
  }

  const hasVerifiedData = sheltersData?.has_verified_data ?? false;
  const allShelters = sheltersData?.shelters || [];

  const filteredShelters = allShelters.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.address && s.address.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || s.operational_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 select-none font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#142B42]">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Verified Relief Shelters
            </h1>
            <Badge variant="emerald" size="sm">
              GOVERNMENT VERIFIED
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Official relief camps designated by State &amp; District Disaster Management Authorities.
          </p>
        </div>

        {/* Filter Controls */}
        {hasVerifiedData && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-[#091522] p-0.5 rounded-xl border border-[#142B42]">
              {(['ALL', 'ACTIVE', 'STANDBY'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 text-xs rounded-lg font-mono font-semibold transition cursor-pointer ${
                    statusFilter === f
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-teal-glow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shelter name or village..."
                className="bg-[#091522] border border-[#142B42] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 w-44 sm:w-56"
              />
            </div>
          </div>
        )}
      </div>

      {/* Notice Callout */}
      <div className="p-3.5 bg-[#091522] border border-[#142B42] rounded-2xl text-xs text-slate-300 flex items-start space-x-3">
        <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-white">Authoritative Distinction:</strong> Only facilities listed below are official designated relief shelters equipped with backup generators, potable drinking water, medical staff, and community rations.
        </div>
      </div>

      {/* Unseeded Region Warning */}
      {!hasVerifiedData && (
        <div className="p-8 text-center space-y-4 bg-[#091522] border border-[#142B42] rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-[#060D17] text-slate-400 flex items-center justify-center mx-auto border border-[#142B42]">
            <Home className="w-6 h-6 text-amber-400" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h3 className="text-base font-bold text-white">No Verified Shelter Dataset Connected</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {sheltersData?.notice || `No verified official shelter dataset is currently connected for ${currentRegionName}.`}
            </p>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Requires local DDMA integration in FloodGuard Command.
          </div>
        </div>
      )}

      {/* Verified Shelter Cards */}
      {hasVerifiedData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredShelters.map((s) => {
            const capacity = s.capacity || 100;
            const occupancy = s.current_occupancy ?? 0;
            const occupancyRate = Math.min(100, Math.round((occupancy / capacity) * 100));
            const availableBeds = Math.max(0, capacity - occupancy);
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`;

            return (
              <div
                key={s.id}
                className="p-5 bg-[#091522] border border-[#142B42] rounded-3xl space-y-4 shadow-xl hover:border-slate-500 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">{s.name}</h3>
                    <div className="text-xs text-slate-400 flex items-center space-x-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span>{s.address}</span>
                    </div>
                  </div>
                  <Badge variant={s.operational_status === 'ACTIVE' ? 'emerald' : 'amber'} size="sm">
                    {s.operational_status}
                  </Badge>
                </div>

                {/* Capacity Gauge */}
                <div className="space-y-1.5 bg-[#060D17] p-3 rounded-2xl border border-[#142B42]">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Available Bed Space:</span>
                    <span className="text-emerald-300 font-bold">
                      {availableBeds} beds available ({occupancyRate}% full)
                    </span>
                  </div>
                  <div className="w-full bg-[#10243A] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        occupancyRate > 85 ? 'bg-rose-500' : occupancyRate > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${occupancyRate}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono text-right">
                    Certified for {capacity} residents
                  </div>
                </div>

                {/* Supplies & Provisions */}
                <div className="flex flex-wrap gap-1.5">
                  {(s.amenities || ['Drinking Water', 'Medical Volunteer Post', 'Power Backup']).map((sup, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-[#060D17] text-slate-300 border border-[#142B42]"
                    >
                      {sup.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>

                {/* Direct Action Buttons */}
                <div className="pt-2 border-t border-[#142B42] flex items-center justify-between gap-2">
                  {s.contact_phone ? (
                    <a
                      href={`tel:${s.contact_phone}`}
                      className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Camp ({s.contact_phone})</span>
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">DDMA Dispatch</span>
                  )}

                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition"
                  >
                    <Navigation2 className="w-3.5 h-3.5" />
                    <span>Get Directions</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

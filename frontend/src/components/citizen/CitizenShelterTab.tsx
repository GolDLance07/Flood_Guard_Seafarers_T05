import React, { useState } from 'react';
import {
  Home,
  Search,
  MapPin,
  Phone,
  Navigation2,
  Info,
  Layers
} from 'lucide-react';
import { Card } from '../common/Card';
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
      <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Checking verified emergency shelter registries...</span>
      </div>
    );
  }

  const hasVerifiedData = sheltersData?.has_verified_data ?? false;
  const allShelters = sheltersData?.shelters || [];

  const filteredShelters = allShelters.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.address && s.address.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || s.operational_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Shelter Header & Official Registry Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E2D4A]">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Emergency Shelter Finder
            </h1>
            <Badge variant="emerald" size="sm">
              Verified Feeds
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authoritative relief camps designated by State & District Disaster Management Authorities.
          </p>
        </div>

        {/* Search & Filter Inputs */}
        {hasVerifiedData && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1">
              {(['ALL', 'ACTIVE', 'STANDBY'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition cursor-pointer ${
                    statusFilter === f
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-[#0D1626] text-slate-400 hover:text-slate-200 border border-[#1E2D4A]'
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
                placeholder="Search shelter by name or area..."
                className="bg-[#0D1626] border border-[#1E2D4A] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 w-44 sm:w-56"
              />
            </div>
          </div>
        )}
      </div>

      {/* Strict Distinction: Designated Shelters vs Low-Risk Areas */}
      <div className="p-3.5 bg-[#0D1626] border border-[#1E2D4A] rounded-xl text-xs text-slate-300 flex items-start space-x-3">
        <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Important Public Distinction:</strong> Only facilities listed below are official designated emergency relief camps equipped with power, water, and emergency food supplies. General low-risk geographic elevations do NOT possess life-support provisions.
        </div>
      </div>

      {/* Case 1: Unseeded Region Honest Empty State */}
      {!hasVerifiedData && (
        <Card className="p-6 sm:p-8 text-center space-y-4 border-dashed border-[#1E2D4A]">
          <div className="w-12 h-12 rounded-2xl bg-[#16243A] text-slate-400 flex items-center justify-center mx-auto">
            <Home className="w-6 h-6 text-amber-400" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h3 className="text-base font-bold text-white">
              No Verified Shelter Registry Connected
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {sheltersData?.notice || `No verified official shelter dataset is currently connected for ${currentRegionName}.`}
            </p>
          </div>

          <div className="bg-[#070D18] p-4 rounded-xl border border-[#1E2D4A] max-w-lg mx-auto text-left text-xs space-y-2">
            <div className="flex items-center space-x-1.5 text-amber-300 font-bold">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Data Integration Requirements:</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {sheltersData?.data_requirements_notice ||
                'Municipal and District Disaster Management Authorities must register designated relief shelters through the FloodGuard Command portal with GPS coordinates, certified capacity, and liaison phone numbers before facilities can be presented to the public.'}
            </p>
            <div className="text-[10px] text-slate-500 font-mono pt-1">
              Data Provenance: {sheltersData?.data_provenance || 'NO_VERIFIED_DATASET_CONNECTED'}
            </div>
          </div>
        </Card>
      )}

      {/* Case 2: Verified Shelters Available (Kerala / Alappuzha) */}
      {hasVerifiedData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing {filteredShelters.length} of {allShelters.length} official relief centers</span>
            <span className="font-mono text-[10px] text-emerald-400">
              Provenance: {sheltersData?.data_provenance}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredShelters.map((s) => {
              const statusVariant: 'emerald' | 'amber' | 'rose' | 'slate' =
                s.operational_status === 'ACTIVE' ? 'emerald' :
                s.operational_status === 'STANDBY' ? 'amber' :
                s.operational_status === 'FULL' ? 'rose' : 'slate';

              const occupancyPct = s.capacity && s.current_occupancy !== null && s.current_occupancy !== undefined
                ? Math.min(Math.round((s.current_occupancy / s.capacity) * 100), 100)
                : null;

              return (
                <Card
                  key={s.id}
                  borderAccent={statusVariant}
                  className="p-5 shadow-xl space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-white leading-snug">
                          {s.name}
                        </h3>
                        <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          <span className="truncate">{s.address || 'Alappuzha District'}</span>
                        </div>
                      </div>
                      <Badge variant={statusVariant} size="sm">
                        {s.operational_status}
                      </Badge>
                    </div>

                    {/* Capacity & Occupancy Bar */}
                    {s.capacity && (
                      <div className="bg-[#070D18] p-2.5 rounded-xl border border-[#1E2D4A] space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Certified Capacity</span>
                          <span className="font-bold text-white font-mono">
                            {s.current_occupancy || 0} / {s.capacity} beds occupied
                          </span>
                        </div>
                        {occupancyPct !== null && (
                          <div className="w-full bg-[#16243A] h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                occupancyPct > 85 ? 'bg-rose-500' : occupancyPct > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                              }`}
                              style={{ width: `${occupancyPct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Amenities Chips */}
                    {s.amenities && s.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {s.amenities.map((am, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-[#16243A] text-slate-300 border border-[#1E2D4A]"
                          >
                            {am}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions & Official Source Footer */}
                  <div className="pt-3 border-t border-[#1E2D4A] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
                      Source: {s.official_source}
                    </span>

                    <div className="flex items-center space-x-2">
                      {s.contact_phone && (
                        <a
                          href={`tel:${s.contact_phone}`}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#16243A] hover:bg-[#1E2D4A] text-slate-200 border border-[#1E2D4A] rounded-lg transition"
                        >
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>Call</span>
                        </a>
                      )}

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition shadow-md shadow-emerald-950/40"
                      >
                        <Navigation2 className="w-3 h-3" />
                        <span>Directions</span>
                      </a>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

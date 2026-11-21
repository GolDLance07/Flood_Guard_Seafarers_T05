import React, { useState } from 'react';
import {
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
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-[#8DA3B8] select-none font-sans">
        <div className="w-8 h-8 border-2 border-[#18A58B] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-[#18A58B]">Accessing verified district shelter registry...</span>
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 select-none font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#203A52]">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-xl font-bold text-[#E8F0F7] tracking-tight">
              Verified Relief Shelters
            </h1>
            <Badge variant="emerald" size="sm">
              GOVERNMENT VERIFIED
            </Badge>
          </div>
          <p className="text-xs text-[#8DA3B8] mt-0.5">
            Official relief camps designated by State &amp; District Disaster Management Authorities.
          </p>
        </div>

        {/* Filter Controls */}
        {hasVerifiedData && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-[#091522] p-0.5 rounded border border-[#203A52]">
              {(['ALL', 'ACTIVE', 'STANDBY'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2.5 py-0.5 text-xs rounded font-mono font-medium transition cursor-pointer ${
                    statusFilter === f
                      ? 'bg-[#10243A] text-[#18A58B] border border-[#18A58B]'
                      : 'text-[#8DA3B8] hover:text-[#E8F0F7]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8DA3B8] absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shelter name or village..."
                className="bg-[#091522] border border-[#203A52] rounded pl-8 pr-2.5 py-1 text-xs text-[#E8F0F7] placeholder-[#8DA3B8]/60 focus:outline-none focus:border-[#18A58B] w-44 sm:w-56"
              />
            </div>
          </div>
        )}
      </div>

      {/* Notice Callout */}
      <div className="p-3 bg-[#091522] border border-[#203A52] rounded text-xs text-[#8DA3B8] flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-[#18A58B] flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-[#E8F0F7]">Authoritative Distinction:</strong> Only facilities listed below are official designated relief shelters equipped with backup generators, potable drinking water, medical staff, and community rations.
        </p>
      </div>

      {/* Shelters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredShelters.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-[#8DA3B8] font-mono text-xs bg-[#091522] rounded border border-[#203A52]">
            No verified relief shelters matching search criteria in {currentRegionName}.
          </div>
        ) : (
          filteredShelters.map((shelter) => {
            const occupancy = shelter.current_occupancy || 0;
            const capacity = shelter.capacity || 100;
            const occupancyPct = Math.min(100, Math.round((occupancy / capacity) * 100));
            const availableBeds = Math.max(0, capacity - occupancy);

            return (
              <div
                key={shelter.id}
                className="p-4 bg-[#091522] border border-[#203A52] rounded space-y-3 transition shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#E8F0F7]">{shelter.name}</h3>
                    <div className="text-xs text-[#8DA3B8] flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#18A58B] flex-shrink-0" />
                      <span className="truncate">{shelter.address || 'Alappuzha, Kerala'}</span>
                    </div>
                  </div>
                  <Badge variant={shelter.operational_status === 'ACTIVE' ? 'emerald' : 'amber'} size="sm">
                    {shelter.operational_status}
                  </Badge>
                </div>

                {/* Capacity Gauge */}
                <div className="p-2.5 bg-[#07111F] rounded border border-[#203A52] space-y-1.5 font-mono">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8DA3B8]">Available Bed Space:</span>
                    <span className="text-[#18A58B] font-bold">
                      {availableBeds} beds available ({occupancyPct}% full)
                    </span>
                  </div>
                  <div className="w-full bg-[#10243A] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        occupancyPct > 80 ? 'bg-[#E45555]' : occupancyPct > 50 ? 'bg-[#F0A83B]' : 'bg-[#18A58B]'
                      }`}
                      style={{ width: `${occupancyPct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[#8DA3B8] text-right">
                    Certified for {capacity} residents
                  </div>
                </div>

                {/* Amenities Tags */}
                {shelter.amenities && shelter.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {shelter.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#10243A] text-[#8DA3B8] border border-[#203A52]"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Controls */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#203A52]">
                  {shelter.contact_phone ? (
                    <a
                      href={`tel:${shelter.contact_phone}`}
                      className="py-1.5 px-3 bg-[#10243A] hover:bg-[#142B42] text-[#18A58B] border border-[#203A52] hover:border-[#18A58B] rounded text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Camp ({shelter.contact_phone})</span>
                    </a>
                  ) : (
                    <a
                      href="tel:1077"
                      className="py-1.5 px-3 bg-[#10243A] hover:bg-[#142B42] text-[#8DA3B8] border border-[#203A52] rounded text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Camp (1077)</span>
                    </a>
                  )}

                  {shelter.latitude && shelter.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude},${shelter.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-3 bg-[#10243A] hover:bg-[#142B42] text-[#16B8D4] border border-[#203A52] hover:border-[#16B8D4] rounded text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                    >
                      <Navigation2 className="w-3.5 h-3.5" />
                      <span>Get Directions</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

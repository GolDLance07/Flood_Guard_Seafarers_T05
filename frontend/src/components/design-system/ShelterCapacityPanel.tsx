import React from 'react';
import type { ShelterItem } from '../../types/citizen';
import { Home, Phone, Navigation } from 'lucide-react';

interface ShelterCapacityPanelProps {
  shelters: ShelterItem[];
  selectedShelterId?: string | null;
  onSelectShelter?: (shelter: ShelterItem) => void;
  className?: string;
}

export const ShelterCapacityPanel: React.FC<ShelterCapacityPanelProps> = ({
  shelters,
  selectedShelterId,
  onSelectShelter,
  className = ''
}) => {
  return (
    <div className={`bg-[#091522] border border-[#203A52] rounded p-3 select-none text-xs font-sans space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b border-[#203A52] pb-2">
        <div className="flex items-center space-x-2">
          <Home className="w-4 h-4 text-[#18A58B]" />
          <span className="font-bold text-[#E8F0F7] uppercase tracking-wider text-[11px] font-mono">
            Verified Shelter Registry ({shelters.length})
          </span>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#18A58B]/40 bg-[#18A58B]/10 text-[#18A58B]">
          DDMA AUTHORIZED
        </span>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {shelters.length === 0 ? (
          <div className="p-4 text-center text-[#8DA3B8] font-mono text-xs">
            No active designated shelters registered for this monitoring zone.
          </div>
        ) : (
          shelters.map((shelter) => {
            const isSelected = selectedShelterId === shelter.id;
            const occupancy = shelter.current_occupancy || 0;
            const capacity = shelter.capacity || 100;
            const occupancyPct = Math.min(100, Math.round((occupancy / capacity) * 100));
            const availableBeds = Math.max(0, capacity - occupancy);

            return (
              <div
                key={shelter.id}
                onClick={() => onSelectShelter && onSelectShelter(shelter)}
                className={`p-2.5 rounded border transition-colors cursor-pointer space-y-2 ${
                  isSelected
                    ? 'bg-[#10243A] border-[#16B8D4]'
                    : 'bg-[#07111F] border-[#203A52] hover:border-[#8DA3B8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#E8F0F7] text-xs truncate max-w-[200px]">
                    {shelter.name}
                  </h4>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase ${
                    shelter.operational_status === 'ACTIVE'
                      ? 'text-[#18A58B] border-[#18A58B]/40 bg-[#18A58B]/10'
                      : 'text-[#F0A83B] border-[#F0A83B]/40 bg-[#F0A83B]/10'
                  }`}>
                    {shelter.operational_status}
                  </span>
                </div>

                <div className="text-[10px] text-[#8DA3B8] truncate">
                  {shelter.address}
                </div>

                {/* Capacity Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-[#8DA3B8]">Occupancy: {occupancyPct}%</span>
                    <span className="text-[#18A58B] font-bold">{availableBeds} beds free</span>
                  </div>
                  <div className="w-full bg-[#142B42] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        occupancyPct > 80 ? 'bg-[#E45555]' : occupancyPct > 50 ? 'bg-[#F0A83B]' : 'bg-[#18A58B]'
                      }`}
                      style={{ width: `${occupancyPct}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-[#203A52]/60 font-mono text-[10px]">
                  {shelter.contact_phone ? (
                    <a
                      href={`tel:${shelter.contact_phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#16B8D4] hover:underline flex items-center space-x-1"
                    >
                      <Phone className="w-2.5 h-2.5" />
                      <span>{shelter.contact_phone}</span>
                    </a>
                  ) : (
                    <span className="text-[#8DA3B8]">Emergency DDMA 1077</span>
                  )}
                  {shelter.latitude && shelter.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude},${shelter.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#18A58B] hover:underline flex items-center space-x-1"
                    >
                      <Navigation className="w-2.5 h-2.5" />
                      <span>Directions</span>
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

import React from 'react';

interface MapLegendProps {
  showInundation?: boolean;
  showAffectedRoads?: boolean;
  showRoads?: boolean;
  showFacilities?: boolean;
  showShelters?: boolean;
  showIncidents?: boolean;
  showStations?: boolean;
  className?: string;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  showInundation = true,
  showAffectedRoads = true,
  showRoads = true,
  showFacilities = true,
  showShelters = true,
  showIncidents = false,
  showStations = false,
  className = ''
}) => {
  return (
    <div className={`bg-[#091522] border border-[#203A52] rounded p-2.5 text-[11px] font-mono text-[#8DA3B8] shadow-lg select-none space-y-1.5 ${className}`}>
      <div className="text-[10px] uppercase font-bold text-[#E8F0F7] border-b border-[#203A52] pb-1 tracking-wider">
        Cartographic Symbology
      </div>
      <div className="space-y-1.5 pt-0.5">
        {showInundation && (
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-2 rounded-sm bg-[#16B8D4]/60 border border-[#16B8D4]" />
            <span className="text-[#E8F0F7]">SAR Inundation (Copernicus S1)</span>
          </div>
        )}
        {showAffectedRoads && (
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-1 rounded bg-[#E45555]" />
            <span className="text-[#E8F0F7]">Submerged / Cut-Off Road</span>
          </div>
        )}
        {showRoads && (
          <div className="flex items-center space-x-2">
            <span className="w-3.5 h-0.5 bg-[#8DA3B8]" />
            <span>Passable Road Network</span>
          </div>
        )}
        {showFacilities && (
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E45555] border border-white" />
            <span>Hospital at Risk</span>
          </div>
        )}
        {showShelters && (
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#18A58B] border border-white" />
            <span>Designated Safe Shelter</span>
          </div>
        )}
        {showIncidents && (
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F0A83B] border border-[#E45555]" />
            <span>Tactical Incident Beacon</span>
          </div>
        )}
        {showStations && (
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16B8D4] border border-[#10243A]" />
            <span>CWC / IMD Telemetry Station</span>
          </div>
        )}
      </div>
    </div>
  );
};

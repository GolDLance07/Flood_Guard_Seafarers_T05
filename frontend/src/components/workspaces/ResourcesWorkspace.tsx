import React, { useState } from 'react';
import {
  Home,
  Building2,
  Navigation,
  MapPin,
  Phone,
  Info
} from 'lucide-react';
import type { FeatureCollection } from 'geojson';
import type { RouteCoordinate, RouteResponse } from '../../types/api';
import type { SheltersResponse } from '../../types/citizen';
import type { LayerVisibility } from '../LayerControls';
import { RescueWorkspace } from './RescueWorkspace';
import { Badge } from '../common/Badge';

interface ResourcesWorkspaceProps {
  layers: LayerVisibility;
  onToggleLayer: (layer: keyof LayerVisibility) => void;
  floodGeoJSON: FeatureCollection | null;
  roadsGeoJSON: FeatureCollection | null;
  roadNetworkGeoJSON?: FeatureCollection | null;
  facilitiesGeoJSON: FeatureCollection | null;
  settlementsGeoJSON: FeatureCollection | null;
  origin: RouteCoordinate | null;
  destination: RouteCoordinate | null;
  setOrigin: (coord: RouteCoordinate | null) => void;
  setDestination: (coord: RouteCoordinate | null) => void;
  routeResponse: RouteResponse | null;
  routingLoading: boolean;
  onComputeRoute: () => void;
  selectionMode: 'none' | 'origin' | 'destination';
  setSelectionMode: (mode: 'none' | 'origin' | 'destination') => void;
  fitAoiTrigger: number;
  resetViewTrigger: number;
  onFitAOI: () => void;
  onResetView: () => void;
  sheltersData?: SheltersResponse | null;
}

export const ResourcesWorkspace: React.FC<ResourcesWorkspaceProps> = ({
  layers,
  onToggleLayer,
  floodGeoJSON,
  roadsGeoJSON,
  roadNetworkGeoJSON,
  facilitiesGeoJSON,
  settlementsGeoJSON,
  origin,
  destination,
  setOrigin,
  setDestination,
  routeResponse,
  routingLoading,
  onComputeRoute,
  selectionMode,
  setSelectionMode,
  fitAoiTrigger,
  resetViewTrigger,
  onFitAOI,
  onResetView,
  sheltersData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'routing' | 'shelters' | 'facilities'>('routing');

  const shelters = sheltersData?.shelters || [];
  const facilities = facilitiesGeoJSON?.features || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07111F] text-slate-200 overflow-hidden select-none">
      {/* Sub-navigation Ribbon */}
      <div className="h-11 px-4 bg-[#0A1828] border-b border-[#1E3550] flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => setActiveSubTab('routing')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'routing'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#10243A]/50 border border-transparent'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>Evacuation & Routing</span>
          </button>

          <button
            onClick={() => setActiveSubTab('shelters')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'shelters'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#10243A]/50 border border-transparent'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-emerald-400" />
            <span>Shelter Registry ({shelters.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('facilities')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'facilities'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#10243A]/50 border border-transparent'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Critical Facilities ({facilities.length})</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-mono hidden md:block">
          Resources & Evacuation Infrastructure
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden relative">
        {/* SUB-TAB 1: Evacuation Routing Engine */}
        {activeSubTab === 'routing' && (
          <RescueWorkspace
            layers={layers}
            onToggleLayer={onToggleLayer}
            floodGeoJSON={floodGeoJSON}
            roadsGeoJSON={roadsGeoJSON}
            roadNetworkGeoJSON={roadNetworkGeoJSON}
            facilitiesGeoJSON={facilitiesGeoJSON}
            settlementsGeoJSON={settlementsGeoJSON}
            origin={origin}
            destination={destination}
            setOrigin={setOrigin}
            setDestination={setDestination}
            routeResponse={routeResponse}
            routingLoading={routingLoading}
            onComputeRoute={onComputeRoute}
            selectionMode={selectionMode}
            setSelectionMode={setSelectionMode}
            fitAoiTrigger={fitAoiTrigger}
            resetViewTrigger={resetViewTrigger}
            onFitAOI={onFitAOI}
            onResetView={onResetView}
          />
        )}

        {/* SUB-TAB 2: Shelter Registry */}
        {activeSubTab === 'shelters' && (
          <div className="w-full h-full p-4 sm:p-6 overflow-y-auto space-y-4">
            <div className="p-4 bg-[#10243A] border border-[#1E3550] rounded-xl flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Home className="w-4 h-4 text-emerald-400" />
                  <span>Designated Emergency Relief Shelters</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified disaster relief camps, live capacity vs occupancy, and local nodal officers
                </p>
              </div>
              <Badge variant="emerald">{shelters.length} Shelters Verified</Badge>
            </div>

            {shelters.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs max-w-md mx-auto">
                <Info className="w-8 h-8 text-slate-600 mb-2 mx-auto" />
                <span className="font-bold block text-white mb-1">No Shelters Connected for This Jurisdiction</span>
                <span>To register operational relief camps for this area, district collectors must provide shelter GPS coordinates, contact phone, and total capacity.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {shelters.map((s: any) => (
                  <div
                    key={s.id || s.name}
                    className="p-3.5 bg-[#10243A] border border-[#1E3550] hover:border-cyan-500/50 rounded-xl space-y-2 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-white text-xs leading-snug">{s.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600">
                        {s.operational_status || 'ACTIVE'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 line-clamp-1 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                      <span>{s.address || s.location_name || 'Designated relief facility'}</span>
                    </div>

                    <div className="pt-2 border-t border-[#1E3550]/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Capacity</span>
                        <span className="font-mono font-bold text-white">{s.capacity || '—'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block text-[10px]">Current Occupancy</span>
                        <span className="font-mono font-bold text-cyan-400">{s.current_occupancy || 0}</span>
                      </div>
                    </div>

                    {s.contact_phone && (
                      <div className="pt-1 text-[11px] text-slate-400 flex items-center space-x-1 font-mono">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>{s.contact_phone}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 3: Critical Facilities */}
        {activeSubTab === 'facilities' && (
          <div className="w-full h-full p-4 sm:p-6 overflow-y-auto space-y-4">
            <div className="p-4 bg-[#10243A] border border-[#1E3550] rounded-xl flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>Critical Infrastructure & Facilities Atlas</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hospitals, clinics, educational relief shelters, and police stations
                </p>
              </div>
              <Badge variant="cyan">{facilities.length} Facilities Cataloged</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {facilities.slice(0, 30).map((f: any, i: number) => {
                const isFlooded = f.properties?.inside_flood_extent;
                return (
                  <div
                    key={f.id || i}
                    className="p-3 bg-[#10243A] border border-[#1E3550] rounded-xl flex justify-between items-start"
                  >
                    <div>
                      <h4 className="font-bold text-white text-xs">{f.properties?.name || 'Critical Facility'}</h4>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">{f.properties?.category || 'hospital'}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isFlooded
                        ? 'bg-rose-950 text-rose-300 border border-rose-700'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    }`}>
                      {isFlooded ? 'FLOOD EXPOSED' : 'PASSABLE'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Home,
  Building2,
  Navigation,
  MapPin,
  Phone
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
    <div className="flex-1 flex flex-col h-full bg-[#060D17] text-slate-200 overflow-hidden select-none font-sans relative">
      {/* Sub-Navigation Ribbon */}
      <div className="h-12 px-4 bg-[#091522] border-b border-[#142B42] flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            onClick={() => setActiveSubTab('routing')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'routing'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-cyan-glow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#10243A]/50 border border-transparent'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>Evacuation & Routing</span>
          </button>

          <button
            onClick={() => setActiveSubTab('shelters')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'shelters'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-teal-glow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#10243A]/50 border border-transparent'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-emerald-400" />
            <span>Shelter Registry ({shelters.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('facilities')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'facilities'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-cyan-glow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#10243A]/50 border border-transparent'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Critical Facilities ({facilities.length})</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-mono hidden md:flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>RELIEF LOGISTICS &amp; EVACUATION ENGINE</span>
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
          <div className="w-full h-full p-4 sm:p-6 overflow-y-auto space-y-4 max-w-6xl mx-auto">
            <div className="p-4 bg-[#091522] border border-[#142B42] rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center space-x-2 font-mono">
                  <Home className="w-4 h-4 text-emerald-400" />
                  <span>District Verified Relief Camp Registry</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  DDMA Alappuzha officially designated relief shelters with verified capacity and provisions
                </p>
              </div>
              <Badge variant="emerald" size="md">STATE MONITORED</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shelters.map((sh) => (
                <div
                  key={sh.id}
                  className="p-4 bg-[#0D1D2D] border border-[#142B42] rounded-2xl space-y-3 shadow-lg hover:border-slate-600 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-white">{sh.name}</h3>
                      <div className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <span>{sh.address}</span>
                      </div>
                    </div>
                    <Badge variant={sh.operational_status === 'ACTIVE' ? 'emerald' : 'amber'} size="sm">
                      {sh.operational_status}
                    </Badge>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Occupancy:</span>
                      <span className="text-white font-bold">
                        {sh.current_occupancy ?? 0} / {sh.capacity || 100} beds ({Math.round(((sh.current_occupancy ?? 0) / (sh.capacity || 1)) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#060D17] rounded-full h-2 border border-[#142B42]">
                      <div
                        className="bg-emerald-400 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round(((sh.current_occupancy ?? 0) / (sh.capacity || 1)) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Provisions tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(sh.amenities || ['Drinking Water', 'Medical Volunteer Post', 'Power Backup']).map((sup, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#060D17] text-slate-300 border border-[#142B42]"
                      >
                        {sup.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#142B42] flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400">Coord: {sh.latitude.toFixed(3)}°N, {sh.longitude.toFixed(3)}°E</span>
                    {sh.contact_phone && (
                      <a
                        href={`tel:${sh.contact_phone}`}
                        className="px-2.5 py-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 rounded-lg flex items-center space-x-1 hover:bg-emerald-600/30"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{sh.contact_phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-TAB 3: Critical Facilities */}
        {activeSubTab === 'facilities' && (
          <div className="w-full h-full p-4 sm:p-6 overflow-y-auto space-y-4 max-w-6xl mx-auto">
            <div className="p-4 bg-[#091522] border border-[#142B42] rounded-2xl flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center space-x-2 font-mono">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>Regional Critical Infrastructure Atlas</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Hospitals, emergency medical outposts, power substations, and evacuation shelters
                </p>
              </div>
              <Badge variant="cyan" size="md">{facilities.length} Mapped Assets</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {facilities.slice(0, 30).map((f: any, idx: number) => {
                const props = f.properties || {};
                const isFlooded = props.inside_flood_extent;
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      isFlooded
                        ? 'bg-rose-950/30 border-rose-800/60'
                        : 'bg-[#0D1D2D] border-[#142B42]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-white truncate max-w-[200px]">
                        {props.name || 'Critical Facility'}
                      </span>
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold ${
                          isFlooded ? 'bg-rose-950 text-rose-300 border border-rose-700' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        }`}
                      >
                        {isFlooded ? 'Inundated' : 'Accessible'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono">
                      Category: <span className="text-cyan-300 uppercase">{props.category || 'Hospital'}</span>
                    </div>

                    {props.bed_count && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        Bed Capacity: {props.bed_count} Units
                      </div>
                    )}
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

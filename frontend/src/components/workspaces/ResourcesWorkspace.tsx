import React, { useState } from 'react';
import {
  Home,
  Building2,
  Navigation,
  Hospital
} from 'lucide-react';
import type { FeatureCollection } from 'geojson';
import type { RouteCoordinate, RouteResponse } from '../../types/api';
import type { SheltersResponse, ShelterItem } from '../../types/citizen';
import type { LayerVisibility } from '../LayerControls';
import { RescueWorkspace } from './RescueWorkspace';
import { ShelterCapacityPanel } from '../design-system/ShelterCapacityPanel';

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
  const [selectedShelter, setSelectedShelter] = useState<ShelterItem | null>(null);

  const shelters = sheltersData?.shelters || [];
  const facilities = facilitiesGeoJSON?.features || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07111F] text-[#E8F0F7] overflow-hidden select-none font-sans relative">
      {/* Sub-Navigation Ribbon */}
      <div className="h-11 px-4 bg-[#091522] border-b border-[#203A52] flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setActiveSubTab('routing')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium font-mono transition-colors cursor-pointer ${
              activeSubTab === 'routing'
                ? 'bg-[#10243A] text-[#16B8D4] border border-[#16B8D4]'
                : 'text-[#8DA3B8] hover:text-[#E8F0F7] hover:bg-[#10243A]/50 border border-transparent'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-[#16B8D4]" />
            <span>Evacuation & Routing</span>
          </button>

          <button
            onClick={() => setActiveSubTab('shelters')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium font-mono transition-colors cursor-pointer ${
              activeSubTab === 'shelters'
                ? 'bg-[#10243A] text-[#18A58B] border border-[#18A58B]'
                : 'text-[#8DA3B8] hover:text-[#E8F0F7] hover:bg-[#10243A]/50 border border-transparent'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-[#18A58B]" />
            <span>Shelter Registry ({shelters.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('facilities')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium font-mono transition-colors cursor-pointer ${
              activeSubTab === 'facilities'
                ? 'bg-[#10243A] text-[#F0A83B] border border-[#F0A83B]'
                : 'text-[#8DA3B8] hover:text-[#E8F0F7] hover:bg-[#10243A]/50 border border-transparent'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-[#F0A83B]" />
            <span>Critical Facilities ({facilities.length})</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-[10px] font-mono text-[#8DA3B8]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#18A58B]" />
          <span>RELIEF LOGISTICS &amp; EVACUATION ENGINE</span>
        </div>
      </div>

      {/* Primary Workspace Content View */}
      <div className="flex-1 overflow-hidden relative">
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

        {activeSubTab === 'shelters' && (
          <div className="h-full p-4 overflow-y-auto max-w-5xl mx-auto">
            <ShelterCapacityPanel
              shelters={shelters}
              selectedShelterId={selectedShelter?.id}
              onSelectShelter={setSelectedShelter}
            />
          </div>
        )}

        {activeSubTab === 'facilities' && (
          <div className="h-full p-4 overflow-y-auto max-w-5xl mx-auto space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-[#203A52] pb-2">
              <div>
                <h3 className="text-xs font-bold text-[#E8F0F7] uppercase tracking-wider flex items-center space-x-2">
                  <Hospital className="w-4 h-4 text-[#E45555]" />
                  <span>Critical Infrastructure &amp; Medical Atlas</span>
                </h3>
                <p className="text-[10px] text-[#8DA3B8]">
                  Verified hospitals, community health centers, and staging points across the basin.
                </p>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded border border-[#203A52] bg-[#091522] text-[#8DA3B8]">
                {facilities.length} ASSETS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {facilities.slice(0, 30).map((f: any, idx: number) => {
                const isFlooded = f.properties?.inside_flood_extent;
                return (
                  <div
                    key={idx}
                    className="p-3 bg-[#091522] border border-[#203A52] rounded space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#E8F0F7] text-xs font-sans truncate max-w-[260px]">
                        {f.properties?.name || 'Local Facility'}
                      </span>
                      <span
                        className={`text-[8px] uppercase px-1.5 py-0.2 rounded font-bold border ${
                          isFlooded
                            ? 'bg-[#E45555]/10 text-[#E45555] border-[#E45555]/40'
                            : 'bg-[#18A58B]/10 text-[#18A58B] border-[#18A58B]/40'
                        }`}
                      >
                        {isFlooded ? 'Threatened' : 'Operational'}
                      </span>
                    </div>

                    <div className="text-[10px] text-[#8DA3B8] flex items-center justify-between">
                      <span>Category: {f.properties?.category || 'Healthcare'}</span>
                      {f.geometry?.coordinates && (
                        <span>
                          {f.geometry.coordinates[1].toFixed(4)}°N, {f.geometry.coordinates[0].toFixed(4)}°E
                        </span>
                      )}
                    </div>
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

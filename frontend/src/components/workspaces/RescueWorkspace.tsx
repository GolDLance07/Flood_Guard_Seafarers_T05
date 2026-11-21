import React, { useState } from 'react';
import { Navigation, AlertTriangle, MapPin, CheckCircle2, XCircle, Compass, Sparkles, RotateCcw } from 'lucide-react';
import type { RouteCoordinate, RouteResponse } from '../../types/api';
import type { FeatureCollection } from 'geojson';
import type { LayerVisibility } from '../LayerControls';
import { Card } from '../common/Card';
import { MapComponent } from '../MapComponent';
import { LayerControls } from '../LayerControls';

interface RescueWorkspaceProps {
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
}

const SUPPORTED_POIS: { name: string; coord: RouteCoordinate; description: string }[] = [
  { name: 'Alappuzha General Hospital', coord: { longitude: 76.335, latitude: 9.495 }, description: 'Primary hospital hub (Coastal corridor)' },
  { name: 'Kalavoor Relief Centre', coord: { longitude: 76.330, latitude: 9.550 }, description: 'Northern staging depot (Dry link via NH66)' },
  { name: 'Kuttanad Wetland Center', coord: { longitude: 76.450, latitude: 9.480 }, description: 'Deep inundation zone (Severed access)' },
  { name: 'Alappuzha Beach Port', coord: { longitude: 76.315, latitude: 9.492 }, description: 'Western evacuation staging point' },
  { name: 'KSRTC Central Station', coord: { longitude: 76.340, latitude: 9.498 }, description: 'Town transit hub' },
  { name: 'Ambalappuzha Health Clinic', coord: { longitude: 76.356, latitude: 9.382 }, description: 'Southern sector medical outpost' },
];

const AOI_BOUNDS = { minLon: 76.30, maxLon: 76.60, minLat: 9.30, maxLat: 9.60 };

export const RescueWorkspace: React.FC<RescueWorkspaceProps> = ({
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
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  // Scenario Preset 1: Passable Coastal Corridor
  const handleApplyPresetSafe = () => {
    setOrigin({ longitude: 76.335, latitude: 9.495 });
    setDestination({ longitude: 76.330, latitude: 9.550 });
    setValidationError(null);
  };

  // Scenario Preset 2: Disconnected Inundated Wetland
  const handleApplyPresetFlooded = () => {
    setOrigin({ longitude: 76.335, latitude: 9.495 });
    setDestination({ longitude: 76.450, latitude: 9.480 });
    setValidationError(null);
  };

  const handleClearRoute = () => {
    setOrigin(null);
    setDestination(null);
    setSelectionMode('none');
    setValidationError(null);
  };

  const validateAndCompute = () => {
    setValidationError(null);
    if (!origin) {
      setValidationError('Please select or click an Origin point on the map.');
      return;
    }
    if (!destination) {
      setValidationError('Please select or click a Destination point on the map.');
      return;
    }

    const inBounds = (c: RouteCoordinate) =>
      c.longitude >= AOI_BOUNDS.minLon &&
      c.longitude <= AOI_BOUNDS.maxLon &&
      c.latitude >= AOI_BOUNDS.minLat &&
      c.latitude <= AOI_BOUNDS.maxLat;

    if (!inBounds(origin)) {
      setValidationError(`Origin [${origin.longitude}, ${origin.latitude}] is outside the Alappuzha AOI.`);
      return;
    }
    if (!inBounds(destination)) {
      setValidationError(`Destination [${destination.longitude}, ${destination.latitude}] is outside the Alappuzha AOI.`);
      return;
    }

    onComputeRoute();
  };

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-[#070D18]">
      {/* Left Operational Control Panel */}
      <div className="w-full lg:w-[440px] xl:w-[480px] h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-[#1E2D4A] bg-[#070D18]/95 p-4 sm:p-6 overflow-y-auto space-y-4 flex-shrink-0 z-10">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Rescue Access Intelligence
                </h1>
                <p className="text-xs text-slate-400">
                  Strict dry-road candidate routing avoiding inundated segments
                </p>
              </div>
            </div>

            {(origin || destination) && (
              <button
                onClick={handleClearRoute}
                className="flex items-center space-x-1 px-2.5 py-1 bg-[#111E30] hover:bg-[#16243A] text-slate-300 hover:text-white rounded border border-[#1E2D4A] text-xs transition cursor-pointer"
                title="Clear route inputs and markers"
              >
                <RotateCcw className="w-3 h-3 text-cyan-400" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* 1-Click Demonstration Scenarios */}
        <Card className="p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Demonstration Scenarios
            </span>
            <span className="text-[10px] text-slate-400 font-mono">1-Click Test</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={handleApplyPresetSafe}
              className="p-2.5 bg-[#0D1626] hover:bg-emerald-950/40 border border-emerald-500/40 hover:border-emerald-400 text-left rounded-lg transition cursor-pointer group"
            >
              <div className="text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
                ✓ Coastal Relief Route
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Hospital → Kalavoor (Passable NH66 link)
              </div>
            </button>

            <button
              onClick={handleApplyPresetFlooded}
              className="p-2.5 bg-[#0D1626] hover:bg-rose-950/40 border border-rose-500/40 hover:border-rose-400 text-left rounded-lg transition cursor-pointer group"
            >
              <div className="text-xs font-bold text-rose-300 group-hover:text-rose-200">
                ⚠️ Isolated Wetland Point
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Coast → Kuttanad (No dry route exists)
              </div>
            </button>
          </div>
        </Card>

        {/* Location Selection: Origin & Destination */}
        <div className="space-y-3">
          {/* Origin Card */}
          <Card className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                Origin Point (Departure / Staging)
              </span>
              <button
                onClick={() => setSelectionMode(selectionMode === 'origin' ? 'none' : 'origin')}
                className={`px-2.5 py-1 rounded text-xs font-semibold border transition cursor-pointer ${
                  selectionMode === 'origin'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 animate-pulse'
                    : 'bg-[#111E30] text-cyan-300 border-cyan-800 hover:bg-[#16243A]'
                }`}
              >
                {selectionMode === 'origin' ? 'Click map to place...' : 'Pick from map'}
              </button>
            </div>

            {/* Quick POI dropdown */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 text-[11px] whitespace-nowrap">Preset POI:</span>
              <select
                onChange={(e) => {
                  const poi = SUPPORTED_POIS.find((p) => p.name === e.target.value);
                  if (poi) setOrigin({ ...poi.coord });
                }}
                defaultValue=""
                className="w-full bg-[#070D18] border border-[#1E2D4A] rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="" disabled>Choose landmark or facility...</option>
                {SUPPORTED_POIS.map((poi, idx) => (
                  <option key={idx} value={poi.name}>
                    {poi.name} ({poi.description})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-[#070D18] border border-[#1E2D4A] rounded">
                <span className="text-[10px] text-slate-400 block font-sans">Longitude:</span>
                <input
                  type="number"
                  step="0.0001"
                  value={origin ? origin.longitude : ''}
                  placeholder="e.g. 76.3350"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setOrigin({ longitude: val, latitude: origin?.latitude || 9.495 });
                  }}
                  className="w-full bg-transparent text-white font-bold focus:outline-none"
                />
              </div>
              <div className="p-2 bg-[#070D18] border border-[#1E2D4A] rounded">
                <span className="text-[10px] text-slate-400 block font-sans">Latitude:</span>
                <input
                  type="number"
                  step="0.0001"
                  value={origin ? origin.latitude : ''}
                  placeholder="e.g. 9.4950"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setOrigin({ longitude: origin?.longitude || 76.335, latitude: val });
                  }}
                  className="w-full bg-transparent text-white font-bold focus:outline-none"
                />
              </div>
            </div>
          </Card>

          {/* Destination Card */}
          <Card className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-400" />
                Destination Point (Target / Hospital)
              </span>
              <button
                onClick={() => setSelectionMode(selectionMode === 'destination' ? 'none' : 'destination')}
                className={`px-2.5 py-1 rounded text-xs font-semibold border transition cursor-pointer ${
                  selectionMode === 'destination'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 animate-pulse'
                    : 'bg-[#111E30] text-emerald-300 border-emerald-800 hover:bg-[#16243A]'
                }`}
              >
                {selectionMode === 'destination' ? 'Click map to place...' : 'Pick from map'}
              </button>
            </div>

            {/* Quick POI dropdown */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 text-[11px] whitespace-nowrap">Preset POI:</span>
              <select
                onChange={(e) => {
                  const poi = SUPPORTED_POIS.find((p) => p.name === e.target.value);
                  if (poi) setDestination({ ...poi.coord });
                }}
                defaultValue=""
                className="w-full bg-[#070D18] border border-[#1E2D4A] rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="" disabled>Choose landmark or facility...</option>
                {SUPPORTED_POIS.map((poi, idx) => (
                  <option key={idx} value={poi.name}>
                    {poi.name} ({poi.description})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 bg-[#070D18] border border-[#1E2D4A] rounded">
                <span className="text-[10px] text-slate-400 block font-sans">Longitude:</span>
                <input
                  type="number"
                  step="0.0001"
                  value={destination ? destination.longitude : ''}
                  placeholder="e.g. 76.3300"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setDestination({ longitude: val, latitude: destination?.latitude || 9.550 });
                  }}
                  className="w-full bg-transparent text-white font-bold focus:outline-none"
                />
              </div>
              <div className="p-2 bg-[#070D18] border border-[#1E2D4A] rounded">
                <span className="text-[10px] text-slate-400 block font-sans">Latitude:</span>
                <input
                  type="number"
                  step="0.0001"
                  value={destination ? destination.latitude : ''}
                  placeholder="e.g. 9.5500"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) setDestination({ longitude: destination?.longitude || 76.330, latitude: val });
                  }}
                  className="w-full bg-transparent text-white font-bold focus:outline-none"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Validation Error banner */}
        {validationError && (
          <div className="p-3 bg-rose-950/80 border border-rose-500/80 rounded-xl text-rose-200 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={validateAndCompute}
          disabled={!origin || !destination || routingLoading}
          className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition shadow-xl cursor-pointer ${
            !origin || !destination || routingLoading
              ? 'bg-[#111E30] text-slate-500 cursor-not-allowed border border-[#1E2D4A]'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
          }`}
        >
          <Navigation className={`w-4 h-4 ${routingLoading ? 'animate-spin' : ''}`} />
          <span>{routingLoading ? 'Computing Dry Route Over Road Graph...' : 'Compute Candidate Rescue Route'}</span>
        </button>

        {/* Route Execution Result */}
        {routeResponse && (
          <Card
            borderAccent={routeResponse.status === 'candidate_route' ? 'emerald' : 'rose'}
            className="p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {routeResponse.status === 'candidate_route' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                <span className="font-bold text-sm text-white">
                  {routeResponse.status === 'candidate_route'
                    ? 'Candidate Dry Route Identified'
                    : 'No Flood-Free Route Available'}
                </span>
              </div>
              {routeResponse.distance_km !== null && (
                <span className="text-emerald-300 font-mono font-extrabold text-base">
                  {routeResponse.distance_km} km
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {routeResponse.method}
            </p>

            {/* Non-negotiable safety notice */}
            <div className="p-3 bg-amber-950/70 border border-amber-500/60 rounded-xl space-y-1 text-amber-200">
              <div className="flex items-center space-x-1.5 font-bold text-xs text-amber-300 uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Mandatory Ground Verification Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-100">
                {routeResponse.warnings[0] || 'Candidate route only. Road conditions and passability require ground verification.'}
              </p>
            </div>
          </Card>
        )}

        {/* Algorithm Specs */}
        <div className="p-3 bg-[#0D1626] border border-[#1E2D4A] rounded-xl text-xs space-y-1 text-slate-400">
          <div className="font-semibold text-slate-300">Routing Algorithm Specification</div>
          <div className="text-[11px] leading-relaxed">
            Dijkstra shortest path executed over 108,038 nodes in NetworkX. All 2,619 road segments intersecting the mapped SAR flood extent are strictly excluded (<code className="text-cyan-300">dry_graph</code>). Zero traversal of inundated edges permitted.
          </div>
        </div>
      </div>

      {/* Right Map View */}
      <div className="flex-1 h-1/2 lg:h-full relative overflow-hidden">
        <MapComponent
          layers={layers}
          floodGeoJSON={floodGeoJSON}
          roadsGeoJSON={roadsGeoJSON}
          roadNetworkGeoJSON={roadNetworkGeoJSON}
          facilitiesGeoJSON={facilitiesGeoJSON}
          settlementsGeoJSON={settlementsGeoJSON}
          routeResponse={routeResponse}
          origin={origin}
          destination={destination}
          selectionMode={selectionMode}
          onMapClickCoord={(coord) => {
            if (selectionMode === 'origin') {
              setOrigin(coord);
              setSelectionMode('none');
              setValidationError(null);
            } else if (selectionMode === 'destination') {
              setDestination(coord);
              setSelectionMode('none');
              setValidationError(null);
            }
          }}
          fitAoiTrigger={fitAoiTrigger}
          resetViewTrigger={resetViewTrigger}
        />

        {/* Floating Layer Controls */}
        <div className="absolute bottom-6 left-6 z-20">
          <LayerControls
            layers={layers}
            onToggle={onToggleLayer}
            onFitAOI={onFitAOI}
            onResetView={onResetView}
          />
        </div>
      </div>
    </div>
  );
};

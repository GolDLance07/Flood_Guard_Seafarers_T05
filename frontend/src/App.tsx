import React, { useState, useEffect, useRef } from 'react';
import { AppHeader } from './components/navigation/AppHeader';
import { CommandSidebar, type CommandWorkspaceId } from './components/navigation/CommandSidebar';
import { MapComponent } from './components/MapComponent';
import { LayerControls, type LayerVisibility } from './components/LayerControls';
import { OverviewWorkspace } from './components/workspaces/OverviewWorkspace';
import { IntelligenceWorkspace } from './components/workspaces/IntelligenceWorkspace';
import { IncidentWorkspace } from './components/workspaces/IncidentWorkspace';
import { ResponderWorkspace } from './components/workspaces/ResponderWorkspace';
import { ResourcesWorkspace } from './components/workspaces/ResourcesWorkspace';
import { SystemDiagnosticsModal } from './components/workspaces/SystemDiagnosticsModal';
import { EarthLoadingScreen } from './components/loading/EarthLoadingScreen';

// Citizen Experience Components
import { CitizenHeader } from './components/citizen/CitizenHeader';
import { CitizenNavigation } from './components/citizen/CitizenNavigation';
import { CitizenOverviewTab } from './components/citizen/CitizenOverviewTab';
import { CitizenMapTab } from './components/citizen/CitizenMapTab';
import { CitizenShelterTab } from './components/citizen/CitizenShelterTab';
import { CitizenReportTab } from './components/citizen/CitizenReportTab';
import { CitizenActivityTab } from './components/citizen/CitizenActivityTab';

import {
  fetchOverview,
  fetchFloodMetadata,
  fetchFloodExtent,
  fetchAffectedRoads,
  fetchRoadNetwork,
  fetchFacilities,
  fetchSettlements,
  fetchLiveOverview,
  fetchMonitoringRegions,
  fetchCitizenOverview,
  fetchCitizenShelters,
  computeCandidateRoute,
} from './services/api';

import type {
  OverviewResponse,
  FloodMetadataResponse,
  RouteCoordinate,
  RouteResponse,
  MonitoringRegion,
} from './types/api';

import type {
  AppMode,
  CitizenTab,
  CitizenOverviewData,
  SheltersResponse,
  IncidentSubmissionResult,
} from './types/citizen';

import type { FeatureCollection } from 'geojson';
import { AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  // Application Mode: Citizen (Public Safety) vs Command (Emergency Operations)
  const [appMode, setAppMode] = useState<AppMode>(() => {
    return (localStorage.getItem('floodguard_app_mode') as AppMode) || 'citizen';
  });

  // Initial Signature 3D Earth Loading State (boot only)
  const [hasInitialLoaded, setHasInitialLoaded] = useState<boolean>(false);
  const [bootStage, setBootStage] = useState<string>('Establishing secure connection');
  const [bootProgress, setBootProgress] = useState<number>(15);

  // Citizen Tab Navigation (Home, Live Map, Shelters, Report, My Activity)
  const [activeCitizenTab, setActiveCitizenTab] = useState<CitizenTab>('overview');

  // Command Center Workspaces (Overview, Intelligence, Operations, Field Teams, Resources)
  const [activeWorkspace, setActiveWorkspace] = useState<CommandWorkspaceId>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState<boolean>(false);

  // Operational Geospatial Data State
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [floodMeta, setFloodMeta] = useState<FloodMetadataResponse | null>(null);
  const [floodGeoJSON, setFloodGeoJSON] = useState<FeatureCollection | null>(null);
  const [roadsGeoJSON, setRoadsGeoJSON] = useState<FeatureCollection | null>(null);
  const [roadNetworkGeoJSON, setRoadNetworkGeoJSON] = useState<FeatureCollection | null>(null);
  const [facilitiesGeoJSON, setFacilitiesGeoJSON] = useState<FeatureCollection | null>(null);
  const [settlementsGeoJSON, setSettlementsGeoJSON] = useState<FeatureCollection | null>(null);

  // Live Environmental Telemetry State
  const [liveData, setLiveData] = useState<any>(null);
  const [liveLoading, setLiveLoading] = useState<boolean>(false);

  // Citizen State
  const [citizenOverview, setCitizenOverview] = useState<CitizenOverviewData | null>(null);
  const [citizenShelters, setCitizenShelters] = useState<SheltersResponse | null>(null);
  const [citizenLoading, setCitizenLoading] = useState<boolean>(false);
  const [regionsList, setRegionsList] = useState<MonitoringRegion[]>([]);

  // Local Incident Reports (Privacy-safe localStorage)
  const [myReports, setMyReports] = useState<IncidentSubmissionResult[]>(() => {
    try {
      const saved = localStorage.getItem('floodguard_my_reports');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Layer Visibility
  const [layers, setLayers] = useState<LayerVisibility>({
    floodExtent: true,
    affectedRoads: true,
    normalRoads: true,
    facilities: true,
    settlements: true,
  });

  // Routing State
  const [origin, setOrigin] = useState<RouteCoordinate | null>(null);
  const [destination, setDestination] = useState<RouteCoordinate | null>(null);
  const [routeResponse, setRouteResponse] = useState<RouteResponse | null>(null);
  const [routingLoading, setRoutingLoading] = useState<boolean>(false);
  const [selectionMode, setSelectionMode] = useState<'none' | 'origin' | 'destination'>('none');

  // Viewport Triggers
  const [fitAoiTrigger, setFitAoiTrigger] = useState<number>(0);
  const [resetViewTrigger, setResetViewTrigger] = useState<number>(0);

  const [monitoringRegionId, setMonitoringRegionId] = useState<string>(() => {
    return localStorage.getItem('floodguard_monitoring_region_id') || 'kerala-alappuzha';
  });
  const liveRequestIdRef = useRef(0);

  const handleSetAppMode = (mode: AppMode) => {
    setAppMode(mode);
    localStorage.setItem('floodguard_app_mode', mode);
  };

  const loadCitizenData = async (regId: string) => {
    setCitizenLoading(true);
    try {
      const [ov, sh] = await Promise.all([
        fetchCitizenOverview(regId).catch((e) => {
          console.warn('Citizen overview fetch failed:', e);
          return null;
        }),
        fetchCitizenShelters(regId).catch((e) => {
          console.warn('Citizen shelters fetch failed:', e);
          return null;
        }),
      ]);
      if (ov) setCitizenOverview(ov);
      if (sh) setCitizenShelters(sh);
    } catch (err: any) {
      console.error('Failed to load citizen data:', err);
    } finally {
      setCitizenLoading(false);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      setBootStage('Establishing secure connection');
      setBootProgress(20);

      const savedRegion = localStorage.getItem('floodguard_monitoring_region_id') || 'kerala-alappuzha';

      setBootStage('Connecting to monitoring feeds');
      setBootProgress(40);

      const [ov, fm, fg, rg, rn, fac, set, live, regResp] = await Promise.all([
        fetchOverview(),
        fetchFloodMetadata(),
        fetchFloodExtent(),
        fetchAffectedRoads(),
        fetchRoadNetwork().catch((e) => {
          console.warn('Road network fetch failed, continuing without base network:', e);
          return null;
        }),
        fetchFacilities(),
        fetchSettlements(),
        fetchLiveOverview(savedRegion).catch((e) => {
          console.warn('Live monitoring service unavailable, falling back:', e);
          return null;
        }),
        fetchMonitoringRegions().catch((e) => {
          console.warn('Failed to fetch regions list:', e);
          return null;
        }),
      ]);

      setBootStage('Loading regional intelligence');
      setBootProgress(75);

      setOverview(ov);
      setFloodMeta(fm);
      setFloodGeoJSON(fg);
      setRoadsGeoJSON(rg);
      if (rn) setRoadNetworkGeoJSON(rn);
      setFacilitiesGeoJSON(fac);
      setSettlementsGeoJSON(set);
      if (live) setLiveData(live);
      if (regResp?.regions) setRegionsList(regResp.regions);

      setBootStage('Preparing operational workspace');
      setBootProgress(95);

      await loadCitizenData(savedRegion);

      setBootProgress(100);
      setTimeout(() => {
        setHasInitialLoaded(true);
      }, 400);
    } catch (err: any) {
      console.error('Failed to load disaster intelligence data:', err);
      setError(err?.message || 'Failed to connect to FloodGuard API backend.');
      setHasInitialLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const pollLiveData = async (regionId?: string) => {
    const target = regionId || monitoringRegionId;
    const reqId = ++liveRequestIdRef.current;
    try {
      setLiveLoading(true);
      const live = await fetchLiveOverview(target);
      if (reqId === liveRequestIdRef.current) {
        setLiveData(live);
      }
    } catch (err: any) {
      console.error('Failed to poll live telemetry:', err);
    } finally {
      if (reqId === liveRequestIdRef.current) {
        setLiveLoading(false);
      }
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleToggleLayer = (layer: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleComputeRoute = async () => {
    if (!origin || !destination) return;
    try {
      setRoutingLoading(true);
      const res = await computeCandidateRoute({
        event_id: 'kerala-2018-demo',
        origin,
        destination,
      });
      setRouteResponse(res);
    } catch (err: any) {
      console.error('Routing computation failed:', err);
      setRouteResponse({
        status: 'no_route_found',
        distance_km: null,
        geometry: null,
        method: 'NetworkX shortest path over OSM road graph (dry roads strictly enforced)',
        warnings: [
          err.message || 'Routing calculation failed.',
          'Candidate route only. Road conditions and passability require ground verification.',
        ],
      });
    } finally {
      setRoutingLoading(false);
    }
  };

  const handleMapClickCoord = (coord: RouteCoordinate) => {
    if (selectionMode === 'origin') {
      setOrigin(coord);
      setSelectionMode('none');
    } else if (selectionMode === 'destination') {
      setDestination(coord);
      setSelectionMode('none');
    }
  };

  const handleCitizenSelectRegion = (regId: string) => {
    setMonitoringRegionId(regId);
    localStorage.setItem('floodguard_monitoring_region_id', regId);
    loadCitizenData(regId);
    pollLiveData(regId);
  };

  const handleReportSubmitted = (res: IncidentSubmissionResult) => {
    setMyReports((prev) => {
      const updated = [res, ...prev.filter((r) => r.tracking_number !== res.tracking_number)];
      try {
        localStorage.setItem('floodguard_my_reports', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist report locally:', e);
      }
      return updated;
    });
    setActiveCitizenTab('activity');
  };

  // 1. Initial Signature Earth Loading Screen (boot only)
  if (!hasInitialLoaded && loading) {
    return (
      <EarthLoadingScreen
        currentStage={bootStage}
        progressPct={bootProgress}
        onFinished={() => setHasInitialLoaded(true)}
      />
    );
  }

  // --------------------------------------------------------------------------
  // CITIZEN INTERFACE (Public Citizen Experience)
  // --------------------------------------------------------------------------
  if (appMode === 'citizen') {
    const currentReg = citizenOverview?.region || {
      id: monitoringRegionId,
      name: monitoringRegionId.split('-')[1] || 'Alappuzha',
      state: monitoringRegionId.split('-')[0] || 'Kerala',
    };

    return (
      <div className="relative w-screen h-screen overflow-hidden bg-[#07111F] flex flex-col font-sans select-none text-[#F1F5F9]">
        {/* Public Citizen Header */}
        <CitizenHeader
          currentRegion={{
            id: currentReg.id,
            name: currentReg.name,
            state: currentReg.state,
          }}
          regionsList={regionsList}
          onSelectRegion={handleCitizenSelectRegion}
          onSwitchToCommand={() => handleSetAppMode('command')}
        />

        {/* 5-Tab Public Navigation (Home, Live Map, Shelters, Report, My Activity) */}
        <CitizenNavigation
          activeTab={activeCitizenTab}
          onSelectTab={setActiveCitizenTab}
          reportCount={myReports.length}
        />

        {/* Tab Content Area */}
        <main className="relative flex-1 overflow-y-auto">
          {activeCitizenTab === 'overview' && (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
              <CitizenOverviewTab
                data={citizenOverview}
                loading={citizenLoading}
                onNavigateTab={setActiveCitizenTab}
              />
            </div>
          )}

          {activeCitizenTab === 'map' && (
            <div className="w-full h-full">
              <CitizenMapTab
                region={{
                  id: currentReg.id,
                  name: currentReg.name,
                  state: currentReg.state,
                  center: citizenOverview?.region.center,
                  aoi_bbox: citizenOverview?.region.aoi_bbox,
                  zoom: citizenOverview?.region.zoom,
                }}
                shelters={citizenShelters?.shelters || []}
                stations={liveData?.rivers?.stations || liveData?.stations || []}
                floodGeoJSON={floodGeoJSON}
              />
            </div>
          )}

          {activeCitizenTab === 'shelters' && (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
              <CitizenShelterTab
                sheltersData={citizenShelters}
                loading={citizenLoading}
                currentRegionName={currentReg.name}
              />
            </div>
          )}

          {activeCitizenTab === 'report' && (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
              <CitizenReportTab
                currentRegion={{
                  id: currentReg.id,
                  name: currentReg.name,
                  center: citizenOverview?.region.center,
                }}
                onReportSubmitted={handleReportSubmitted}
              />
            </div>
          )}

          {activeCitizenTab === 'activity' && (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
              <CitizenActivityTab
                myReports={myReports}
                onSelectTab={setActiveCitizenTab}
              />
            </div>
          )}
        </main>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // COMMAND INTERFACE (Emergency Operations Center)
  // --------------------------------------------------------------------------
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07111F] flex flex-col font-sans select-none text-[#F1F5F9]">
      {/* Top Fixed-Height Intelligence Header Bar */}
      <AppHeader
        appMode={appMode}
        onSwitchMode={handleSetAppMode}
        currentRegionName={overview?.aoi.name || 'Alappuzha & Kuttanad, Kerala'}
        loading={loading || liveLoading}
        onRefresh={loadAllData}
        onOpenSystemDiagnostics={() => setIsDiagnosticsModalOpen(true)}
      />

      {/* Backend Error Banner */}
      {error && (
        <div className="absolute top-14 left-6 right-6 z-40 flex items-center justify-between px-4 py-3 bg-rose-950/90 border border-rose-500 text-rose-200 rounded-xl text-xs shadow-2xl backdrop-blur-md">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadAllData}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/40 text-white rounded font-bold transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Central Viewport Layout with Collapsible Command Sidebar */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left Collapsible Command Sidebar */}
        <CommandSidebar
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={setActiveWorkspace}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenSystemDiagnostics={() => setIsDiagnosticsModalOpen(true)}
        />

        {/* Primary Workspace Display Canvas */}
        <main className="relative flex-1 overflow-hidden bg-[#07111F]">
          {/* WORKSPACE 1: Overview (Map-Centric Executive Briefing) */}
          {activeWorkspace === 'overview' && (
            <div className="relative w-full h-full">
              {/* Satellite Map Canvas */}
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
                onMapClickCoord={handleMapClickCoord}
                fitAoiTrigger={fitAoiTrigger}
                resetViewTrigger={resetViewTrigger}
              />

              {/* Floating KPIs & Executive Drawer */}
              <OverviewWorkspace
                overview={overview}
                floodMeta={floodMeta}
                facilitiesGeoJSON={facilitiesGeoJSON}
                settlementsGeoJSON={settlementsGeoJSON}
                loading={loading}
                onNavigateToImpact={() => setActiveWorkspace('intelligence')}
                onNavigateToRescue={() => setActiveWorkspace('resources')}
                onNavigateToLive={() => setActiveWorkspace('intelligence')}
              />

              {/* Bottom-Left Layer Controls */}
              <div className="absolute bottom-6 left-6 z-20">
                <LayerControls
                  layers={layers}
                  onToggle={handleToggleLayer}
                  onFitAOI={() => setFitAoiTrigger((c) => c + 1)}
                  onResetView={() => setResetViewTrigger((c) => c + 1)}
                />
              </div>
            </div>
          )}

          {/* WORKSPACE 2: Intelligence (Live Telemetry, SAR Pipeline, Risk Engine, Historical) */}
          {activeWorkspace === 'intelligence' && (
            <IntelligenceWorkspace
              liveData={liveData}
              liveLoading={liveLoading}
              selectedRegionId={monitoringRegionId}
              onSelectRegion={(regId) => {
                setMonitoringRegionId(regId);
                localStorage.setItem('floodguard_monitoring_region_id', regId);
                pollLiveData(regId);
              }}
              onRefresh={() => pollLiveData(monitoringRegionId)}
              floodGeoJSON={floodGeoJSON}
              overview={overview}
              floodMeta={floodMeta}
              facilitiesGeoJSON={facilitiesGeoJSON}
              settlementsGeoJSON={settlementsGeoJSON}
            />
          )}

          {/* WORKSPACE 3: Operations (Incident Triage Queue, Hotspots, Verification, Dispatch) */}
          {activeWorkspace === 'operations' && (
            <IncidentWorkspace />
          )}

          {/* WORKSPACE 4: Field Teams (Responder Console, Telemetry Beacon, Tasks) */}
          {activeWorkspace === 'teams' && (
            <ResponderWorkspace />
          )}

          {/* WORKSPACE 5: Resources (Evacuation Routing, Shelters, Infrastructure) */}
          {activeWorkspace === 'resources' && (
            <ResourcesWorkspace
              layers={layers}
              onToggleLayer={handleToggleLayer}
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
              onComputeRoute={handleComputeRoute}
              selectionMode={selectionMode}
              setSelectionMode={setSelectionMode}
              fitAoiTrigger={fitAoiTrigger}
              resetViewTrigger={resetViewTrigger}
              onFitAOI={() => setFitAoiTrigger((c) => c + 1)}
              onResetView={() => setResetViewTrigger((c) => c + 1)}
              sheltersData={citizenShelters}
            />
          )}
        </main>
      </div>

      {/* Secondary Area: Data & System Diagnostics Modal */}
      <SystemDiagnosticsModal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
        floodMeta={floodMeta}
        overview={overview}
      />
    </div>
  );
};

export default App;

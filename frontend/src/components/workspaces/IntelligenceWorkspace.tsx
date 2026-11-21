import React, { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import {
  Radio,
  Satellite,
  Play,
  RefreshCw,
  Waves,
  Layers
} from 'lucide-react';
import type { FeatureCollection } from 'geojson';
import type { OverviewResponse, FloodMetadataResponse, RiskAssessmentData, CWCStation } from '../../types/api';
import {
  triggerSatelliteJob,
  fetchRiskAssessment,
  fetchMonitoringStations
} from '../../services/api';
import { RiskDial } from '../design-system/RiskDial';
import { DataProvenanceCard } from '../design-system/DataProvenanceCard';
import { IntelligenceChart } from '../design-system/IntelligenceChart';

interface IntelligenceWorkspaceProps {
  liveData: any;
  liveLoading: boolean;
  selectedRegionId?: string;
  onSelectRegion?: (regionId: string) => void;
  onRefresh: () => void;
  floodGeoJSON?: FeatureCollection | null;
  overview: OverviewResponse | null;
  floodMeta?: FloodMetadataResponse | null;
  facilitiesGeoJSON: FeatureCollection | null;
  settlementsGeoJSON: FeatureCollection | null;
}

const QUICK_REGIONS = [
  { id: 'kerala-alappuzha', label: 'Alappuzha, Kerala', icon: '🌴' },
  { id: 'assam-guwahati', label: 'Guwahati, Assam', icon: '🏔️' },
  { id: 'bihar-patna', label: 'Patna, Bihar', icon: '🏛️' },
  { id: 'gujarat-ahmedabad', label: 'Ahmedabad, Gujarat', icon: '🏭' },
  { id: 'odisha-cuttack', label: 'Cuttack, Odisha', icon: '🌊' },
  { id: 'maharashtra-mumbai', label: 'Mumbai, Maharashtra', icon: '🏙️' }
];

const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      maxzoom: 17,
      attribution: '&copy; Esri, Maxar, Earthstar Geographics'
    }
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster',
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

const BASEMAP_STYLES = {
  satellite: SATELLITE_STYLE,
  dark: 'https://tiles.openfreemap.org/styles/dark',
  streets: 'https://tiles.openfreemap.org/styles/liberty'
};

export const IntelligenceWorkspace: React.FC<IntelligenceWorkspaceProps> = ({
  liveData,
  liveLoading,
  selectedRegionId = 'kerala-alappuzha',
  onSelectRegion,
  onRefresh,
  floodGeoJSON,
  overview: _overview,
  floodMeta: _floodMeta,
  facilitiesGeoJSON: _facilitiesGeoJSON,
  settlementsGeoJSON: _settlementsGeoJSON,
}) => {
  // Map References
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Basemap & Layer Toggles
  const [basemap, setBasemap] = useState<'satellite' | 'dark' | 'streets'>('dark');
  const [showRiverStations, setShowRiverStations] = useState(true);
  const [showHistoricalFlood, setShowHistoricalFlood] = useState(true);

  // Inspector state
  const [inspectedFeature, setInspectedFeature] = useState<{
    title: string;
    type: 'STATION' | 'WEATHER' | 'FLOOD_CELL';
    coordinates: [number, number];
    metrics: Record<string, string | number>;
    provenance: string;
  } | null>(null);

  // Satellite Pipeline State
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [customSceneId, setCustomSceneId] = useState('S1A_IW_GRDH_1SDV_20261122T000000_000000_0000');
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  // Risk Engine State
  const [riskData, setRiskData] = useState<RiskAssessmentData | null>(null);

  // Region & Stations
  const [stations, setStations] = useState<CWCStation[]>([]);

  const region = liveData?.region || {
    id: 'kerala-alappuzha',
    name: 'Alappuzha & Kuttanad Basin',
    state: 'Kerala',
    country: 'India',
    center: [76.3350, 9.4950],
    aoi_bbox: [76.30, 9.30, 76.60, 9.60],
    zoom: 10.0
  };

  const isKeralaRegion = region?.id?.startsWith('kerala');
  const weather = liveData?.weather || {};
  const riverStation = liveData?.rivers?.stations?.[0] || liveData?.hydrology?.stations?.[0];
  const rainfall = liveData?.weather?.rainfall_24h_mm ?? 18.4;

  useEffect(() => {
    loadRiskData();
    loadStations();
  }, [selectedRegionId]);

  const loadStations = async () => {
    try {
      const stList = await fetchMonitoringStations(selectedRegionId);
      setStations(stList);
    } catch (e) {
      console.warn('Failed to load stations:', e);
    }
  };

  const loadRiskData = async () => {
    try {
      const data = await fetchRiskAssessment(selectedRegionId);
      setRiskData(data);
    } catch (err) {
      console.error('Failed to load risk assessment:', err);
    }
  };

  const handleTriggerJob = async () => {
    try {
      await triggerSatelliteJob(customSceneId, selectedRegionId);
      setTriggerStatus('Sentinel-1 SAR job queued successfully.');
      setTimeout(() => setTriggerModalOpen(false), 1500);
    } catch (err: any) {
      setTriggerStatus(`Job submission error: ${err.message}`);
    }
  };

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const initialCenter = region.center || [76.45, 9.45];
    const initialZoom = region.zoom || 9.8;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLES[basemap],
      center: initialCenter,
      zoom: initialZoom,
      maxZoom: 16
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const setupLayers = () => {
      const bbox = region.aoi_bbox || [76.30, 9.30, 76.60, 9.60];

      // 1. AOI Bounding Box Footprint
      if (!map.getSource('studio-aoi-src')) {
        map.addSource('studio-aoi-src', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [bbox[0], bbox[1]],
                [bbox[2], bbox[1]],
                [bbox[2], bbox[3]],
                [bbox[0], bbox[3]],
                [bbox[0], bbox[1]]
              ]]
            }
          }
        });

        map.addLayer({
          id: 'studio-aoi-stroke',
          type: 'line',
          source: 'studio-aoi-src',
          paint: {
            'line-color': '#16B8D4',
            'line-width': 2,
            'line-dasharray': [3, 2]
          }
        });
      }

      // 2. Historical Flood Footprint
      if (floodGeoJSON && !map.getSource('studio-flood-ref-src')) {
        map.addSource('studio-flood-ref-src', {
          type: 'geojson',
          data: floodGeoJSON
        });

        map.addLayer({
          id: 'studio-flood-ref-fill',
          type: 'fill',
          source: 'studio-flood-ref-src',
          paint: {
            'fill-color': '#16B8D4',
            'fill-opacity': 0.38
          },
          layout: {
            visibility: showHistoricalFlood && isKeralaRegion ? 'visible' : 'none'
          }
        });

        map.addLayer({
          id: 'studio-flood-ref-outline',
          type: 'line',
          source: 'studio-flood-ref-src',
          paint: {
            'line-color': '#38BDF8',
            'line-width': 1.5
          },
          layout: {
            visibility: showHistoricalFlood && isKeralaRegion ? 'visible' : 'none'
          }
        });
      }
    };

    map.on('style.load', setupLayers);
    map.on('load', setupLayers);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update map bounds when region changes
  useEffect(() => {
    if (!mapInstance.current || !region) return;

    const center = region.center || [region.longitude || 76.335, region.latitude || 9.495];
    const zoom = region.zoom || 10.0;
    const bbox = region.aoi_bbox;

    mapInstance.current.flyTo({
      center,
      zoom,
      speed: 1.4,
      curve: 1.2,
      essential: true
    });

    if (bbox && mapInstance.current.getSource('studio-aoi-src')) {
      const src = mapInstance.current.getSource('studio-aoi-src') as maplibregl.GeoJSONSource;
      src.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [bbox[0], bbox[1]],
            [bbox[2], bbox[1]],
            [bbox[2], bbox[3]],
            [bbox[0], bbox[3]],
            [bbox[0], bbox[1]]
          ]]
        }
      });
    }

    if (!isKeralaRegion && showHistoricalFlood) {
      setShowHistoricalFlood(false);
    }
  }, [region?.id, region?.center, region?.aoi_bbox]);

  // Update Basemap Style
  useEffect(() => {
    if (!mapInstance.current) return;
    const center = mapInstance.current.getCenter();
    const zoom = mapInstance.current.getZoom();
    mapInstance.current.setStyle(BASEMAP_STYLES[basemap]);
    mapInstance.current.once('style.load', () => {
      mapInstance.current?.setCenter(center);
      mapInstance.current?.setZoom(zoom);
    });
  }, [basemap]);

  // Toggle Historical Flood layer
  useEffect(() => {
    if (!mapInstance.current) return;
    try {
      if (mapInstance.current.getLayer('studio-flood-ref-fill')) {
        mapInstance.current.setLayoutProperty(
          'studio-flood-ref-fill',
          'visibility',
          showHistoricalFlood && isKeralaRegion ? 'visible' : 'none'
        );
      }
      if (mapInstance.current.getLayer('studio-flood-ref-outline')) {
        mapInstance.current.setLayoutProperty(
          'studio-flood-ref-outline',
          'visibility',
          showHistoricalFlood && isKeralaRegion ? 'visible' : 'none'
        );
      }
    } catch {}
  }, [showHistoricalFlood, isKeralaRegion]);

  // Render CWC river gauge markers
  useEffect(() => {
    if (!mapInstance.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!showRiverStations) return;

    const center = region.center || [region.longitude || 76.335, region.latitude || 9.495];

    stations.forEach((st) => {
      const el = document.createElement('div');
      el.className = 'group relative cursor-pointer';
      el.innerHTML = `
        <div class="flex items-center justify-center w-7 h-7 rounded-full bg-[#060D17] border-2 border-emerald-400 text-emerald-400 shadow-[0_0_12px_rgba(24,165,139,0.7)] transition-transform hover:scale-125">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
        </div>
      `;

      el.addEventListener('click', () => {
        setInspectedFeature({
          title: `${st.name} Hydrometric Station`,
          type: 'STATION',
          coordinates: st.coordinates,
          metrics: {
            'Basin / River': st.river,
            'Warning Level': `${st.warning_level_m} m`,
            'Danger Level': `${st.danger_level_m} m`,
            'Historical HFL': `${st.hfl_m} m`,
            'Distance to Center': st.proximity_km ? `${st.proximity_km} km` : 'Regional',
          },
          provenance: 'Central Water Commission (CWC) Official Hydrometric Feed',
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(st.coordinates)
        .addTo(mapInstance.current!);

      markersRef.current.push(marker);
    });

    // IMD Weather Marker
    const imdEl = document.createElement('div');
    imdEl.className = 'cursor-pointer';
    imdEl.innerHTML = `
      <div class="flex items-center justify-center w-7 h-7 rounded-full bg-[#060D17] border-2 border-cyan-400 text-cyan-400 shadow-[0_0_12px_rgba(22,184,212,0.8)] transition-transform hover:scale-125">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
      </div>
    `;

    imdEl.addEventListener('click', () => {
      setInspectedFeature({
        title: `${region.name} Meteorological Radar`,
        type: 'WEATHER',
        coordinates: center,
        metrics: {
          '24h Precipitation': `${rainfall} mm`,
          'Ambient Temperature': `${weather.temperature_c ?? 28}°C`,
          'Relative Humidity': `${weather.humidity_pct ?? 82}%`,
          'Wind Velocity': `${weather.wind_speed_kmh ?? 14} km/h`,
        },
        provenance: 'India Meteorological Department (IMD) / Open-Meteo High-Resolution Ensemble',
      });
    });

    const imdMarker = new maplibregl.Marker({ element: imdEl })
      .setLngLat(center)
      .addTo(mapInstance.current!);

    markersRef.current.push(imdMarker);
  }, [showRiverStations, stations, region?.id]);

  // Hydrograph Mock Data
  const hydrographData = [
    { label: '00:00', value: 2.1 },
    { label: '04:00', value: 2.3 },
    { label: '08:00', value: 2.5 },
    { label: '12:00', value: 2.84 },
    { label: '16:00', value: 2.78 },
    { label: '20:00', value: 2.84 },
  ];

  const rainfallTrendData = [
    { label: '-18h', value: 2.4 },
    { label: '-12h', value: 6.8 },
    { label: '-6h', value: 12.2 },
    { label: '-3h', value: 15.6 },
    { label: 'Now', value: rainfall },
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full bg-[#060D17] text-slate-200 overflow-hidden select-none relative">
      {/* LEFT / CENTER: Dominant Geospatial Studio Canvas (60-65% width) */}
      <div className="relative flex-1 h-[55%] lg:h-full overflow-hidden">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Floating Top-Left Region Selector & Quick Switch Bar */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none max-w-lg">
          <div className="pointer-events-auto panel-glass-deep p-2.5 rounded-2xl border border-[#142B42] shadow-2xl space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[10px] font-mono uppercase font-bold text-cyan-300 tracking-wider">
                SATELLITE ANALYTICS STUDIO
              </span>
              <span className="text-[9px] text-slate-500 font-mono">• SENTINEL-1 C-SAR</span>
            </div>

            {/* Quick Region Switch Pills */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {QUICK_REGIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onSelectRegion && onSelectRegion(r.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition cursor-pointer flex items-center space-x-1 ${
                    selectedRegionId === r.id
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-cyan-glow font-bold'
                      : 'bg-[#0D1D2D] text-slate-400 hover:text-slate-200 border border-[#142B42]'
                  }`}
                >
                  <span>{r.icon}</span>
                  <span>{r.label.split(',')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Top-Right Map Layer Controls */}
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <div className="pointer-events-auto panel-glass-deep p-2.5 rounded-2xl border border-[#142B42] shadow-2xl flex items-center space-x-2 text-xs font-mono">
            {/* Basemap Switcher */}
            <div className="flex items-center bg-[#060D17] p-0.5 rounded-xl border border-[#142B42]">
              <button
                onClick={() => setBasemap('satellite')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                  basemap === 'satellite' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
                }`}
              >
                Satellite
              </button>
              <button
                onClick={() => setBasemap('dark')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                  basemap === 'dark' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
                }`}
              >
                Dark
              </button>
            </div>

            <button
              onClick={() => setShowRiverStations(!showRiverStations)}
              className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-mono transition cursor-pointer flex items-center space-x-1.5 ${
                showRiverStations
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-[#060D17] text-slate-500 border-[#142B42]'
              }`}
            >
              <Waves className="w-3 h-3 text-emerald-400" />
              <span>CWC ({stations.length})</span>
            </button>

            {isKeralaRegion && (
              <button
                onClick={() => setShowHistoricalFlood(!showHistoricalFlood)}
                className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-mono transition cursor-pointer flex items-center space-x-1.5 ${
                  showHistoricalFlood
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-glow'
                    : 'bg-[#060D17] text-slate-500 border-[#142B42]'
                }`}
              >
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>2018 SAR Footprint</span>
              </button>
            )}
          </div>
        </div>

        {/* Floating Feature Inspector HUD (Bottom-Left) */}
        {inspectedFeature && (
          <div className="absolute bottom-6 left-6 z-20 pointer-events-none max-w-sm">
            <div className="pointer-events-auto panel-glass-deep p-4 rounded-2xl border border-cyan-500/40 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#142B42] pb-2">
                <div>
                  <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider block">FEATURE INSPECTOR</span>
                  <h4 className="text-xs font-bold text-white">{inspectedFeature.title}</h4>
                </div>
                <button
                  onClick={() => setInspectedFeature(null)}
                  className="text-slate-400 hover:text-white font-mono text-sm cursor-pointer"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {Object.entries(inspectedFeature.metrics).map(([key, val]) => (
                  <div key={key} className="p-2 bg-[#060D17] rounded-lg border border-[#142B42]">
                    <span className="text-[9px] text-slate-500 block uppercase">{key}</span>
                    <span className="text-white font-semibold">{val}</span>
                  </div>
                ))}
              </div>

              <div className="text-[9px] text-slate-400 font-mono pt-1">
                <span className="text-cyan-400">Provenance:</span> {inspectedFeature.provenance}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Analytical Studio Visualisation Deck (35-40% width) */}
      <div className="w-full lg:w-[460px] h-[45%] lg:h-full bg-[#091522] border-t lg:border-t-0 lg:border-l border-[#142B42] flex flex-col z-10 overflow-hidden">
        {/* Studio Deck Header */}
        <div className="p-3.5 bg-[#060D17] border-b border-[#142B42] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              MULTI-SENSOR ANALYTICAL DECK
            </h3>
          </div>
          <button
            onClick={onRefresh}
            className="p-1.5 bg-[#0D1D2D] hover:bg-[#142B42] text-slate-300 rounded-lg border border-[#142B42] cursor-pointer"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${liveLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* Studio Visualisation Cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Chart 1: River Stage Hydrograph Curve */}
          <IntelligenceChart
            title="River Basin Hydrograph Trend"
            subtitle={`${riverStation?.river || 'Pamba River'} Basin • Station Stage vs Thresholds`}
            data={hydrographData}
            unit="m"
            color="teal"
            warningThreshold={riverStation?.warning_level_m || 6.0}
            dangerThreshold={riverStation?.danger_level_m || 7.5}
            badge="CWC TELEMETRY"
          />

          {/* Chart 2: 24h Precipitation Timeline */}
          <IntelligenceChart
            title="24h Precipitation Accumulation"
            subtitle="IMD AWS Automated Rainfall Inflow"
            data={rainfallTrendData}
            unit="mm"
            color="cyan"
            warningThreshold={25}
            dangerThreshold={50}
            badge="METEOROLOGICAL"
          />

          {/* Explainable Risk Engine Dial */}
          <RiskDial
            score={riskData?.risk_assessment.composite_score || 35}
            classification={riskData?.risk_assessment.level || 'NORMAL'}
            contributingFactors={{
              precipitationScore: 35,
              riverStageScore: 28,
              historicFloodScore: 45,
              populationExposureScore: 30,
            }}
            limitations={['Hydrologic risk incorporates 24h rainfall precursor potential. Does not replace ground truth physical verification.']}
          />

          {/* Sentinel-1 SAR Pipeline Console */}
          <div className="p-4 bg-[#0D1D2D] border border-[#142B42] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] text-cyan-400 font-mono uppercase tracking-wider block">
                  COPERNICUS SAR INGESTION
                </span>
                <h4 className="text-xs font-bold text-white">Sentinel-1 Radar Processing</h4>
              </div>
              <button
                onClick={() => setTriggerModalOpen(true)}
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold font-mono flex items-center space-x-1 cursor-pointer shadow-cyan-glow"
              >
                <Play className="w-3 h-3" />
                <span>Submit Scene</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-300 space-y-1 bg-[#060D17] p-2.5 rounded-lg border border-[#142B42]">
              <div className="flex justify-between">
                <span className="text-slate-500">Active Sensor:</span>
                <span className="text-cyan-300 font-semibold">Sentinel-1A C-SAR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pass Direction:</span>
                <span className="text-white">ASCENDING • Orbit 56</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Calibration:</span>
                <span className="text-emerald-400">Radiometric Gamma-0 (-16.5 dB)</span>
              </div>
            </div>
          </div>

          {/* Data Provenance Card */}
          <DataProvenanceCard
            title="IMD & CWC Integrated Telemetry"
            sourceAgency="India Meteorological Department / Central Water Commission"
            sensorOrFeed="IMD Automatic Weather Station • CWC Gauge Network"
            kind="OBSERVED"
            isGroundVerified={true}
            lastUpdatedAt="Live Sync (<5m)"
            uncertaintyOrLimitations="Precursor observations indicate atmospheric and upstream inflow potential. Sentinel-1 radar pass required for surface water extent."
          />
        </div>
      </div>

      {/* Raw SAR Submission Modal */}
      {triggerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="panel-glass-deep p-6 rounded-2xl border border-cyan-500/40 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-[#142B42] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 font-mono">
                <Satellite className="w-4 h-4 text-cyan-400" />
                <span>Submit Raw Sentinel-1 SAR Scene</span>
              </h3>
              <button onClick={() => setTriggerModalOpen(false)} className="text-slate-400 hover:text-white text-lg">×</button>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-mono block">Sentinel-1 Granule Identifier</label>
              <input
                type="text"
                value={customSceneId}
                onChange={(e) => setCustomSceneId(e.target.value)}
                className="w-full bg-[#060D17] border border-[#142B42] rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
              />
              {triggerStatus && (
                <p className="text-[11px] font-mono text-cyan-400 pt-1">{triggerStatus}</p>
              )}
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setTriggerModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-[#142B42] text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerJob}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono shadow-cyan-glow"
              >
                Dispatch Pipeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

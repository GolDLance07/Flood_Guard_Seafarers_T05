import React, { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import {
  Radio,
  RefreshCw,
  Waves,
  Layers,
  Sliders
} from 'lucide-react';
import type { FeatureCollection } from 'geojson';
import type { OverviewResponse, FloodMetadataResponse, RiskAssessmentData, CWCStation } from '../../types/api';
import {
  fetchRiskAssessment,
  fetchMonitoringStations
} from '../../services/api';
import { RiskDial } from '../design-system/RiskDial';
import { DataProvenanceCard } from '../design-system/DataProvenanceCard';
import { IntelligenceChart } from '../design-system/IntelligenceChart';
import { SatelliteAcquisitionPanel } from '../design-system/SatelliteAcquisitionPanel';
import { MapLegend } from '../design-system/MapLegend';

interface IntelligenceWorkspaceProps {
  liveData: any;
  liveLoading: boolean;
  selectedRegionId?: string;
  onSelectRegion?: (regionId: string) => void;
  onRefresh: () => void;
  floodGeoJSON?: FeatureCollection | null;
  overview?: OverviewResponse | null;
  floodMeta?: FloodMetadataResponse | null;
  facilitiesGeoJSON?: FeatureCollection | null;
  settlementsGeoJSON?: FeatureCollection | null;
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
}) => {
  // Map References
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Basemap & Layer Toggles
  const [basemap, setBasemap] = useState<'satellite' | 'dark' | 'streets'>('dark');
  const [showRiverStations, setShowRiverStations] = useState(true);
  const [showHistoricalFlood, setShowHistoricalFlood] = useState(true);
  
  // Before-and-After Comparison Wipe Slider State
  const [showComparisonSlider, setShowComparisonSlider] = useState(false);
  const [comparisonOpacity, setComparisonOpacity] = useState<number>(85); // 0 = baseline dry, 100 = full flood extent

  // Inspector state
  const [inspectedFeature, setInspectedFeature] = useState<{
    title: string;
    type: 'STATION' | 'WEATHER' | 'FLOOD_CELL';
    coordinates: [number, number];
    metrics: Record<string, string | number>;
    provenance: string;
  } | null>(null);

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
            'line-width': 1.5,
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

        const floodFillOpacity = (comparisonOpacity / 100) * 0.75;

        map.addLayer({
          id: 'studio-flood-ref-fill',
          type: 'fill',
          source: 'studio-flood-ref-src',
          paint: {
            'fill-color': '#16B8D4',
            'fill-opacity': floodFillOpacity
          }
        });

        map.addLayer({
          id: 'studio-flood-ref-stroke',
          type: 'line',
          source: 'studio-flood-ref-src',
          paint: {
            'line-color': '#16B8D4',
            'line-width': 1,
            'line-opacity': Math.min(1, floodFillOpacity + 0.2)
          }
        });
      }
    };

    map.on('load', setupLayers);
    map.on('style.load', setupLayers);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update basemap style
  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.setStyle(BASEMAP_STYLES[basemap]);
  }, [basemap]);

  // Update dynamic flood layer opacity with comparison slider
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    if (map.getLayer('studio-flood-ref-fill')) {
      const activeOpacity = showHistoricalFlood ? (comparisonOpacity / 100) * 0.75 : 0;
      map.setPaintProperty('studio-flood-ref-fill', 'fill-opacity', activeOpacity);
    }
    if (map.getLayer('studio-flood-ref-stroke')) {
      const activeStrokeOpacity = showHistoricalFlood ? Math.min(1, (comparisonOpacity / 100) * 0.9) : 0;
      map.setPaintProperty('studio-flood-ref-stroke', 'line-opacity', activeStrokeOpacity);
    }
  }, [comparisonOpacity, showHistoricalFlood]);

  // Center on region switch
  useEffect(() => {
    if (!mapInstance.current || !region.center) return;
    mapInstance.current.flyTo({
      center: region.center,
      zoom: region.zoom || 10.0,
      duration: 1200
    });
  }, [region.id]);

  // Render station markers
  useEffect(() => {
    if (!mapInstance.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!showRiverStations) return;

    stations.forEach((st) => {
      const el = document.createElement('div');
      el.className = 'w-4 h-4 rounded-full bg-[#16B8D4] border border-[#07111F] flex items-center justify-center cursor-pointer shadow-md';
      el.innerHTML = '<span style="font-size: 8px; color: #07111F; font-weight: bold;">●</span>';

      el.addEventListener('click', () => {
        setInspectedFeature({
          title: `CWC Station: ${st.name}`,
          type: 'STATION',
          coordinates: st.coordinates,
          metrics: {
            'River': st.river,
            'Warning Level': `${st.warning_level_m} m`,
            'Danger Level': `${st.danger_level_m} m`,
            'HFL Record': `${st.hfl_m} m (${st.hfl_date || 'Historical'})`
          },
          provenance: 'Central Water Commission (CWC) Hydrological Network'
        });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(st.coordinates)
        .addTo(mapInstance.current!);

      markersRef.current.push(marker);
    });
  }, [showRiverStations, stations, region?.id]);

  // Hydrograph Trend Data
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
    <div className="flex-1 flex flex-col lg:flex-row h-full bg-[#07111F] text-[#E8F0F7] overflow-hidden select-none relative font-sans">
      {/* LEFT / CENTER: Dominant Geospatial Studio Canvas (65-70% width) */}
      <div className="relative flex-1 h-[55%] lg:h-full overflow-hidden">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Floating Top-Left Region Selector & Quick Switch Bar */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none max-w-lg">
          <div className="pointer-events-auto bg-[#091522] p-2 rounded border border-[#203A52] shadow-xl space-y-1.5">
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16B8D4]" />
              <span className="text-[10px] font-mono uppercase font-bold text-[#16B8D4] tracking-wider">
                SATELLITE ANALYTICS STUDIO
              </span>
              <span className="text-[9px] text-[#8DA3B8] font-mono">• SENTINEL-1 C-SAR</span>
            </div>

            {/* Quick Region Switch Buttons */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {QUICK_REGIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onSelectRegion && onSelectRegion(r.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer flex items-center space-x-1 ${
                    selectedRegionId === r.id
                      ? 'bg-[#10243A] text-[#16B8D4] border border-[#16B8D4] font-bold'
                      : 'bg-[#07111F] text-[#8DA3B8] hover:text-[#E8F0F7] border border-[#203A52]'
                  }`}
                >
                  <span>{r.icon}</span>
                  <span>{r.label.split(',')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Top-Right Map Controls */}
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
          <div className="pointer-events-auto bg-[#091522] p-1.5 rounded border border-[#203A52] shadow-xl flex items-center space-x-1.5 text-xs font-mono">
            {/* Basemap Switcher */}
            <div className="flex items-center bg-[#07111F] p-0.5 rounded border border-[#203A52]">
              <button
                onClick={() => setBasemap('satellite')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  basemap === 'satellite' ? 'bg-[#10243A] text-[#16B8D4] border border-[#16B8D4]' : 'text-[#8DA3B8]'
                }`}
              >
                Satellite
              </button>
              <button
                onClick={() => setBasemap('dark')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  basemap === 'dark' ? 'bg-[#10243A] text-[#16B8D4] border border-[#16B8D4]' : 'text-[#8DA3B8]'
                }`}
              >
                Dark
              </button>
            </div>

            <button
              onClick={() => setShowRiverStations(!showRiverStations)}
              className={`px-2 py-1 rounded border text-[10px] font-mono transition-colors cursor-pointer flex items-center space-x-1 ${
                showRiverStations
                  ? 'bg-[#18A58B]/10 text-[#18A58B] border-[#18A58B]/40'
                  : 'bg-[#07111F] text-[#8DA3B8] border-[#203A52]'
              }`}
            >
              <Waves className="w-3 h-3 text-[#18A58B]" />
              <span>CWC ({stations.length})</span>
            </button>

            {isKeralaRegion && (
              <button
                onClick={() => setShowHistoricalFlood(!showHistoricalFlood)}
                className={`px-2 py-1 rounded border text-[10px] font-mono transition-colors cursor-pointer flex items-center space-x-1 ${
                  showHistoricalFlood
                    ? 'bg-[#16B8D4]/10 text-[#16B8D4] border-[#16B8D4]/40'
                    : 'bg-[#07111F] text-[#8DA3B8] border-[#203A52]'
                }`}
              >
                <Layers className="w-3 h-3 text-[#16B8D4]" />
                <span>2018 SAR Footprint</span>
              </button>
            )}

            {/* Draggable Comparison Wipe Slider Toggle */}
            {isKeralaRegion && showHistoricalFlood && (
              <button
                onClick={() => setShowComparisonSlider(!showComparisonSlider)}
                className={`px-2 py-1 rounded border text-[10px] font-mono transition-colors cursor-pointer flex items-center space-x-1 ${
                  showComparisonSlider
                    ? 'bg-[#F0A83B]/10 text-[#F0A83B] border-[#F0A83B]/40'
                    : 'bg-[#07111F] text-[#8DA3B8] border-[#203A52]'
                }`}
                title="Toggle Before/After Imagery Wipe Slider"
              >
                <Sliders className="w-3 h-3 text-[#F0A83B]" />
                <span>Compare</span>
              </button>
            )}
          </div>
        </div>

        {/* Floating Before-and-After Imagery Comparison Slider */}
        {showComparisonSlider && isKeralaRegion && showHistoricalFlood && (
          <div className="absolute top-16 right-3 z-20 pointer-events-none w-72">
            <div className="pointer-events-auto bg-[#091522] p-2.5 rounded border border-[#203A52] shadow-2xl space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#F0A83B] font-bold uppercase tracking-wider flex items-center space-x-1">
                  <Sliders className="w-3 h-3 text-[#F0A83B]" />
                  <span>SAR Inundation Wipe Slider</span>
                </span>
                <span className="text-[#E8F0F7] font-bold">{comparisonOpacity}% Overlay</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={comparisonOpacity}
                onChange={(e) => setComparisonOpacity(Number(e.target.value))}
                className="w-full accent-[#16B8D4] cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-[#8DA3B8]">
                <span>0% (Dry Baseline)</span>
                <span>100% (Flood Water Extent)</span>
              </div>
            </div>
          </div>
        )}

        {/* Floating Feature Inspector HUD (Bottom-Left) */}
        {inspectedFeature && (
          <div className="absolute bottom-5 left-5 z-20 pointer-events-none max-w-sm">
            <div className="pointer-events-auto bg-[#091522] p-3 rounded border border-[#203A52] shadow-2xl space-y-2">
              <div className="flex items-center justify-between border-b border-[#203A52] pb-1.5">
                <div>
                  <span className="text-[9px] font-mono text-[#16B8D4] uppercase tracking-wider block">FEATURE INSPECTOR</span>
                  <h4 className="text-xs font-bold text-[#E8F0F7]">{inspectedFeature.title}</h4>
                </div>
                <button
                  onClick={() => setInspectedFeature(null)}
                  className="text-[#8DA3B8] hover:text-[#E8F0F7] font-mono text-sm px-1"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                {Object.entries(inspectedFeature.metrics).map(([key, val]) => (
                  <div key={key} className="p-1.5 bg-[#07111F] rounded border border-[#203A52]">
                    <span className="text-[9px] text-[#8DA3B8] block uppercase">{key}</span>
                    <span className="text-[#E8F0F7] font-semibold">{val}</span>
                  </div>
                ))}
              </div>

              <div className="text-[9px] text-[#8DA3B8] font-mono pt-0.5">
                <span className="text-[#16B8D4]">Lineage:</span> {inspectedFeature.provenance}
              </div>
            </div>
          </div>
        )}

        {/* Floating Map Legend (Bottom-Right) */}
        <div className="absolute bottom-5 right-5 z-20 pointer-events-none hidden sm:block">
          <div className="pointer-events-auto">
            <MapLegend
              showInundation={showHistoricalFlood}
              showAffectedRoads={true}
              showRoads={true}
              showFacilities={true}
              showStations={showRiverStations}
            />
          </div>
        </div>
      </div>

      {/* RIGHT: Analytical Studio Visualisation Deck (30-35% width) */}
      <div className="w-full lg:w-[440px] h-[45%] lg:h-full bg-[#091522] border-t lg:border-t-0 lg:border-l border-[#203A52] flex flex-col z-10 overflow-hidden font-sans">
        {/* Studio Deck Header */}
        <div className="p-3 bg-[#07111F] border-b border-[#203A52] flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5 text-[#18A58B]" />
            <h3 className="text-xs font-bold text-[#E8F0F7] font-mono uppercase tracking-wider">
              MULTI-SENSOR ANALYTICAL DECK
            </h3>
          </div>
          <button
            onClick={onRefresh}
            className="p-1 bg-[#10243A] hover:bg-[#142B42] text-[#8DA3B8] hover:text-[#E8F0F7] rounded border border-[#203A52] cursor-pointer"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${liveLoading ? 'animate-spin text-[#16B8D4]' : ''}`} />
          </button>
        </div>

        {/* Studio Visualisation Cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Sentinel-1 Acquisition Profile */}
          <SatelliteAcquisitionPanel
            regionId={selectedRegionId}
            onJobTriggered={onRefresh}
          />

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
            score={riskData?.risk_assessment.composite_score || 22}
            classification={riskData?.risk_assessment.level || 'NORMAL'}
            contributingFactors={{
              precipitationScore: 35,
              riverStageScore: 28,
              historicFloodScore: 45,
              populationExposureScore: 30,
            }}
            limitations={['Hydrologic risk incorporates 24h rainfall precursor potential. Ground truth physical verification required for critical actions.']}
          />

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
    </div>
  );
};

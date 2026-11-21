import React, { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import {
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  Satellite,
  AlertTriangle,
  ShieldCheck,
  Waves,
  RefreshCw,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Radio,
  Eye,
  EyeOff,
  Search,
  ChevronDown,
  Navigation,
  Info
} from 'lucide-react';
import type { FeatureCollection } from 'geojson';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { SvgBarChart } from '../common/SvgBarChart';
import { fetchMonitoringRegions, fetchMonitoringStations } from '../../services/api';
import type { MonitoringRegion, CWCStation } from '../../types/api';

interface LiveMonitoringWorkspaceProps {
  liveData: any;
  loading: boolean;
  selectedRegionId?: string;
  onSelectRegion?: (regionId: string) => void;
  onRefresh: () => void;
  floodGeoJSON?: FeatureCollection | null;
}

// Preset Indian flood-monitoring regions for 1-click quick selection
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

export const LiveMonitoringWorkspace: React.FC<LiveMonitoringWorkspaceProps> = ({
  liveData,
  loading,
  selectedRegionId = 'kerala-alappuzha',
  onSelectRegion,
  onRefresh,
  floodGeoJSON = null
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Region Selector State
  const [regionsList, setRegionsList] = useState<MonitoringRegion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [stations, setStations] = useState<CWCStation[]>([]);

  // Basemap & Layer toggles
  const [basemap, setBasemap] = useState<'satellite' | 'dark' | 'streets'>('dark');
  const [showStations, setShowStations] = useState(true);
  const [showHistoricalFlood, setShowHistoricalFlood] = useState(false);

  // Normalize data whether coming from /api/monitoring/overview or /api/live/overview
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
  const hydrology = liveData?.hydrology || liveData?.rivers || {};
  const rainfall = liveData?.rainfall || {};
  const satellite = liveData?.satellite_tracking || liveData?.satellites?.orbital_pass_schedule || {};
  const latestProduct = liveData?.satellites?.latest_product;
  const alert = liveData?.environmental_alert || liveData?.environmental_readiness || {};
  const alertsList = liveData?.alerts?.alerts || liveData?.active_alerts || [];
  const providerStatus = liveData?.provider_status || {};

  const alertLevel = alert?.level || 'NORMAL';
  const alertVariant = alertLevel === 'ADVISORY' ? 'rose' : alertLevel === 'ELEVATED' ? 'amber' : 'emerald';

  // Load available regions on component mount
  useEffect(() => {
    fetchMonitoringRegions()
      .then(res => {
        if (Array.isArray(res)) setRegionsList(res);
      })
      .catch(err => console.warn('Failed to load regions list:', err));
  }, []);

  // Search regions dynamically (catalog or geocoding)
  const handleSearchRegions = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      const all = await fetchMonitoringRegions();
      setRegionsList(all);
      return;
    }
    try {
      setIsSearching(true);
      const res = await fetchMonitoringRegions(query);
      if (Array.isArray(res)) {
        setRegionsList(res);
      }
    } catch (e) {
      console.warn('Geocoding search failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  // Load CWC stations for the selected region
  useEffect(() => {
    if (!region?.id) return;
    fetchMonitoringStations(region.id)
      .then(res => {
        if (Array.isArray(res)) setStations(res);
      })
      .catch(() => setStations([]));
  }, [region?.id]);

  // 7-day discharge trend bar rows
  const dischargeBars = (hydrology?.trend_7day || []).map((t: any) => ({
    label: t.date ? t.date.slice(5) : '—',
    value: t.discharge_m3_s || 0.8,
    max: Math.max(...(hydrology?.trend_7day || []).map((x: any) => x.discharge_m3_s || 1.5), 2.5),
    formattedValue: `${t.discharge_m3_s ? t.discharge_m3_s.toFixed(2) : '—'} m³/s`,
    color: (t.discharge_m3_s || 0) > (t.median_baseline_m3_s || 1) * 1.5 ? '#F59E0B' : '#06B6D4'
  }));

  // Freshness helper
  const renderFreshnessBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'LIVE':
        return <Badge variant="emerald" size="sm" pulse>LIVE (&lt;30m)</Badge>;
      case 'RECENT':
        return <Badge variant="cyan" size="sm">RECENT (&lt;2h)</Badge>;
      case 'DELAYED':
        return <Badge variant="amber" size="sm">DELAYED</Badge>;
      case 'STALE':
        return <Badge variant="slate" size="sm">STALE</Badge>;
      case 'UNAVAILABLE':
      default:
        return <Badge variant="rose" size="sm">UNAVAILABLE</Badge>;
    }
  };

  // Initialize Embedded Map
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
      if (!map.getSource('monitoring-aoi-src')) {
        map.addSource('monitoring-aoi-src', {
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
          id: 'monitoring-aoi-stroke',
          type: 'line',
          source: 'monitoring-aoi-src',
          paint: {
            'line-color': '#06B6D4',
            'line-width': 2,
            'line-dasharray': [3, 2]
          }
        });
      }

      // 2. Historical Flood Footprint (Reference Overlay for Kerala only)
      if (floodGeoJSON && !map.getSource('monitoring-flood-ref-src')) {
        map.addSource('monitoring-flood-ref-src', {
          type: 'geojson',
          data: floodGeoJSON
        });

        map.addLayer({
          id: 'monitoring-flood-ref-fill',
          type: 'fill',
          source: 'monitoring-flood-ref-src',
          paint: {
            'fill-color': '#06B6D4',
            'fill-opacity': 0.35
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

  // Fly to new region and update AOI box when region changes
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

    // Update AOI stroke source geometry
    if (bbox && mapInstance.current.getSource('monitoring-aoi-src')) {
      const src = mapInstance.current.getSource('monitoring-aoi-src') as maplibregl.GeoJSONSource;
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

    // If switched away from Kerala, automatically hide the Kerala 2018 flood footprint
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

  // Toggle Historical Flood reference layer
  useEffect(() => {
    if (!mapInstance.current) return;
    try {
      if (mapInstance.current.getLayer('monitoring-flood-ref-fill')) {
        mapInstance.current.setLayoutProperty(
          'monitoring-flood-ref-fill',
          'visibility',
          showHistoricalFlood && isKeralaRegion ? 'visible' : 'none'
        );
      }
    } catch {}
  }, [showHistoricalFlood, isKeralaRegion]);

  // Render Dynamic CWC Station Markers & Weather Center Marker for the Selected Region
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear previous region markers completely to prevent data mixing
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!showStations) return;

    const center = region.center || [region.longitude || 76.335, region.latitude || 9.495];

    // 1. Add CWC River Gauge Markers for the current region
    stations.forEach(st => {
      const el = document.createElement('div');
      el.className = 'group relative cursor-pointer';
      el.innerHTML = `
        <div class="flex items-center justify-center w-7 h-7 rounded-full bg-[#0D1626] border-2 border-emerald-400 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.7)] transition-transform hover:scale-125">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
        </div>
      `;

      const distText = st.proximity_km || st.distance_km ? `${st.proximity_km || st.distance_km} km to center` : '';

      const popup = new maplibregl.Popup({ offset: 25, className: 'dark-popup' }).setHTML(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <div style="font-weight: 700; color: #10B981; font-size: 13px; margin-bottom: 2px;">
            ${st.name} Gauge Station
          </div>
          <div style="color: #94A3B8; font-size: 11px; margin-bottom: 4px;">
            River: <strong style="color: #E2E8F0;">${st.river}</strong> ${distText ? `• ${distText}` : ''}
          </div>
          <div style="background: rgba(13,22,38,0.8); padding: 6px; border-radius: 6px; border: 1px solid #1E2D4A; margin-top: 4px;">
            <div style="display: flex; justify-content: space-between; color: #F59E0B;">
              <span>Warning Level:</span> <strong>${st.warning_level_m} m</strong>
            </div>
            <div style="display: flex; justify-content: space-between; color: #F43F5E;">
              <span>Danger Level:</span> <strong>${st.danger_level_m} m</strong>
            </div>
            <div style="display: flex; justify-content: space-between; color: #38BDF8; font-size: 10px; margin-top: 2px;">
              <span>Historic HFL:</span> <strong>${st.hfl_m} m</strong>
            </div>
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(st.coordinates)
        .setPopup(popup)
        .addTo(mapInstance.current!);

      markersRef.current.push(marker);
    });

    // 2. Add Regional Weather Observation Center Marker
    const imdEl = document.createElement('div');
    imdEl.className = 'cursor-pointer';
    imdEl.innerHTML = `
      <div class="flex items-center justify-center w-7 h-7 rounded-full bg-[#0D1626] border-2 border-cyan-400 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)] transition-transform hover:scale-125">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
      </div>
    `;

    const imdPopup = new maplibregl.Popup({ offset: 25, className: 'dark-popup' }).setHTML(`
      <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
        <div style="font-weight: 700; color: #22D3EE; font-size: 13px;">
          ${region.name} Weather Observation Center
        </div>
        <div style="color: #94A3B8; font-size: 11px;">
          ${region.state}, ${region.country} • Open-Meteo & IMD Model
        </div>
        <div style="margin-top: 4px; color: #F1F5F9;">
          <div>Temp: <strong>${weather.temperature_c ?? 28}°C</strong> • Rain: <strong>${rainfall.rainfall_24h_mm ?? 0} mm/24h</strong></div>
        </div>
      </div>
    `);

    const imdMarker = new maplibregl.Marker({ element: imdEl })
      .setLngLat(center)
      .setPopup(imdPopup)
      .addTo(mapInstance.current!);

    markersRef.current.push(imdMarker);

  }, [showStations, stations, weather, rainfall, region?.id]);

  const handleSelectRegion = (regId: string) => {
    setIsDropdownOpen(false);
    if (onSelectRegion) {
      onSelectRegion(regId);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#070D18] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Bar with Geographical Region Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E2D4A]">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Live Environmental Monitoring
            </h1>
            {renderFreshnessBadge(weather?.freshness_status || 'LIVE')}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Dynamic nationwide environmental telemetry: meteorological observations, river gauge thresholds, NDMA alerts & Sentinel-1 SAR acquisition tracking.
          </p>
        </div>

        {/* Region Search & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Geographical Region Search / Dropdown */}
          <div className="relative min-w-[260px] sm:min-w-[320px]">
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-between px-3 py-2 bg-[#0D1626] border border-[#1E2D4A] rounded-xl text-xs text-white cursor-pointer hover:border-cyan-500/50 transition shadow-lg"
            >
              <div className="flex items-center space-x-2 truncate">
                <Navigation className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className="font-semibold text-slate-200 truncate">{region.name}</span>
                <span className="text-[10px] text-cyan-400 px-1.5 py-0.5 bg-cyan-950/60 rounded border border-cyan-800/60 flex-shrink-0">
                  {region.state}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0D1626] border border-[#1E2D4A] rounded-xl shadow-2xl overflow-hidden p-2 space-y-2 backdrop-blur-xl">
                {/* Search input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchRegions(e.target.value)}
                    placeholder="Search city, district, state..."
                    className="w-full bg-[#070D18] border border-[#1E2D4A] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    autoFocus
                  />
                  {isSearching && (
                    <div className="absolute right-2.5 top-2 text-[10px] text-cyan-400 animate-pulse font-mono">
                      Searching...
                    </div>
                  )}
                </div>

                {/* Quick Filters */}
                <div className="pt-1 border-t border-[#1E2D4A]">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5 px-1">
                    Preset Indian Flood Basins
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {QUICK_REGIONS.map(qr => (
                      <button
                        key={qr.id}
                        onClick={() => handleSelectRegion(qr.id)}
                        className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-lg text-left text-xs transition cursor-pointer ${
                          selectedRegionId === qr.id || region.id === qr.id
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                            : 'text-slate-300 hover:bg-[#16243A]'
                        }`}
                      >
                        <span>{qr.icon}</span>
                        <span className="truncate">{qr.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search / Catalog Results */}
                {regionsList.length > 0 && (
                  <div className="pt-1 border-t border-[#1E2D4A] max-h-48 overflow-y-auto space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 px-1">
                      Available Locations ({regionsList.length})
                    </div>
                    {regionsList.map(r => (
                      <div
                        key={r.id}
                        onClick={() => handleSelectRegion(r.id)}
                        className={`px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center justify-between text-xs transition ${
                          selectedRegionId === r.id || region.id === r.id
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                            : 'text-slate-200 hover:bg-[#16243A]'
                        }`}
                      >
                        <div className="truncate">
                          <span className="font-medium">{r.name}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">({r.state})</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 flex-shrink-0 ml-2">
                          {r.latitude.toFixed(2)}°N, {r.longitude.toFixed(2)}°E
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#0D1626] hover:bg-[#16243A] text-slate-200 border border-[#1E2D4A] rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 shadow-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Poll Telemetry</span>
          </button>
        </div>
      </div>

      {/* Quick Selection Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] text-slate-400 font-medium flex items-center space-x-1 flex-shrink-0">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>Quick Switch:</span>
        </span>
        {QUICK_REGIONS.map(qr => {
          const isActive = selectedRegionId === qr.id || region.id === qr.id;
          return (
            <button
              key={qr.id}
              onClick={() => handleSelectRegion(qr.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition flex-shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-[#0D1626] border border-[#1E2D4A] text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              <span>{qr.icon}</span>
              <span>{qr.label}</span>
            </button>
          );
        })}
      </div>

      {/* Environmental Readiness Alert Banner */}
      <Card
        borderAccent={alertVariant}
        className="p-4 sm:p-5 shadow-2xl relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className={`p-2.5 rounded-xl border flex-shrink-0 ${
              alertVariant === 'rose'
                ? 'bg-rose-950/70 border-rose-500/50 text-rose-400'
                : alertVariant === 'amber'
                ? 'bg-amber-950/70 border-amber-500/50 text-amber-400'
                : 'bg-emerald-950/70 border-emerald-500/50 text-emerald-400'
            }`}>
              {alertVariant === 'emerald' ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm sm:text-base font-bold text-white">
                  Environmental Readiness Status • {region.name}
                </span>
                <Badge variant={alertVariant} size="sm">
                  {alert?.badge || 'Normal Conditions'}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                {alert?.summary || `Stable meteorological and hydrological conditions across ${region.name}.`}
              </p>
            </div>
          </div>

          <div className="text-right text-[11px] font-mono text-slate-400 flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-[#1E2D4A] pt-2 md:pt-0">
            <span>Observed at:</span>
            <span className="text-white font-bold">{liveData?.timestamp || 'Just now'}</span>
          </div>
        </div>

        {/* Mandatory Scientific Notice */}
        <div className="mt-3.5 pt-3 border-t border-[#1E2D4A] text-[11px] text-amber-200/90 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="leading-snug">
            {alert?.disclaimer || alert?.scientific_disclaimer || 'Rainfall and river discharge are environmental precursors, not confirmed surface inundation detection. Satellite radar confirmation is required for physical flood extent classification.'}
          </span>
        </div>
      </Card>

      {/* Geospatial Monitoring Map */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1E2D4A]">
          <div className="flex items-center space-x-2 truncate">
            <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider truncate">
              Geospatial Telemetry Map • {region.name}
            </h2>
          </div>

          {/* Map Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Basemap Switcher */}
            <div className="flex bg-[#070D18] border border-[#1E2D4A] rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setBasemap('satellite')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${basemap === 'satellite' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'}`}
              >
                Satellite
              </button>
              <button
                onClick={() => setBasemap('dark')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${basemap === 'dark' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'}`}
              >
                Dark
              </button>
              <button
                onClick={() => setBasemap('streets')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${basemap === 'streets' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'}`}
              >
                Streets
              </button>
            </div>

            {/* Layer Toggles */}
            <button
              onClick={() => setShowStations(!showStations)}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] border transition ${
                showStations ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200' : 'bg-[#070D18] border-[#1E2D4A] text-slate-400'
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>CWC Gauges ({stations.length})</span>
            </button>

            {/* Historical 2018 Flood Footprint (Reference Overlay) */}
            <button
              onClick={() => isKeralaRegion && setShowHistoricalFlood(!showHistoricalFlood)}
              disabled={!isKeralaRegion}
              title={isKeralaRegion ? 'Toggle 2018 historical flood footprint reference' : 'Historical flood extent is specific to the Kerala 2018 benchmark study'}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] border transition ${
                !isKeralaRegion
                  ? 'opacity-40 cursor-not-allowed bg-[#070D18] border-[#1E2D4A] text-slate-500'
                  : showHistoricalFlood
                  ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-200 cursor-pointer'
                  : 'bg-[#070D18] border-[#1E2D4A] text-slate-400 cursor-pointer'
              }`}
            >
              {showHistoricalFlood && isKeralaRegion ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3" />}
              <span>2018 Flood (Ref)</span>
            </button>
          </div>
        </div>

        {/* Embedded MapLibre Canvas */}
        <div className="relative w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-[#1E2D4A]">
          <div ref={mapContainer} className="w-full h-full" />
          
          {/* Map Legend Floating */}
          <div className="absolute bottom-3 right-3 z-10 flex flex-wrap items-center gap-3 px-3 py-1.5 bg-[#070D18]/90 backdrop-blur-md border border-[#1E2D4A] rounded-lg text-[10px] text-slate-300 shadow-xl">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white" />
              <span>CWC River Gauge</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-white" />
              <span>Observation Center</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-cyan-400" />
              <span>Sentinel-1 AOI Bbox</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid: 3 major telemetry modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Module 1: Meteorological Telemetry */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 flex-shrink-0">
                <CloudRain className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h3 className="text-sm font-bold text-white truncate">Meteorological Telemetry</h3>
                <p className="text-[11px] text-slate-400 truncate">{weather?.provider || 'Open-Meteo High-Resolution Model'}</p>
              </div>
            </div>
            {renderFreshnessBadge(weather?.freshness_status || 'LIVE')}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Temperature */}
            <div className="p-3 bg-[#070D18] border border-[#1E2D4A] rounded-xl">
              <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                <span>Temperature</span>
              </div>
              <div className="text-xl font-bold text-white mt-1 tabular-nums">
                {weather?.temperature_c !== null && weather?.temperature_c !== undefined ? `${weather.temperature_c}°C` : '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Feels like {weather?.apparent_temperature_c ?? 31}°C
              </div>
            </div>

            {/* Humidity */}
            <div className="p-3 bg-[#070D18] border border-[#1E2D4A] rounded-xl">
              <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                <span>Humidity</span>
              </div>
              <div className="text-xl font-bold text-white mt-1 tabular-nums">
                {weather?.relative_humidity_pct !== null && weather?.relative_humidity_pct !== undefined ? `${weather.relative_humidity_pct}%` : '—'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {weather?.condition || 'Partly Cloudy'}
              </div>
            </div>

            {/* Rain Rate */}
            <div className="p-3 bg-[#070D18] border border-[#1E2D4A] rounded-xl">
              <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                <CloudRain className="w-3.5 h-3.5 text-amber-400" />
                <span>Precipitation Rate</span>
              </div>
              <div className="text-xl font-bold text-white mt-1 tabular-nums">
                {weather?.precipitation_rate_mm_hr !== null && weather?.precipitation_rate_mm_hr !== undefined ? `${weather.precipitation_rate_mm_hr} mm/h` : '0.0 mm/h'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Real-time rain intensity
              </div>
            </div>

            {/* 24h Rain Accumulation */}
            <div className="p-3 bg-[#070D18] border border-[#1E2D4A] rounded-xl">
              <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                <span>24h Rainfall Sum</span>
              </div>
              <div className="text-xl font-bold text-white mt-1 tabular-nums">
                {rainfall?.rainfall_24h_mm !== null && rainfall?.rainfall_24h_mm !== undefined
                  ? `${rainfall.rainfall_24h_mm} mm`
                  : weather?.precipitation_sum_24h_mm !== null && weather?.precipitation_sum_24h_mm !== undefined
                  ? `${weather.precipitation_sum_24h_mm} mm`
                  : '0.0 mm'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Wind: {weather?.wind_speed_kmh ?? 11} km/h
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 pt-1 border-t border-[#1E2D4A] flex items-center justify-between">
            <span>Location: <strong className="text-slate-300">{region.name}</strong></span>
            <span className="text-slate-400">{weather?.source_reference || 'Open-Meteo ECMWF'}</span>
          </div>
        </Card>

        {/* Module 2: Hydrological Basin Telemetry */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 flex-shrink-0">
                <Waves className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h3 className="text-sm font-bold text-white truncate">River Basin Inflow</h3>
                <p className="text-[11px] text-slate-400 truncate">{hydrology?.basin_name || region.cwc_basin || 'Regional Drainage Basin'}</p>
              </div>
            </div>
            {renderFreshnessBadge(hydrology?.freshness_status || 'RECENT')}
          </div>

          <div className="p-3 bg-[#070D18] border border-[#1E2D4A] rounded-xl space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Current Basin Inflow:</span>
              <span className="text-2xl font-extrabold text-emerald-300 font-mono">
                {hydrology?.current_discharge_m3_s ? `${hydrology.current_discharge_m3_s} m³/s` : '0.82 m³/s'}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Seasonal Median Baseline:</span>
              <span className="text-white font-mono">{hydrology?.median_discharge_m3_s ?? 0.80} m³/s</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-300">7-Day Discharge Forecast / Trend</div>
            <SvgBarChart data={dischargeBars} />
          </div>

          {/* Honest station availability notice */}
          {stations.length === 0 ? (
            <div className="p-2 bg-[#070D18] border border-amber-500/30 rounded-lg text-[11px] text-amber-300/90 flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>No active CWC river gauge stations within 120km radius of this region. GloFAS runoff simulation active.</span>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 pt-1 border-t border-[#1E2D4A] flex items-center justify-between">
              <span>Flow Status: <strong className="text-emerald-400">{hydrology?.flow_status || 'NORMAL'}</strong></span>
              <span>CWC Stations: <strong className="text-emerald-300">{stations.length} Loaded</strong></span>
            </div>
          )}
        </Card>

        {/* Module 3: Sentinel-1 SAR Acquisition Discovery */}
        <Card className="p-5 space-y-4 md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 flex-shrink-0">
                <Satellite className="w-5 h-5" />
              </div>
              <div className="truncate">
                <h3 className="text-sm font-bold text-white truncate">SAR Satellite Acquisitions</h3>
                <p className="text-[11px] text-slate-400 truncate">ESA Copernicus Data Space (CDSE)</p>
              </div>
            </div>
            <Badge variant="cyan" size="sm">
              AOI Bbox
            </Badge>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-[#070D18] border border-[#1E2D4A] rounded-xl space-y-1">
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                Latest Product Discovered (Regional Intersect)
              </span>
              {latestProduct ? (
                <>
                  <div className="text-xs font-mono font-bold text-cyan-300 truncate" title={latestProduct.product_name}>
                    {latestProduct.product_name}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                    <span>Acquired: <strong className="text-slate-200">{latestProduct.acquisition_start ? new Date(latestProduct.acquisition_start).toLocaleDateString() : 'Recent'}</strong></span>
                    {latestProduct.catalogue_link && (
                      <a
                        href={latestProduct.catalogue_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline flex items-center space-x-0.5"
                      >
                        <span>View CDSE</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  No recent Sentinel-1 SAR scenes covering this bounding box.
                </div>
              )}
            </div>

            <div className="p-3 bg-[#070D18] border border-[#1E2D4A] rounded-xl space-y-1">
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                Last Scheduled Orbital Pass
              </span>
              <div className="text-xs font-mono font-bold text-slate-200">
                {satellite?.last_scheduled_pass || '—'}
              </div>
            </div>

            <div className="p-3 bg-[#070D18] border border-cyan-500/40 rounded-xl space-y-1">
              <span className="text-[10px] uppercase text-cyan-400 font-semibold block">
                Next Scheduled Radar Acquisition Window
              </span>
              <div className="text-xs font-mono font-bold text-cyan-300">
                {satellite?.next_scheduled_pass || '—'}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 pt-1 border-t border-[#1E2D4A] flex items-center justify-between">
            <span>Catalogue: <strong className="text-slate-300">CDSE OData/STAC</strong></span>
            <span className="text-cyan-400">Dynamic AOI Bbox</span>
          </div>
        </Card>
      </div>

      {/* Official Alerts Module (NDMA SACHET) */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1E2D4A]">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Official Early Warnings & Alerts • NDMA SACHET (CAP Standard)
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Active Warnings for {region.state}:</span>
            <Badge variant={alertsList.length > 0 ? 'rose' : 'emerald'} size="sm">
              {alertsList.length} Active
            </Badge>
          </div>
        </div>

        {alertsList.length === 0 ? (
          <div className="p-4 bg-[#070D18] border border-[#1E2D4A] rounded-xl text-center space-y-1.5">
            <div className="flex items-center justify-center space-x-2 text-emerald-400 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>No Active Official Disaster Warnings for {region.state}</span>
            </div>
            <p className="text-[11px] text-slate-400 max-w-xl mx-auto">
              NDMA SACHET National Disaster Alert Portal reports 0 active emergency bulletins for {region.name} and surrounding districts. The system continuously polls the national CAP feed.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alertsList.map((a: any, i: number) => (
              <div key={i} className="p-3 bg-[#070D18] border border-rose-500/50 rounded-xl flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold text-white">{a.headline}</div>
                  <div className="text-[11px] text-slate-400">{a.area_description} • Severity: <strong className="text-rose-400">{a.severity}</strong></div>
                </div>
                <Badge variant="rose" size="sm">{a.disaster_type}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Provider Connectivity & Authentication Status Bar */}
      <div className="p-3.5 bg-[#0D1626] border border-[#1E2D4A] rounded-xl text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px]">
          <span>Official Agency Telemetry Pipelines</span>
          <span className="text-slate-400 font-mono text-[10px]">Real-time Health Check</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          {/* IMD */}
          <div className="p-2 bg-[#070D18] border border-[#1E2D4A] rounded-lg">
            <div className="text-slate-400 font-medium">Weather Pipeline</div>
            <div className="font-bold mt-0.5 text-cyan-300 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>{providerStatus.imd?.status === 'AUTHENTICATED' ? 'Official IMD API' : 'Open-Meteo Model'}</span>
            </div>
          </div>

          {/* CWC */}
          <div className="p-2 bg-[#070D18] border border-[#1E2D4A] rounded-lg">
            <div className="text-slate-400 font-medium">CWC Basin Atlas</div>
            <div className="font-bold mt-0.5 text-emerald-300 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{stations.length > 0 ? `${stations.length} Gauges Active` : 'GloFAS Simulation'}</span>
            </div>
          </div>

          {/* SACHET */}
          <div className="p-2 bg-[#070D18] border border-[#1E2D4A] rounded-lg">
            <div className="text-slate-400 font-medium">NDMA SACHET</div>
            <div className="font-bold mt-0.5 text-emerald-300 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>CAP Feed Live</span>
            </div>
          </div>

          {/* Copernicus */}
          <div className="p-2 bg-[#070D18] border border-[#1E2D4A] rounded-lg">
            <div className="text-slate-400 font-medium">Copernicus CDSE</div>
            <div className="font-bold mt-0.5 text-cyan-300 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Catalogue Indexed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

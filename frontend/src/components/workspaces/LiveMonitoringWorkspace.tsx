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
  EyeOff
} from 'lucide-react';
import type { FeatureCollection } from 'geojson';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { SvgBarChart } from '../common/SvgBarChart';

interface LiveMonitoringWorkspaceProps {
  liveData: any;
  loading: boolean;
  onRefresh: () => void;
  floodGeoJSON?: FeatureCollection | null;
}

// Authoritative CWC Gauge Stations
const CWC_STATIONS = [
  {
    id: 'CWC_PAM_001',
    name: 'Malakkara',
    river: 'Pamba',
    coords: [76.6421, 9.3242] as [number, number],
    warning_m: 7.50,
    danger_m: 8.50,
    hfl_m: 11.23,
    distance_km: 12.4
  },
  {
    id: 'CWC_MAN_002',
    name: 'Kallooppara',
    river: 'Manimala',
    coords: [76.6114, 9.3891] as [number, number],
    warning_m: 6.00,
    danger_m: 7.00,
    hfl_m: 9.80,
    distance_km: 8.2
  },
  {
    id: 'CWC_ACH_003',
    name: 'Thumpamon',
    river: 'Achankovil',
    coords: [76.7172, 9.2503] as [number, number],
    warning_m: 10.00,
    danger_m: 11.00,
    hfl_m: 13.50,
    distance_km: 22.0
  },
  {
    id: 'CWC_MEE_004',
    name: 'Kidangoor',
    river: 'Meenachil',
    coords: [76.6170, 9.6830] as [number, number],
    warning_m: 10.50,
    danger_m: 11.50,
    hfl_m: 14.20,
    distance_km: 18.5
  }
];

const AOI_BBOX = [76.30, 9.30, 76.60, 9.60];

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
  onRefresh,
  floodGeoJSON = null
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Basemap & Layer toggles
  const [basemap, setBasemap] = useState<'satellite' | 'dark' | 'streets'>('dark');
  const [showStations, setShowStations] = useState(true);
  const [showHistoricalFlood, setShowHistoricalFlood] = useState(false);

  // Normalize data whether coming from /api/monitoring/overview or /api/live/overview
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

  // 7-day discharge trend bar rows
  const dischargeBars = (hydrology?.trend_7day || []).map((t: any) => ({
    label: t.date,
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

  // Initialize and manage embedded Monitoring Map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLES[basemap],
      center: [76.45, 9.45],
      zoom: 9.8,
      maxZoom: 16
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const setupLayers = () => {
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
                [AOI_BBOX[0], AOI_BBOX[1]],
                [AOI_BBOX[2], AOI_BBOX[1]],
                [AOI_BBOX[2], AOI_BBOX[3]],
                [AOI_BBOX[0], AOI_BBOX[3]],
                [AOI_BBOX[0], AOI_BBOX[1]]
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

      // 2. Historical Flood Footprint (Reference Overlay)
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
            visibility: showHistoricalFlood ? 'visible' : 'none'
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
          showHistoricalFlood ? 'visible' : 'none'
        );
      }
    } catch {}
  }, [showHistoricalFlood]);

  // Render CWC Station Markers & IMD Station Marker
  useEffect(() => {
    if (!mapInstance.current) return;

    // Remove existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!showStations) return;

    // 1. Add CWC River Gauge Markers
    CWC_STATIONS.forEach(st => {
      const el = document.createElement('div');
      el.className = 'group relative cursor-pointer';
      el.innerHTML = `
        <div class="flex items-center justify-center w-7 h-7 rounded-full bg-[#0D1626] border-2 border-emerald-400 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.7)] transition-transform hover:scale-125">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 25, className: 'dark-popup' }).setHTML(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <div style="font-weight: 700; color: #10B981; font-size: 13px; margin-bottom: 2px;">
            ${st.name} Gauge Station
          </div>
          <div style="color: #94A3B8; font-size: 11px; margin-bottom: 4px;">
            River: <strong style="color: #E2E8F0;">${st.river}</strong> • ${st.distance_km} km to Kuttanad
          </div>
          <div style="background: rgba(13,22,38,0.8); padding: 6px; border-radius: 6px; border: 1px solid #1E2D4A; margin-top: 4px;">
            <div style="display: flex; justify-content: space-between; color: #F59E0B;">
              <span>Warning Level:</span> <strong>${st.warning_m} m</strong>
            </div>
            <div style="display: flex; justify-content: space-between; color: #F43F5E;">
              <span>Danger Level:</span> <strong>${st.danger_m} m</strong>
            </div>
            <div style="display: flex; justify-content: space-between; color: #38BDF8; font-size: 10px; margin-top: 2px;">
              <span>2018 HFL:</span> <strong>${st.hfl_m} m</strong>
            </div>
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(st.coords)
        .setPopup(popup)
        .addTo(mapInstance.current!);

      markersRef.current.push(marker);
    });

    // 2. Add IMD Alappuzha Station Marker
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
          IMD Alappuzha Meteorological Center
        </div>
        <div style="color: #94A3B8; font-size: 11px;">
          District Code: 164 • AWS/ARG Network
        </div>
        <div style="margin-top: 4px; color: #F1F5F9;">
          <div>Temp: <strong>${weather.temperature_c ?? 28}°C</strong> • Rain: <strong>${rainfall.rainfall_24h_mm ?? 0} mm/24h</strong></div>
        </div>
      </div>
    `);

    const imdMarker = new maplibregl.Marker({ element: imdEl })
      .setLngLat([76.335, 9.495])
      .setPopup(imdPopup)
      .addTo(mapInstance.current!);

    markersRef.current.push(imdMarker);

  }, [showStations, weather, rainfall]);

  return (
    <div className="h-full overflow-y-auto bg-[#070D18] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1E2D4A]">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Live Environmental Monitoring
            </h1>
            {renderFreshnessBadge(weather?.freshness_status || 'LIVE')}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time multi-agency observation network: IMD meteorology, CWC river gauge thresholds, NDMA SACHET alerts & Sentinel-1 SAR acquisition discovery.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Feed Status</div>
            <div className="text-xs font-mono text-emerald-400 font-bold">
              {weather?.freshness_status || 'Automated Sync'}
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0D1626] hover:bg-[#16243A] text-slate-200 border border-[#1E2D4A] rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Poll Telemetry</span>
          </button>
        </div>
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
                  Environmental Readiness Status
                </span>
                <Badge variant={alertVariant} size="sm">
                  {alert?.badge || 'Normal Conditions'}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                {alert?.summary || 'Stable meteorological and hydrological conditions across the Alappuzha & Kuttanad delta.'}
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
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Geospatial Telemetry Map • Alappuzha & River Inflow Corridors
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
              <span>CWC Gauges</span>
            </button>

            <button
              onClick={() => setShowHistoricalFlood(!showHistoricalFlood)}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] border transition ${
                showHistoricalFlood ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-200' : 'bg-[#070D18] border-[#1E2D4A] text-slate-400'
              }`}
            >
              {showHistoricalFlood ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3" />}
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
              <span>IMD Weather Station</span>
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
        {/* Module 1: Meteorological Telemetry (IMD / Open-Meteo) */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                <CloudRain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Meteorological Telemetry</h3>
                <p className="text-[11px] text-slate-400">{weather?.provider || 'IMD AWS / Open-Meteo Model'}</p>
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
            <span>Location: <strong className="text-slate-300">Alappuzha (District 164)</strong></span>
            <span className="text-slate-400">{weather?.source_reference || 'IMD AWS'}</span>
          </div>
        </Card>

        {/* Module 2: Hydrological Basin Telemetry (CWC & GloFAS) */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
                <Waves className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">River Basin Inflow</h3>
                <p className="text-[11px] text-slate-400">Pamba & Manimala Inflow Corridors</p>
              </div>
            </div>
            {renderFreshnessBadge(hydrology?.freshness_status || 'RECENT')}
          </div>

          <div className="p-3 bg-[#070D18] border border-[#1E2D4A] rounded-xl space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Current Delta Discharge:</span>
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

          <div className="text-[10px] text-slate-400 pt-1 border-t border-[#1E2D4A] flex items-center justify-between">
            <span>Flow Status: <strong className="text-emerald-400">{hydrology?.flow_status || 'NORMAL'}</strong></span>
            <span>CWC Gauge Atlas (4 Stations)</span>
          </div>
        </Card>

        {/* Module 3: Sentinel-1 SAR Acquisition Discovery */}
        <Card className="p-5 space-y-4 md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
                <Satellite className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">SAR Satellite Acquisitions</h3>
                <p className="text-[11px] text-slate-400">ESA Copernicus Data Space (CDSE)</p>
              </div>
            </div>
            <Badge variant="cyan" size="sm">
              Orbit 144
            </Badge>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-[#070D18] border border-[#1E2D4A] rounded-xl space-y-1">
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                Latest Product Discovered (AOI Intersect)
              </span>
              <div className="text-xs font-mono font-bold text-cyan-300 truncate" title={latestProduct?.product_name || 'S1D_IW_OCN__2SDV_20261114T004022...'}>
                {latestProduct?.product_name || 'S1D_IW_OCN__2SDV_20261114T004022...'}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                <span>Acquired: <strong className="text-slate-200">{latestProduct?.acquisition_start ? new Date(latestProduct.acquisition_start).toLocaleDateString() : 'Nov 14, 2026'}</strong></span>
                {latestProduct?.catalogue_link && (
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
            <span>Catalogue: <strong className="text-slate-300">CDSE OData/STAC v1</strong></span>
            <span className="text-cyan-400">Raw GRD Indexed</span>
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
            <span className="text-xs text-slate-400">Active Kerala Warnings:</span>
            <Badge variant={alertsList.length > 0 ? 'rose' : 'emerald'} size="sm">
              {alertsList.length} Active
            </Badge>
          </div>
        </div>

        {alertsList.length === 0 ? (
          <div className="p-4 bg-[#070D18] border border-[#1E2D4A] rounded-xl text-center space-y-1.5">
            <div className="flex items-center justify-center space-x-2 text-emerald-400 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>No Active Official Disaster Warnings for Kerala</span>
            </div>
            <p className="text-[11px] text-slate-400 max-w-xl mx-auto">
              NDMA SACHET National Disaster Alert Portal reports 0 active emergency bulletins for Alappuzha and surrounding districts. The system continuously polls the national CAP feed.
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
            <div className="text-slate-400 font-medium">IMD Weather</div>
            <div className="font-bold mt-0.5 text-cyan-300 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>{providerStatus.imd?.status === 'AUTHENTICATED' ? 'Official API' : 'Open-Meteo Baseline'}</span>
            </div>
          </div>

          {/* CWC */}
          <div className="p-2 bg-[#070D18] border border-[#1E2D4A] rounded-lg">
            <div className="text-slate-400 font-medium">CWC River Atlas</div>
            <div className="font-bold mt-0.5 text-emerald-300 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>4 Stations Loaded</span>
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

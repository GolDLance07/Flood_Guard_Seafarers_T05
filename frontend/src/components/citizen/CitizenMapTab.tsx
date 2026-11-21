import React, { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import {
  MapPin,
  Home,
  Waves,
  Eye,
  EyeOff,
  Layers
} from 'lucide-react';
import type { FeatureCollection } from 'geojson';
import type { ShelterItem } from '../../types/citizen';
import type { CWCStation } from '../../types/api';

interface CitizenMapTabProps {
  region: {
    id: string;
    name: string;
    state: string;
    center?: [number, number];
    aoi_bbox?: [number, number, number, number];
    zoom?: number;
  };
  shelters: ShelterItem[];
  stations: CWCStation[];
  floodGeoJSON?: FeatureCollection | null;
}

const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';

export const CitizenMapTab: React.FC<CitizenMapTabProps> = ({
  region,
  shelters,
  stations,
  floodGeoJSON = null
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const isKerala = region.id.startsWith('kerala');
  const [showShelters, setShowShelters] = useState(true);
  const [showRiverGauges, setShowRiverGauges] = useState(true);
  const [showHistoricalReference, setShowHistoricalReference] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const initialCenter = region.center || [76.335, 9.495];
    const initialZoom = region.zoom || 10.0;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      maxZoom: 16
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const setupSources = () => {
      const bbox = region.aoi_bbox || [76.30, 9.30, 76.60, 9.60];

      // 1. Regional AOI Bounding Box
      if (!map.getSource('citizen-aoi-src')) {
        map.addSource('citizen-aoi-src', {
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
          id: 'citizen-aoi-line',
          type: 'line',
          source: 'citizen-aoi-src',
          paint: {
            'line-color': '#10B981',
            'line-width': 2,
            'line-dasharray': [3, 2]
          }
        });
      }

      // 2. Historical Kerala Inundation Layer (STRICTLY constrained to Kerala context)
      if (floodGeoJSON && !map.getSource('citizen-kerala-historical-src')) {
        map.addSource('citizen-kerala-historical-src', {
          type: 'geojson',
          data: floodGeoJSON
        });

        map.addLayer({
          id: 'citizen-kerala-historical-fill',
          type: 'fill',
          source: 'citizen-kerala-historical-src',
          paint: {
            'fill-color': '#06B6D4',
            'fill-opacity': 0.35
          },
          layout: {
            visibility: 'none'
          }
        });
      }
    };

    map.on('style.load', setupSources);
    map.on('load', setupSources);
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update Center & AOI when region changes
  useEffect(() => {
    if (!mapInstance.current || !region) return;

    const center = region.center || [76.335, 9.495];
    const zoom = region.zoom || 10.0;
    const bbox = region.aoi_bbox;

    mapInstance.current.flyTo({
      center,
      zoom,
      speed: 1.3,
      essential: true
    });

    if (bbox && mapInstance.current.getSource('citizen-aoi-src')) {
      const src = mapInstance.current.getSource('citizen-aoi-src') as maplibregl.GeoJSONSource;
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

    // Automatically reset historical reference overlay if navigating outside Kerala
    if (!isKerala && showHistoricalReference) {
      setShowHistoricalReference(false);
    }
  }, [region.id, region.center, region.aoi_bbox]);

  // Toggle Historical Reference Fill (Kerala context only)
  useEffect(() => {
    if (!mapInstance.current) return;
    try {
      if (mapInstance.current.getLayer('citizen-kerala-historical-fill')) {
        mapInstance.current.setLayoutProperty(
          'citizen-kerala-historical-fill',
          'visibility',
          showHistoricalReference && isKerala ? 'visible' : 'none'
        );
      }
    } catch {}
  }, [showHistoricalReference, isKerala]);

  // Render Shelter & River Markers
  useEffect(() => {
    if (!mapInstance.current) return;

    // Remove previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 1. Shelter Markers
    if (showShelters) {
      shelters.forEach(s => {
        const el = document.createElement('div');
        el.className = 'cursor-pointer group';
        el.innerHTML = `
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-[#070D18] border-2 border-emerald-400 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.7)] transition-transform hover:scale-125">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
          </div>
        `;

        const occupancyText = s.capacity ? `${s.current_occupancy || 0} / ${s.capacity} occupied` : 'Designated Shelter';

        const popup = new maplibregl.Popup({ offset: 25, className: 'dark-popup' }).setHTML(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4; color: #F1F5F9;">
            <div style="font-weight: 700; color: #10B981; font-size: 13px; margin-bottom: 2px;">
              ${s.name}
            </div>
            <div style="color: #94A3B8; font-size: 11px; margin-bottom: 4px;">
              ${s.facility_type.replace(/_/g, ' ')} • Status: <strong style="color: #34D399;">${s.operational_status}</strong>
            </div>
            <div style="background: rgba(13,22,38,0.8); padding: 6px; border-radius: 6px; border: 1px solid #1E2D4A; margin-top: 4px;">
              <div>Capacity: <strong>${occupancyText}</strong></div>
              ${s.contact_phone ? `<div style="margin-top: 2px;">Phone: <strong>${s.contact_phone}</strong></div>` : ''}
              <div style="font-size: 10px; color: #64748B; margin-top: 4px;">${s.official_source}</div>
            </div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([s.longitude, s.latitude])
          .setPopup(popup)
          .addTo(mapInstance.current!);

        markersRef.current.push(marker);
      });
    }

    // 2. CWC River Gauge Markers
    if (showRiverGauges) {
      stations.forEach(st => {
        const el = document.createElement('div');
        el.className = 'cursor-pointer group';
        el.innerHTML = `
          <div class="flex items-center justify-center w-7 h-7 rounded-full bg-[#070D18] border-2 border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)] transition-transform hover:scale-125">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 25, className: 'dark-popup' }).setHTML(`
          <div style="font-family: inherit; font-size: 12px; line-height: 1.4; color: #F1F5F9;">
            <div style="font-weight: 700; color: #22D3EE; font-size: 13px;">
              ${st.name} Gauge
            </div>
            <div style="color: #94A3B8; font-size: 11px;">
              River: ${st.river} • ${st.basin}
            </div>
            <div style="margin-top: 4px; font-size: 11px;">
              Warning: <strong style="color: #F59E0B;">${st.warning_level_m} m</strong> • Danger: <strong style="color: #F43F5E;">${st.danger_level_m} m</strong>
            </div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(st.coordinates)
          .setPopup(popup)
          .addTo(mapInstance.current!);

        markersRef.current.push(marker);
      });
    }
  }, [showShelters, showRiverGauges, shelters, stations]);

  return (
    <div className="h-[calc(100vh-120px)] w-full relative flex flex-col">
      {/* Map Header Controls */}
      <div className="bg-[#0D1626] border-b border-[#1E2D4A] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-10">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white uppercase tracking-wider">
            Public Safety Map • {region.name}
          </span>
        </div>

        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowShelters(!showShelters)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border transition ${
              showShelters
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 font-semibold'
                : 'bg-[#070D18] border-[#1E2D4A] text-slate-400'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Shelters ({shelters.length})</span>
          </button>

          <button
            onClick={() => setShowRiverGauges(!showRiverGauges)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border transition ${
              showRiverGauges
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 font-semibold'
                : 'bg-[#070D18] border-[#1E2D4A] text-slate-400'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>River Gauges ({stations.length})</span>
          </button>

          {isKerala && (
            <button
              onClick={() => setShowHistoricalReference(!showHistoricalReference)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border transition ${
                showHistoricalReference
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 font-semibold'
                  : 'bg-[#070D18] border-[#1E2D4A] text-slate-400'
              }`}
              title="Reference only: Historical flood extent from August 2018 case study"
            >
              {showHistoricalReference ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>2018 Historical Reference</span>
            </button>
          )}
        </div>
      </div>

      {/* Embedded Map Canvas */}
      <div ref={mapContainer} className="flex-1 w-full relative" />

      {/* Floating Map Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-[#070D18]/90 backdrop-blur-md border border-[#1E2D4A] rounded-xl p-3 shadow-2xl text-[11px] space-y-2 max-w-xs">
        <div className="font-bold text-white flex items-center space-x-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Public Safety Legend</span>
        </div>
        <div className="space-y-1.5 text-slate-300">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400 border border-emerald-300" />
            <span>Official Designated Safe Shelter</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-cyan-400 border border-cyan-300" />
            <span>CWC River Gauge Threshold Station</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-0.5 border-t border-dashed border-emerald-400" />
            <span>Regional Monitoring AOI Boundary</span>
          </div>
          {isKerala && showHistoricalReference && (
            <div className="flex items-center space-x-2 pt-1 border-t border-[#1E2D4A]">
              <div className="w-3 h-3 bg-cyan-500/40 border border-cyan-400 rounded-sm" />
              <span className="text-[10px] text-cyan-300">Aug 2018 Historical SAR Reference</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

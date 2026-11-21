import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { LayerVisibility } from './LayerControls';
import type { RouteCoordinate, RouteResponse } from '../types/api';
import { Globe, Map as MapIcon, Moon } from 'lucide-react';

interface MapComponentProps {
  layers: LayerVisibility;
  floodGeoJSON: FeatureCollection | null;
  roadsGeoJSON: FeatureCollection | null;
  roadNetworkGeoJSON?: FeatureCollection | null;
  facilitiesGeoJSON: FeatureCollection | null;
  settlementsGeoJSON: FeatureCollection | null;
  routeResponse: RouteResponse | null;
  origin: RouteCoordinate | null;
  destination: RouteCoordinate | null;
  selectionMode: 'none' | 'origin' | 'destination';
  onMapClickCoord: (coord: RouteCoordinate) => void;
  fitAoiTrigger: number;
  resetViewTrigger: number;
  className?: string;
}

const AOI_BOUNDS: [number, number, number, number] = [76.30, 9.30, 76.60, 9.60]; // [min_lon, min_lat, max_lon, max_lat]

// Satellite Basemap Specification (Esri World Imagery)
const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      maxzoom: 17, // Overzoom past z17 to prevent missing tiles
      attribution: '&copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>, Maxar, Earthstar Geographics'
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

// Basemap style configurations (OpenFreeMap vector styles for Dark and Streets)
const BASEMAP_STYLES: Record<'satellite' | 'dark' | 'streets', string | maplibregl.StyleSpecification> = {
  satellite: SATELLITE_STYLE,
  dark: 'https://tiles.openfreemap.org/styles/dark',
  streets: 'https://tiles.openfreemap.org/styles/liberty',
};

export const MapComponent: React.FC<MapComponentProps> = ({
  layers,
  floodGeoJSON,
  roadsGeoJSON,
  roadNetworkGeoJSON,
  facilitiesGeoJSON,
  settlementsGeoJSON,
  routeResponse,
  origin,
  destination,
  selectionMode,
  onMapClickCoord,
  fitAoiTrigger,
  resetViewTrigger,
  className = '',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const originMarker = useRef<maplibregl.Marker | null>(null);
  const destMarker = useRef<maplibregl.Marker | null>(null);

  // Basemap selection (satellite | dark | streets)
  const [basemap, setBasemap] = useState<'satellite' | 'dark' | 'streets'>('satellite');
  const activeBasemapRef = useRef<'satellite' | 'dark' | 'streets'>('satellite');

  // Synchronize latest data and props into refs for style-switch re-hydrations
  const dataRef = useRef({
    floodGeoJSON,
    roadsGeoJSON,
    roadNetworkGeoJSON,
    facilitiesGeoJSON,
    settlementsGeoJSON,
    routeResponse,
    layers,
  });

  useEffect(() => {
    dataRef.current = {
      floodGeoJSON,
      roadsGeoJSON,
      roadNetworkGeoJSON,
      facilitiesGeoJSON,
      settlementsGeoJSON,
      routeResponse,
      layers,
    };
  }, [floodGeoJSON, roadsGeoJSON, roadNetworkGeoJSON, facilitiesGeoJSON, settlementsGeoJSON, routeResponse, layers]);

  const onMapClickCoordRef = useRef(onMapClickCoord);
  useEffect(() => {
    onMapClickCoordRef.current = onMapClickCoord;
  }, [onMapClickCoord]);

  const selectionModeRef = useRef(selectionMode);
  useEffect(() => {
    selectionModeRef.current = selectionMode;
  }, [selectionMode]);

  // Helper to safely apply layer visibility
  const setLayerVisibility = (layerId: string, visible: boolean) => {
    if (!map.current) return;
    try {
      if (map.current.getLayer(layerId)) {
        map.current.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    } catch {
      // Ignore transient style state during reloads
    }
  };

  // Setup / re-add all application-owned GeoJSON sources and custom layers
  const setupVectorLayers = (mapInstance: maplibregl.Map) => {
    const current = dataRef.current;

    // 1. General Road Network Layer (OSM Road Network: Slate #94A3B8 major, #475569 local)
    if (!mapInstance.getSource('road-network-src')) {
      mapInstance.addSource('road-network-src', {
        type: 'geojson',
        data: current.roadNetworkGeoJSON || { type: 'FeatureCollection', features: [] }
      });

      mapInstance.addLayer({
        id: 'road-network-layer',
        type: 'line',
        source: 'road-network-src',
        paint: {
          'line-color': [
            'case',
            ['get', 'is_major'],
            '#94A3B8',
            '#475569'
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, ['case', ['get', 'is_major'], 1.2, 0.7],
            14, ['case', ['get', 'is_major'], 2.2, 1.2],
            18, ['case', ['get', 'is_major'], 3.5, 2.0]
          ],
          'line-opacity': 0.75
        }
      });
    }

    // 2. Flood Extent Sources and Layers (Cyan #06B6D4 with #22D3EE crisp stroke)
    if (!mapInstance.getSource('flood-extent-src')) {
      mapInstance.addSource('flood-extent-src', {
        type: 'geojson',
        data: current.floodGeoJSON || { type: 'FeatureCollection', features: [] }
      });

      mapInstance.addLayer({
        id: 'flood-extent-fill',
        type: 'fill',
        source: 'flood-extent-src',
        paint: {
          'fill-color': '#06B6D4',
          'fill-opacity': 0.60
        }
      });

      mapInstance.addLayer({
        id: 'flood-extent-stroke',
        type: 'line',
        source: 'flood-extent-src',
        paint: {
          'line-color': '#22D3EE',
          'line-width': 1.6,
          'line-opacity': 0.95
        }
      });
    }

    // 3. Affected Roads Source and Layer (Vibrant warning orange #F97316)
    if (!mapInstance.getSource('affected-roads-src')) {
      mapInstance.addSource('affected-roads-src', {
        type: 'geojson',
        data: current.roadsGeoJSON || { type: 'FeatureCollection', features: [] }
      });

      mapInstance.addLayer({
        id: 'affected-roads-layer',
        type: 'line',
        source: 'affected-roads-src',
        paint: {
          'line-color': '#F97316',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 2.2,
            14, 3.6,
            18, 5.0
          ],
          'line-opacity': 0.95
        }
      });
    }

    // 4. Candidate Route Layers (3-tier prominent line: Navy Casing, Outer Glow, Emerald Core)
    if (!mapInstance.getSource('candidate-route-src')) {
      const route = current.routeResponse;
      const initialRouteData =
        route && route.geometry && route.status === 'candidate_route'
          ? {
              type: 'FeatureCollection' as const,
              features: [
                {
                  type: 'Feature' as const,
                  properties: {},
                  geometry: route.geometry
                }
              ]
            }
          : { type: 'FeatureCollection' as const, features: [] };

      mapInstance.addSource('candidate-route-src', {
        type: 'geojson',
        data: initialRouteData
      });

      // 4a. Dark navy casing
      mapInstance.addLayer({
        id: 'candidate-route-casing',
        type: 'line',
        source: 'candidate-route-src',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#070D18',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 6,
            14, 9,
            18, 13
          ],
          'line-opacity': 0.95
        }
      });

      // 4b. Emerald glowing aura
      mapInstance.addLayer({
        id: 'candidate-route-glow',
        type: 'line',
        source: 'candidate-route-src',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#10B981',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 8,
            14, 13,
            18, 18
          ],
          'line-opacity': 0.40
        }
      });

      // 4c. Crisp emerald centerline
      mapInstance.addLayer({
        id: 'candidate-route-line',
        type: 'line',
        source: 'candidate-route-src',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#34D399',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 3.5,
            14, 5.5,
            18, 8.0
          ],
          'line-opacity': 1.0
        }
      });
    }

    // 5. Facilities Source and Layer
    if (!mapInstance.getSource('facilities-src')) {
      mapInstance.addSource('facilities-src', {
        type: 'geojson',
        data: current.facilitiesGeoJSON || { type: 'FeatureCollection', features: [] }
      });

      mapInstance.addLayer({
        id: 'facilities-layer',
        type: 'circle',
        source: 'facilities-src',
        paint: {
          'circle-radius': 5.5,
          'circle-color': [
            'case',
            ['get', 'inside_flood_extent'],
            '#F43F5E',
            '#38BDF8'
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#070D18'
        }
      });
    }

    // 6. Settlements Source and Layer
    if (!mapInstance.getSource('settlements-src')) {
      mapInstance.addSource('settlements-src', {
        type: 'geojson',
        data: current.settlementsGeoJSON || { type: 'FeatureCollection', features: [] }
      });

      mapInstance.addLayer({
        id: 'settlements-layer',
        type: 'circle',
        source: 'settlements-src',
        paint: {
          'circle-radius': 4.5,
          'circle-color': '#FBBF24',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#070D18'
        }
      });
    }

    // Apply layer visibilities
    const setVis = (layerId: string, visible: boolean) => {
      try {
        if (mapInstance.getLayer(layerId)) {
          mapInstance.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
        }
      } catch {
        // Ignore during style transitions
      }
    };

    const v = current.layers;
    setVis('road-network-layer', v.normalRoads !== false);
    setVis('flood-extent-fill', v.floodExtent);
    setVis('flood-extent-stroke', v.floodExtent);
    setVis('affected-roads-layer', v.affectedRoads);
    setVis('facilities-layer', v.facilities);
    setVis('settlements-layer', v.settlements);
    setVis('candidate-route-casing', v.candidateRoute !== false);
    setVis('candidate-route-glow', v.candidateRoute !== false);
    setVis('candidate-route-line', v.candidateRoute !== false);
  };

  // Popup helper for healthcare facilities
  const showFacilityPopup = (mapInst: maplibregl.Map, feat: any) => {
    const props = feat.properties || {};
    const geom = feat.geometry as any;
    const isFlooded = props.inside_flood_extent;

    new maplibregl.Popup({ closeButton: true, className: 'dark-popup' })
      .setLngLat(geom.coordinates)
      .setHTML(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <div style="font-weight: 700; color: #F1F5F9; font-size: 13px; margin-bottom: 2px;">
            ${props.name || 'Healthcare Facility'}
          </div>
          <div style="color: #94A3B8; font-size: 11px; margin-bottom: 6px;">
            Category: <span style="color: #E2E8F0; text-transform: capitalize;">${props.category || 'Hospital'}</span>
          </div>
          <div style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 10px; border: 1px solid ${
            isFlooded ? '#F43F5E' : '#0284C7'
          }; background: ${isFlooded ? 'rgba(244,63,94,0.2)' : 'rgba(2,132,199,0.2)'}; color: ${
            isFlooded ? '#FDA4AF' : '#7DD3FC'
          };">
            ${isFlooded ? '⚠️ Inside Flood Extent (Exposed)' : '✓ Uninundated / Clear'}
          </div>
        </div>
      `)
      .addTo(mapInst);
  };

  // Popup helper for settlements
  const showSettlementPopup = (mapInst: maplibregl.Map, feat: any) => {
    const props = feat.properties || {};
    const geom = feat.geometry as any;
    const isAffected = props.affected_by_flood;

    new maplibregl.Popup({ closeButton: true, className: 'dark-popup' })
      .setLngLat(geom.coordinates)
      .setHTML(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <div style="font-weight: 700; color: #F1F5F9; font-size: 13px; margin-bottom: 2px;">
            ${props.name || 'Village Settlement'}
          </div>
          <div style="color: #94A3B8; font-size: 11px; margin-bottom: 6px;">
            Settlement Type: <span style="color: #E2E8F0; text-transform: capitalize;">${props.type || 'Village'}</span>
          </div>
          <div style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 10px; border: 1px solid ${
            isAffected ? '#F59E0B' : '#64748B'
          }; background: ${isAffected ? 'rgba(245,158,11,0.2)' : 'rgba(100,116,139,0.2)'}; color: ${
            isAffected ? '#FDE68A' : '#CBD5E1'
          };">
            ${isAffected ? '⚠️ Inundation Intersecting Settlement' : 'No Direct Footprint Intersection'}
          </div>
        </div>
      `)
      .addTo(mapInst);
  };

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLES[basemap],
      center: [76.45, 9.45],
      zoom: 11,
      maxZoom: 18,
      pitch: 0
    });

    mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    mapInstance.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    // Error logging without leaking credentials
    mapInstance.on('error', (e: any) => {
      const err = e?.error;
      if (err?.status === 401 || err?.status === 403) {
        console.warn(`[MapLibre] Tile request authentication error (${err.status}) on URL:`, err.url?.split('?')[0]);
      }
    });

    // Style load event fires on initial load and on every setStyle() call
    mapInstance.on('style.load', () => {
      setupVectorLayers(mapInstance);
    });

    mapInstance.on('load', () => {
      mapInstance.resize();
      setupVectorLayers(mapInstance);

      // If route response is already present, set it on load
      const current = dataRef.current;
      if (current.routeResponse && current.routeResponse.geometry && current.routeResponse.status === 'candidate_route') {
        const src = mapInstance.getSource('candidate-route-src') as maplibregl.GeoJSONSource;
        if (src) {
          src.setData({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: current.routeResponse.geometry }]
          });
        }
      }

      // Fit AOI initially
      mapInstance.fitBounds(
        [[AOI_BOUNDS[0], AOI_BOUNDS[1]], [AOI_BOUNDS[2], AOI_BOUNDS[3]]],
        { padding: 80, duration: 800 }
      );
    });

    // Global map click handler: handles facility/settlement clicks or coordinate selection
    mapInstance.on('click', (e: any) => {
      // If user is actively picking origin/destination coordinates
      if (selectionModeRef.current !== 'none') {
        onMapClickCoordRef.current({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
        return;
      }

      // Check for facilities layer hit
      if (mapInstance.getLayer('facilities-layer')) {
        const facilities = mapInstance.queryRenderedFeatures(e.point, { layers: ['facilities-layer'] });
        if (facilities.length > 0) {
          showFacilityPopup(mapInstance, facilities[0]);
          return;
        }
      }

      // Check for settlements layer hit
      if (mapInstance.getLayer('settlements-layer')) {
        const settlements = mapInstance.queryRenderedFeatures(e.point, { layers: ['settlements-layer'] });
        if (settlements.length > 0) {
          showSettlementPopup(mapInstance, settlements[0]);
          return;
        }
      }

      // Default map coordinate click
      onMapClickCoordRef.current({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
    });

    // Pointer hover states for interactive layers
    mapInstance.on('mousemove', (e: any) => {
      if (selectionModeRef.current !== 'none') {
        mapInstance.getCanvas().style.cursor = 'crosshair';
        return;
      }
      const interactiveLayers = ['facilities-layer', 'settlements-layer'].filter((id) => mapInstance.getLayer(id));
      if (interactiveLayers.length > 0) {
        const features = mapInstance.queryRenderedFeatures(e.point, { layers: interactiveLayers });
        mapInstance.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';
      } else {
        mapInstance.getCanvas().style.cursor = '';
      }
    });

    const onResize = () => mapInstance.resize();
    window.addEventListener('resize', onResize);

    map.current = mapInstance;

    return () => {
      window.removeEventListener('resize', onResize);
      mapInstance.remove();
      map.current = null;
    };
  }, []);

  // Basemap switching: preserve viewport camera, set vector style, and restore layers on style.load
  useEffect(() => {
    if (!map.current) return;
    if (activeBasemapRef.current === basemap) return;

    activeBasemapRef.current = basemap;

    // Preserve camera position and zoom
    const center = map.current.getCenter();
    const zoom = map.current.getZoom();
    const pitch = map.current.getPitch();
    const bearing = map.current.getBearing();

    // Switch to target basemap style
    map.current.setStyle(BASEMAP_STYLES[basemap]);

    // Once the new style finishes loading, restore camera and re-add vector layers
    map.current.once('style.load', () => {
      if (!map.current) return;
      map.current.setCenter(center);
      map.current.setZoom(zoom);
      map.current.setPitch(pitch);
      map.current.setBearing(bearing);
      setupVectorLayers(map.current);
    });
  }, [basemap]);

  // Update Data Sources
  useEffect(() => {
    if (!map.current) return;

    if (floodGeoJSON) {
      const src = map.current.getSource('flood-extent-src') as maplibregl.GeoJSONSource;
      if (src) src.setData(floodGeoJSON);
    }
    if (roadsGeoJSON) {
      const src = map.current.getSource('affected-roads-src') as maplibregl.GeoJSONSource;
      if (src) src.setData(roadsGeoJSON);
    }
    if (roadNetworkGeoJSON) {
      const src = map.current.getSource('road-network-src') as maplibregl.GeoJSONSource;
      if (src) src.setData(roadNetworkGeoJSON);
    }
    if (facilitiesGeoJSON) {
      const src = map.current.getSource('facilities-src') as maplibregl.GeoJSONSource;
      if (src) src.setData(facilitiesGeoJSON);
    }
    if (settlementsGeoJSON) {
      const src = map.current.getSource('settlements-src') as maplibregl.GeoJSONSource;
      if (src) src.setData(settlementsGeoJSON);
    }
  }, [floodGeoJSON, roadsGeoJSON, roadNetworkGeoJSON, facilitiesGeoJSON, settlementsGeoJSON]);

  // Update Route Geometry & fit bounds when calculated
  useEffect(() => {
    if (!map.current) return;
    const src = map.current.getSource('candidate-route-src') as maplibregl.GeoJSONSource;
    if (src) {
      if (routeResponse && routeResponse.geometry && routeResponse.status === 'candidate_route') {
        const coords = routeResponse.geometry.coordinates;
        src.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: routeResponse.geometry
            }
          ]
        });

        // Auto-fit bounds to the calculated route
        if (coords && coords.length > 1) {
          let minX = coords[0][0], minY = coords[0][1], maxX = coords[0][0], maxY = coords[0][1];
          for (const pt of coords) {
            if (pt[0] < minX) minX = pt[0];
            if (pt[0] > maxX) maxX = pt[0];
            if (pt[1] < minY) minY = pt[1];
            if (pt[1] > maxY) maxY = pt[1];
          }
          map.current.fitBounds([[minX, minY], [maxX, maxY]], { padding: 90, duration: 800 });
        }
      } else {
        src.setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [routeResponse]);

  // Update Layer Visibilities
  useEffect(() => {
    if (!map.current) return;
    setLayerVisibility('road-network-layer', layers.normalRoads !== false);
    setLayerVisibility('flood-extent-fill', layers.floodExtent);
    setLayerVisibility('flood-extent-stroke', layers.floodExtent);
    setLayerVisibility('affected-roads-layer', layers.affectedRoads);
    setLayerVisibility('facilities-layer', layers.facilities);
    setLayerVisibility('settlements-layer', layers.settlements);
    setLayerVisibility('candidate-route-casing', layers.candidateRoute !== false);
    setLayerVisibility('candidate-route-glow', layers.candidateRoute !== false);
    setLayerVisibility('candidate-route-line', layers.candidateRoute !== false);
  }, [layers]);

  // Update Origin / Destination Markers ONLY when explicitly set
  useEffect(() => {
    if (!map.current) return;

    // Origin Marker
    if (origin) {
      if (!originMarker.current) {
        const el = document.createElement('div');
        el.className = 'w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_14px_rgba(6,182,212,1)] animate-pulse cursor-pointer';
        el.title = 'Route Origin (Departure)';
        originMarker.current = new maplibregl.Marker({ element: el })
          .setLngLat([origin.longitude, origin.latitude])
          .addTo(map.current);
      } else {
        originMarker.current.setLngLat([origin.longitude, origin.latitude]);
      }
    } else if (originMarker.current) {
      originMarker.current.remove();
      originMarker.current = null;
    }

    // Destination Marker
    if (destination) {
      if (!destMarker.current) {
        const el = document.createElement('div');
        el.className = 'w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_14px_rgba(16,185,129,1)] animate-pulse cursor-pointer';
        el.title = 'Route Destination (Arrival)';
        destMarker.current = new maplibregl.Marker({ element: el })
          .setLngLat([destination.longitude, destination.latitude])
          .addTo(map.current);
      } else {
        destMarker.current.setLngLat([destination.longitude, destination.latitude]);
      }
    } else if (destMarker.current) {
      destMarker.current.remove();
      destMarker.current = null;
    }
  }, [origin, destination]);

  // Trigger Fit AOI
  useEffect(() => {
    if (map.current && fitAoiTrigger > 0) {
      map.current.fitBounds(
        [[AOI_BOUNDS[0], AOI_BOUNDS[1]], [AOI_BOUNDS[2], AOI_BOUNDS[3]]],
        { padding: 80, duration: 1000 }
      );
    }
  }, [fitAoiTrigger]);

  // Trigger Reset View
  useEffect(() => {
    if (map.current && resetViewTrigger > 0) {
      map.current.flyTo({
        center: [76.45, 9.45],
        zoom: 11,
        pitch: 0,
        duration: 1000
      });
    }
  }, [resetViewTrigger]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div
        ref={mapContainer}
        style={{ width: '100%', height: '100%' }}
        className={selectionMode !== 'none' ? 'cursor-crosshair' : 'cursor-default'}
      />

      {/* Basemap Switcher */}
      <div className="absolute top-4 right-4 z-20 flex bg-[#070D18]/90 backdrop-blur-md border border-[#1E2D4A] rounded-xl p-1 space-x-1 shadow-2xl">
        <button
          onClick={() => setBasemap('satellite')}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
            basemap === 'satellite'
              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm shadow-cyan-950'
              : 'text-slate-400 hover:text-white border border-transparent'
          }`}
          title="Esri World Satellite Imagery"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Satellite</span>
        </button>
        <button
          onClick={() => setBasemap('dark')}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
            basemap === 'dark'
              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm shadow-cyan-950'
              : 'text-slate-400 hover:text-white border border-transparent'
          }`}
          title="OpenFreeMap Dark Vector Basemap (Zero Key Dependency)"
        >
          <Moon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dark</span>
        </button>
        <button
          onClick={() => setBasemap('streets')}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
            basemap === 'streets'
              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm shadow-cyan-950'
              : 'text-slate-400 hover:text-white border border-transparent'
          }`}
          title="OpenFreeMap Liberty Vector Streets Basemap (Full Road Names & Labels)"
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Streets</span>
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-6 right-16 z-20 hidden md:flex items-center space-x-4 px-3.5 py-1.5 bg-[#070D18]/90 backdrop-blur-md border border-[#1E2D4A] rounded-xl text-[11px] text-slate-300 shadow-xl pointer-events-auto">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <span>SAR Inundation</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-1 rounded bg-slate-400" />
          <span>Road Network</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-1 rounded bg-orange-400" />
          <span>Flooded Road</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-1 rounded bg-emerald-400" />
          <span>Candidate Route</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Facility</span>
        </div>
      </div>

      {/* Interactive Coordinate Picker Banner */}
      {selectionMode !== 'none' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-[#0D1626]/95 text-cyan-300 border border-cyan-500 rounded-full shadow-2xl text-xs font-semibold flex items-center space-x-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>
            Click on map to position {selectionMode === 'origin' ? 'Origin Point' : 'Destination Point'}
          </span>
        </div>
      )}
    </div>
  );
};

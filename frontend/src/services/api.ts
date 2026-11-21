import type { OverviewResponse, FloodMetadataResponse, RouteRequest, RouteResponse } from '../types/api';
import type { FeatureCollection } from 'geojson';
import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  } catch {
    return {};
  }
}

export async function fetchHealth(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchOverview(eventId: string = 'kerala-2018-demo'): Promise<OverviewResponse> {
  const res = await fetch(`${API_BASE}/api/overview?event_id=${eventId}`);
  if (!res.ok) throw new Error('Failed to fetch overview metrics');
  return res.json();
}

export async function fetchFloodExtent(eventId: string = 'kerala-2018-demo'): Promise<FeatureCollection> {
  const res = await fetch(`${API_BASE}/api/flood/extent?event_id=${eventId}`);
  if (!res.ok) throw new Error('Failed to fetch flood extent GeoJSON');
  return res.json();
}

export async function fetchFloodMetadata(eventId: string = 'kerala-2018-demo'): Promise<FloodMetadataResponse> {
  const res = await fetch(`${API_BASE}/api/flood/metadata?event_id=${eventId}`);
  if (!res.ok) throw new Error('Failed to fetch flood metadata');
  return res.json();
}

export async function fetchAffectedRoads(eventId: string = 'kerala-2018-demo'): Promise<FeatureCollection> {
  const res = await fetch(`${API_BASE}/api/impact/roads?event_id=${eventId}`);
  if (!res.ok) throw new Error('Failed to fetch affected roads');
  return res.json();
}

export async function fetchRoadNetwork(eventId: string = 'kerala-2018-demo'): Promise<FeatureCollection> {
  const res = await fetch(`${API_BASE}/api/impact/roads/network?event_id=${eventId}`);
  if (!res.ok) throw new Error('Failed to fetch road network');
  return res.json();
}

export async function fetchFacilities(eventId: string = 'kerala-2018-demo'): Promise<FeatureCollection> {
  const res = await fetch(`${API_BASE}/api/facilities?event_id=${eventId}`);
  if (!res.ok) throw new Error('Failed to fetch facilities');
  return res.json();
}

export async function fetchSettlements(eventId: string = 'kerala-2018-demo'): Promise<FeatureCollection> {
  const res = await fetch(`${API_BASE}/api/impact/settlements?event_id=${eventId}`);
  if (!res.ok) throw new Error('Failed to fetch settlements');
  return res.json();
}

export async function computeCandidateRoute(req: RouteRequest): Promise<RouteResponse> {
  const res = await fetch(`${API_BASE}/api/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Route calculation failed');
  }
  return res.json();
}

export async function fetchMonitoringRegions(search?: string): Promise<any> {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`${API_BASE}/api/monitoring/regions${q}`);
  if (!res.ok) throw new Error('Failed to fetch monitoring regions');
  return res.json();
}

export async function fetchLiveOverview(regionId?: string): Promise<any> {
  const q = regionId ? `?region=${encodeURIComponent(regionId)}` : '';
  const res = await fetch(`${API_BASE}/api/monitoring/overview${q}`);
  if (!res.ok) {
    // Fallback to legacy live endpoint if monitoring router not yet synced
    const fallbackRes = await fetch(`${API_BASE}/api/live/overview${q}`);
    if (!fallbackRes.ok) throw new Error('Failed to fetch live environmental telemetry');
    return fallbackRes.json();
  }
  return res.json();
}

export async function fetchMonitoringOverview(regionId?: string): Promise<any> {
  const q = regionId ? `?region=${encodeURIComponent(regionId)}` : '';
  const res = await fetch(`${API_BASE}/api/monitoring/overview${q}`);
  if (!res.ok) throw new Error('Failed to fetch monitoring telemetry');
  return res.json();
}

export async function fetchMonitoringStations(regionId?: string): Promise<any> {
  const q = regionId ? `?region=${encodeURIComponent(regionId)}` : '';
  const res = await fetch(`${API_BASE}/api/monitoring/stations${q}`);
  if (!res.ok) throw new Error('Failed to fetch river stations');
  return res.json();
}

export async function fetchAuthMe(): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { ...authHeaders, 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Authentication check failed');
  }
  return res.json();
}

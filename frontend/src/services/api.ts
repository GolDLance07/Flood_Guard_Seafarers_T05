import type {
  OverviewResponse,
  FloodMetadataResponse,
  RouteRequest,
  RouteResponse,
  IncidentSummary,
  IncidentDetail,
  IncidentCluster,
  DispatchRecommendation,
  ResponderTeam,
  ResponderTask,
  SatelliteJob,
  RiskAssessmentData,
  EvacuationRouteResult,
  NotificationItem
} from '../types/api';
import type {
  SheltersResponse,
  IncidentReportPayload,
  IncidentSubmissionResult,
  IncidentTrackingItem,
  CitizenOverviewData
} from '../types/citizen';
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

// ------------------------------------------------------------------------------
// Citizen Public Safety API Functions
// ------------------------------------------------------------------------------

export async function fetchCitizenOverview(regionId?: string): Promise<CitizenOverviewData> {
  const q = regionId ? `?region=${encodeURIComponent(regionId)}` : '';
  const res = await fetch(`${API_BASE}/api/citizen/overview${q}`);
  if (!res.ok) throw new Error('Failed to fetch citizen safety overview');
  return res.json();
}

export async function fetchCitizenShelters(regionId?: string): Promise<SheltersResponse> {
  const q = regionId ? `?region=${encodeURIComponent(regionId)}` : '';
  const res = await fetch(`${API_BASE}/api/citizen/shelters${q}`);
  if (!res.ok) throw new Error('Failed to fetch emergency shelter registry');
  return res.json();
}

export async function submitCitizenIncident(payload: IncidentReportPayload): Promise<IncidentSubmissionResult> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/citizen/incidents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.detail?.error?.message || 'Report submission failed');
  }
  return res.json();
}

export async function fetchIncidentStatus(trackingNumber: string): Promise<IncidentTrackingItem> {
  const res = await fetch(`${API_BASE}/api/citizen/incidents/${encodeURIComponent(trackingNumber)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Tracking report not found');
  }
  return res.json();
}

export async function fetchMyReports(trackingNumbers: string[]): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const query = trackingNumbers.map(t => `tracking_numbers=${encodeURIComponent(t)}`).join('&');
  const res = await fetch(`${API_BASE}/api/citizen/incidents/my-reports${query ? `?${query}` : ''}`, {
    method: 'POST',
    headers: {
      ...authHeaders
    }
  });
  if (!res.ok) throw new Error('Failed to fetch report history');
  return res.json();
}

export async function uploadCitizenEvidence(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/citizen/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.detail?.error?.message || 'Image upload validation failed');
  }
  return res.json();
}

// ------------------------------------------------------------------------------
// Unified Intelligence, Command Triage & Responder Operations
// ------------------------------------------------------------------------------

export async function fetchCommandIncidents(params?: {
  status?: string;
  severity?: string;
  region?: string;
  search?: string;
}): Promise<IncidentSummary[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.severity) query.append('severity', params.severity);
  if (params?.region) query.append('region', params.region);
  if (params?.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE}/api/command/incidents?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch command incident queue');
  return res.json();
}

export async function fetchIncidentClusters(
  region?: string,
  radiusMeters: number = 1500
): Promise<{ status: string; cluster_count: number; clusters: IncidentCluster[] }> {
  const query = new URLSearchParams();
  if (region) query.append('region', region);
  query.append('radius_meters', radiusMeters.toString());

  const res = await fetch(`${API_BASE}/api/command/incidents/clusters?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch incident hotspot clusters');
  return res.json();
}

export async function fetchIncidentDetail(incidentId: string): Promise<IncidentDetail> {
  const res = await fetch(`${API_BASE}/api/command/incidents/${encodeURIComponent(incidentId)}`);
  if (!res.ok) throw new Error(`Incident '${incidentId}' not found`);
  return res.json();
}

export async function updateIncidentStatus(
  incidentId: string,
  payload: { new_status: string; reason?: string; public_note?: string; internal_note?: string }
): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/command/incidents/${encodeURIComponent(incidentId)}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Actor-Role': 'district_authority',
      ...authHeaders
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.detail?.error?.message || 'Status transition failed');
  }
  return res.json();
}

export async function verifyIncident(
  incidentId: string,
  payload: { decision: 'confirmed' | 'rejected' | 'duplicate'; confidence_score?: number; verification_notes?: string; public_note?: string }
): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/command/incidents/${encodeURIComponent(incidentId)}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Actor-Role': 'district_authority',
      ...authHeaders
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.detail?.error?.message || 'Verification update failed');
  }
  return res.json();
}

export async function assignIncidentTeam(
  incidentId: string,
  payload: { team_id: string; priority?: string; assignment_notes?: string }
): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/command/incidents/${encodeURIComponent(incidentId)}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Actor-Role': 'district_authority',
      ...authHeaders
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.detail?.error?.message || 'Assignment failed');
  }
  return res.json();
}

export async function fetchDispatchRecommendations(
  incidentId: string,
  limit: number = 5
): Promise<{ status: string; incident_id: string; top_recommendations: DispatchRecommendation[] }> {
  const res = await fetch(`${API_BASE}/api/command/incidents/${encodeURIComponent(incidentId)}/dispatch-recommendations?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to retrieve dispatch recommendations');
  return res.json();
}

export async function fetchResponderTeams(region?: string, status?: string): Promise<ResponderTeam[]> {
  const query = new URLSearchParams();
  if (region) query.append('region', region);
  if (status) query.append('status', status);

  const res = await fetch(`${API_BASE}/api/responder/teams?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch responder teams');
  return res.json();
}

export async function fetchResponderTasks(teamId: string): Promise<ResponderTask[]> {
  const res = await fetch(`${API_BASE}/api/responder/my-tasks?team_id=${encodeURIComponent(teamId)}`);
  if (!res.ok) throw new Error('Failed to fetch responder tasks');
  return res.json();
}

export async function respondToTask(
  assignmentId: string,
  payload: { team_id: string; decision: 'ACCEPTED' | 'DECLINED'; decline_reason?: string }
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/responder/assignments/${encodeURIComponent(assignmentId)}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Task response failed');
  }
  return res.json();
}

export async function updateTaskLifecycle(
  assignmentId: string,
  payload: { team_id: string; status: 'EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED'; notes?: string }
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/responder/assignments/${encodeURIComponent(assignmentId)}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Task status update failed');
  }
  return res.json();
}

export async function sendResponderLocation(payload: {
  team_id: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed_kmh?: number;
  is_sharing_active: boolean;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/responder/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Location telemetry upload failed');
  return res.json();
}

export async function fetchActiveResponderLocations(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/responder/locations`);
  if (!res.ok) throw new Error('Failed to fetch responder telemetry');
  return res.json();
}

export async function fetchSatelliteJobs(region?: string): Promise<SatelliteJob[]> {
  const query = region ? `?region=${encodeURIComponent(region)}` : '';
  const res = await fetch(`${API_BASE}/api/satellite/jobs${query}`);
  if (!res.ok) throw new Error('Failed to fetch satellite jobs');
  return res.json();
}

export async function triggerSatelliteJob(sceneId: string, regionSlug: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/satellite/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scene_id: sceneId, region_slug: regionSlug })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to trigger satellite analysis job');
  }
  return res.json();
}

export async function fetchSatelliteJobExtent(jobId: string): Promise<FeatureCollection> {
  const res = await fetch(`${API_BASE}/api/satellite/jobs/${encodeURIComponent(jobId)}/extent`);
  if (!res.ok) throw new Error('Failed to fetch derived satellite extent GeoJSON');
  return res.json();
}

export async function fetchRiskAssessment(regionId?: string): Promise<RiskAssessmentData> {
  const query = regionId ? `?region=${encodeURIComponent(regionId)}` : '';
  const res = await fetch(`${API_BASE}/api/intelligence/risk-assessment${query}`);
  if (!res.ok) throw new Error('Failed to fetch regional disaster risk evaluation');
  return res.json();
}

export async function computeEvacuationRoute(
  origin: { latitude: number; longitude: number },
  regionSlug?: string,
  preferredShelterId?: string,
  travelMode: 'driving' | 'walking' = 'driving'
): Promise<EvacuationRouteResult> {
  const res = await fetch(`${API_BASE}/api/routes/evacuation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      region_slug: regionSlug,
      preferred_shelter_id: preferredShelterId,
      travel_mode: travelMode
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Evacuation route computation failed');
  }
  return res.json();
}

export async function fetchNotifications(region?: string): Promise<NotificationItem[]> {
  const query = region ? `?region=${encodeURIComponent(region)}` : '';
  const res = await fetch(`${API_BASE}/api/notifications${query}`);
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function markNotificationRead(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH'
  });
  if (!res.ok) throw new Error('Failed to mark notification read');
  return res.json();
}

export async function broadcastAlert(payload: {
  title: string;
  message: string;
  severity?: string;
  category?: string;
  region_slug?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/notifications/broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Actor-Role': 'district_authority'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Emergency broadcast failed');
  }
  return res.json();
}

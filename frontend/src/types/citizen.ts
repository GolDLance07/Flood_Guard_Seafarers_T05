export type CitizenTab = 'overview' | 'map' | 'shelters' | 'report' | 'activity';
export type AppMode = 'citizen' | 'command';

export interface ShelterItem {
  id: string;
  region_id: string;
  name: string;
  facility_type: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  capacity?: number | null;
  current_occupancy?: number | null;
  operational_status: 'ACTIVE' | 'STANDBY' | 'FULL' | 'CLOSED';
  official_source: string;
  last_verified_at: string;
  contact_phone?: string | null;
  amenities: string[];
  is_demo_data: boolean;
  distance_km?: number | null;
}

export interface SheltersResponse {
  status: string;
  region_id: string;
  region_name: string;
  total_shelters: number;
  shelters: ShelterItem[];
  has_verified_data: boolean;
  data_provenance: string;
  notice?: string | null;
  data_requirements_notice?: string | null;
}

export type IncidentCategory =
  | 'waterlogging'
  | 'flooded_road'
  | 'stranded_citizens'
  | 'infrastructure_damage'
  | 'medical_emergency'
  | 'shelter_need'
  | 'other';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IncidentReportPayload {
  category: IncidentCategory;
  severity: IncidentSeverity;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  affected_people_count?: number;
  contact_phone?: string;
  image_url?: string;
  region_slug?: string;
}

export interface IncidentSubmissionResult {
  status: string;
  incident_id: string;
  tracking_number: string;
  submission_status: 'SUBMITTED_UNVERIFIED' | 'IN_REVIEW' | 'VERIFIED' | 'RESOLVED' | 'REJECTED';
  verification_status: string;
  submitted_at: string;
  category: string;
  severity: string;
  title: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string | null;
  };
  safety_disclaimer: string;
}

export type IncidentSubmissionResponse = IncidentSubmissionResult;

export interface IncidentStatusQueryResponse {
  tracking_number: string;
  incident_id: string;
  category: string;
  severity: string;
  title: string;
  verification_status: string;
  public_status_note?: string;
  created_at: string;
  verified_at?: string;
}

export interface IncidentTrackingItem {
  tracking_number: string;
  incident_id: string;
  submission_status: string;
  verification_status: string;
  submitted_at: string;
  category: string;
  severity: string;
  title: string;
  description?: string | null;
  location: {
    latitude: number;
    longitude: number;
    address?: string | null;
  };
  verification_notes?: string | null;
  is_verified: boolean;
}

export interface CitizenOverviewData {
  status: string;
  region: {
    id: string;
    name: string;
    state: string;
    country: string;
    district: string;
    center: [number, number];
    aoi_bbox: [number, number, number, number];
    zoom: number;
  };
  timestamp: string;
  environmental_readiness: {
    level: string;
    badge: string;
    summary: string;
    data_sufficiency: string;
    scientific_disclaimer?: string;
  };
  official_alerts: {
    active_count: number;
    alerts: Array<{
      identifier?: string;
      sender?: string;
      headline?: string;
      severity?: string;
      sent_timestamp?: string;
      area_description?: string;
      source?: string;
    }>;
    source: string;
    freshness: string;
    coverage_status: string;
    notice?: string | null;
  };
  observations: {
    temperature_c?: number | null;
    condition: string;
    rainfall_24h_mm?: number | null;
    weather_freshness: string;
    weather_provider: string;
    river_discharge_m3_s?: number | null;
    river_flow_status: string;
    river_freshness: string;
  };
  shelters_summary: {
    has_verified_data: boolean;
    total_shelters: number;
    active_shelters: number;
    notice?: string | null;
    data_requirements_notice?: string | null;
  };
  safety_advisory: string;
}

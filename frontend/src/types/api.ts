export interface AOI {
  name: string;
  bbox: [number, number, number, number]; // [min_lon, min_lat, max_lon, max_lat]
  center: [number, number];
}

export interface KPIs {
  flooded_area_ha: number;
  flooded_area_km2: number;
  estimated_exposed_population: number;
  affected_roads_km: number;
  affected_road_segments: number;
  affected_settlements: number;
  total_facilities: number;
  facilities_exposed: number;
  hospitals_exposed?: number;
}

export interface ProvenanceItem {
  source: string;
  date?: string;
  year?: number;
  extraction_date?: string;
  method: string;
}

export interface OverviewResponse {
  event_id: string;
  generated_at: string;
  aoi: AOI;
  kpis: KPIs;
  provenance: {
    flooded_area: ProvenanceItem;
    population_exposure: ProvenanceItem;
    roads_and_infrastructure: ProvenanceItem;
  };
  layer_readiness: {
    flood_extent: string;
    affected_roads: string;
    facilities: string;
    settlements: string;
    candidate_routing: string;
  };
}

export interface FloodMetadataResponse {
  event_id: string;
  event_name: string;
  aoi: {
    name: string;
    bbox: [number, number, number, number];
    crs: string;
    utm_crs: string;
  };
  event_scene: {
    id: string;
    copernicus_cog_id: string;
    date: string;
    polarisation: string;
    pass: string;
    relative_orbit: number;
  };
  baseline_scene: {
    id: string;
    copernicus_cog_id: string;
    date: string;
    polarisation: string;
    pass: string;
    relative_orbit: number;
  };
  methodology: {
    detection: string;
    permanent_water_treatment: string;
    area_calculation_method: string;
    total_flooded_area_ha: number;
    total_flooded_area_km2: number;
    limitations: string[];
  };
}

export interface RouteCoordinate {
  longitude: number;
  latitude: number;
}

export interface RouteRequest {
  event_id?: string;
  origin: RouteCoordinate;
  destination: RouteCoordinate;
}

export interface RouteResponse {
  status: "candidate_route" | "no_route_found" | "service_unavailable";
  distance_km: number | null;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  } | null;
  method: string;
  warnings: string[];
}

export interface LiveWeather {
  temperature_c: number;
  apparent_temperature_c: number;
  relative_humidity_pct: number;
  precipitation_rate_mm_hr: number;
  precipitation_sum_24h_mm: number;
  wind_speed_kmh: number;
  condition: string;
  source: string;
  status: string;
}

export interface LiveHydrology {
  basin_name: string;
  current_discharge_m3_s: number;
  median_discharge_m3_s: number;
  flow_status: string;
  trend_7day: {
    date: string;
    discharge_m3_s: number | null;
    median_baseline_m3_s: number | null;
  }[];
  source: string;
  status: string;
}

export interface LiveSatelliteTracking {
  constellation: string;
  sensor: string;
  nominal_relative_orbit: number;
  pass_direction: string;
  repeat_cycle_days: number;
  last_scheduled_pass: string;
  next_scheduled_pass: string;
  satellite_operational_state: string;
  observation_mode: string;
  polarisation: string;
  source: string;
}

export interface CWCStation {
  station_id: string;
  name: string;
  river: string;
  basin: string;
  district?: string;
  coordinates: [number, number]; // [lon, lat]
  warning_level_m: number;
  danger_level_m: number;
  hfl_m: number;
  hfl_date?: string;
  proximity_km?: number;
  relevance?: string;
  upstream_gateway_status?: string;
  note?: string;
}

export interface NDMAAlert {
  identifier: string;
  sender: string;
  disaster_type: string;
  severity: string;
  headline: string;
  area_description: string;
  sent_timestamp: string;
  source: string;
  status: string;
}

export interface SentinelAcquisition {
  product_id: string;
  product_name: string;
  satellite: string;
  sensor_mode: string;
  polarisation: string;
  acquisition_start: string;
  acquisition_end: string;
  catalogue_link: string;
  processing_status: string;
  pipeline_capability: string;
}

export interface MonitoringOverviewResponse {
  status: string;
  mode: string;
  timestamp: string;
  region: {
    name: string;
    center: [number, number];
    aoi_bbox: [number, number, number, number];
  };
  environmental_readiness: {
    level: string;
    badge: string;
    summary: string;
    methodology: string;
    scientific_disclaimer: string;
  };
  weather: {
    provider: string;
    observation_type: string;
    location: string;
    coordinates: [number, number];
    temperature_c: number | null;
    apparent_temperature_c?: number;
    relative_humidity_pct: number | null;
    wind_speed_kmh: number | null;
    condition: string;
    observation_timestamp: string;
    fetch_timestamp: string;
    source_reference: string;
    freshness_status: string;
    credentials_configured: boolean;
    upstream_status_note?: string;
  };
  rainfall: {
    provider: string;
    observation_type: string;
    district: string;
    state: string;
    rainfall_24h_mm: number | null;
    normal_rainfall_mm?: number;
    departure_pct?: number;
    observation_timestamp: string;
    fetch_timestamp: string;
    source_reference: string;
    freshness_status: string;
    credentials_configured: boolean;
    upstream_status_note?: string;
  };
  rivers: {
    provider: string;
    observation_type: string;
    basin_name: string;
    current_discharge_m3_s: number;
    median_discharge_m3_s: number;
    flow_status: string;
    trend_7day: {
      date: string;
      discharge_m3_s: number | null;
      median_baseline_m3_s: number | null;
    }[];
    stations: CWCStation[];
    freshness_status: string;
    source_reference: string;
  };
  alerts: {
    provider: string;
    observation_type: string;
    region: string;
    total_active_alerts_india: number;
    active_alerts_kerala: number;
    alerts: NDMAAlert[];
    freshness_status: string;
    source_reference: string;
  };
  satellites: {
    provider: string;
    observation_type: string;
    aoi_bbox: [number, number, number, number];
    target_relative_orbit: number;
    total_acquisitions_found: number;
    latest_product: SentinelAcquisition | null;
    acquisitions: SentinelAcquisition[];
    orbital_pass_schedule: {
      constellation: string;
      relative_orbit: number;
      pass_direction: string;
      repeat_cycle_days: number;
      last_scheduled_pass: string;
      next_scheduled_pass: string;
      swath_width_km?: number;
    };
    freshness_status: string;
    source_reference: string;
  };
  provider_status: Record<string, {
    name: string;
    status: string;
    endpoint?: string;
    credentials_required?: string;
    telemetry_note?: string;
  }>;
}

export interface LiveOverviewResponse {
  status: string;
  mode: string;
  region: {
    name: string;
    latitude: number;
    longitude: number;
    aoi_bbox: [number, number, number, number];
  };
  timestamp: string;
  data_freshness: string;
  environmental_alert: {
    level: string;
    badge: string;
    summary: string;
    disclaimer: string;
  };
  weather: LiveWeather;
  hydrology: LiveHydrology;
  satellite_tracking: LiveSatelliteTracking;
}

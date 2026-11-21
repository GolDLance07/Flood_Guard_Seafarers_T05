-- ==============================================================================
-- Seed Data: supabase/seed.sql
-- Description: Initial Regional Atlas for FloodGuard Telemetry Integration
-- Target: Supabase PostgreSQL
-- ==============================================================================

INSERT INTO public.regions (
    id,
    slug,
    name,
    state,
    country,
    district,
    latitude,
    longitude,
    aoi_bbox,
    zoom,
    cwc_basin,
    is_active
) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'kerala-alappuzha',
    'Alappuzha & Kuttanad Basin',
    'Kerala',
    'India',
    'Alappuzha',
    9.4950,
    76.3350,
    '[76.30, 9.30, 76.60, 9.60]'::jsonb,
    10.0,
    'Pamba & Manimala Basin',
    true
),
(
    'a0000000-0000-0000-0000-000000000002',
    'assam-guwahati',
    'Guwahati & Kamrup Corridor',
    'Assam',
    'India',
    'Kamrup Metropolitan',
    26.1445,
    91.7362,
    '[91.50, 26.00, 91.90, 26.30]'::jsonb,
    10.2,
    'Brahmaputra Basin',
    true
),
(
    'a0000000-0000-0000-0000-000000000003',
    'bihar-patna',
    'Patna Middle Ganga Plains',
    'Bihar',
    'India',
    'Patna',
    25.5941,
    85.1376,
    '[84.90, 25.45, 85.35, 25.75]'::jsonb,
    10.1,
    'Middle Ganga Basin',
    true
),
(
    'a0000000-0000-0000-0000-000000000004',
    'gujarat-ahmedabad',
    'Ahmedabad & Sabarmati Riverfront',
    'Gujarat',
    'India',
    'Ahmedabad',
    23.0225,
    72.5714,
    '[72.40, 22.90, 72.75, 23.15]'::jsonb,
    10.3,
    'Sabarmati Basin',
    true
),
(
    'a0000000-0000-0000-0000-000000000005',
    'odisha-cuttack',
    'Cuttack & Mahanadi Delta Bifurcation',
    'Odisha',
    'India',
    'Cuttack',
    20.4625,
    85.8830,
    '[85.70, 20.35, 86.05, 20.60]'::jsonb,
    10.2,
    'Mahanadi Delta Basin',
    true
),
(
    'a0000000-0000-0000-0000-000000000006',
    'maharashtra-mumbai',
    'Mumbai Metropolitan Coastal Zone',
    'Maharashtra',
    'India',
    'Mumbai City',
    19.0760,
    72.8777,
    '[72.75, 18.90, 73.00, 19.25]'::jsonb,
    10.5,
    'Mithi & Coastal Estuary Basin',
    true
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    aoi_bbox = EXCLUDED.aoi_bbox,
    cwc_basin = EXCLUDED.cwc_basin,
    updated_at = now();

-- ------------------------------------------------------------------------------
-- Seed Responder Teams
-- ------------------------------------------------------------------------------
INSERT INTO public.responder_teams (
    id,
    region_id,
    name,
    callsign,
    capabilities,
    operational_status,
    contact_phone,
    base_latitude,
    base_longitude,
    metadata
) VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Kerala NDRF 04 Battalion Alpha Unit',
    'NDRF-ALP-ALPHA',
    ARRAY['rescue', 'boat_ops', 'evacuation', 'medical']::TEXT[],
    'AVAILABLE',
    '+91-477-2238630',
    9.4981,
    76.3388,
    '{"boats": 4, "personnel": 18, "satellite_comms": true}'::jsonb
),
(
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Alappuzha Fire & Rescue Water Wing',
    'FRS-ALP-WATER-1',
    ARRAY['boat_ops', 'rescue', 'logistics']::TEXT[],
    'AVAILABLE',
    '101',
    9.4920,
    76.3260,
    '{"boats": 2, "personnel": 10, "diving_gear": true}'::jsonb
),
(
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000002',
    'Kamrup Metropolitan SDRF Quick Response',
    'SDRF-GHY-QR1',
    ARRAY['rescue', 'boat_ops', 'supply_delivery']::TEXT[],
    'AVAILABLE',
    '+91-361-2735622',
    26.1450,
    91.7370,
    '{"boats": 3, "personnel": 14}'::jsonb
),
(
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000003',
    'Patna Civil Defense Medical Triage Unit',
    'MED-PAT-TRIAGE',
    ARRAY['medical', 'evacuation', 'relief_distribution']::TEXT[],
    'AVAILABLE',
    '+91-612-2217636',
    25.5940,
    85.1380,
    '{"ambulances": 3, "paramedics": 8}'::jsonb
),
(
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000004',
    'Ahmedabad Municipal Rapid Drainage Wing',
    'AMC-AHM-RAPID',
    ARRAY['infrastructure_inspection', 'logistics', 'rescue']::TEXT[],
    'AVAILABLE',
    '+91-79-25391811',
    23.0220,
    72.5710,
    '{"pumps": 8, "heavy_vehicles": 4}'::jsonb
)
ON CONFLICT (callsign) DO UPDATE SET
    name = EXCLUDED.name,
    capabilities = EXCLUDED.capabilities,
    operational_status = EXCLUDED.operational_status,
    contact_phone = EXCLUDED.contact_phone,
    base_latitude = EXCLUDED.base_latitude,
    base_longitude = EXCLUDED.base_longitude,
    metadata = EXCLUDED.metadata,
    updated_at = now();

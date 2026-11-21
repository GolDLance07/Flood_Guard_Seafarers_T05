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

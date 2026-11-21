-- ==============================================================================
-- Migration: 20261122000001_initial_schema.sql
-- Description: Core Schema for FloodGuard Persistent Telemetry & Incident Management
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Helper Function: Automatic updated_at Timestamp
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 2. Profiles Table (Linked to auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'field_team', 'district_authority', 'administrator')),
    full_name TEXT,
    phone_number TEXT,
    district TEXT,
    state TEXT DEFAULT 'Kerala',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_district ON public.profiles(district);

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 3. Regions Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'India',
    district TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    aoi_bbox JSONB NOT NULL, -- [min_lon, min_lat, max_lon, max_lat]
    zoom DOUBLE PRECISION DEFAULT 10.0,
    cwc_basin TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regions_slug ON public.regions(slug);
CREATE INDEX IF NOT EXISTS idx_regions_state ON public.regions(state);
CREATE INDEX IF NOT EXISTS idx_regions_active ON public.regions(is_active);

CREATE TRIGGER set_regions_updated_at
    BEFORE UPDATE ON public.regions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 4. Incidents Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    region_id UUID REFERENCES public.regions(id) ON DELETE RESTRICT,
    category TEXT NOT NULL CHECK (category IN (
        'flood_inundation',
        'water_level_rise',
        'stranded_citizens',
        'road_blockage',
        'bridge_submerged',
        'infrastructure_damage',
        'medical_emergency',
        'shelter_need',
        'other'
    )),
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified', 'in_progress', 'resolved', 'rejected', 'archived')),
    title TEXT NOT NULL,
    description TEXT,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lon DOUBLE PRECISION NOT NULL,
    address TEXT,
    affected_people_count INTEGER DEFAULT 0 CHECK (affected_people_count >= 0),
    evidence_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_reporter ON public.incidents(reporter_id);
CREATE INDEX IF NOT EXISTS idx_incidents_region ON public.incidents(region_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON public.incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_lat_lon ON public.incidents(location_lat, location_lon);

CREATE TRIGGER set_incidents_updated_at
    BEFORE UPDATE ON public.incidents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. Incident Verifications Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    verified_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    verification_status TEXT NOT NULL CHECK (verification_status IN ('confirmed', 'refuted', 'duplicate', 'needs_more_info')),
    verification_notes TEXT,
    confidence_score DOUBLE PRECISION CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_verifications_incident ON public.incident_verifications(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_verifications_verified_by ON public.incident_verifications(verified_by);

-- ------------------------------------------------------------------------------
-- 6. Shelters Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shelters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID REFERENCES public.regions(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    facility_type TEXT DEFAULT 'relief_camp',
    location_lat DOUBLE PRECISION NOT NULL,
    location_lon DOUBLE PRECISION NOT NULL,
    address TEXT,
    capacity INTEGER NOT NULL DEFAULT 100 CHECK (capacity > 0),
    current_occupancy INTEGER NOT NULL DEFAULT 0 CHECK (current_occupancy >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'full', 'standby', 'closed')),
    contact_name TEXT,
    contact_phone TEXT,
    amenities TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shelters_region ON public.shelters(region_id);
CREATE INDEX IF NOT EXISTS idx_shelters_status ON public.shelters(status);
CREATE INDEX IF NOT EXISTS idx_shelters_lat_lon ON public.shelters(location_lat, location_lon);

CREATE TRIGGER set_shelters_updated_at
    BEFORE UPDATE ON public.shelters
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 7. Response Tasks Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.response_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK (task_type IN (
        'rescue',
        'evacuation',
        'supply_delivery',
        'medical_aid',
        'route_clearance',
        'damage_assessment',
        'shelter_transfer'
    )),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    location_lat DOUBLE PRECISION,
    location_lon DOUBLE PRECISION,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_response_tasks_incident ON public.response_tasks(incident_id);
CREATE INDEX IF NOT EXISTS idx_response_tasks_assigned_to ON public.response_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_response_tasks_status ON public.response_tasks(status);
CREATE INDEX IF NOT EXISTS idx_response_tasks_priority ON public.response_tasks(priority);

CREATE TRIGGER set_response_tasks_updated_at
    BEFORE UPDATE ON public.response_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 8. Saved Locations Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    alert_enabled BOOLEAN NOT NULL DEFAULT true,
    radius_km DOUBLE PRECISION DEFAULT 5.0 CHECK (radius_km > 0),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_locations_user ON public.saved_locations(user_id);

CREATE TRIGGER set_saved_locations_updated_at
    BEFORE UPDATE ON public.saved_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 9. Audit Logs Table (Append-Only)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

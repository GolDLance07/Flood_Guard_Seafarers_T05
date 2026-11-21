-- ==============================================================================
-- Migration: 20261122000004_unified_platform.sql
-- Description: Unified Disaster Intelligence, Responder Operations, Satellite Pipeline & Dispatch
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Extend Incidents Table with Tracking Number, Public Notes & Duplicate Links
-- ------------------------------------------------------------------------------
ALTER TABLE public.incidents
    ADD COLUMN IF NOT EXISTS tracking_number TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS public_status_note TEXT,
    ADD COLUMN IF NOT EXISTS duplicate_of_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_team_id UUID;

CREATE INDEX IF NOT EXISTS idx_incidents_tracking ON public.incidents(tracking_number);
CREATE INDEX IF NOT EXISTS idx_incidents_duplicate_of ON public.incidents(duplicate_of_id);

-- ------------------------------------------------------------------------------
-- 2. Responder Teams Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.responder_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID REFERENCES public.regions(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    callsign TEXT UNIQUE NOT NULL,
    capabilities TEXT[] NOT NULL DEFAULT ARRAY['rescue']::TEXT[],
    operational_status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (operational_status IN (
        'AVAILABLE', 'DISPATCHED', 'ON_SCENE', 'STANDBY', 'OFFLINE'
    )),
    contact_phone TEXT,
    leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    current_incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
    base_latitude DOUBLE PRECISION,
    base_longitude DOUBLE PRECISION,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_responder_teams_region ON public.responder_teams(region_id);
CREATE INDEX IF NOT EXISTS idx_responder_teams_status ON public.responder_teams(operational_status);
CREATE INDEX IF NOT EXISTS idx_responder_teams_callsign ON public.responder_teams(callsign);

CREATE TRIGGER set_responder_teams_updated_at
    BEFORE UPDATE ON public.responder_teams
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add foreign key constraint to incidents.assigned_team_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_incidents_assigned_team'
    ) THEN
        ALTER TABLE public.incidents
            ADD CONSTRAINT fk_incidents_assigned_team
            FOREIGN KEY (assigned_team_id)
            REFERENCES public.responder_teams(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Team Members Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.responder_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_in_team TEXT NOT NULL DEFAULT 'member' CHECK (role_in_team IN (
        'leader', 'medic', 'boat_operator', 'rescuer', 'driver', 'member'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);

-- ------------------------------------------------------------------------------
-- 4. Team Locations Table (Opt-in live operational telemetry)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.responder_teams(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION,
    speed_kmh DOUBLE PRECISION,
    is_sharing_active BOOLEAN NOT NULL DEFAULT true,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_locations_team ON public.team_locations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_locations_recorded_at ON public.team_locations(recorded_at DESC);

-- ------------------------------------------------------------------------------
-- 5. Incident Assignments Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.responder_teams(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'ACCEPTED', 'DECLINED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED'
    )),
    notes TEXT,
    decline_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_assignments_incident ON public.incident_assignments(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_assignments_team ON public.incident_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_incident_assignments_status ON public.incident_assignments(status);

CREATE TRIGGER set_incident_assignments_updated_at
    BEFORE UPDATE ON public.incident_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6. Incident Updates Table (Timeline / Operational Log)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    update_type TEXT NOT NULL DEFAULT 'status_change' CHECK (update_type IN (
        'status_change', 'field_note', 'evidence_added', 'citizen_note', 'resolution', 'dispatch'
    )),
    message TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_updates_incident ON public.incident_updates(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_updates_created_at ON public.incident_updates(created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. Satellite Processing Jobs Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.satellite_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id TEXT NOT NULL,
    region_slug TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DISCOVERED' CHECK (status IN (
        'DISCOVERED', 'QUEUED', 'DOWNLOADING', 'PROCESSING', 'ANALYSING', 'COMPLETED', 'FAILED'
    )),
    progress_pct INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
    algorithm_version TEXT NOT NULL DEFAULT 'v1.2.0-sar-backscatter',
    inundated_area_km2 DOUBLE PRECISION,
    output_geojson_path TEXT,
    provenance JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_satellite_jobs_scene ON public.satellite_jobs(scene_id);
CREATE INDEX IF NOT EXISTS idx_satellite_jobs_region ON public.satellite_jobs(region_slug);
CREATE INDEX IF NOT EXISTS idx_satellite_jobs_status ON public.satellite_jobs(status);

-- ------------------------------------------------------------------------------
-- 8. Notifications Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    region_slug TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('info', 'advisory', 'warning', 'critical')),
    category TEXT NOT NULL CHECK (category IN ('alert', 'incident_update', 'task_assignment', 'shelter_status', 'system')),
    source TEXT NOT NULL DEFAULT 'FloodGuard Intelligence',
    is_read BOOLEAN NOT NULL DEFAULT false,
    delivery_channel TEXT NOT NULL DEFAULT 'in_app' CHECK (delivery_channel IN ('in_app', 'push', 'sms', 'email')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_region ON public.notifications(region_slug);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- ------------------------------------------------------------------------------
-- 9. Explicit Grants and RLS Policies for New Tables
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.responder_teams TO anon, authenticated;
GRANT SELECT ON public.incident_updates TO anon, authenticated;
GRANT SELECT ON public.satellite_jobs TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.responder_teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.team_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.incident_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.incident_updates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.satellite_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Enable RLS
ALTER TABLE public.responder_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satellite_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Responder Teams Policies
CREATE POLICY "responder_teams_read" ON public.responder_teams FOR SELECT USING (true);
CREATE POLICY "responder_teams_manage" ON public.responder_teams FOR ALL TO authenticated USING (public.is_authority_or_admin());

-- Team Locations: Responders update their own; Authorities read all; Public NEVER reads live team locations
CREATE POLICY "team_locations_read" ON public.team_locations FOR SELECT TO authenticated USING (public.is_responder_or_above());
CREATE POLICY "team_locations_insert" ON public.team_locations FOR INSERT TO authenticated WITH CHECK (public.is_responder_or_above());

-- Incident Assignments: Authorities and assigned responders
CREATE POLICY "incident_assignments_read" ON public.incident_assignments FOR SELECT TO authenticated USING (public.is_responder_or_above());
CREATE POLICY "incident_assignments_manage" ON public.incident_assignments FOR ALL TO authenticated USING (public.is_authority_or_admin());

-- Incident Updates: Public can read is_public=true; Responders/Authorities can read all
CREATE POLICY "incident_updates_read_public" ON public.incident_updates FOR SELECT USING (is_public = true OR public.is_responder_or_above());
CREATE POLICY "incident_updates_create" ON public.incident_updates FOR INSERT TO authenticated WITH CHECK (public.is_responder_or_above());

-- Notifications: Users read their own, plus public regional broadcasts
CREATE POLICY "notifications_read_self" ON public.notifications FOR SELECT USING (
    recipient_id = auth.uid() OR recipient_id IS NULL OR public.is_authority_or_admin()
);
CREATE POLICY "notifications_update_self" ON public.notifications FOR UPDATE TO authenticated USING (
    recipient_id = auth.uid()
);

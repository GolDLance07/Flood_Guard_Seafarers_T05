-- ==============================================================================
-- Migration: 20261122000002_rls_and_grants.sql
-- Description: Row Level Security, Explicit Grants, Role Authorization & Triggers
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Explicit Role Grants & Revocations
-- (Do not assume enabling RLS alone revokes existing default grants)
-- ------------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Grant selective usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grants for Anon (Unauthenticated Citizens)
GRANT SELECT ON public.regions TO anon;
GRANT SELECT ON public.shelters TO anon;
GRANT SELECT ON public.incidents TO anon;

-- Grants for Authenticated Users
GRANT SELECT ON public.regions TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.incidents TO authenticated;
GRANT SELECT, INSERT ON public.incident_verifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.shelters TO authenticated;
GRANT SELECT, UPDATE ON public.response_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_locations TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- Service Role retains full administrative bypass
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ------------------------------------------------------------------------------
-- 2. Security Definer Helper Functions (Role Validation)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = user_uuid;
    RETURN COALESCE(user_role, 'citizen');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        (auth.jwt() ->> 'role' = 'service_role') OR
        (public.get_user_role(auth.uid()) = 'administrator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_authority_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        (auth.jwt() ->> 'role' = 'service_role') OR
        (public.get_user_role(auth.uid()) IN ('district_authority', 'administrator'))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_responder_or_above()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        (auth.jwt() ->> 'role' = 'service_role') OR
        (public.get_user_role(auth.uid()) IN ('field_team', 'district_authority', 'administrator'))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- 3. Automatic Profile Provisioning Trigger (auth.users -> public.profiles)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, metadata)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'citizen', -- Never allow self-assigned elevated role on signup
        jsonb_build_object('signup_source', 'web_auth')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 4. Prevent Role Self-Escalation Trigger
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- If role is being changed
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Only service_role or administrators can alter a user's role
        IF NOT public.is_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Only an administrator can modify user roles. Self-escalation is forbidden.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_role_change_security ON public.profiles;
CREATE TRIGGER enforce_role_change_security
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_escalation();

-- ------------------------------------------------------------------------------
-- 5. Enable Row Level Security (RLS) on All Tables
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6. RLS Policies: Profiles
-- ------------------------------------------------------------------------------
-- Users can read their own profile; Responders and Admins can view any profile
CREATE POLICY "profiles_select_policy"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR
        public.is_responder_or_above()
    );

-- Users can update their own non-privileged details
CREATE POLICY "profiles_update_own_policy"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. RLS Policies: Regions
-- ------------------------------------------------------------------------------
-- Active regions are public to all
CREATE POLICY "regions_select_active"
    ON public.regions FOR SELECT
    TO anon, authenticated
    USING (is_active = true OR public.is_authority_or_admin());

-- Only administrators can insert/update/delete regions
CREATE POLICY "regions_admin_insert"
    ON public.regions FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "regions_admin_update"
    ON public.regions FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. RLS Policies: Incidents
-- ------------------------------------------------------------------------------
-- Public/anon can only view verified or in-progress incidents for situational awareness
CREATE POLICY "incidents_anon_select"
    ON public.incidents FOR SELECT
    TO anon
    USING (status IN ('verified', 'in_progress', 'resolved'));

-- Authenticated citizens can view their own reported incidents OR any public verified incident
-- Responders and authorities can view ALL incidents
CREATE POLICY "incidents_authenticated_select"
    ON public.incidents FOR SELECT
    TO authenticated
    USING (
        reporter_id = auth.uid() OR
        status IN ('verified', 'in_progress', 'resolved') OR
        public.is_responder_or_above()
    );

-- Any authenticated user can submit an emergency incident report as themselves
CREATE POLICY "incidents_authenticated_insert"
    ON public.incidents FOR INSERT
    TO authenticated
    WITH CHECK (
        reporter_id = auth.uid()
    );

-- Citizens can edit their own report only while it is still pending ('submitted')
-- Responders and authorities can update any incident (status, severity, notes)
CREATE POLICY "incidents_authenticated_update"
    ON public.incidents FOR UPDATE
    TO authenticated
    USING (
        (reporter_id = auth.uid() AND status = 'submitted') OR
        public.is_responder_or_above()
    )
    WITH CHECK (
        (reporter_id = auth.uid() AND status = 'submitted') OR
        public.is_responder_or_above()
    );

-- ------------------------------------------------------------------------------
-- 9. RLS Policies: Incident Verifications
-- ------------------------------------------------------------------------------
-- Anyone who can see an incident can see its verification details
CREATE POLICY "verifications_select"
    ON public.incident_verifications FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.incidents i
            WHERE i.id = incident_id AND (
                i.reporter_id = auth.uid() OR
                i.status IN ('verified', 'in_progress', 'resolved') OR
                public.is_responder_or_above()
            )
        )
    );

-- Only field teams, authorities, and administrators can submit formal verifications
CREATE POLICY "verifications_insert_responder_only"
    ON public.incident_verifications FOR INSERT
    TO authenticated
    WITH CHECK (
        verified_by = auth.uid() AND
        public.is_responder_or_above()
    );

-- ------------------------------------------------------------------------------
-- 10. RLS Policies: Shelters
-- ------------------------------------------------------------------------------
-- Citizens in emergency need open access to shelter capacities and statuses
CREATE POLICY "shelters_public_select"
    ON public.shelters FOR SELECT
    TO anon, authenticated
    USING (status IN ('active', 'full', 'standby'));

-- Only district authorities and administrators can add or update shelters
CREATE POLICY "shelters_authority_insert"
    ON public.shelters FOR INSERT
    TO authenticated
    WITH CHECK (public.is_authority_or_admin());

CREATE POLICY "shelters_authority_update"
    ON public.shelters FOR UPDATE
    TO authenticated
    USING (public.is_authority_or_admin())
    WITH CHECK (public.is_authority_or_admin());

-- ------------------------------------------------------------------------------
-- 11. RLS Policies: Response Tasks
-- ------------------------------------------------------------------------------
-- Assigned field team member or district authority / admin can view tasks
CREATE POLICY "tasks_select"
    ON public.response_tasks FOR SELECT
    TO authenticated
    USING (
        assigned_to = auth.uid() OR
        public.is_authority_or_admin()
    );

-- Assigned field team can update status/notes; Authority/Admin can update all
CREATE POLICY "tasks_update"
    ON public.response_tasks FOR UPDATE
    TO authenticated
    USING (
        assigned_to = auth.uid() OR
        public.is_authority_or_admin()
    )
    WITH CHECK (
        assigned_to = auth.uid() OR
        public.is_authority_or_admin()
    );

-- Only authorities and admins can create rescue tasks
CREATE POLICY "tasks_insert"
    ON public.response_tasks FOR INSERT
    TO authenticated
    WITH CHECK (public.is_authority_or_admin());

-- ------------------------------------------------------------------------------
-- 12. RLS Policies: Saved Locations
-- ------------------------------------------------------------------------------
-- Users have strict private control over their saved monitoring pins
CREATE POLICY "saved_locations_user_all"
    ON public.saved_locations FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 13. RLS Policies: Audit Logs (Append-Only)
-- ------------------------------------------------------------------------------
-- Only administrators can read audit logs
CREATE POLICY "audit_logs_admin_select"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Regular authenticated/anon users cannot insert/update/delete directly
-- Inserts must happen through service_role backend or trusted security definer triggers
CREATE POLICY "audit_logs_service_role_insert"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

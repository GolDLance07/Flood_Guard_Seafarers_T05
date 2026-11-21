-- ==============================================================================
-- Migration: 20261122000003_storage_setup.sql
-- Description: Private Supabase Storage Bucket for Incident Evidence & Access Control
-- Target: Supabase PostgreSQL
-- ==============================================================================

-- 1. Create or configure private 'incident-evidence' bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'incident-evidence',
    'incident-evidence',
    false, -- Private bucket: sensitive incident photographs must never be publicly exposed
    10485760, -- 10 Megabyte limit per file
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

-- 2. Storage RLS Policies for storage.objects

-- Citizens can upload evidence to their user folder or incident subfolder
CREATE POLICY "incident_evidence_upload_policy"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'incident-evidence' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Citizens can read their own uploaded files; Responders and Admins can view all evidence
CREATE POLICY "incident_evidence_read_policy"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'incident-evidence' AND (
            (storage.foldername(name))[1] = auth.uid()::text OR
            public.is_responder_or_above()
        )
    );

-- Citizens can delete their own uploaded files before verification; Admins can delete any file
CREATE POLICY "incident_evidence_delete_policy"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'incident-evidence' AND (
            (storage.foldername(name))[1] = auth.uid()::text OR
            public.is_admin()
        )
    );

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sgsnnzejbeoafpspoqpy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_AAoSV6GWYX21uqZfOOICOQ_WG0q_6zf';

/**
 * Authoritative Supabase Client for Frontend.
 * Uses the safe public anon key. Service role keys MUST NEVER be exposed here.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'floodguard_auth_session'
  }
});

// Allowed file types for incident evidence (max 10MB)
export const ALLOWED_EVIDENCE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf'
];
export const MAX_EVIDENCE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface EvidenceUploadResult {
  path: string;
  fullPath: string;
  url?: string;
}

/**
 * Validates and uploads private incident evidence to the 'incident-evidence' Supabase Storage bucket.
 * Enforces file size and type boundaries before transmitting to storage.
 */
export async function uploadIncidentEvidence(
  file: File,
  userId: string,
  incidentId?: string
): Promise<{ data: EvidenceUploadResult | null; error: Error | null }> {
  // 1. Client-Side Size Validation
  if (file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
    return {
      data: null,
      error: new Error(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum allowed limit of 10MB.`)
    };
  }

  // 2. Client-Side Mime-Type Validation
  if (!ALLOWED_EVIDENCE_MIME_TYPES.includes(file.type)) {
    return {
      data: null,
      error: new Error(`Unsupported file type '${file.type}'. Allowed: JPEG, PNG, WEBP, HEIC, PDF.`)
    };
  }

  // 3. Construct user-scoped private folder path: {userId}/{timestamp}_{clean_filename}
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const subFolder = incidentId ? `${userId}/${incidentId}` : userId;
  const filePath = `${subFolder}/${Date.now()}_${cleanName}`;

  try {
    const { data, error } = await supabase.storage
      .from('incident-evidence')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return { data: null, error };
    }

    return {
      data: {
        path: data.path,
        fullPath: `incident-evidence/${data.path}`
      },
      error: null
    };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Creates a temporary signed download URL for private incident evidence.
 * Expires after requested seconds (default 300s = 5m).
 */
export async function getEvidenceSignedUrl(
  path: string,
  expiresInSeconds: number = 300
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('incident-evidence')
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

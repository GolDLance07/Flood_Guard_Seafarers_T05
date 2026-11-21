import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'citizen' | 'field_team' | 'district_authority' | 'administrator' | 'guest';

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone_number: string | null;
  district: string | null;
  state?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  isAuthenticated: boolean;
}

export interface AuthContextType extends AuthState {
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

import { createClient, SupabaseClient, Session, AuthChangeEvent } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project') &&
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export interface AuthResponse {
  session?: Session | null;
  error?: string | null;
}

export const supabaseAuthService = {
  isConfigured: () => isSupabaseConfigured,

  async getSession(): Promise<Session | null> {
    if (!supabase) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    if (!supabase) return { unsubscribe: () => {} };
    const { data } = supabase.auth.onAuthStateChange(callback);
    return { unsubscribe: () => data.subscription.unsubscribe() };
  },

  async signIn(email: string, password: string): Promise<AuthResponse> {
    if (!supabase) {
      return { error: 'Supabase authentication is not configured in this environment.' };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { session: data.session };
  },

  async signUp(email: string, password: string, fullName: string): Promise<AuthResponse> {
    if (!supabase) {
      return { error: 'Supabase authentication is not configured in this environment.' };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) return { error: error.message };
    return { session: data.session };
  },

  async signOut(): Promise<{ error?: string | null }> {
    if (!supabase) return {};
    const { error } = await supabase.auth.signOut();
    return { error: error ? error.message : null };
  },

  async resetPassword(email: string): Promise<{ error?: string | null }> {
    if (!supabase) {
      return { error: 'Supabase authentication is not configured in this environment.' };
    }
    const redirectOrigin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectOrigin ? `${redirectOrigin}/reset-password` : undefined,
    });
    return { error: error ? error.message : null };
  },
};


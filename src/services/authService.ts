import { supabase, isSupabaseConfigured } from './supabase';
import { UserProfile } from '../types';

const DEMO_STORAGE_KEY = 'raksha_demo_session';
const PROFILE_STORAGE_KEY = 'raksha_user_profile';

const DEFAULT_DEMO_USER: UserProfile = {
  id: 'demo-user-101',
  email: 'priya.sharma@raksha-demo.org',
  fullName: 'Priya Sharma',
  phone: '+91 98765 43210',
  dateOfBirth: '1998-05-14',
  bloodGroup: 'O+',
  allergies: 'Penicillin',
  medicalNotes: 'Asthma inhaler in purse',
  emergencyNotesShared: true,
  isOnboarded: true,
  createdAt: new Date().toISOString(),
};

export const authService = {
  isConfigured: isSupabaseConfigured,

  async signInWithGoogle(): Promise<{ error: Error | null; url?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        error: new Error('Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or switch to Demo Mode.'),
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) throw error;
      return { error: null, url: data.url };
    } catch (err: unknown) {
      return { error: err as Error };
    }
  },

  async signInWithEmail(email: string, password: string): Promise<{ user: UserProfile | null; error: Error | null }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        user: null,
        error: new Error('Supabase not configured. Please use Demo Mode.'),
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error('No user returned');

      const profile = await this.getUserProfile(data.user.id);
      return { user: profile, error: null };
    } catch (err: unknown) {
      return { user: null, error: err as Error };
    }
  },

  async signUpWithEmail(email: string, password: string, fullName: string): Promise<{ user: UserProfile | null; error: Error | null }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        user: null,
        error: new Error('Supabase not configured. Please use Demo Mode.'),
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error('No user created');

      const newProfile: UserProfile = {
        id: data.user.id,
        email: data.user.email || email,
        fullName,
        isOnboarded: false,
        createdAt: new Date().toISOString(),
      };

      await this.saveProfile(newProfile);
      return { user: newProfile, error: null };
    } catch (err: unknown) {
      return { user: null, error: err as Error };
    }
  },

  loginDemoUser(customProfile?: Partial<UserProfile>): UserProfile {
    const profile: UserProfile = {
      ...DEFAULT_DEMO_USER,
      ...customProfile,
    };
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return profile;
  },

  async getCurrentSession(): Promise<{ user: UserProfile | null; isDemo: boolean }> {
    // 1. Check live Supabase session if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await this.getUserProfile(session.user.id);
          return {
            user: profile || {
              id: session.user.id,
              email: session.user.email || '',
              fullName: session.user.user_metadata?.full_name || 'Citizen User',
              isOnboarded: false,
              createdAt: new Date().toISOString(),
            },
            isDemo: false,
          };
        }
      } catch (e) {
        console.warn('Failed to retrieve Supabase session:', e);
      }
    }

    // 2. Check local demo session
    const demoData = localStorage.getItem(DEMO_STORAGE_KEY);
    if (demoData) {
      try {
        return { user: JSON.parse(demoData), isDemo: true };
      } catch {
        localStorage.removeItem(DEMO_STORAGE_KEY);
      }
    }

    return { user: null, isDemo: false };
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.warn('Error fetching Supabase profile, falling back to local cache:', error.message);
        } else if (data) {
          return {
            id: data.id,
            email: data.email,
            fullName: data.full_name || data.fullName,
            phone: data.phone,
            dateOfBirth: data.date_of_birth,
            bloodGroup: data.blood_group,
            allergies: data.allergies,
            medicalNotes: data.medical_notes,
            emergencyNotesShared: data.emergency_notes_shared ?? true,
            isOnboarded: data.is_onboarded ?? true,
            createdAt: data.created_at,
          };
        }
      } catch (err) {
        console.warn('Supabase query failed:', err);
      }
    }

    // Fallback to local storage
    const local = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {
        return null;
      }
    }
    return null;
  },

  async saveProfile(profile: UserProfile): Promise<{ success: boolean; error: Error | null }> {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(profile));

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('profiles').upsert({
          id: profile.id,
          email: profile.email,
          full_name: profile.fullName,
          phone: profile.phone,
          date_of_birth: profile.dateOfBirth,
          blood_group: profile.bloodGroup,
          allergies: profile.allergies,
          medical_notes: profile.medicalNotes,
          emergency_notes_shared: profile.emergencyNotesShared,
          is_onboarded: profile.isOnboarded,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } catch (err: unknown) {
        return { success: false, error: err as Error };
      }
    }

    return { success: true, error: null };
  },

  async signOut(): Promise<void> {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
  },
};

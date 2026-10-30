import { supabase, isSupabaseConfigured } from './supabase';
import { signInWithFirebaseGoogle, isFirebaseConfigured } from './firebase';
import { UserProfile } from '../types';

const DEMO_STORAGE_KEY = 'raksha_demo_session';
const PROFILE_STORAGE_KEY = 'raksha_user_profile';

function ensureValidUuid(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  // Deterministically map arbitrary ID (like Firebase UID) to UUID format
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = ((hash2 << 5) + hash2) ^ char;
  }
  const p1 = Math.abs(hash1).toString(16).padStart(8, '0');
  const p2 = Math.abs(hash2).toString(16).padStart(8, '0');
  const p3 = Math.abs(hash1 ^ hash2).toString(16).padStart(8, '0');
  const p4 = Math.abs(hash1 + hash2).toString(16).padStart(8, '0');
  const raw = (p1 + p2 + p3 + p4).slice(0, 32);
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-4${raw.slice(13, 16)}-8${raw.slice(17, 20)}-${raw.slice(20, 32)}`;
}

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

  async signInWithGoogle(): Promise<{ user?: UserProfile | null; error: Error | null; url?: string }> {
    // 1. If Firebase is configured, use Firebase Google Popup authentication
    if (isFirebaseConfigured()) {
      const { user: fbUser, error: fbErr } = await signInWithFirebaseGoogle();
      if (fbErr) return { user: null, error: fbErr };
      if (!fbUser) return { user: null, error: new Error('Google Sign-In was cancelled.') };

      const uuid = ensureValidUuid(fbUser.uid);
      const profile: UserProfile = {
        id: uuid,
        email: fbUser.email || '',
        fullName: fbUser.displayName || 'Google Citizen',
        isOnboarded: true,
        createdAt: new Date().toISOString(),
      };

      await this.saveProfile(profile);
      return { user: profile, error: null };
    }

    // 2. Otherwise try Supabase OAuth
    if (isSupabaseConfigured() && supabase) {
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
    }

    return {
      error: new Error('Firebase Google Authentication is not configured. Please supply VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID.'),
    };
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

      // Pass auth email so profile mapping can use it (profiles table has no email column)
      const profile = await this.getUserProfile(data.user.id, data.user.email);
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
          const profile = await this.getUserProfile(session.user.id, session.user.email);
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

  async getUserProfile(userId: string, authEmail?: string): Promise<UserProfile | null> {
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
          // profiles table has no email column — source email from Supabase Auth (authEmail)
          return {
            id: data.id,
            email: authEmail || '',
            fullName: data.full_name || '',
            phone: data.phone,
            dateOfBirth: data.date_of_birth,
            bloodGroup: data.blood_group,
            allergies: data.allergies,
            medicalNotes: data.medical_notes,
            emergencyNotesShared: data.emergency_notes_shared ?? true,
            isOnboarded: data.is_onboarded ?? false,
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
          // Note: email lives in Supabase Auth only; profiles table has no email column
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

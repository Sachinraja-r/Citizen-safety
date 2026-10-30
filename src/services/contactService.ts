import { TrustedContact } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const CONTACTS_STORAGE_KEY = 'raksha_trusted_contacts';

const getStorageKey = (userId?: string): string =>
  `raksha_trusted_contacts_${userId || 'default'}`;

const isUuid = (id?: string): boolean =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

const DEFAULT_DEMO_CONTACTS: TrustedContact[] = [
  {
    id: 'contact-1',
    name: 'Rajesh Sharma (Brother)',
    phone: '+91 98450 11223',
    relationship: 'Brother',
    priority: 1,
    notifySms: true,
    notifyCall: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'contact-2',
    name: 'Ananya Verma (Roommate)',
    phone: '+91 97312 99887',
    relationship: 'Roommate',
    priority: 2,
    notifySms: true,
    notifyCall: false,
    createdAt: new Date().toISOString(),
  },
];

export const contactService = {
  async getContacts(userId?: string): Promise<TrustedContact[]> {
    const key = getStorageKey(userId);

    // 1. Read existing local storage contacts for this user
    let localContacts: TrustedContact[] = [];
    const localRaw = localStorage.getItem(key) || localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (localRaw) {
      try {
        localContacts = JSON.parse(localRaw);
      } catch {
        // ignore parse error
      }
    }

    // 2. If Supabase is configured and user has a valid UUID, attempt cloud sync
    if (isSupabaseConfigured() && supabase && userId && isUuid(userId)) {
      try {
        const { data, error } = await supabase
          .from('trusted_contacts')
          .select('*')
          .eq('user_id', userId)
          .order('priority', { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped: TrustedContact[] = data.map((d) => ({
            id: d.id,
            userId: d.user_id,
            name: d.name,
            phone: d.phone,
            relationship: d.relationship,
            priority: d.priority,
            notifySms: d.notify_sms ?? true,
            notifyCall: d.notify_call ?? true,
            createdAt: d.created_at,
          }));

          // Synchronize to local storage
          localStorage.setItem(key, JSON.stringify(mapped));
          localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(mapped));
          return mapped;
        }
      } catch (err) {
        console.warn('Failed to fetch contacts from Supabase, using local fallback:', err);
      }
    }

    // 3. If local contacts exist, NEVER wipe them out with empty array
    if (localContacts.length > 0) {
      return localContacts;
    }

    // 4. Default seed for demo or fresh user accounts so emergency dispatch always has targets
    localStorage.setItem(key, JSON.stringify(DEFAULT_DEMO_CONTACTS));
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_CONTACTS));
    return DEFAULT_DEMO_CONTACTS;
  },

  async addContact(
    contact: Omit<TrustedContact, 'id' | 'createdAt'>,
    userId?: string
  ): Promise<{ contact: TrustedContact; error: Error | null }> {
    const existing = await this.getContacts(userId);
    if (existing.length >= 5) {
      return {
        contact: null as unknown as TrustedContact,
        error: new Error('Maximum limit of 5 trusted contacts reached. Please remove or edit an existing contact.'),
      };
    }

    const newContact: TrustedContact = {
      ...contact,
      id: 'contact-' + Date.now(),
      userId,
      createdAt: new Date().toISOString(),
    };

    // Save locally immediately to guarantee instant UI responsiveness
    const updated = [...existing, newContact].sort((a, b) => a.priority - b.priority);
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(updated));
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(updated));

    // If Supabase is configured and user ID is a valid UUID, persist to cloud database
    if (isSupabaseConfigured() && supabase && userId && isUuid(userId)) {
      try {
        const { data, error } = await supabase
          .from('trusted_contacts')
          .insert([
            {
              user_id: userId,
              name: contact.name,
              phone: contact.phone,
              relationship: contact.relationship,
              priority: contact.priority,
              notify_sms: contact.notifySms ?? true,
              notify_call: contact.notifyCall ?? true,
            },
          ])
          .select()
          .single();

        if (error) {
          console.warn('Supabase contact insert warning:', error.message);
        } else if (data) {
          newContact.id = data.id;
          const finalUpdated = updated.map((c) => (c.id === newContact.id ? newContact : c));
          localStorage.setItem(key, JSON.stringify(finalUpdated));
          localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(finalUpdated));
        }
      } catch (err) {
        console.warn('Failed to insert contact into Supabase, safely kept locally:', err);
      }
    }

    return { contact: newContact, error: null };
  },

  async updateContact(contact: TrustedContact, userId?: string): Promise<{ success: boolean; error: Error | null }> {
    const existing = await this.getContacts(userId);
    const updated = existing
      .map((c) => (c.id === contact.id ? contact : c))
      .sort((a, b) => a.priority - b.priority);

    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(updated));
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured() && supabase && userId && isUuid(userId)) {
      try {
        const { error } = await supabase
          .from('trusted_contacts')
          .update({
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship,
            priority: contact.priority,
            notify_sms: contact.notifySms,
            notify_call: contact.notifyCall,
          })
          .eq('id', contact.id)
          .eq('user_id', userId);

        if (error) throw error;
      } catch (err) {
        console.warn('Supabase update contact warning:', err);
        return { success: true, error: null }; // Preserved locally
      }
    }

    return { success: true, error: null };
  },

  async deleteContact(id: string, userId?: string): Promise<{ success: boolean; error: Error | null }> {
    const existing = await this.getContacts(userId);
    const updated = existing.filter((c) => c.id !== id);

    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(updated));
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured() && supabase && userId && isUuid(userId)) {
      try {
        const { error } = await supabase
          .from('trusted_contacts')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) throw error;
      } catch (err) {
        console.warn('Supabase delete contact warning:', err);
      }
    }

    return { success: true, error: null };
  },
};

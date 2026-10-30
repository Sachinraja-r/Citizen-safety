import { TrustedContact } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const CONTACTS_STORAGE_KEY = 'raksha_trusted_contacts';

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
    if (isSupabaseConfigured() && supabase && userId) {
      try {
        const { data, error } = await supabase
          .from('trusted_contacts')
          .select('*')
          .eq('user_id', userId)
          .order('priority', { ascending: true });

        if (!error && data) {
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
          localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(mapped));
          return mapped;
        }
      } catch (err) {
        console.warn('Failed to fetch contacts from Supabase:', err);
      }
    }

    const cached = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // fallback to default
      }
    }

    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_CONTACTS));
    return DEFAULT_DEMO_CONTACTS;
  },

  async addContact(contact: Omit<TrustedContact, 'id' | 'createdAt'>, userId?: string): Promise<{ contact: TrustedContact; error: Error | null }> {
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

    if (isSupabaseConfigured() && supabase && userId) {
      try {
        const { data, error } = await supabase.from('trusted_contacts').insert([
          {
            user_id: userId,
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship,
            priority: contact.priority,
            notify_sms: contact.notifySms,
            notify_call: contact.notifyCall,
          },
        ]).select().single();

        if (error) throw error;
        if (data) {
          newContact.id = data.id;
        }
      } catch (err) {
        console.warn('Failed to insert contact into Supabase, saving locally:', err);
      }
    }

    const updated = [...existing, newContact].sort((a, b) => a.priority - b.priority);
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(updated));
    return { contact: newContact, error: null };
  },

  async updateContact(contact: TrustedContact, userId?: string): Promise<{ success: boolean; error: Error | null }> {
    const existing = await this.getContacts(userId);
    const updated = existing.map((c) => (c.id === contact.id ? contact : c)).sort((a, b) => a.priority - b.priority);
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured() && supabase && userId) {
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
        return { success: false, error: err as Error };
      }
    }

    return { success: true, error: null };
  },

  async deleteContact(id: string, userId?: string): Promise<{ success: boolean; error: Error | null }> {
    const existing = await this.getContacts(userId);
    const updated = existing.filter((c) => c.id !== id);
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured() && supabase && userId) {
      try {
        const { error } = await supabase
          .from('trusted_contacts')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) throw error;
      } catch (err) {
        return { success: false, error: err as Error };
      }
    }

    return { success: true, error: null };
  },
};

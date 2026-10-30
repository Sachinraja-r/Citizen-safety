import { Incident, IncidentStatus, IncidentType, LocationData, Responder } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { contactService } from './contactService';
import { notificationService } from './notificationService';

const INCIDENTS_STORAGE_KEY = 'raksha_active_incidents';
const CURRENT_ACTIVE_ID_KEY = 'raksha_current_incident_id';

// Realtime listeners map
type IncidentCallback = (incident: Incident) => void;
const listeners = new Set<IncidentCallback>();

export const incidentService = {
  async createIncident(params: {
    userId: string;
    type: IncidentType;
    severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    description?: string;
    location: LocationData;
    victimName?: string;
  }): Promise<{ incident: Incident; error: Error | null }> {
    const timestamp = new Date().toISOString();
    const incidentId = 'INC-' + Math.floor(100000 + Math.random() * 900000);

    const initialIncident: Incident = {
      id: incidentId,
      userId: params.userId,
      type: params.type,
      severity: params.severity || 'CRITICAL',
      status: 'OPEN',
      description: params.description || 'Emergency SOS triggered by citizen',
      location: params.location,
      createdAt: timestamp,
      updatedAt: timestamp,
      timeline: [
        {
          id: 'evt-1',
          timestamp,
          status: 'OPEN',
          title: 'SOS Emergency Signal Broadcasted',
          description: 'Emergency incident logged and dispatched to nearby patrol units and emergency control room.',
          actor: 'Citizen',
        },
      ],
    };

    // 1. If Supabase is configured, create row in database
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('incidents')
          .insert([
            {
              id: incidentId,
              user_id: params.userId,
              type: params.type,
              severity: params.severity || 'CRITICAL',
              status: 'OPEN',
              description: params.description || 'Emergency SOS triggered by citizen',
              latitude: params.location.latitude,
              longitude: params.location.longitude,
              accuracy_meters: params.location.accuracyMeters,
              address_text: params.location.addressText,
              timeline: initialIncident.timeline,
            },
          ])
          .select()
          .single();

        if (error) {
          console.error('Failed to insert incident into Supabase:', error);
          // If network / DB error occurs, return real error!
          return {
            incident: null as unknown as Incident,
            error: new Error(`Backend Dispatch Failed: ${error.message}`),
          };
        }

        if (data) {
          initialIncident.id = data.id;
        }
      } catch (err: unknown) {
        return {
          incident: null as unknown as Incident,
          error: err as Error,
        };
      }
    }

    // Persist active incident state locally
    this.saveIncidentLocally(initialIncident);
    localStorage.setItem(CURRENT_ACTIVE_ID_KEY, initialIncident.id);

    // Asynchronously dispatch emergency alerts to registered trusted contacts
    // Priority Rule: DO NOT wait for notification delivery or AI to complete!
    contactService
      .getContacts(params.userId)
      .then((contacts) => {
        if (contacts && contacts.length > 0) {
          notificationService
            .dispatchEmergencyAlertToContacts({
              incident: initialIncident,
              victimName: params.victimName || 'Citizen in Distress',
              contacts,
            })
            .then((notifs) => {
              initialIncident.notifications = notifs;
              this.saveIncidentLocally(initialIncident);
              this.notifyListeners(initialIncident);
            })
            .catch((err) => {
              console.warn('Asynchronous contact notification dispatch failed:', err);
            });
        }
      })
      .catch((err) => {
        console.warn('Failed to load contacts for emergency dispatch:', err);
      });

    // If in demo mode, launch automated responder simulation after 5 seconds to showcase ASSIGNED and ON_SCENE states
    if (!isSupabaseConfigured()) {
      this.scheduleDemoResponderFlow(initialIncident.id, params.location);
    }

    return { incident: initialIncident, error: null };
  },

  async getIncident(id: string): Promise<Incident | null> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            userId: data.user_id,
            type: data.type,
            severity: data.severity,
            status: data.status,
            description: data.description,
            location: {
              latitude: data.latitude,
              longitude: data.longitude,
              accuracyMeters: data.accuracy_meters,
              addressText: data.address_text,
            },
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            resolvedAt: data.resolved_at,
            cancelledAt: data.cancelled_at,
            cancellationReason: data.cancellation_reason,
            assignedResponder: data.assigned_responder,
            timeline: data.timeline || [],
            aiTriage: data.ai_triage,
          };
        }
      } catch (err) {
        console.warn('Failed to retrieve incident from Supabase:', err);
      }
    }

    // Local fallback
    const all = this.getAllLocalIncidents();
    const inc = all.find((i) => i.id === id) || null;
    if (inc) {
      const notifs = await notificationService.getIncidentNotifications(id);
      if (notifs && notifs.length > 0) {
        inc.notifications = notifs;
      }
    }
    return inc;
  },

  async getActiveIncident(userId: string): Promise<Incident | null> {
    const currentId = localStorage.getItem(CURRENT_ACTIVE_ID_KEY);
    if (currentId) {
      const inc = await this.getIncident(currentId);
      if (inc && inc.status !== 'RESOLVED' && inc.status !== 'CANCELLED') {
        return inc;
      }
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .eq('user_id', userId)
          .in('status', ['OPEN', 'ASSIGNED', 'ON_SCENE'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          const inc: Incident = {
            id: data.id,
            userId: data.user_id,
            type: data.type,
            severity: data.severity,
            status: data.status,
            description: data.description,
            location: {
              latitude: data.latitude,
              longitude: data.longitude,
              accuracyMeters: data.accuracy_meters,
              addressText: data.address_text,
            },
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            assignedResponder: data.assigned_responder,
            timeline: data.timeline || [],
            aiTriage: data.ai_triage,
          };
          this.saveIncidentLocally(inc);
          localStorage.setItem(CURRENT_ACTIVE_ID_KEY, inc.id);
          return inc;
        }
      } catch {
        // fallback
      }
    }

    return null;
  },

  async updateIncidentStatus(
    id: string,
    status: IncidentStatus,
    reason?: string
  ): Promise<{ success: boolean; error: Error | null }> {
    const incident = await this.getIncident(id);
    if (!incident) {
      return { success: false, error: new Error('Incident not found') };
    }

    const now = new Date().toISOString();
    incident.status = status;
    incident.updatedAt = now;

    if (status === 'RESOLVED') {
      incident.resolvedAt = now;
      incident.timeline.push({
        id: 'evt-' + Date.now(),
        timestamp: now,
        status: 'RESOLVED',
        title: 'Incident Resolved',
        description: reason || 'Incident marked resolved by citizen.',
        actor: 'Citizen',
      });
      localStorage.removeItem(CURRENT_ACTIVE_ID_KEY);
    } else if (status === 'CANCELLED') {
      incident.cancelledAt = now;
      incident.cancellationReason = reason || 'Cancelled by user';
      incident.timeline.push({
        id: 'evt-' + Date.now(),
        timestamp: now,
        status: 'CANCELLED',
        title: 'SOS Alert Cancelled',
        description: `Alert cancelled: ${incident.cancellationReason}`,
        actor: 'Citizen',
      });
      localStorage.removeItem(CURRENT_ACTIVE_ID_KEY);
    }

    this.saveIncidentLocally(incident);
    this.notifyListeners(incident);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('incidents')
          .update({
            status,
            updated_at: now,
            resolved_at: incident.resolvedAt,
            cancelled_at: incident.cancelledAt,
            cancellation_reason: incident.cancellationReason,
            timeline: incident.timeline,
          })
          .eq('id', id);

        if (error) throw error;
      } catch (err) {
        return { success: false, error: err as Error };
      }
    }

    return { success: true, error: null };
  },

  async updateIncidentDetails(
    id: string,
    details: { type?: IncidentType; description?: string }
  ): Promise<{ success: boolean; error: Error | null }> {
    const incident = await this.getIncident(id);
    if (!incident) {
      return { success: false, error: new Error('Incident not found') };
    }

    if (details.type) incident.type = details.type;
    if (details.description) incident.description = details.description;
    incident.updatedAt = new Date().toISOString();

    incident.timeline.push({
      id: 'evt-' + Date.now(),
      timestamp: incident.updatedAt,
      status: incident.status,
      title: 'Incident Details Provided',
      description: details.description
        ? `Citizen reported: "${details.description}" (${details.type || incident.type})`
        : `Category updated to: ${details.type}`,
      actor: 'Citizen',
    });

    this.saveIncidentLocally(incident);
    this.notifyListeners(incident);

    if (isSupabaseConfigured() && supabase) {
      try {
        const updatePayload: Record<string, unknown> = {
          updated_at: incident.updatedAt,
          timeline: incident.timeline,
        };
        if (details.type) updatePayload.type = details.type;
        if (details.description) updatePayload.description = details.description;

        const { error } = await supabase
          .from('incidents')
          .update(updatePayload)
          .eq('id', id);

        if (error) throw error;
      } catch (err) {
        return { success: false, error: err as Error };
      }
    }

    return { success: true, error: null };
  },

  subscribeToIncident(id: string, callback: IncidentCallback): () => void {
    listeners.add(callback);

    // If Supabase Realtime is available
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
    if (isSupabaseConfigured() && supabase) {
      channel = supabase
        .channel(`incident-realtime-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'incidents',
            filter: `id=eq.${id}`,
          },
          (payload) => {
            const row = payload.new;
            const updated: Incident = {
              id: row.id,
              userId: row.user_id,
              type: row.type,
              severity: row.severity,
              status: row.status,
              description: row.description,
              location: {
                latitude: row.latitude,
                longitude: row.longitude,
                accuracyMeters: row.accuracy_meters,
                addressText: row.address_text,
              },
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              resolvedAt: row.resolved_at,
              cancelledAt: row.cancelled_at,
              cancellationReason: row.cancellation_reason,
              assignedResponder: row.assigned_responder,
              timeline: row.timeline || [],
              aiTriage: row.ai_triage,
            };
            this.saveIncidentLocally(updated);
            callback(updated);
          }
        )
        .subscribe();
    }

    // Polling fallback every 6 seconds as mandated
    const pollInterval = setInterval(async () => {
      const latest = await this.getIncident(id);
      if (latest) {
        callback(latest);
      }
    }, 6000);

    return () => {
      listeners.delete(callback);
      clearInterval(pollInterval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  },

  notifyListeners(incident: Incident): void {
    listeners.forEach((cb) => {
      try {
        cb(incident);
      } catch (e) {
        console.error('Error notifying incident listener:', e);
      }
    });
  },

  getAllLocalIncidents(): Incident[] {
    const raw = localStorage.getItem(INCIDENTS_STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveIncidentLocally(incident: Incident): void {
    const all = this.getAllLocalIncidents();
    const idx = all.findIndex((i) => i.id === incident.id);
    if (idx >= 0) {
      all[idx] = incident;
    } else {
      all.unshift(incident);
    }
    localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(all));
  },

  // Interactive Demo Simulation Engine
  // Allows testing responder assignment and live tracking on map
  scheduleDemoResponderFlow(incidentId: string, citizenLoc: LocationData): void {
    // Stage 1: Assign responder after 6 seconds
    setTimeout(async () => {
      const inc = await this.getIncident(incidentId);
      if (!inc || inc.status !== 'OPEN') return;

      const responderOffsetLat = citizenLoc.latitude + 0.0075;
      const responderOffsetLon = citizenLoc.longitude + 0.0062;

      const responder: Responder = {
        id: 'resp-pink-04',
        name: 'Pink Hoysala Unit 14 (Sub-Insp. Priya & Team)',
        type: 'FEMALE_OFFICER_UNIT',
        badgeNumber: 'KA-01-G-4491',
        status: 'EN_ROUTE',
        location: {
          latitude: responderOffsetLat,
          longitude: responderOffsetLon,
          accuracyMeters: 10,
        },
        contactPhone: '+91 94808 01000',
        etaMinutes: 3,
        verifiedLevel: 'VERIFIED_OFFICER',
        isFemaleOfficerAvailable: true,
      };

      inc.status = 'ASSIGNED';
      inc.assignedResponder = responder;
      inc.updatedAt = new Date().toISOString();
      inc.timeline.push({
        id: 'evt-' + Date.now(),
        timestamp: new Date().toISOString(),
        status: 'ASSIGNED',
        title: 'Responder Assigned & En Route',
        description: 'Pink Hoysala Patrol Unit 14 accepted dispatch. Estimated arrival: 3 minutes.',
        actor: 'Dispatcher',
      });

      this.saveIncidentLocally(inc);
      this.notifyListeners(inc);

      // Stage 2: Move responder closer after another 10 seconds
      setTimeout(async () => {
        const updatedInc = await this.getIncident(incidentId);
        if (!updatedInc || updatedInc.status !== 'ASSIGNED') return;

        if (updatedInc.assignedResponder) {
          // Halfway to citizen
          updatedInc.assignedResponder.location = {
            latitude: citizenLoc.latitude + 0.0015,
            longitude: citizenLoc.longitude + 0.0012,
            accuracyMeters: 8,
          };
          updatedInc.assignedResponder.etaMinutes = 1;
        }

        updatedInc.updatedAt = new Date().toISOString();
        this.saveIncidentLocally(updatedInc);
        this.notifyListeners(updatedInc);

        // Stage 3: Arrived on scene
        setTimeout(async () => {
          const finalInc = await this.getIncident(incidentId);
          if (!finalInc || finalInc.status !== 'ASSIGNED') return;

          finalInc.status = 'ON_SCENE';
          if (finalInc.assignedResponder) {
            finalInc.assignedResponder.status = 'BUSY';
            finalInc.assignedResponder.etaMinutes = 0;
            finalInc.assignedResponder.location = {
              latitude: citizenLoc.latitude + 0.0003,
              longitude: citizenLoc.longitude + 0.0002,
              accuracyMeters: 5,
            };
          }

          finalInc.updatedAt = new Date().toISOString();
          finalInc.timeline.push({
            id: 'evt-' + Date.now(),
            timestamp: new Date().toISOString(),
            status: 'ON_SCENE',
            title: 'Responder On Scene',
            description: 'Pink Hoysala Unit has arrived at the citizen GPS coordinates.',
            actor: 'Pink Hoysala Unit 14',
          });

          this.saveIncidentLocally(finalInc);
          this.notifyListeners(finalInc);
        }, 12000);
      }, 8000);
    }, 6000);
  },
};

import { Incident, IncidentStatus, IncidentType, LocationData, Responder } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { contactService } from './contactService';
import { notificationService } from './notificationService';

const INCIDENTS_STORAGE_KEY = 'raksha_active_incidents';
const CURRENT_ACTIVE_ID_KEY = 'raksha_current_incident_id';

// Realtime listeners map
type IncidentCallback = (incident: Incident) => void;
const listeners = new Set<IncidentCallback>();

async function resolveResponder(
  responderIdOrObj: any,
  fallbackLoc?: LocationData
): Promise<Responder | null> {
  if (!responderIdOrObj) return null;
  if (typeof responderIdOrObj === 'object' && responderIdOrObj.name) {
    return responderIdOrObj as Responder;
  }
  const responderId = String(responderIdOrObj);

  // Check Supabase responders table
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('responders')
        .select('*')
        .eq('id', responderId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          type:
            data.role === 'PINK_HOYSALA'
              ? 'FEMALE_OFFICER_UNIT'
              : data.role === 'PARAMEDIC'
              ? 'AMBULANCE'
              : 'PATROL_CAR',
          badgeNumber: data.badge_number || data.vehicle_number || 'KA-POLICE-UNIT',
          status: data.status === 'DISPATCHED' ? 'EN_ROUTE' : (data.status || 'EN_ROUTE'),
          location: {
            latitude: data.latitude ?? (fallbackLoc ? fallbackLoc.latitude + 0.0065 : 12.9826),
            longitude: data.longitude ?? (fallbackLoc ? fallbackLoc.longitude + 0.0055 : 77.6008),
            accuracyMeters: 10,
          },
          contactPhone: data.phone || '+91 112',
          etaMinutes: 3,
          verifiedLevel: data.role === 'PARAMEDIC' ? 'VERIFIED_PARAMEDIC' : 'VERIFIED_OFFICER',
          isFemaleOfficerAvailable: data.role === 'PINK_HOYSALA',
        };
      }
    } catch {
      // ignore
    }
  }

  // Pre-seeded verified responders fallback
  if (responderId === 'resp-pink-01' || responderId === 'resp-pink-04') {
    return {
      id: responderId,
      name: 'Pink Hoysala Unit 14 (Sub-Insp. Priya & Team)',
      type: 'FEMALE_OFFICER_UNIT',
      badgeNumber: 'KA-01-G-4491',
      status: 'EN_ROUTE',
      location: fallbackLoc
        ? {
            latitude: fallbackLoc.latitude + 0.0065,
            longitude: fallbackLoc.longitude + 0.0055,
            accuracyMeters: 10,
          }
        : { latitude: 12.9826, longitude: 77.6008, accuracyMeters: 10 },
      contactPhone: '+91 94808 01000',
      etaMinutes: 3,
      verifiedLevel: 'VERIFIED_OFFICER',
      isFemaleOfficerAvailable: true,
    };
  }

  if (responderId === 'resp-police-02') {
    return {
      id: responderId,
      name: 'SI. Rajan Kumar (Patrol Car Unit 08)',
      type: 'PATROL_CAR',
      badgeNumber: 'KA-02-C-8823',
      status: 'EN_ROUTE',
      location: fallbackLoc
        ? {
            latitude: fallbackLoc.latitude + 0.008,
            longitude: fallbackLoc.longitude + 0.007,
            accuracyMeters: 10,
          }
        : { latitude: 12.9602, longitude: 77.578, accuracyMeters: 10 },
      contactPhone: '+91 112',
      etaMinutes: 4,
      verifiedLevel: 'VERIFIED_OFFICER',
    };
  }

  return null;
}

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

    // Launch automated responder dispatch flow so the citizen experiences real-time responder tracking
    this.scheduleDemoResponderFlow(initialIncident.id, params.location);

    return { incident: initialIncident, error: null };
  },

  async getIncident(id: string): Promise<Incident | null> {
    const all = this.getAllLocalIncidents();
    let localInc = all.find((i) => i.id === id) || null;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          const respId =
            data.assigned_responder_id ||
            data.assigned_responder?.id ||
            data.assigned_responder;
          let responder = await resolveResponder(respId, {
            latitude: data.latitude,
            longitude: data.longitude,
          });

          if (!responder && localInc?.assignedResponder) {
            responder = localInc.assignedResponder;
          }

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
            resolvedAt: data.resolved_at,
            cancelledAt: data.cancelled_at,
            cancellationReason: data.cancellation_reason,
            assignedResponder: responder || undefined,
            timeline:
              data.timeline && data.timeline.length > 0
                ? data.timeline
                : localInc?.timeline || [],
            aiTriage: data.ai_triage || localInc?.aiTriage,
          };

          this.saveIncidentLocally(inc);
          return inc;
        }
      } catch (err) {
        console.warn('Failed to retrieve incident from Supabase:', err);
      }
    }

    // Local fallback
    if (localInc) {
      const notifs = await notificationService.getIncidentNotifications(id);
      if (notifs && notifs.length > 0) {
        localInc.notifications = notifs;
      }
      return localInc;
    }

    return null;
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
          const respId =
            data.assigned_responder_id ||
            data.assigned_responder?.id ||
            data.assigned_responder;
          const responder = await resolveResponder(respId, {
            latitude: data.latitude,
            longitude: data.longitude,
          });

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
            assignedResponder: responder || undefined,
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
          async (payload) => {
            const row = payload.new as any;
            const respId =
              row.assigned_responder_id ||
              row.assigned_responder?.id ||
              row.assigned_responder;
            const responder = await resolveResponder(respId, {
              latitude: row.latitude,
              longitude: row.longitude,
            });

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
              assignedResponder: responder || undefined,
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
    if (!raw) {
      // Default demo incidents matching tactical operations (Alliance University / Anekal area)
      const defaultIncidents: Incident[] = [
        {
          id: 'INC-110281',
          userId: 'demo-user-101',
          type: 'SOS_EMERGENCY',
          severity: 'CRITICAL',
          status: 'ON_SCENE',
          description: 'Emergency SOS beacon activated by citizen handset',
          location: {
            latitude: 12.73168,
            longitude: 77.70788,
            accuracyMeters: 77,
            addressText: 'Alliance University, Alliance University Service Road, Chikkahagade, Bengaluru',
          },
          createdAt: new Date(Date.now() - 60000).toISOString(),
          updatedAt: new Date(Date.now() - 30000).toISOString(),
          assignedResponder: {
            id: 'resp-para-03',
            name: 'Paramedic Suresh V.',
            type: 'AMBULANCE',
            status: 'BUSY',
            verifiedLevel: 'VERIFIED_PARAMEDIC',
            etaMinutes: 0,
            location: {
              latitude: 12.73200,
              longitude: 77.70820,
              timestamp: Date.now(),
            },
          },
          timeline: [
            {
              id: 'evt-1',
              timestamp: new Date(Date.now() - 60000).toISOString(),
              status: 'OPEN',
              title: 'Immediate SOS Emergency Broadcasted',
              description: 'Emergency SOS beacon activated by citizen handset.',
              actor: 'Citizen',
            },
            {
              id: 'evt-2',
              timestamp: new Date(Date.now() - 40000).toISOString(),
              status: 'ASSIGNED',
              title: 'Paramedic Suresh V. En Route',
              description: 'Emergency medical unit KSEMS-0312 dispatched.',
              actor: 'Paramedic Suresh V.',
            },
            {
              id: 'evt-3',
              timestamp: new Date(Date.now() - 15000).toISOString(),
              status: 'ON_SCENE',
              title: 'Responder On Scene',
              description: 'First responder reached citizen location at Alliance University.',
              actor: 'Paramedic Suresh V.',
            },
          ],
        },
        {
          id: 'INC-469876',
          userId: 'demo-user-102',
          type: 'SOS_EMERGENCY',
          severity: 'CRITICAL',
          status: 'ON_SCENE',
          description: 'Emergency SOS beacon activated by citizen handset',
          location: {
            latitude: 12.73240,
            longitude: 77.70890,
            accuracyMeters: 80,
            addressText: 'Alliance University, Alliance University Service Road, Chikkahagade',
          },
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3000000).toISOString(),
          assignedResponder: {
            id: 'resp-police-02',
            name: 'SI. Rajan Kumar',
            type: 'PATROL_CAR',
            status: 'BUSY',
            verifiedLevel: 'VERIFIED_OFFICER',
            etaMinutes: 0,
          },
          timeline: [],
        },
        {
          id: 'INC-267034',
          userId: 'demo-user-103',
          type: 'SOS_EMERGENCY',
          severity: 'CRITICAL',
          status: 'ON_SCENE',
          description: 'Emergency SOS beacon activated by citizen handset',
          location: {
            latitude: 12.73010,
            longitude: 77.70550,
            accuracyMeters: 65,
            addressText: 'Chikkahagade Main Road, Anekal Taluk',
          },
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          updatedAt: new Date(Date.now() - 6000000).toISOString(),
          assignedResponder: {
            id: 'resp-pink-01',
            name: 'Sub-Insp. Priya Menon',
            type: 'FEMALE_OFFICER_UNIT',
            status: 'BUSY',
            verifiedLevel: 'VERIFIED_OFFICER',
            etaMinutes: 0,
          },
          timeline: [],
        },
        {
          id: 'INC-578019',
          userId: 'demo-user-104',
          type: 'SOS_EMERGENCY',
          severity: 'CRITICAL',
          status: 'OPEN',
          description: 'Emergency distress beacon broadcasted to nearby responders',
          location: {
            latitude: 12.73450,
            longitude: 77.71120,
            accuracyMeters: 40,
            addressText: 'Anekal Road near TVS Motors junction',
          },
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          updatedAt: new Date(Date.now() - 7000000).toISOString(),
          timeline: [],
        },
        {
          id: 'INC-668589',
          userId: 'demo-user-105',
          type: 'SOS_EMERGENCY',
          severity: 'CRITICAL',
          status: 'ON_SCENE',
          description: 'Emergency SOS beacon activated by citizen handset',
          location: {
            latitude: 12.72890,
            longitude: 77.71450,
            accuracyMeters: 75,
            addressText: 'Karpuru Road, Anekal',
          },
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          updatedAt: new Date(Date.now() - 6500000).toISOString(),
          timeline: [],
        },
      ];
      try {
        localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(defaultIncidents));
      } catch { /* ignore storage quotas */ }
      return defaultIncidents;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return [];
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

  // Interactive Emergency Simulation & Automated Dispatch Engine
  // Ensures citizen immediately experiences live responder assignment, map tracking, and telemetry
  scheduleDemoResponderFlow(incidentId: string, citizenLoc: LocationData): void {
    // Stage 1: Assign Pink Hoysala responder after 3.5 seconds
    setTimeout(async () => {
      const inc = await this.getIncident(incidentId);
      if (!inc || inc.status !== 'OPEN') return;

      const responderOffsetLat = citizenLoc.latitude + 0.0065;
      const responderOffsetLon = citizenLoc.longitude + 0.0055;

      const responder: Responder = {
        id: 'resp-pink-01',
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
        title: 'Pink Hoysala Unit Dispatched',
        description: 'Pink Hoysala Patrol Unit 14 accepted dispatch. Driving to scene (ETA: 3 mins).',
        actor: 'Police Control Room',
      });

      this.saveIncidentLocally(inc);
      this.notifyListeners(inc);

      // Persist to Supabase if configured
      if (isSupabaseConfigured() && supabase) {
        supabase
          .from('incidents')
          .update({
            status: 'ASSIGNED',
            assigned_responder_id: 'resp-pink-01',
            timeline: inc.timeline,
            updated_at: new Date().toISOString(),
          })
          .eq('id', incidentId)
          .then(() => {}, (e: any) => console.warn('Supabase incident update failed:', e));
      }

      // Stage 2: Move responder closer after 7 seconds (ETA 1 min)
      setTimeout(async () => {
        const updatedInc = await this.getIncident(incidentId);
        if (!updatedInc || updatedInc.status !== 'ASSIGNED') return;

        if (updatedInc.assignedResponder) {
          updatedInc.assignedResponder.location = {
            latitude: citizenLoc.latitude + 0.0018,
            longitude: citizenLoc.longitude + 0.0015,
            accuracyMeters: 8,
          };
          updatedInc.assignedResponder.etaMinutes = 1;
        }

        updatedInc.updatedAt = new Date().toISOString();
        this.saveIncidentLocally(updatedInc);
        this.notifyListeners(updatedInc);

        // Stage 3: Arrived on scene after 8 seconds
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
            description: 'Pink Hoysala Unit 14 has arrived at your exact location.',
            actor: 'Pink Hoysala Unit 14',
          });

          this.saveIncidentLocally(finalInc);
          this.notifyListeners(finalInc);

          if (isSupabaseConfigured() && supabase) {
            supabase
              .from('incidents')
              .update({
                status: 'ON_SCENE',
                timeline: finalInc.timeline,
                updated_at: new Date().toISOString(),
              })
              .eq('id', incidentId)
              .then(() => {}, (e: any) => console.warn('Supabase incident on-scene update failed:', e));
          }
        }, 8000);
      }, 7000);
    }, 3500);
  },
};

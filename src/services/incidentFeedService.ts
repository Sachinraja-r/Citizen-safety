// Live incident feed service for police/responder dashboard
// Reads from incidentService local storage + Supabase if configured

import { LiveIncidentFeed } from '../types/responder';
import { incidentService } from './incidentService';
import { supabase, isSupabaseConfigured } from './supabase';
import { Incident } from '../types';

function mapIncident(i: Incident): LiveIncidentFeed {
  return {
    id: i.id,
    type: i.type,
    severity: i.severity,
    status: i.status,
    description: i.description,
    reportedByUserId: i.userId,
    reportedByName: 'Citizen User',
    location: i.location,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
    assignedResponderId: i.assignedResponder?.id,
    assignedResponderName: i.assignedResponder?.name,
    timeline: i.timeline,
  };
}

export const incidentFeedService = {
  async getAllIncidents(): Promise<LiveIncidentFeed[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map((row) => ({
            id: row.id,
            type: row.type,
            severity: row.severity,
            status: row.status,
            description: row.description,
            reportedByUserId: row.user_id,
            location: {
              latitude: row.latitude,
              longitude: row.longitude,
              accuracyMeters: row.accuracy_meters,
              addressText: row.address_text,
            },
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            assignedResponderId: row.assigned_responder_id || row.assigned_responder?.id,
            assignedResponderName: row.assigned_responder?.name || (row.assigned_responder_id ? 'Assigned Patrol Unit' : undefined),
            timeline: row.timeline || [],
          }));
        }
      } catch { /* fallback */ }
    }

    // Local fallback (demo mode)
    const local = incidentService.getAllLocalIncidents();
    return local.map(mapIncident);
  },

  async acceptIncident(incidentId: string, responderId: string, responderName: string): Promise<boolean> {
    const now = new Date().toISOString();
    const all = incidentService.getAllLocalIncidents();
    const inc = all.find(i => i.id === incidentId);
    if (!inc) return false;

    inc.status = 'ASSIGNED';
    inc.assignedResponder = {
      id: responderId,
      name: responderName,
      type: 'PATROL_CAR',
      status: 'EN_ROUTE',
      verifiedLevel: 'VERIFIED_OFFICER',
      etaMinutes: Math.floor(Math.random() * 5) + 2,
      location: {
        latitude: inc.location.latitude + 0.008,
        longitude: inc.location.longitude + 0.006,
      },
    };
    inc.updatedAt = now;
    inc.timeline.push({
      id: 'evt-' + Date.now(),
      timestamp: now,
      status: 'ASSIGNED',
      title: `Accepted by ${responderName}`,
      description: `Emergency unit ${responderName} has accepted dispatch and is en route.`,
      actor: responderName,
    });
    incidentService.saveIncidentLocally(inc);
    incidentService.notifyListeners(inc);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('incidents').update({
          status: 'ASSIGNED',
          assigned_responder_id: responderId,
          updated_at: now,
          timeline: inc.timeline,
        }).eq('id', incidentId);
      } catch (err) {
        console.warn('Failed to update Supabase incident assignment:', err);
      }
    }
    return true;
  },

  async markOnScene(incidentId: string, responderName: string): Promise<boolean> {
    const now = new Date().toISOString();
    const all = incidentService.getAllLocalIncidents();
    const inc = all.find(i => i.id === incidentId);
    if (!inc || !inc.assignedResponder) return false;

    inc.status = 'ON_SCENE';
    inc.assignedResponder.status = 'BUSY';
    inc.assignedResponder.etaMinutes = 0;
    inc.updatedAt = now;
    inc.timeline.push({
      id: 'evt-' + Date.now(),
      timestamp: now,
      status: 'ON_SCENE',
      title: `${responderName} Arrived On Scene`,
      description: 'Responder has arrived at the citizen GPS location.',
      actor: responderName,
    });
    incidentService.saveIncidentLocally(inc);
    incidentService.notifyListeners(inc);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('incidents').update({
          status: 'ON_SCENE',
          updated_at: now,
          timeline: inc.timeline,
        }).eq('id', incidentId);
      } catch (err) {
        console.warn('Failed to update Supabase incident on-scene:', err);
      }
    }
    return true;
  },

  async resolveIncident(incidentId: string, responderName: string): Promise<boolean> {
    const now = new Date().toISOString();
    const all = incidentService.getAllLocalIncidents();
    const inc = all.find(i => i.id === incidentId);
    if (!inc) return false;

    inc.status = 'RESOLVED';
    inc.resolvedAt = now;
    inc.updatedAt = now;
    inc.timeline.push({
      id: 'evt-' + Date.now(),
      timestamp: now,
      status: 'RESOLVED',
      title: 'Incident Resolved',
      description: `Situation resolved by ${responderName}. Case closed.`,
      actor: responderName,
    });
    incidentService.saveIncidentLocally(inc);
    incidentService.notifyListeners(inc);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('incidents').update({
          status: 'RESOLVED',
          resolved_at: now,
          updated_at: now,
          timeline: inc.timeline,
        }).eq('id', incidentId);
      } catch (err) {
        console.warn('Failed to update Supabase incident resolution:', err);
      }
    }
    return true;
  },

  subscribeToFeed(callback: (incidents: LiveIncidentFeed[]) => void): () => void {
    const interval = setInterval(async () => {
      const incidents = await this.getAllIncidents();
      callback(incidents);
    }, 3000);

    let channel: any = null;
    if (isSupabaseConfigured() && supabase) {
      try {
        const chName = `incidents-feed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        channel = supabase
          .channel(chName)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'incidents',
          }, async () => {
            const incidents = await this.getAllIncidents();
            callback(incidents);
          })
          .subscribe();
      } catch (subErr) {
        console.warn('Feed realtime subscription error:', subErr);
      }
    }

    return () => {
      clearInterval(interval);
      if (channel && supabase) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  },
};

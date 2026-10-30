import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Incident, IncidentType, LocationData } from '../types';
import { incidentService } from '../services/incidentService';
import { aiTriageService } from '../services/aiTriageService';
import { useAuth } from './AuthContext';
import { useLocation } from './LocationContext';

interface IncidentContextType {
  activeIncident: Incident | null;
  historyIncidents: Incident[];
  isSubmittingSOS: boolean;
  error: string | null;
  triggerSOS: (options?: {
    type?: IncidentType;
    description?: string;
  }) => Promise<{ incident: Incident | null; error: Error | null }>;
  resolveCurrentIncident: (reason?: string) => Promise<boolean>;
  cancelCurrentIncident: (reason: string) => Promise<boolean>;
  updateIncidentDetails: (
    id: string,
    details: { type?: IncidentType; description?: string }
  ) => Promise<boolean>;
  refreshActiveIncident: () => Promise<void>;
}

const IncidentContext = createContext<IncidentContextType | undefined>(undefined);

export const IncidentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { location, requestLocation } = useLocation();

  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [historyIncidents, setHistoryIncidents] = useState<Incident[]>([]);
  const [isSubmittingSOS, setIsSubmittingSOS] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing active incident or history
  const refreshActiveIncident = useCallback(async () => {
    if (!user) return;
    try {
      const active = await incidentService.getActiveIncident(user.id);
      setActiveIncident(active);
      const all = incidentService.getAllLocalIncidents().filter((i) => i.userId === user.id);
      setHistoryIncidents(all);
    } catch (err: unknown) {
      console.warn('Error refreshing active incident:', err);
    }
  }, [user]);

  useEffect(() => {
    refreshActiveIncident();
  }, [refreshActiveIncident]);

  // Subscribe to realtime updates for active incident
  useEffect(() => {
    if (!activeIncident?.id) return;

    const unsubscribe = incidentService.subscribeToIncident(activeIncident.id, (updated) => {
      setActiveIncident(updated);
      setHistoryIncidents((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );
    });

    return () => {
      unsubscribe();
    };
  }, [activeIncident?.id]);

  const triggerSOS = async (options?: {
    type?: IncidentType;
    description?: string;
  }): Promise<{ incident: Incident | null; error: Error | null }> => {
    if (!user) {
      return {
        incident: null,
        error: new Error('User session is required to trigger emergency SOS.'),
      };
    }

    setIsSubmittingSOS(true);
    setError(null);

    // 1. Ensure location is captured; if not yet available, attempt fast fetch
    let incidentLocation = location;
    if (!incidentLocation) {
      try {
        incidentLocation = await requestLocation();
      } catch {
        // Continue with fallback
      }
    }

    // Safe fallback if device GPS is completely blocked or unavailable
    // Clearly flag accuracy as undefined or landmark estimate
    const finalLocation: LocationData = incidentLocation || {
      latitude: 12.9716, // Default city center fallback with clear flag
      longitude: 77.5946,
      accuracyMeters: 2500,
      addressText: 'Location permission unavailable (Approx. City Area)',
      timestamp: Date.now(),
    };

    const incidentType: IncidentType = options?.type || 'SOS_EMERGENCY';
    const note = options?.description || 'Emergency SOS triggered by citizen';

    // 2. Create Incident immediately (DO NOT WAIT FOR AI)
    const { incident, error: createError } = await incidentService.createIncident({
      userId: user.id,
      type: incidentType,
      severity: 'CRITICAL',
      description: note,
      location: finalLocation,
    });

    if (createError || !incident) {
      setIsSubmittingSOS(false);
      setError(createError?.message || 'Failed to dispatch SOS to backend.');
      return { incident: null, error: createError || new Error('Dispatch failed') };
    }

    setActiveIncident(incident);
    setHistoryIncidents((prev) => [incident, ...prev]);
    setIsSubmittingSOS(false);

    // 3. Asynchronously request AI Triage in background without blocking UI
    aiTriageService
      .analyzeEmergencyReport({
        text: note,
        location: finalLocation,
        userId: user.id,
      })
      .then((triage) => {
        if (triage) {
          incident.aiTriage = triage;
          incidentService.saveIncidentLocally(incident);
          setActiveIncident({ ...incident });
        }
      })
      .catch(() => {});

    return { incident, error: null };
  };

  const resolveCurrentIncident = async (reason?: string): Promise<boolean> => {
    if (!activeIncident) return false;
    const { success, error: err } = await incidentService.updateIncidentStatus(
      activeIncident.id,
      'RESOLVED',
      reason
    );
    if (success) {
      setActiveIncident(null);
      await refreshActiveIncident();
      return true;
    }
    if (err) setError(err.message);
    return false;
  };

  const cancelCurrentIncident = async (reason: string): Promise<boolean> => {
    if (!activeIncident) return false;
    const { success, error: err } = await incidentService.updateIncidentStatus(
      activeIncident.id,
      'CANCELLED',
      reason
    );
    if (success) {
      setActiveIncident(null);
      await refreshActiveIncident();
      return true;
    }
    if (err) setError(err.message);
    return false;
  };

  const updateIncidentDetails = async (
    id: string,
    details: { type?: IncidentType; description?: string }
  ): Promise<boolean> => {
    const { success, error: err } = await incidentService.updateIncidentDetails(id, details);
    if (success) {
      await refreshActiveIncident();

      // Background AI triage enrichment with the newly provided details
      if (details.description || details.type) {
        const fullDesc = [details.type ? `Category: ${details.type}` : '', details.description || '']
          .filter(Boolean)
          .join('. ');
        aiTriageService
          .analyzeEmergencyReport({
            text: fullDesc,
            location: activeIncident?.location,
            userId: user?.id,
          })
          .then((triage) => {
            if (triage) {
              const current = incidentService.getAllLocalIncidents().find((i) => i.id === id);
              if (current) {
                current.aiTriage = triage;
                incidentService.saveIncidentLocally(current);
                incidentService.notifyListeners(current);
                if (activeIncident?.id === id) {
                  setActiveIncident({ ...current });
                }
              }
            }
          })
          .catch(() => {});
      }

      return true;
    }
    if (err) setError(err.message);
    return false;
  };

  return (
    <IncidentContext.Provider
      value={{
        activeIncident,
        historyIncidents,
        isSubmittingSOS,
        error,
        triggerSOS,
        resolveCurrentIncident,
        cancelCurrentIncident,
        updateIncidentDetails,
        refreshActiveIncident,
      }}
    >
      {children}
    </IncidentContext.Provider>
  );
};

export const useIncident = (): IncidentContextType => {
  const context = useContext(IncidentContext);
  if (!context) {
    throw new Error('useIncident must be used within an IncidentProvider');
  }
  return context;
};

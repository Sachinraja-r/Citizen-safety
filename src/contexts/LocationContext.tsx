import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { LocationData } from '../types';
import { locationService } from '../services/locationService';

const CACHED_LOCATION_KEY = 'raksha_last_known_location';

function getCachedLocation(): LocationData | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CACHED_LOCATION_KEY) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

interface LocationContextType {
  location: LocationData | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  permission: 'prompt' | 'granted' | 'denied' | 'unsupported';
  addressText: string | null;
  isContinuousTracking: boolean;
  requestLocation: () => Promise<LocationData | null>;
  retryLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<LocationData | null>(() => getCachedLocation());
  const [accuracy, setAccuracy] = useState<number | null>(() => getCachedLocation()?.accuracyMeters ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [addressText, setAddressText] = useState<string | null>(() => getCachedLocation()?.addressText ?? null);
  const [isContinuousTracking, setIsContinuousTracking] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const isStartingRef = useRef(false);

  /**
   * Continuous high-accuracy GPS tracking.
   * Prompts once on first app entry, then permanently stays active in the background.
   * Cannot be turned off by user until app/browser is closed.
   */
  const startContinuousTracking = useCallback(async (): Promise<LocationData | null> => {
    if (!locationService.isSupported()) {
      setPermission('unsupported');
      setError('Geolocation is not supported by your browser.');
      return null;
    }

    if (isStartingRef.current && watchIdRef.current) {
      return location;
    }
    isStartingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // 1. Initial immediate lock (requests permission if needed)
      const freshLoc = await locationService.getCurrentPosition();
      setLocation(freshLoc);
      setAccuracy(freshLoc.accuracyMeters ?? null);
      setPermission('granted');
      setIsContinuousTracking(true);

      try {
        localStorage.setItem(CACHED_LOCATION_KEY, JSON.stringify(freshLoc));
      } catch {
        // ignore
      }

      // Reverse geocode in background
      locationService.reverseGeocode(freshLoc.latitude, freshLoc.longitude).then((addr) => {
        setAddressText(addr);
        setLocation((prev) => {
          if (!prev) return null;
          const merged = { ...prev, addressText: addr };
          try {
            localStorage.setItem(CACHED_LOCATION_KEY, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      });

      // 2. Start permanent watchPosition for continuous real-time lock
      if (!watchIdRef.current) {
        watchIdRef.current = locationService.watchPosition(
          (updated) => {
            setLocation((prev) => {
              const merged: LocationData = {
                ...updated,
                addressText: prev?.addressText,
              };
              try {
                localStorage.setItem(CACHED_LOCATION_KEY, JSON.stringify(merged));
              } catch {}
              return merged;
            });
            setAccuracy(updated.accuracyMeters ?? null);
            setIsContinuousTracking(true);
            setPermission('granted');
            setError(null);
          },
          (err) => {
            console.warn('Continuous GPS watch notification:', err.message);
            // Do not terminate continuous tracking on intermittent GPS satellite dips
          }
        );
      }

      setLoading(false);
      isStartingRef.current = false;
      return freshLoc;
    } catch (err: unknown) {
      const msg = (err as Error).message;
      setError(msg);
      if (msg.includes('denied')) {
        setPermission('denied');
      }
      setLoading(false);
      isStartingRef.current = false;
      return null;
    }
  }, [location]);

  // AUTO-START ON PWA ENTRY:
  // Starts GPS immediately when user enters the PWA.
  // Never asks again in between once allowed.
  useEffect(() => {
    let isMounted = true;

    const autoStart = async () => {
      const status = await locationService.queryPermissionStatus();
      if (!isMounted) return;

      if (status === 'denied') {
        setPermission('denied');
        setError('Location access is blocked. Enable location in your browser settings for real-time 24/7 safety tracking.');
        return;
      }

      // Automatically trigger continuous GPS on enter (for both 'prompt' and 'granted')
      startContinuousTracking();
    };

    autoStart();

    // Auto-reconnect heartbeat: When app/tab becomes visible again, verify GPS is still live
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && permission !== 'denied') {
        startContinuousTracking();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (watchIdRef.current) {
        locationService.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [startContinuousTracking, permission]);

  const retryLocation = async () => {
    await startContinuousTracking();
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        accuracy,
        loading,
        error,
        permission,
        addressText,
        isContinuousTracking,
        requestLocation: startContinuousTracking,
        retryLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

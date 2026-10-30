import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { LocationData } from '../types';
import { locationService } from '../services/locationService';

interface LocationContextType {
  location: LocationData | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  permission: 'prompt' | 'granted' | 'denied' | 'unsupported';
  addressText: string | null;
  requestLocation: () => Promise<LocationData | null>;
  retryLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [addressText, setAddressText] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Check initial browser permission status without prompting
  useEffect(() => {
    const checkPerm = async () => {
      const status = await locationService.queryPermissionStatus();
      if (status === 'granted') {
        setPermission('granted');
        requestLocation();
      } else if (status === 'denied') {
        setPermission('denied');
        setError('Location access has been blocked. Enable location permissions in browser settings for accurate emergency dispatch.');
      } else if (status === 'prompt') {
        setPermission('prompt');
      } else {
        setPermission('unsupported');
      }
    };
    checkPerm();

    return () => {
      if (watchIdRef.current) {
        locationService.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const requestLocation = useCallback(async (): Promise<LocationData | null> => {
    setLoading(true);
    setError(null);

    try {
      const loc = await locationService.getCurrentPosition();
      setLocation(loc);
      setAccuracy(loc.accuracyMeters ?? null);
      setPermission('granted');

      // Fetch reverse geocoded neighborhood
      locationService.reverseGeocode(loc.latitude, loc.longitude).then((addr) => {
        setAddressText(addr);
        setLocation((prev) => (prev ? { ...prev, addressText: addr } : null));
      });

      // Start background watching for high accuracy during active session
      if (!watchIdRef.current) {
        watchIdRef.current = locationService.watchPosition(
          (updated) => {
            setLocation((prev) => ({
              ...updated,
              addressText: prev?.addressText,
            }));
            setAccuracy(updated.accuracyMeters ?? null);
          },
          (err) => {
            console.warn('Watch position warning:', err.message);
          }
        );
      }

      setLoading(false);
      return loc;
    } catch (err: unknown) {
      const msg = (err as Error).message;
      setError(msg);
      if (msg.includes('denied')) {
        setPermission('denied');
      }
      setLoading(false);
      return null;
    }
  }, []);

  const retryLocation = async () => {
    await requestLocation();
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
        requestLocation,
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

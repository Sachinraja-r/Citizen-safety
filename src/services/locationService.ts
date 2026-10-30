import { LocationData } from '../types';

export const locationService = {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'geolocation' in navigator;
  },

  async queryPermissionStatus(): Promise<PermissionState | 'unsupported'> {
    if (!navigator.permissions || !navigator.permissions.query) {
      return 'unsupported';
    }
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return status.state;
    } catch {
      return 'unsupported';
    }
  },

  getCurrentPosition(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: Math.round(position.coords.accuracy),
            timestamp: position.timestamp,
          };
          resolve(location);
        },
        (error) => {
          let message = 'Unable to retrieve location.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location permission was denied. Please allow location access in your browser or device settings to send real-time coordinates.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'GPS location is currently unavailable. Please verify device location is turned on.';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out. Retrying with network location...';
              break;
          }
          reject(new Error(message));
        },
        options
      );
    });
  },

  watchPosition(
    onSuccess: (location: LocationData) => void,
    onError: (err: Error) => void
  ): number | null {
    if (!this.isSupported()) {
      onError(new Error('Geolocation is not supported.'));
      return null;
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        onSuccess({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Math.round(position.coords.accuracy),
          timestamp: position.timestamp,
        });
      },
      (error) => {
        onError(new Error(error.message || 'GPS location tracking lost'));
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000,
      }
    );
  },

  clearWatch(watchId: number): void {
    if (this.isSupported() && watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
  },

  // Friendly reverse geocoding via OpenStreetMap Nominatim with fast fallback
  async reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'RakshaSafetyPWA/1.0',
          },
          signal: AbortSignal.timeout(3500),
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(', ');
          // Return concise landmark, area, city
          return parts.slice(0, 3).join(', ');
        }
      }
    } catch {
      // Fallback
    }

    // Heuristic coordinates fallback
    return `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
  },
};

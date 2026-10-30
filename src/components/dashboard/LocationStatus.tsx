import React from 'react';
import { useLocation } from '../../contexts/LocationContext';
import { MapPin, AlertCircle, RefreshCw } from 'lucide-react';

export const LocationStatus: React.FC = () => {
  const { location, accuracy, loading, error, permission, addressText, retryLocation } = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-between bg-white border border-[#F3D9E2] shadow-sm rounded-xl px-3.5 py-2.5 text-xs text-[#2D1B24]">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-[#E91E63] animate-spin" />
          <span>Acquiring high-accuracy GPS coordinates...</span>
        </div>
      </div>
    );
  }

  if (permission === 'denied' || error) {
    return (
      <div className="flex items-center justify-between bg-red-50 border border-red-200 shadow-sm rounded-xl px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2 text-red-700 font-medium">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="truncate max-w-[210px] sm:max-w-none">
            {permission === 'denied' ? 'GPS Permission Blocked' : 'GPS Unavailable'}
          </span>
        </div>
        <button
          onClick={retryLocation}
          className="text-red-600 font-bold hover:text-red-700 underline underline-offset-2 shrink-0 ml-2"
        >
          Enable / Retry
        </button>
      </div>
    );
  }

  if (location) {
    return (
      <div className="flex items-center justify-between bg-white border border-[#F3D9E2] shadow-sm rounded-xl px-3.5 py-2.5 text-xs text-[#2D1B24]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <span className="truncate text-[#2D1B24] font-medium">
            {addressText || (typeof location?.latitude === 'number' ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Location telemetry active')}
          </span>
        </div>
        {accuracy !== null && (
          <span className="text-[11px] text-[#7A6570] bg-[#FFF5F8] px-2 py-0.5 rounded-full shrink-0 ml-2 border border-[#F3D9E2] font-mono">
            ±{accuracy}m
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-white border border-[#F3D9E2] shadow-sm rounded-xl px-3.5 py-2.5 text-xs text-[#7A6570]">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-[#7A6570]" />
        <span>Location permission not requested</span>
      </div>
      <button
        onClick={retryLocation}
        className="text-[#E91E63] font-semibold hover:text-[#D81B60] shrink-0 ml-2"
      >
        Detect Location
      </button>
    </div>
  );
};

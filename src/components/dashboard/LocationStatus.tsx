import React from 'react';
import { useLocation } from '../../contexts/LocationContext';
import { MapPin, AlertCircle, RefreshCw } from 'lucide-react';

export const LocationStatus: React.FC = () => {
  const { location, accuracy, loading, error, permission, addressText, retryLocation } = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-between bg-white border border-slate-200 shadow-sm rounded-xl px-3.5 py-2.5 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-pink-600 animate-spin" />
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
      <div className="flex items-center justify-between bg-white border border-slate-200 shadow-sm rounded-xl px-3.5 py-2.5 text-xs text-slate-700">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <span className="truncate text-slate-800 font-medium">
            {addressText || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
          </span>
        </div>
        {accuracy !== null && (
          <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 ml-2 border border-slate-200 font-mono">
            ±{accuracy}m
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-white border border-slate-200 shadow-sm rounded-xl px-3.5 py-2.5 text-xs text-slate-500">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-slate-500" />
        <span>Location permission not requested</span>
      </div>
      <button
        onClick={retryLocation}
        className="text-blue-400 font-semibold hover:text-blue-300 shrink-0 ml-2"
      >
        Detect Location
      </button>
    </div>
  );
};

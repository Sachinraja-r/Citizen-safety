import React from 'react';
import { useLocation } from '../../contexts/LocationContext';
import { MapPin, AlertCircle, RefreshCw } from 'lucide-react';

export const LocationStatus: React.FC = () => {
  const { location, accuracy, loading, error, permission, addressText, retryLocation } = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-between bg-[#111827] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
          <span>Acquiring high-accuracy GPS coordinates...</span>
        </div>
      </div>
    );
  }

  if (permission === 'denied' || error) {
    return (
      <div className="flex items-center justify-between bg-red-950/20 border border-red-500/30 rounded-xl px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2 text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="truncate max-w-[210px] sm:max-w-none">
            {permission === 'denied' ? 'GPS Permission Blocked' : 'GPS Unavailable'}
          </span>
        </div>
        <button
          onClick={retryLocation}
          className="text-red-400 font-semibold hover:text-red-300 underline underline-offset-2 shrink-0 ml-2"
        >
          Enable / Retry
        </button>
      </div>
    );
  }

  if (location) {
    return (
      <div className="flex items-center justify-between bg-[#111827] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="truncate text-slate-200 font-medium">
            {addressText || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
          </span>
        </div>
        {accuracy !== null && (
          <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full shrink-0 ml-2 border border-slate-700/50">
            ±{accuracy}m
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between bg-[#111827] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400">
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

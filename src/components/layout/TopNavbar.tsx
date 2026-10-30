import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useIncident } from '../../contexts/IncidentContext';
import { ShieldAlert, Shield, User } from 'lucide-react';

export const TopNavbar: React.FC = () => {
  const { user, isDemo } = useAuth();
  const { activeIncident } = useIncident();
  const navigate = useNavigate();

  const hasActiveIncident = activeIncident && activeIncident.status !== 'RESOLVED' && activeIncident.status !== 'CANCELLED';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-sm px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => navigate('/app')}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <img src="/logo.svg" alt="Raksha Logo" className="w-8 h-8 drop-shadow" />
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-slate-900 tracking-wide">RAKSHA</span>
              {isDemo && (
                <span className="text-[10px] bg-pink-50 text-pink-700 font-bold px-1.5 py-0.2 rounded border border-pink-200">
                  DEMO MODE
                </span>
              )}
            </div>
            <p className="text-[10px] text-pink-600 -mt-1 font-semibold tracking-tight">Citizen Safety Platform</p>
          </div>
        </div>

        {/* Status / Active Alert / Profile */}
        <div className="flex items-center gap-2.5">
          {hasActiveIncident ? (
            <button
              onClick={() => navigate(`/app/incidents/${activeIncident.id}`)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold shadow-md shadow-red-500/30 animate-pulse"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>SOS ACTIVE</span>
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-pink-700 bg-pink-50 border border-pink-200 px-2.5 py-0.5 rounded-full">
              <Shield className="w-3 h-3 text-pink-600" /> Shield Active
            </span>
          )}

          <button
            onClick={() => navigate('/app/profile')}
            className="w-8 h-8 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-700 hover:bg-pink-100 transition-colors shadow-sm"
            aria-label="User Profile"
          >
            {user?.fullName ? (
              <span className="text-xs font-bold text-pink-700">
                {user.fullName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <User className="w-4 h-4 text-pink-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

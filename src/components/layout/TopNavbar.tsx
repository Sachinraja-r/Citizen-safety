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
    <header className="sticky top-0 z-40 w-full bg-[#080c14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => navigate('/app')}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <img src="/logo.svg" alt="Raksha Logo" className="w-8 h-8 drop-shadow" />
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-white tracking-wide">RAKSHA</span>
              {isDemo && (
                <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                  DEMO MODE
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 -mt-1 font-medium">Citizen Safety Platform</p>
          </div>
        </div>

        {/* Status / Active Alert / Profile */}
        <div className="flex items-center gap-2.5">
          {hasActiveIncident ? (
            <button
              onClick={() => navigate(`/app/incidents/${activeIncident.id}`)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-950/60 animate-pulse"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>SOS ACTIVE</span>
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              <Shield className="w-3 h-3" /> Shield Active
            </span>
          )}

          <button
            onClick={() => navigate('/app/profile')}
            className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
            aria-label="User Profile"
          >
            {user?.fullName ? (
              <span className="text-xs font-bold text-blue-400">
                {user.fullName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <User className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

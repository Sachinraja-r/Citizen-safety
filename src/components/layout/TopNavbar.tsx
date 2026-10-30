import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useIncident } from '../../contexts/IncidentContext';
import { ShieldAlert, Shield, User } from 'lucide-react';
import { RakshaLogo } from '../common/RakshaLogo';

export const TopNavbar: React.FC = () => {
  const { user, isDemo } = useAuth();
  const { activeIncident } = useIncident();
  const navigate = useNavigate();

  const hasActiveIncident = activeIncident && activeIncident.status !== 'RESOLVED' && activeIncident.status !== 'CANCELLED';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#F3D9E2] shadow-sm px-4 py-2.5">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        {/* Brand with new logo */}
        <div
          onClick={() => navigate('/app')}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <RakshaLogo variant="full" size="sm" showTagline={true} />
          {isDemo && (
            <span className="text-[10px] bg-[#FFF5F8] text-[#D81B60] font-bold px-2 py-0.5 rounded-full border border-[#F3D9E2] ml-1">
              DEMO
            </span>
          )}
        </div>

        {/* Status / Active Alert / Profile */}
        <div className="flex items-center gap-2.5">
          {hasActiveIncident ? (
            <button
              onClick={() => navigate(`/app/incidents/${activeIncident.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/30 animate-pulse"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>SOS ACTIVE</span>
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-[#D81B60] bg-[#FFF5F8] border border-[#F3D9E2] px-2.5 py-1 rounded-full">
              <Shield className="w-3 h-3 text-[#E91E63]" /> Shield Active
            </span>
          )}

          <button
            onClick={() => navigate('/app/profile')}
            className="w-9 h-9 rounded-full bg-[#FFF5F8] border border-[#F3D9E2] flex items-center justify-center text-[#D81B60] hover:bg-[#F8BBD0]/40 transition-colors shadow-sm"
            aria-label="User Profile"
          >
            {user?.fullName ? (
              <span className="text-xs font-bold text-[#D81B60]">
                {user.fullName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <User className="w-4 h-4 text-[#E91E63]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

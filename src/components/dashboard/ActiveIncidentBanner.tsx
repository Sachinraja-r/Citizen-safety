import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIncident } from '../../contexts/IncidentContext';
import { ArrowRight, ShieldAlert } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { formatIncidentType } from '../../utils/formatters';

export const ActiveIncidentBanner: React.FC = () => {
  const { activeIncident } = useIncident();
  const navigate = useNavigate();

  if (!activeIncident || activeIncident.status === 'RESOLVED' || activeIncident.status === 'CANCELLED') {
    return null;
  }

  return (
    <div
      onClick={() => navigate(`/app/incidents/${activeIncident.id}`)}
      className="cursor-pointer bg-gradient-to-r from-red-950/40 via-red-900/30 to-slate-900 border-2 border-red-500/50 rounded-2xl p-4 shadow-lg shadow-red-950/30 hover:border-red-400 transition-all mb-5 group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-red-600/30 rounded-lg text-red-400">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Active Incident</span>
            <h4 className="text-sm font-semibold text-white">{formatIncidentType(activeIncident.type)}</h4>
          </div>
        </div>
        <StatusBadge status={activeIncident.status} size="sm" />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-red-500/20">
        <span>Incident #{activeIncident.id}</span>
        <span className="text-red-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
          View Live Tracking & Map <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};

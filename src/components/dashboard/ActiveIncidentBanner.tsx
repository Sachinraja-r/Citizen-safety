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
      className="cursor-pointer bg-gradient-to-r from-red-50 via-pink-50/60 to-white border-2 border-red-500 rounded-2xl p-4 shadow-md hover:border-red-600 transition-all mb-5 group text-left"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-100 rounded-xl text-red-600">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-black text-red-600 uppercase tracking-wider">Active Incident</span>
            <h4 className="text-sm font-bold text-slate-900">{formatIncidentType(activeIncident.type)}</h4>
          </div>
        </div>
        <StatusBadge status={activeIncident.status} size="sm" />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-red-100">
        <span className="font-mono font-semibold">Incident #{activeIncident.id}</span>
        <span className="text-red-600 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
          View Live Tracking &amp; Map <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};

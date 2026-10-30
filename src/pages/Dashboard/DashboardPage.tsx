import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useIncident } from '../../contexts/IncidentContext';
import { LocationStatus } from '../../components/dashboard/LocationStatus';
import { ActiveIncidentBanner } from '../../components/dashboard/ActiveIncidentBanner';
import { SOSButton } from '../../components/dashboard/SOSButton';
import { EmergencyCategories } from '../../components/dashboard/EmergencyCategories';
import { TrustedContactsPreview } from '../../components/dashboard/TrustedContactsPreview';
import { SafetyTips } from '../../components/dashboard/SafetyTips';
import { IncidentType } from '../../types';
import { formatIncidentType, formatRelativeTime } from '../../utils/formatters';
import { Clock, ChevronRight } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSubmittingSOS, historyIncidents } = useIncident();

  const handleSOSTrigger = () => {
    navigate('/app/sos');
  };

  const handleCategorySelect = (category: IncidentType) => {
    navigate('/app/sos', { state: { preselectedType: category } });
  };

  return (
    <div className="w-full text-center animate-fade-in pb-6">
      {/* Greeting and quick status */}
      <div className="flex items-center justify-between mb-4 text-left">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-pink-600">
            Civilian Protection • Pink Hoysala Mesh
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            Hello, {user?.fullName?.split(' ')[0] || 'Citizen'}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Ready</span>
        </div>
      </div>

      {/* Persistent GPS Status Pill */}
      <div className="mb-4">
        <LocationStatus />
      </div>

      {/* Active Incident Persistent Alert Banner */}
      <ActiveIncidentBanner />

      {/* Main Tactical SOS Button — BOLD RED */}
      <SOSButton onTrigger={handleSOSTrigger} isLoading={isSubmittingSOS} />

      {/* Quick Emergency Category Shortcuts */}
      <EmergencyCategories onSelectCategory={handleCategorySelect} />

      {/* Trusted Emergency Contacts Preview */}
      <TrustedContactsPreview />

      {/* Safety Instructions & Silent SOS Tip */}
      <SafetyTips />

      {/* Emergency History Section (if any past incidents exist) */}
      {historyIncidents.length > 0 && (
        <div className="w-full text-left my-5 bg-white border border-slate-200/90 shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-pink-600" />
              Recent Emergency History
            </h3>
          </div>

          <div className="space-y-2">
            {historyIncidents.slice(0, 3).map((incident) => (
              <div
                key={incident.id}
                onClick={() => navigate(`/app/incidents/${incident.id}`)}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70 cursor-pointer hover:border-pink-300 hover:bg-pink-50/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {formatIncidentType(incident.type)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      #{incident.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {formatRelativeTime(incident.createdAt)} • Status:{' '}
                    <span className="font-semibold text-slate-700">{incident.status}</span>
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

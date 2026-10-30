import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIncident } from '../../contexts/IncidentContext';
import { incidentService } from '../../services/incidentService';
import { Incident } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { MapView } from '../../components/maps/MapView';
import { ResponderCard } from '../../components/emergency/ResponderCard';
import { IncidentTimeline } from '../../components/emergency/IncidentTimeline';
import { CancelIncidentModal } from '../../components/emergency/CancelIncidentModal';
import { formatIncidentType, formatRelativeTime } from '../../utils/formatters';
import { ArrowLeft, CheckCircle2, XCircle, Sparkles, AlertOctagon, PhoneCall } from 'lucide-react';

export const ActiveIncidentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeIncident, resolveCurrentIncident, cancelCurrentIncident } = useIncident();

  const [incident, setIncident] = useState<Incident | null>(activeIncident);
  const [loading, setLoading] = useState(!activeIncident || activeIncident.id !== id);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Subscribe to live updates for this incident
  useEffect(() => {
    if (!id) return;

    incidentService.getIncident(id).then((data) => {
      if (data) setIncident(data);
      setLoading(false);
    });

    const unsubscribe = incidentService.subscribeToIncident(id, (updated) => {
      setIncident(updated);
    });

    return () => {
      unsubscribe();
    };
  }, [id]);

  // Sync if activeIncident in context updates
  useEffect(() => {
    if (activeIncident && activeIncident.id === id) {
      setIncident(activeIncident);
    }
  }, [activeIncident, id]);

  const handleResolve = async () => {
    if (!incident) return;
    setActionLoading(true);
    await resolveCurrentIncident('Citizen confirmed safe.');
    setActionLoading(false);
    navigate('/app');
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!incident) return;
    setActionLoading(true);
    await cancelCurrentIncident(reason);
    setActionLoading(false);
    setIsCancelModalOpen(false);
    navigate('/app');
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading incident #{id} telemetry...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="py-16 text-center">
        <AlertOctagon className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-1">Incident Record Not Found</h3>
        <p className="text-xs text-slate-400 mb-4">The requested emergency incident reference does not exist.</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/app')}>
          Return to Safety Dashboard
        </Button>
      </div>
    );
  }

  const isClosed = incident.status === 'RESOLVED' || incident.status === 'CANCELLED';

  return (
    <div className="w-full text-left animate-fade-in pb-10 space-y-4">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" /> Safety Dashboard
        </button>

        <span className="text-xs font-mono text-slate-500">#{incident.id}</span>
      </div>

      {/* Incident Header Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block mb-0.5">
              Emergency Dispatch Report
            </span>
            <h1 className="text-lg sm:text-xl font-black text-white">
              {formatIncidentType(incident.type)}
            </h1>
          </div>
          <StatusBadge status={incident.status} />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <span>Logged: {formatRelativeTime(incident.createdAt)}</span>
          <span>•</span>
          <span className="truncate">
            {incident.location.addressText || `${incident.location.latitude.toFixed(4)}, ${incident.location.longitude.toFixed(4)}`}
          </span>
        </div>

        {incident.description && (
          <p className="text-xs text-slate-300 mt-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            "{incident.description}"
          </p>
        )}
      </div>

      {/* Live Map with Incident & Responder GPS Coordinates */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-slate-400 uppercase tracking-wider">
            Live Tactical GPS Map
          </span>
          {incident.assignedResponder && (
            <span className="text-blue-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              Tracking Unit
            </span>
          )}
        </div>

        <MapView
          incidentLocation={incident.location}
          responder={incident.assignedResponder}
          height="280px"
          zoom={15}
        />
      </div>

      {/* Assigned Responder Unit Card */}
      <ResponderCard responder={incident.assignedResponder} />

      {/* AI Triage Intelligence Enrichment (Member 3) */}
      {incident.aiTriage && (
        <div className="bg-[#111827] border border-purple-500/30 rounded-2xl p-4 text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-purple-600/20 rounded-lg text-purple-400 border border-purple-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">AI Emergency Triage Insights</h4>
              <p className="text-[10px] text-slate-400">Processed by Raksha AI Engine</p>
            </div>
          </div>

          <div className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <p>
              <strong className="text-slate-200">Dispatcher Summary:</strong> {incident.aiTriage.summaryEn}
            </p>
            {incident.aiTriage.recommendedAction && (
              <p>
                <strong className="text-purple-300">Action Plan:</strong> {incident.aiTriage.recommendedAction}
              </p>
            )}
            <div className="flex gap-2 text-[10px] text-slate-400 pt-1">
              <span>Severity: {incident.aiTriage.severityScore}/5</span>
              <span>•</span>
              <span>Confidence: {Math.round(incident.aiTriage.confidence * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Incident Event Timeline */}
      <IncidentTimeline currentStatus={incident.status} events={incident.timeline} />

      {/* Immediate Hotlines Shortcut */}
      <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
        <span className="text-slate-300 font-medium">Direct Police & Medical Helpline</span>
        <a
          href="tel:112"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 font-bold hover:bg-red-600/30"
        >
          <PhoneCall className="w-3.5 h-3.5" /> Call 112
        </a>
      </div>

      {/* Action Buttons (Resolve or Cancel) */}
      {!isClosed ? (
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="success"
            size="lg"
            className="flex-1 font-bold shadow-md"
            onClick={handleResolve}
            isLoading={actionLoading}
            leftIcon={<CheckCircle2 className="w-5 h-5" />}
          >
            I Am Safe • Resolve Incident
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            className="border-rose-500/40 text-rose-300 hover:bg-rose-950/30"
            onClick={() => setIsCancelModalOpen(true)}
            disabled={actionLoading}
            leftIcon={<XCircle className="w-4 h-4 text-rose-400" />}
          >
            Cancel Alert (False Alarm)
          </Button>
        </div>
      ) : (
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
          This emergency incident was closed at {incident.resolvedAt ? formatRelativeTime(incident.resolvedAt) : 'earlier'}.
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <CancelIncidentModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        isLoading={actionLoading}
      />
    </div>
  );
};

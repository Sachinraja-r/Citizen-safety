import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIncident } from '../../contexts/IncidentContext';
import { incidentService } from '../../services/incidentService';
import { Incident, IncidentType } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { MapView } from '../../components/maps/MapView';
import { ResponderCard } from '../../components/emergency/ResponderCard';
import { IncidentTimeline } from '../../components/emergency/IncidentTimeline';
import { CancelIncidentModal } from '../../components/emergency/CancelIncidentModal';
import { formatIncidentType, formatRelativeTime } from '../../utils/formatters';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  AlertOctagon,
  PhoneCall,
  Share2,
  Edit3,
  Check,
  X,
} from 'lucide-react';

const CATEGORY_OPTIONS: { type: IncidentType; label: string }[] = [
  { type: 'SOS_EMERGENCY', label: 'General / Critical SOS' },
  { type: 'MEDICAL_EMERGENCY', label: 'Medical Emergency' },
  { type: 'PHYSICAL_HARASSMENT_STALKING', label: 'Harassment / Stalking' },
  { type: 'DOMESTIC_VIOLENCE', label: 'Violence / Assault' },
  { type: 'SUSPICIOUS_ACTIVITY', label: 'Suspicious Activity' },
  { type: 'THEFT_OR_ROBBERY', label: 'Theft / Robbery' },
  { type: 'OTHER', label: 'Other' },
];

export const ActiveIncidentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    activeIncident,
    resolveCurrentIncident,
    cancelCurrentIncident,
    updateIncidentDetails,
  } = useIncident();

  const [incident, setIncident] = useState<Incident | null>(activeIncident);
  const [loading, setLoading] = useState(!activeIncident || activeIncident.id !== id);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Correction / Detail update states
  const [isEditing, setIsEditing] = useState(false);
  const [selectedType, setSelectedType] = useState<IncidentType>(
    incident?.type || 'SOS_EMERGENCY'
  );
  const [notes, setNotes] = useState(incident?.description || '');
  const [isSavingDetails, setIsSavingDetails] = useState(false);

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
      setSelectedType(activeIncident.type);
      setNotes(activeIncident.description || '');
    }
  }, [activeIncident, id]);

  const handleSaveDetails = async () => {
    if (!incident) return;
    setIsSavingDetails(true);
    await updateIncidentDetails(incident.id, {
      type: selectedType,
      description: notes.trim() || undefined,
    });
    setIncident((prev) =>
      prev
        ? {
            ...prev,
            type: selectedType,
            description: notes.trim() || prev.description,
          }
        : null
    );
    setIsSavingDetails(false);
    setIsEditing(false);
  };

  const handleWhatsAppShare = () => {
    if (!incident) return;
    const lat = incident.location.latitude;
    const lon = incident.location.longitude;
    const locText = incident.location.addressText || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    const msg = encodeURIComponent(
      `🚨 EMERGENCY SOS ALERT!\nI need immediate assistance.\nIncident ID: #${incident.id}\nCategory: ${formatIncidentType(incident.type)}\nLocation: ${locText}\nLive GPS Pin: https://maps.google.com/?q=${lat},${lon}\n(Sent from Raksha Emergency Platform)`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

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
          className="inline-flex items-center gap-1.5 text-xs text-[#7A6570] hover:text-[#E91E63] font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Safety Dashboard
        </button>

        <span className="text-xs font-mono text-[#7A6570]">#{incident.id}</span>
      </div>

      {/* Incident Header Card */}
      <div className="bg-white border border-[#F3D9E2] shadow-sm rounded-2xl p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D81B60] block mb-0.5">
              Emergency Dispatch Report
            </span>
            <h1 className="text-lg sm:text-xl font-black text-[#2D1B24]">
              {formatIncidentType(incident.type)}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {!isClosed && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-[11px] font-bold text-[#D81B60] hover:text-[#E91E63] px-2.5 py-1 rounded-lg bg-[#FFF5F8] border border-[#F3D9E2] inline-flex items-center gap-1 transition-colors"
                title="Update category or add details"
              >
                <Edit3 className="w-3 h-3 text-[#E91E63]" />
                Update Details
              </button>
            )}
            <StatusBadge status={incident.status} />
          </div>
        </div>

        {/* Category & Description Editor (if editing) */}
        {isEditing && (
          <div className="my-3 p-3.5 rounded-xl bg-[#FFF5F8] border border-[#F3D9E2] space-y-3 animate-fade-in">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D1B24] mb-1">
                Select / Correct Incident Category
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as IncidentType)}
                className="w-full bg-white text-[#2D1B24] text-xs rounded-xl px-3 py-2 border border-[#F3D9E2] focus:outline-none focus:border-[#E91E63] shadow-sm"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.type} value={c.type}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D1B24] mb-1">
                Optional Description / Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any specific location landmarks or immediate hazard description..."
                rows={2}
                className="w-full bg-white text-[#2D1B24] placeholder:text-[#7A6570] text-xs rounded-xl px-3 py-2 border border-[#F3D9E2] focus:outline-none focus:border-[#E91E63] shadow-sm resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedType(incident.type);
                  setNotes(incident.description || '');
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#F3D9E2] bg-white text-[#7A6570] text-xs font-semibold hover:bg-[#FFF5F8]"
              >
                <X className="w-3.5 h-3.5 inline mr-1" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDetails}
                disabled={isSavingDetails}
                className="px-3.5 py-1.5 rounded-lg bg-[#E91E63] hover:bg-[#D81B60] text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
              >
                <Check className="w-3.5 h-3.5 inline mr-1" />
                {isSavingDetails ? 'Updating...' : 'Save & Notify Responders'}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-[#7A6570] pt-2 border-t border-[#F3D9E2]">
          <span>Logged: {formatRelativeTime(incident.createdAt)}</span>
          <span>•</span>
          <span className="truncate">
            {incident.location.addressText || `${incident.location.latitude.toFixed(4)}, ${incident.location.longitude.toFixed(4)}`}
          </span>
        </div>

        {incident.description && !isEditing && (
          <p className="text-xs text-[#2D1B24] mt-2 bg-[#FFF5F8] p-2.5 rounded-xl border border-[#F3D9E2] font-medium">
            "{incident.description}"
          </p>
        )}
      </div>

      {/* Live Map with Incident & Responder GPS Coordinates */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-slate-600 uppercase tracking-wider">
            Live Tactical GPS Map
          </span>
          {incident.assignedResponder && (
            <span className="text-pink-600 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
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
        <div className="bg-white border border-[#F3D9E2] shadow-sm rounded-2xl p-4 text-left">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#FFF5F8] rounded-lg text-[#E91E63] border border-[#F3D9E2]">
                <Sparkles className="w-4 h-4 text-[#E91E63]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#2D1B24]">AI Emergency Triage Insights</h4>
                <p className="text-[10px] text-[#7A6570]">Processed by Member 3 AI Engine</p>
              </div>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#D81B60] bg-[#FFF5F8] px-2 py-0.5 rounded-full border border-[#F3D9E2]">
              AI Suggestion • Unverified
            </span>
          </div>

          <div className="text-xs text-[#2D1B24] bg-[#FFF5F8] p-3 rounded-xl border border-[#F3D9E2] space-y-1.5">
            <p>
              <strong className="text-[#2D1B24]">Dispatcher Summary:</strong> {incident.aiTriage.summaryEn}
            </p>
            {incident.aiTriage.recommendedAction && (
              <p>
                <strong className="text-[#D81B60]">Action Plan:</strong> {incident.aiTriage.recommendedAction}
              </p>
            )}
            <div className="flex gap-2 text-[10px] text-[#7A6570] pt-1 font-medium">
              <span>Severity: {incident.aiTriage.severityScore}/5</span>
              <span>•</span>
              <span>Confidence: {Math.round(incident.aiTriage.confidence * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Sharing Fallback (User-Initiated) */}
      <div className="p-3.5 bg-white border border-[#F3D9E2] shadow-sm rounded-2xl text-left space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#2D1B24]">
            Emergency WhatsApp Share
          </span>
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share via WhatsApp
          </button>
        </div>
        <p className="text-[10px] text-[#7A6570] leading-tight">
          User-initiated: Opens WhatsApp with pre-filled GPS coordinates. You must tap &quot;Send&quot; in WhatsApp to deliver the message.
        </p>
      </div>

      {/* Incident Event Timeline */}
      <IncidentTimeline currentStatus={incident.status} events={incident.timeline} />

      {/* Immediate Hotlines Shortcut */}
      <div className="p-3 bg-white border border-[#F3D9E2] shadow-sm rounded-2xl flex items-center justify-between text-xs">
        <span className="text-[#2D1B24] font-semibold">Direct Police &amp; Medical Helpline</span>
        <a
          href="tel:112"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 font-bold hover:bg-red-100 shadow-sm"
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

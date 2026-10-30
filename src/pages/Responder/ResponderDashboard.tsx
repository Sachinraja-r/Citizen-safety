import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveIncidentFeed } from '../../types/responder';
import { ResponderSession } from '../../types/responder';
import { incidentFeedService } from '../../services/incidentFeedService';
import { responderAuthService } from '../../services/responderAuthService';
import { MapView } from '../../components/maps/MapView';
import { formatIncidentType, formatRelativeTime, formatIncidentStatus } from '../../utils/formatters';
import {
  CheckCircle2, LogOut, MapPin, Clock,
  AlertOctagon, RefreshCw, Radio, Shield,
  Siren, Car,
} from 'lucide-react';

const SEVERITY_COLOR = {
  CRITICAL: 'text-red-400 bg-red-500/15 border-red-500/40',
  HIGH: 'text-orange-400 bg-orange-500/15 border-orange-500/40',
  MEDIUM: 'text-amber-400 bg-amber-500/15 border-amber-500/40',
  LOW: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40',
};

const STATUS_COLOR = {
  OPEN: 'text-red-400 bg-red-500/15 border-red-500/40',
  ASSIGNED: 'text-blue-400 bg-blue-500/15 border-blue-500/40',
  ON_SCENE: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40',
  RESOLVED: 'text-slate-400 bg-slate-700/20 border-slate-600/40',
  CANCELLED: 'text-rose-400 bg-rose-500/15 border-rose-500/40',
};

export const ResponderDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<ResponderSession | null>(null);
  const [incidents, setIncidents] = useState<LiveIncidentFeed[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<LiveIncidentFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const s = responderAuthService.getCurrentSession();
    if (!s) { navigate('/responder'); return; }
    setSession(s);

    incidentFeedService.getAllIncidents().then((data) => {
      setIncidents(data);
      if (data.length > 0) setSelectedIncident(data[0]);
      setLoading(false);
    });

    const unsubscribe = incidentFeedService.subscribeToFeed((data) => {
      setIncidents(data);
      setLastRefresh(new Date());
      // Keep selection updated
      setSelectedIncident(prev => {
        if (!prev) return data[0] || null;
        const updated = data.find(i => i.id === prev.id);
        return updated || prev;
      });
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleAccept = async (incidentId: string) => {
    if (!session) return;
    setActionLoading(incidentId + '-accept');
    await incidentFeedService.acceptIncident(incidentId, session.id, session.name);
    const fresh = await incidentFeedService.getAllIncidents();
    setIncidents(fresh);
    setSelectedIncident(fresh.find(i => i.id === incidentId) || null);
    setActionLoading(null);
  };

  const handleOnScene = async (incidentId: string) => {
    if (!session) return;
    setActionLoading(incidentId + '-scene');
    await incidentFeedService.markOnScene(incidentId, session.name);
    const fresh = await incidentFeedService.getAllIncidents();
    setIncidents(fresh);
    setSelectedIncident(fresh.find(i => i.id === incidentId) || null);
    setActionLoading(null);
  };

  const handleResolve = async (incidentId: string) => {
    if (!session) return;
    setActionLoading(incidentId + '-resolve');
    await incidentFeedService.resolveIncident(incidentId, session.name);
    const fresh = await incidentFeedService.getAllIncidents();
    setIncidents(fresh);
    setSelectedIncident(fresh.find(i => i.id === incidentId) || null);
    setActionLoading(null);
  };

  const handleLogout = () => {
    responderAuthService.logout();
    navigate('/responder');
  };

  const activeIncidents = incidents.filter(i => ['OPEN', 'ASSIGNED', 'ON_SCENE'].includes(i.status));
  const closedIncidents = incidents.filter(i => ['RESOLVED', 'CANCELLED'].includes(i.status));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        <span className="ml-3 text-slate-400 text-sm">Loading incident feed...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
      {/* Top Command Bar */}
      <header className="bg-[#0d1117] border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Raksha" className="w-7 h-7" />
          <div>
            <span className="font-black text-white text-base tracking-wide">RAKSHA</span>
            <span className="text-xs text-blue-400 font-semibold ml-2">Responder Command</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live pulse indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Live Feed</span>
          </div>

          {session && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-white">{session.name}</span>
              <span className="text-slate-400">· {session.badgeNumber}</span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 h-[calc(100vh-56px)] overflow-hidden">
        {/* ─── LEFT PANEL: Incident Queue ─── */}
        <aside className="w-full sm:w-80 lg:w-96 border-r border-slate-800 bg-[#0d1117] flex flex-col overflow-hidden">
          {/* Queue header */}
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <Siren className="w-4 h-4 text-red-400" />
                Incident Queue
              </h2>
              <span className="text-xs text-slate-500">
                Refreshed {Math.round((Date.now() - lastRefresh.getTime()) / 1000)}s ago
              </span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full font-bold">
                {activeIncidents.length} Active
              </span>
              <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-full">
                {closedIncidents.length} Closed
              </span>
            </div>
          </div>

          {/* Incident list */}
          <div className="flex-1 overflow-y-auto">
            {incidents.length === 0 ? (
              <div className="py-16 text-center px-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-bold text-white">No Active Incidents</p>
                <p className="text-xs text-slate-400 mt-1">
                  All clear. Monitoring for new emergency alerts...
                </p>
                <p className="text-xs text-slate-500 mt-3">
                  Ask a citizen to trigger an SOS from the citizen app to test the live flow.
                </p>
              </div>
            ) : (
              <div>
                {/* Active first */}
                {activeIncidents.length > 0 && (
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900/50">
                    Active Emergencies
                  </div>
                )}
                {activeIncidents.map((inc) => (
                  <IncidentQueueItem
                    key={inc.id}
                    incident={inc}
                    isSelected={selectedIncident?.id === inc.id}
                    onClick={() => setSelectedIncident(inc)}
                  />
                ))}

                {closedIncidents.length > 0 && (
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900/50 border-t border-slate-800">
                    Closed / Resolved
                  </div>
                )}
                {closedIncidents.map((inc) => (
                  <IncidentQueueItem
                    key={inc.id}
                    incident={inc}
                    isSelected={selectedIncident?.id === inc.id}
                    onClick={() => setSelectedIncident(inc)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ─── RIGHT PANEL: Incident Detail ─── */}
        <main className="flex-1 overflow-y-auto bg-[#0a0e1a] hidden sm:block">
          {!selectedIncident ? (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <AlertOctagon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Select an incident from the queue to view details</p>
              </div>
            </div>
          ) : (
            <IncidentDetailPanel
              incident={selectedIncident}
              session={session}
              actionLoading={actionLoading}
              onAccept={handleAccept}
              onOnScene={handleOnScene}
              onResolve={handleResolve}
            />
          )}
        </main>
      </div>
    </div>
  );
};

/* ─── Sub-components ─── */

const IncidentQueueItem: React.FC<{
  incident: LiveIncidentFeed;
  isSelected: boolean;
  onClick: () => void;
}> = ({ incident, isSelected, onClick }) => {
  const isClosed = ['RESOLVED', 'CANCELLED'].includes(incident.status);
  const statusMeta = formatIncidentStatus(incident.status as any);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-slate-800/60 transition-all ${
        isSelected
          ? 'bg-blue-950/30 border-l-2 border-l-blue-500'
          : 'hover:bg-slate-900/60 border-l-2 border-l-transparent'
      } ${isClosed ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          {!isClosed && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0 mt-0.5" />
          )}
          <span className="text-xs font-bold text-white leading-tight">
            {formatIncidentType(incident.type as any)}
          </span>
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
          (SEVERITY_COLOR as any)[incident.severity] || 'text-slate-400'
        }`}>
          {incident.severity}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
          (STATUS_COLOR as any)[incident.status] || ''
        }`}>
          {statusMeta.label}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(incident.createdAt)}
        </span>
        <span className="font-mono text-slate-600">#{incident.id.split('-').pop()}</span>
      </div>

      {incident.location.addressText && (
        <p className="mt-1 text-[11px] text-slate-500 truncate flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {incident.location.addressText}
        </p>
      )}
    </button>
  );
};

const IncidentDetailPanel: React.FC<{
  incident: LiveIncidentFeed;
  session: ResponderSession | null;
  actionLoading: string | null;
  onAccept: (id: string) => void;
  onOnScene: (id: string) => void;
  onResolve: (id: string) => void;
}> = ({ incident, session, actionLoading, onAccept, onOnScene, onResolve }) => {
  const statusMeta = formatIncidentStatus(incident.status as any);
  const isClosed = ['RESOLVED', 'CANCELLED'].includes(incident.status);
  const isAssignedToMe = incident.assignedResponderId === session?.id;

  return (
    <div className="p-5 space-y-5 max-w-3xl">
      {/* Incident Header */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {!isClosed && <AlertOctagon className="w-5 h-5 text-red-500 animate-pulse flex-shrink-0" />}
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Emergency Report #{incident.id}
              </span>
            </div>
            <h2 className="text-xl font-black text-white">
              {formatIncidentType(incident.type as any)}
            </h2>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              (SEVERITY_COLOR as any)[incident.severity] || ''
            }`}>
              {incident.severity} SEVERITY
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              (STATUS_COLOR as any)[incident.status] || ''
            }`}>
              {statusMeta.label}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Time Reported</span>
            <span className="text-white font-semibold">{formatRelativeTime(incident.createdAt)}</span>
            <span className="text-slate-500 block text-[10px]">
              {new Date(incident.createdAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Citizen ID</span>
            <span className="text-white font-mono font-semibold text-[11px]">{incident.reportedByUserId.slice(0, 16)}...</span>
          </div>

          <div className="col-span-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">
              <MapPin className="w-3 h-3 inline mr-1" />
              Incident GPS Coordinates
            </span>
            <span className="text-white font-mono text-sm font-bold">
              {incident.location.latitude.toFixed(5)}, {incident.location.longitude.toFixed(5)}
            </span>
            {incident.location.accuracyMeters && (
              <span className="text-slate-400 text-[11px] ml-2">±{incident.location.accuracyMeters}m accuracy</span>
            )}
            {incident.location.addressText && (
              <p className="text-slate-300 text-xs mt-1">{incident.location.addressText}</p>
            )}
          </div>
        </div>

        {incident.description && (
          <div className="mt-3 p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl">
            <span className="text-amber-400 text-[10px] font-bold uppercase block mb-1">Citizen's Description</span>
            <p className="text-slate-200 text-sm">"{incident.description}"</p>
          </div>
        )}
      </div>

      {/* Live Tactical Map */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-red-400" />
          Live GPS Tactical Map
        </h3>
        <MapView
          incidentLocation={incident.location}
          height="280px"
          zoom={15}
          interactive={true}
        />
      </div>

      {/* Responder Assignment Status */}
      {incident.assignedResponderId && (
        <div className="bg-blue-950/20 border border-blue-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Car className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Assigned Responder</span>
          </div>
          <p className="text-white font-bold text-sm">{incident.assignedResponderName}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Status: <span className="text-blue-300 font-semibold">{incident.status}</span>
          </p>
        </div>
      )}

      {/* Action Buttons (context-sensitive) */}
      {!isClosed && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            Dispatch Actions
          </h3>

          {incident.status === 'OPEN' && (
            <button
              onClick={() => onAccept(incident.id)}
              disabled={!!actionLoading}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-950/50 transition-colors"
            >
              {actionLoading === incident.id + '-accept' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Car className="w-5 h-5" />
              )}
              Accept & Dispatch Unit — En Route
            </button>
          )}

          {incident.status === 'ASSIGNED' && isAssignedToMe && (
            <button
              onClick={() => onOnScene(incident.id)}
              disabled={!!actionLoading}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {actionLoading === incident.id + '-scene' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-5 h-5" />
              )}
              Mark: Arrived On Scene
            </button>
          )}

          {incident.status === 'ASSIGNED' && !isAssignedToMe && (
            <div className="text-center py-3 text-sm text-slate-400">
              Assigned to <span className="text-white font-bold">{incident.assignedResponderName}</span>
            </div>
          )}

          {incident.status === 'ON_SCENE' && (isAssignedToMe || session?.role === 'DEV_ADMIN') && (
            <button
              onClick={() => onResolve(incident.id)}
              disabled={!!actionLoading}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {actionLoading === incident.id + '-resolve' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              Mark Incident Resolved — Case Closed
            </button>
          )}
        </div>
      )}

      {isClosed && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 text-center text-sm text-slate-400">
          This incident was <span className="font-bold text-slate-200">{incident.status}</span>
          {' '}· {formatRelativeTime(incident.updatedAt)}
        </div>
      )}

      {/* Timeline */}
      {incident.timeline && incident.timeline.length > 0 && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Incident Timeline
          </h3>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {incident.timeline.map((evt) => (
              <div key={evt.id} className="relative">
                <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-[#111827] border border-slate-700 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200">{evt.title}</h4>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{evt.description}</p>
                  {evt.actor && (
                    <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded mt-1 inline-block">
                      {evt.actor}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

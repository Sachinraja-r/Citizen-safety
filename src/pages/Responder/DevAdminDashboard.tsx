import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveIncidentFeed } from '../../types/responder';
import { incidentFeedService } from '../../services/incidentFeedService';
import { incidentService } from '../../services/incidentService';
import { responderAuthService } from '../../services/responderAuthService';
import { MapView } from '../../components/maps/MapView';
import { formatIncidentType, formatRelativeTime } from '../../utils/formatters';
import { isSupabaseConfigured } from '../../services/supabase';
import {
  BarChart3, LogOut,
  Zap, Database, Wifi, WifiOff, RefreshCw, Trash2, Code2,
  ChevronDown, ChevronUp,
} from 'lucide-react';

const INCIDENT_SCENARIOS = [
  { type: 'SOS_EMERGENCY', desc: 'Help! Someone is following me near the bus stop.', lat: 12.9716, lon: 77.5946 },
  { type: 'PHYSICAL_HARASSMENT_STALKING', desc: 'Being stalked outside MG Road metro station', lat: 12.9762, lon: 77.6033 },
  { type: 'MEDICAL_EMERGENCY', desc: 'Person collapsed near Lalbagh gate, needs ambulance', lat: 12.9502, lon: 77.5848 },
  { type: 'DOMESTIC_VIOLENCE', desc: 'Noise complaint and screaming from apartment 3B', lat: 12.9352, lon: 77.6245 },
  { type: 'SUSPICIOUS_ACTIVITY', desc: 'Suspicious person trying vehicle doors in parking lot', lat: 12.9602, lon: 77.6015 },
];

export const DevAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<LiveIncidentFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const supabaseOk = isSupabaseConfigured();

  useEffect(() => {
    const session = responderAuthService.getCurrentSession();
    if (!session) { navigate('/responder'); return; }

    loadIncidents();

    const unsub = incidentFeedService.subscribeToFeed((data) => {
      setIncidents(data);
      setLastRefresh(new Date());
    });
    return () => unsub();
  }, [navigate]);

  const loadIncidents = async () => {
    const data = await incidentFeedService.getAllIncidents();
    setIncidents(data);
    setLoading(false);
  };

  const handleSeedIncident = async (scenarioIndex: number) => {
    setSeeding(true);
    const s = INCIDENT_SCENARIOS[scenarioIndex % INCIDENT_SCENARIOS.length];
    const jitterLat = (Math.random() - 0.5) * 0.02;
    const jitterLon = (Math.random() - 0.5) * 0.02;

    await incidentService.createIncident({
      userId: 'dev-test-citizen-' + Date.now(),
      type: s.type as any,
      severity: 'CRITICAL',
      description: s.desc,
      location: {
        latitude: s.lat + jitterLat,
        longitude: s.lon + jitterLon,
        accuracyMeters: Math.floor(Math.random() * 20) + 5,
        addressText: 'Bengaluru, Karnataka (Dev Seed)',
        timestamp: Date.now(),
      },
    });
    await loadIncidents();
    setSeeding(false);
  };

  const handleClearAll = async () => {
    if (!confirm('Clear ALL local incident data? This cannot be undone in demo mode.')) return;
    setClearing(true);
    localStorage.removeItem('raksha_active_incidents');
    localStorage.removeItem('raksha_current_incident_id');
    await loadIncidents();
    setClearing(false);
  };

  const handleLogout = () => {
    responderAuthService.logout();
    navigate('/responder');
  };

  // Derived stats
  const openCount = incidents.filter(i => i.status === 'OPEN').length;
  const assignedCount = incidents.filter(i => i.status === 'ASSIGNED').length;
  const onSceneCount = incidents.filter(i => i.status === 'ON_SCENE').length;
  const resolvedCount = incidents.filter(i => i.status === 'RESOLVED').length;
  const cancelledCount = incidents.filter(i => i.status === 'CANCELLED').length;
  const activeCount = openCount + assignedCount + onSceneCount;

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100">
      {/* Command Header */}
      <header className="bg-[#0d1117] border-b border-slate-800 px-5 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Raksha" className="w-7 h-7" />
          <div>
            <span className="font-black text-white text-base tracking-wide">RAKSHA</span>
            <span className="text-xs text-purple-400 font-semibold ml-2">Developer Operations</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Supabase status */}
          <div className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
            supabaseOk
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            {supabaseOk ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {supabaseOk ? 'Supabase Connected' : 'Demo / Local Mode'}
          </div>

          <span className="text-xs text-slate-500">
            {new Date().toLocaleTimeString()}
          </span>

          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── Stats Cards Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="OPEN" count={openCount} color="text-red-400" bg="bg-red-500/10 border-red-500/30" icon="🔴" pulse />
          <StatCard label="EN ROUTE" count={assignedCount} color="text-blue-400" bg="bg-blue-500/10 border-blue-500/30" icon="🚓" />
          <StatCard label="ON SCENE" count={onSceneCount} color="text-amber-400" bg="bg-amber-500/10 border-amber-500/30" icon="📍" />
          <StatCard label="RESOLVED" count={resolvedCount} color="text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/30" icon="✅" />
          <StatCard label="CANCELLED" count={cancelledCount} color="text-slate-400" bg="bg-slate-700/20 border-slate-600/30" icon="❌" />
        </div>

        {/* ── Dev Control Panel ── */}
        <div className="bg-[#111827] border border-purple-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="w-5 h-5 text-purple-400" />
            <h2 className="font-bold text-white text-base">Developer Control Panel</h2>
            <span className="text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
              ADMIN
            </span>
          </div>

          {/* Seed Incident Buttons */}
          <div>
            <p className="text-xs text-slate-400 mb-2 font-semibold">🔥 Seed Test Incidents (Simulates citizen SOS):</p>
            <div className="flex flex-wrap gap-2">
              {INCIDENT_SCENARIOS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSeedIncident(idx)}
                  disabled={seeding}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-700 hover:border-purple-500/60 hover:bg-purple-950/20 text-slate-300 hover:text-white disabled:opacity-50 transition-all"
                >
                  {seeding ? (
                    <RefreshCw className="w-3.5 h-3.5 inline animate-spin mr-1" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                  )}
                  {formatIncidentType(s.type as any).split(' ')[0]} SOS
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-800">
            <button
              onClick={loadIncidents}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Feed
            </button>

            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All Local Data
            </button>

            <div className="ml-auto text-xs text-slate-500">
              Last updated: {formatRelativeTime(lastRefresh.toISOString())} •{' '}
              <span className="font-mono">{incidents.length} total incidents</span>
            </div>
          </div>

          {/* Environment Info */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <EnvRow label="VITE_SUPABASE_URL" value={supabaseOk ? '✅ Set' : '❌ Missing (Demo Mode)'} />
            <EnvRow label="VITE_AI_ENGINE_URL" value={import.meta.env.VITE_AI_ENGINE_URL || 'http://localhost:8000 (default)'} />
            <EnvRow label="Build Mode" value={import.meta.env.MODE} />
          </div>
        </div>

        {/* ── Incident Table ── */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <h2 className="font-bold text-white text-sm">All Incidents — Live Feed</h2>
              {activeCount > 0 && (
                <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse">
                  {activeCount} Active
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-6 h-6 text-slate-500 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading incidents...</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="py-16 text-center px-6">
              <Database className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-white">No Incidents Yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Use the buttons above to seed test incidents, or have a citizen trigger SOS in the main app.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {/* Table header */}
              <div className="hidden lg:grid grid-cols-[1fr_120px_100px_100px_140px_80px] gap-4 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900/40">
                <span>Incident</span>
                <span>Type</span>
                <span>Severity</span>
                <span>Status</span>
                <span>Time</span>
                <span>Actions</span>
              </div>

              {incidents.map((inc) => (
                <IncidentTableRow
                  key={inc.id}
                  incident={inc}
                  expanded={expandedId === inc.id}
                  onToggle={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Environment config guide */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 text-xs">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-white">Backend Integration Guide (for Member 2)</h3>
          </div>
          <div className="space-y-1.5 font-mono text-slate-400">
            <p><span className="text-purple-300">Expected Supabase Tables:</span> <span className="text-white">profiles, incidents, trusted_contacts</span></p>
            <p><span className="text-purple-300">incidents schema:</span> id, user_id, type, severity, status, description, latitude, longitude, accuracy_meters, address_text, assigned_responder (jsonb), timeline (jsonb[])</p>
            <p><span className="text-purple-300">Realtime channel:</span> <span className="text-white">incident-realtime-{'{'}incident_id{'}'}</span></p>
            <p><span className="text-purple-300">AI Engine (Member 3):</span> <span className="text-white">POST {import.meta.env.VITE_AI_ENGINE_URL || 'http://localhost:8000'}/api/v1/triage</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ── */

const StatCard: React.FC<{
  label: string; count: number; color: string; bg: string; icon: string; pulse?: boolean;
}> = ({ label, count, color, bg, icon, pulse }) => (
  <div className={`rounded-2xl border p-4 ${bg}`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-lg">{icon}</span>
      {pulse && count > 0 && (
        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
      )}
    </div>
    <p className={`text-2xl font-black ${color}`}>{count}</p>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{label}</p>
  </div>
);

const EnvRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
    <span className="text-slate-500 truncate">{label}:</span>
    <span className="text-slate-200 font-bold truncate">{value}</span>
  </div>
);

const IncidentTableRow: React.FC<{
  incident: LiveIncidentFeed;
  expanded: boolean;
  onToggle: () => void;
}> = ({ incident, expanded, onToggle }) => {
  const isClosed = ['RESOLVED', 'CANCELLED'].includes(incident.status);

  const severityColor = {
    CRITICAL: 'text-red-400',
    HIGH: 'text-orange-400',
    MEDIUM: 'text-amber-400',
    LOW: 'text-emerald-400',
  }[incident.severity] || 'text-slate-400';

  return (
    <>
      <div
        className={`grid grid-cols-1 lg:grid-cols-[1fr_120px_100px_100px_140px_80px] gap-x-4 gap-y-1.5 px-5 py-3 cursor-pointer hover:bg-slate-900/40 transition-colors ${isClosed ? 'opacity-60' : ''}`}
        onClick={onToggle}
      >
        {/* ID & location */}
        <div>
          <div className="flex items-center gap-2">
            {!isClosed && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
            <span className="font-mono text-xs text-slate-300 font-bold">#{incident.id}</span>
          </div>
          {incident.location.addressText && (
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{incident.location.addressText}</p>
          )}
          <p className="text-[11px] text-slate-600 font-mono">
            {incident.location.latitude.toFixed(4)}, {incident.location.longitude.toFixed(4)}
          </p>
        </div>

        {/* Type */}
        <div className="text-xs text-slate-300 font-semibold lg:self-center">
          {incident.type.replace(/_/g, ' ')}
        </div>

        {/* Severity */}
        <div className={`text-xs font-bold lg:self-center ${severityColor}`}>
          {incident.severity}
        </div>

        {/* Status */}
        <div className="lg:self-center">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            (({
              OPEN: 'text-red-400 bg-red-500/15 border-red-500/40',
              ASSIGNED: 'text-blue-400 bg-blue-500/15 border-blue-500/40',
              ON_SCENE: 'text-amber-400 bg-amber-500/15 border-amber-500/40',
              RESOLVED: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40',
              CANCELLED: 'text-slate-400 bg-slate-700/20 border-slate-600/40',
            } as Record<string,string>)[incident.status] || '')
          }`}>
            {incident.status}
          </span>
        </div>

        {/* Time */}
        <div className="text-[11px] text-slate-400 lg:self-center">
          {formatRelativeTime(incident.createdAt)}
        </div>

        {/* Expand toggle */}
        <div className="flex items-center justify-end lg:self-center">
          <button className="p-1 rounded-lg text-slate-500 hover:text-slate-300">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded detail with map */}
      {expanded && (
        <div className="border-t border-slate-800/60 bg-slate-900/30 px-5 py-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Incident Details</h4>
            <div className="space-y-1.5 text-xs text-slate-300">
              <p><span className="text-slate-500">Description:</span> {incident.description || '—'}</p>
              <p><span className="text-slate-500">Citizen ID:</span> <span className="font-mono">{incident.reportedByUserId}</span></p>
              <p><span className="text-slate-500">Assigned to:</span> {incident.assignedResponderName || 'Unassigned'}</p>
              <p><span className="text-slate-500">Created:</span> {new Date(incident.createdAt).toLocaleString()}</p>
              <p><span className="text-slate-500">Last updated:</span> {new Date(incident.updatedAt).toLocaleString()}</p>
            </div>
            {/* Timeline summary */}
            <div className="mt-3 space-y-1">
              {incident.timeline.map(e => (
                <div key={e.id} className="flex items-start gap-2 text-[11px] text-slate-400">
                  <span className="text-slate-600 font-mono flex-shrink-0">
                    {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-slate-300">{e.title}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <MapView
              incidentLocation={incident.location}
              height="200px"
              zoom={14}
              interactive={false}
            />
          </div>
        </div>
      )}
    </>
  );
};

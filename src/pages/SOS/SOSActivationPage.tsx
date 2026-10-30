import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { useIncident } from '../../contexts/IncidentContext';
import { useLocation } from '../../contexts/LocationContext';
import { IncidentType } from '../../types';
import { CancelIncidentModal } from '../../components/emergency/CancelIncidentModal';
import {
  AlertOctagon,
  MapPin,
  CheckCircle2,
  PhoneCall,
  HeartPulse,
  UserX,
  Shield,
  Flame,
  Car,
  HelpCircle,
  SkipForward,
  Mic,
  ChevronRight,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  XCircle,
} from 'lucide-react';

interface CategoryChoice {
  type: IncidentType;
  label: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
}

const POST_SOS_CATEGORIES: CategoryChoice[] = [
  {
    type: 'MEDICAL_EMERGENCY',
    label: 'Medical Emergency',
    icon: <HeartPulse className="w-5 h-5 text-emerald-400" />,
    color: 'border-emerald-500/40 hover:bg-emerald-950/30',
  },
  {
    type: 'PHYSICAL_HARASSMENT_STALKING',
    label: 'Harassment / Stalking',
    icon: <UserX className="w-5 h-5 text-purple-400" />,
    color: 'border-purple-500/40 hover:bg-purple-950/30',
  },
  {
    type: 'DOMESTIC_VIOLENCE',
    label: 'Violence / Assault',
    icon: <Shield className="w-5 h-5 text-amber-400" />,
    color: 'border-amber-500/40 hover:bg-amber-950/30',
  },
  {
    type: 'OTHER',
    label: 'Accident / Collision',
    icon: <Car className="w-5 h-5 text-orange-400" />,
    color: 'border-orange-500/40 hover:bg-orange-950/30',
  },
  {
    type: 'OTHER',
    label: 'Fire / Hazard',
    icon: <Flame className="w-5 h-5 text-rose-400" />,
    color: 'border-rose-500/40 hover:bg-rose-950/30',
  },
  {
    type: 'OTHER',
    label: 'Other Danger',
    icon: <HelpCircle className="w-5 h-5 text-slate-300" />,
    color: 'border-slate-600/40 hover:bg-slate-800/30',
  },
  {
    type: 'SOS_EMERGENCY',
    label: 'Unable to Specify',
    icon: <AlertOctagon className="w-5 h-5 text-red-400" />,
    color: 'border-red-500/40 hover:bg-red-950/30',
  },
];

type Phase = 'dispatching' | 'active' | 'failed';

export const SOSActivationPage: React.FC = () => {
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();
  const {
    activeIncident,
    triggerSOS,
    updateIncidentDetails,
    cancelCurrentIncident,
    error: sosError,
  } = useIncident();
  const { location, accuracy, addressText } = useLocation();

  const preselectedType = (routerLocation.state as { preselectedType?: IncidentType })
    ?.preselectedType;

  const [phase, setPhase] = useState<Phase>('dispatching');
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Post-SOS optional incident details
  const [selectedCategory, setSelectedCategory] = useState<IncidentType | null>(
    preselectedType || null
  );
  const [description, setDescription] = useState('');
  const [isSubmittingDetails, setIsSubmittingDetails] = useState(false);
  const [detailsSent, setDetailsSent] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const hasDispatchedRef = useRef(false);

  // 1. SOS-First Immediate Dispatch: Triggers instantly without requiring user input or confirmation
  useEffect(() => {
    if (hasDispatchedRef.current) return;
    hasDispatchedRef.current = true;

    // Haptic notification for user feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([250, 100, 250, 100, 500]);
      } catch {
        // ignore
      }
    }

    // Check if user already has an active, unresolved incident
    if (
      activeIncident &&
      activeIncident.status !== 'RESOLVED' &&
      activeIncident.status !== 'CANCELLED'
    ) {
      setIncidentId(activeIncident.id);
      setPhase('active');
      return;
    }

    const dispatchImmediately = async () => {
      setPhase('dispatching');
      setNetworkError(null);

      const { incident, error } = await triggerSOS({
        type: preselectedType || 'SOS_EMERGENCY',
        description: 'Emergency SOS beacon activated by citizen handset',
      });

      if (incident) {
        setIncidentId(incident.id);
        setPhase('active');
      } else {
        setNetworkError(
          error?.message || 'Emergency SOS dispatch request failed. Network or server unreachable.'
        );
        setPhase('failed');
      }
    };

    dispatchImmediately();
  }, [activeIncident, preselectedType, triggerSOS]);

  // Handle post-SOS optional detail submission
  const handleSubmitDetails = useCallback(async () => {
    if (!incidentId || (!selectedCategory && !description.trim())) return;
    setIsSubmittingDetails(true);

    await updateIncidentDetails(incidentId, {
      type: selectedCategory || undefined,
      description: description.trim() || undefined,
    });

    setIsSubmittingDetails(false);
    setDetailsSent(true);
  }, [incidentId, selectedCategory, description, updateIncidentDetails]);

  // Navigate to live tracking map
  const handleGoToTracking = useCallback(() => {
    if (incidentId) {
      navigate(`/app/incidents/${incidentId}`);
    } else {
      navigate('/app');
    }
  }, [incidentId, navigate]);

  // Retry SOS dispatch if it failed
  const handleRetry = useCallback(async () => {
    setPhase('dispatching');
    setNetworkError(null);

    const { incident, error } = await triggerSOS({
      type: preselectedType || 'SOS_EMERGENCY',
      description: 'Emergency SOS retry dispatch',
    });

    if (incident) {
      setIncidentId(incident.id);
      setPhase('active');
    } else {
      setNetworkError(error?.message || 'Emergency SOS dispatch failed on retry.');
      setPhase('failed');
    }
  }, [preselectedType, triggerSOS]);

  // Cancel accidental SOS with backend confirmation
  const handleConfirmCancel = useCallback(
    async (reason: string) => {
      setIsCancelling(true);
      await cancelCurrentIncident(reason);
      setIsCancelling(false);
      setIsCancelModalOpen(false);
      navigate('/app');
    },
    [cancelCurrentIncident, navigate]
  );

  // Voice input support using Web Speech API
  const startVoiceInput = useCallback(() => {
    const win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        start: () => void;
        onresult: (e: { results: Array<Array<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        start: () => void;
        onresult: (e: { results: Array<Array<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
      };
    };

    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const rec = new SpeechRec();
      rec.lang = 'en-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      setIsListening(true);

      rec.onresult = (e) => {
        const spoken = e.results[0]?.[0]?.transcript;
        if (spoken) {
          setDescription((prev) => (prev ? `${prev} ${spoken}` : spoken));
        }
        setIsListening(false);
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);

      rec.start();
    } catch {
      setIsListening(false);
    }
  }, []);

  const hasSpeechRecognition =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DISPATCHING PHASE (Immediate Non-blocking Broadcasting)
  // ─────────────────────────────────────────────────────────────────────────────
  if (phase === 'dispatching') {
    return (
      <div className="w-full min-h-[75vh] flex flex-col items-center justify-center text-center animate-fade-in py-8 px-4">
        {/* Radar pulsing emergency beacon — BOLD RED */}
        <div className="relative flex items-center justify-center mb-8">
          <div className="absolute w-56 h-56 rounded-full bg-red-500/10 animate-ping-slow pointer-events-none" />
          <div className="absolute w-44 h-44 rounded-full bg-red-500/15 animate-sos-pulse pointer-events-none" />
          <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-700 border-4 border-red-200 shadow-2xl shadow-red-500/50 flex flex-col items-center justify-center text-white">
            <AlertOctagon className="w-12 h-12 text-white animate-pulse" />
            <span className="text-[11px] font-black tracking-widest uppercase mt-0.5 text-red-100">
              DISPATCH
            </span>
          </div>
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
          Broadcasting Emergency SOS
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-xs mx-auto mb-6 font-medium">
          Alerting nearby police patrol units, trusted contacts, and emergency operations center...
        </p>

        {/* Real-time Location Readout Pill */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs text-left max-w-sm w-full mb-6">
          <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Incident Location
            </span>
            <span className="text-slate-800 font-semibold truncate block">
              {location
                ? addressText || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                : 'Acquiring GPS coordinates (using secure city centroid)'}
            </span>
          </div>
          {accuracy ? (
            <span className="shrink-0 text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              ±{accuracy}m
            </span>
          ) : (
            <span className="shrink-0 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
              Approx
            </span>
          )}
        </div>

        {/* Abort button if accidentally triggered */}
        <button
          onClick={() => navigate('/app')}
          className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-4 transition-colors font-medium"
        >
          Cancel / Return to Dashboard
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. FAILED PHASE (Network / Backend Transmission Error)
  // ─────────────────────────────────────────────────────────────────────────────
  if (phase === 'failed') {
    return (
      <div className="w-full min-h-[65vh] flex flex-col items-center justify-center text-center py-8 px-4 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mb-5 text-red-600 shadow-sm">
          <WifiOff className="w-10 h-10" />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
          SOS Could Not Be Confirmed
        </h2>

        <div className="max-w-xs mx-auto mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800">
          <AlertTriangle className="w-4 h-4 inline-block mr-1.5 text-red-600 mb-0.5" />
          <span className="font-bold">
            Responders have NOT been notified. Do NOT assume help is dispatched.
          </span>
        </div>

        <p className="text-xs text-slate-600 max-w-xs mx-auto mb-6">
          {networkError || sosError || 'Unable to establish connection to emergency dispatch backend.'}
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleRetry}
            className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-500/30 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry SOS Dispatch
          </button>

          <a
            href="tel:112"
            className="w-full py-3.5 rounded-2xl bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <PhoneCall className="w-4 h-4 text-amber-600" />
            Call 112 (National Emergency Helpline)
          </a>

          <button
            onClick={() => navigate('/app')}
            className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-4 mt-2"
          >
            Return to Safety Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. ACTIVE PHASE (SOS Active; Non-blocking "What happened?" Details Form)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full animate-fade-in pb-10">
      {/* Emergency Active Card with Live Dispatch Status */}
      <div className="mb-5 p-5 rounded-3xl bg-gradient-to-b from-red-50 via-pink-50/40 to-white border-2 border-red-500 text-center shadow-lg text-slate-900">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-widest text-red-600">
            Emergency SOS Active
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        </div>

        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="text-left">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
              Emergency Signal Sent!
            </h2>
            <p className="text-[11px] font-mono text-slate-500">Reference: #{incidentId}</p>
          </div>
        </div>

        {/* Active Dispatch Indicators */}
        <div className="space-y-1.5 text-xs text-slate-700 mb-4 bg-white/90 p-3 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-800">
              Nearby police &amp; responders receiving telemetry
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            <span>Trusted emergency contacts notified</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[240px]">
              {location
                ? addressText || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                : 'City area default (GPS ungranted)'}
              {accuracy ? ` (±${accuracy}m)` : ''}
            </span>
          </div>
        </div>

        {/* Primary Action Button: Live Tracking — BOLD RED */}
        <button
          onClick={handleGoToTracking}
          className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-500/40 transition-colors"
        >
          Track Live Response &amp; Responders
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          OPTIONAL INCIDENT INFORMATION: Non-blocking post-SOS enrichment
          ───────────────────────────────────────────────────────────────────────── */}
      {!detailsSent ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 text-left mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              What happened? You can tell us if you're able.
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-700 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full">
              Optional
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Alert is already dispatched. Providing details helps responders prepare the right equipment.
          </p>

          {/* Incident Category Selection */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {POST_SOS_CATEGORIES.map((cat, idx) => {
              const isSelected = selectedCategory === cat.type;
              return (
                <button
                  key={`${cat.label}-${idx}`}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? null : cat.type)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                    isSelected
                      ? 'bg-pink-50 border-pink-400 text-pink-900 ring-2 ring-pink-500/20'
                      : 'bg-slate-50 border-slate-200/90 text-slate-700 hover:border-pink-300 hover:bg-pink-50/30'
                  }`}
                >
                  <span className="shrink-0">{cat.icon}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Description & Speech Recognition */}
          <div className="relative mb-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Near bus stop, white vehicle, need urgent medical help..."
              rows={2}
              className="w-full bg-white text-slate-900 placeholder:text-slate-400 text-xs rounded-xl px-3.5 py-3 border border-slate-200 focus:outline-none focus:border-pink-500 shadow-sm resize-none pr-10"
            />
            {hasSpeechRecognition && (
              <button
                type="button"
                onClick={startVoiceInput}
                className={`absolute right-2.5 bottom-3 p-1.5 rounded-lg transition-colors ${
                  isListening
                    ? 'text-pink-600 bg-pink-50 animate-pulse'
                    : 'text-slate-400 hover:text-pink-600'
                }`}
                title="Dictate via voice input"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Row: Skip or Submit Details */}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={handleGoToTracking}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <SkipForward className="w-3.5 h-3.5 text-slate-400" />
              Skip for Now
            </button>
            <button
              type="button"
              onClick={handleSubmitDetails}
              disabled={isSubmittingDetails || (!selectedCategory && !description.trim())}
              className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-pink-500/25 transition-colors"
            >
              {isSubmittingDetails ? 'Updating...' : 'Send Details to Responders'}
            </button>
          </div>
        </div>
      ) : (
        /* Details successfully sent state */
        <div className="bg-white border border-emerald-300 rounded-3xl p-5 text-center mb-5 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-900 mb-1">Details Transmitted to Responders</h4>
          <p className="text-xs text-slate-500 mb-4">
            Your notes and category have been updated in the live dispatch queue.
          </p>
          <button
            onClick={handleGoToTracking}
            className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
          >
            Open Live Map &amp; Tracking
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Accidental SOS Safe Cancellation */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => setIsCancelModalOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors font-medium"
        >
          <XCircle className="w-4 h-4" />
          Cancel Accidental SOS (False Alarm)
        </button>
        <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
          Cancellation informs dispatch units that assistance is no longer required.
        </p>
      </div>

      {/* Emergency Hotlines Fallback */}
      <div className="mt-4 text-center">
        <a
          href="tel:112"
          className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-bold transition-colors"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          Call 112 directly if offline
        </a>
      </div>

      {/* Cancellation Confirmation Modal */}
      <CancelIncidentModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        isLoading={isCancelling}
      />
    </div>
  );
};

export default SOSActivationPage;

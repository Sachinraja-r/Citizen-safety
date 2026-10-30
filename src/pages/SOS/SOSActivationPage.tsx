import React, { useState, useEffect, useRef } from 'react';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { useIncident } from '../../contexts/IncidentContext';
import { useLocation } from '../../contexts/LocationContext';
import { IncidentType } from '../../types';
import { Button } from '../../components/common/Button';
import { AlertBanner } from '../../components/common/AlertBanner';
import { AlertOctagon, MapPin, Send, CheckCircle2, Shield, HeartPulse, UserX, Eye } from 'lucide-react';

const CATEGORIES: { type: IncidentType; label: string; icon: React.ReactNode }[] = [
  { type: 'SOS_EMERGENCY', label: 'General / Critical SOS', icon: <AlertOctagon className="w-4 h-4 text-red-400" /> },
  { type: 'PHYSICAL_HARASSMENT_STALKING', label: 'Stalking / Harassment', icon: <UserX className="w-4 h-4 text-purple-400" /> },
  { type: 'MEDICAL_EMERGENCY', label: 'Medical Emergency', icon: <HeartPulse className="w-4 h-4 text-emerald-400" /> },
  { type: 'DOMESTIC_VIOLENCE', label: 'Domestic Violence', icon: <Shield className="w-4 h-4 text-amber-400" /> },
  { type: 'SUSPICIOUS_ACTIVITY', label: 'Suspicious Activity', icon: <Eye className="w-4 h-4 text-blue-400" /> },
];

export const SOSActivationPage: React.FC = () => {
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();
  const { triggerSOS, error: sosError } = useIncident();
  const { location, accuracy, addressText } = useLocation();

  const preselectedType = (routerLocation.state as { preselectedType?: IncidentType })?.preselectedType || 'SOS_EMERGENCY';
  const [selectedType, setSelectedType] = useState<IncidentType>(preselectedType);
  const [description, setDescription] = useState('');

  // 3-second safety countdown to abort accidental clicks
  const [countdown, setCountdown] = useState<number>(3);
  const [isCountingDown, setIsCountingDown] = useState(true);
  const [createdIncidentId, setCreatedIncidentId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Vibration on enter
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {
        // ignore
      }
    }

    timerRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setIsCountingDown(false);
          dispatchSOSNow();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleCancelCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCountingDown(false);
    navigate('/app');
  };

  const dispatchSOSNow = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCountingDown(false);

    const { incident } = await triggerSOS({
      type: selectedType,
      description: description.trim() || undefined,
    });

    if (incident) {
      setCreatedIncidentId(incident.id);
      // Brief confirmation view then navigate to active tracking
      setTimeout(() => {
        navigate(`/app/incidents/${incident.id}`);
      }, 1200);
    }
  };

  return (
    <div className="w-full text-center animate-fade-in py-2">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <AlertOctagon className="w-6 h-6 text-red-500 animate-pulse" />
          Emergency SOS Dispatch
        </h2>
        <button
          onClick={handleCancelCountdown}
          className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg bg-slate-800"
        >
          Cancel
        </button>
      </div>

      {/* Confirmed State */}
      {createdIncidentId ? (
        <div className="my-10 p-6 rounded-3xl bg-emerald-950/30 border-2 border-emerald-500/50 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/40">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Emergency Beacon Dispatched!</h3>
          <p className="text-xs text-slate-300 font-mono mb-2">Incident ID: #{createdIncidentId}</p>
          <p className="text-xs text-emerald-400 font-medium">
            Redirecting to live tracking map and responder updates...
          </p>
        </div>
      ) : (
        <>
          {/* Countdown & Instant Action Box */}
          <div className="my-4 p-5 rounded-3xl bg-gradient-to-b from-red-950/50 via-[#111827] to-slate-900 border-2 border-red-500/50 shadow-sos text-center">
            {isCountingDown ? (
              <div className="space-y-4">
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-red-500/30 border-t-red-500 animate-spin" />
                  <span className="text-4xl font-black text-white">{countdown}</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">Broadcasting Emergency Signal in {countdown}s</h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                    Sending your live GPS coordinates to nearby police patrol vehicles and emergency contacts.
                  </p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-slate-700 text-slate-300"
                    onClick={handleCancelCountdown}
                  >
                    Cancel / Abort
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="flex-1 font-bold shadow-lg"
                    onClick={dispatchSOSNow}
                  >
                    SEND IMMEDIATELY
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-600/30 border border-red-500 flex items-center justify-center mx-auto text-red-400">
                  <Send className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-base font-bold text-white">Transmitting Emergency Telemetry</h3>
                <p className="text-xs text-slate-400">
                  Contacting backend responder dispatch queue...
                </p>
              </div>
            )}
          </div>

          {/* Location verification pill */}
          <div className="my-4 p-3 bg-[#111827] border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-left">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Incident Coordinates</span>
                <span className="text-slate-200 font-medium truncate block">
                  {location ? (addressText || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`) : 'Acquiring GPS / City Center fallback'}
                </span>
              </div>
            </div>
            {accuracy && (
              <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                ±{accuracy}m
              </span>
            )}
          </div>

          {/* Category selection */}
          <div className="my-4 text-left">
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Emergency Incident Type
            </label>
            <div className="grid grid-cols-1 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.type}
                  type="button"
                  onClick={() => setSelectedType(cat.type)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-colors ${
                    selectedType === cat.type
                      ? 'bg-slate-800 border-red-500 text-white'
                      : 'bg-[#111827] border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {cat.icon}
                    <span>{cat.label}</span>
                  </div>
                  {selectedType === cat.type && (
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Optional notes */}
          <div className="my-4 text-left">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Additional Details (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Near bus stop, blue car following"
              className="w-full bg-[#111827] text-slate-100 placeholder:text-slate-500 text-xs rounded-xl px-3.5 py-3 border border-slate-800 focus:outline-none focus:border-red-500"
            />
          </div>

          {sosError && (
            <AlertBanner
              type="error"
              title="Dispatch Failed"
              message={sosError}
              className="my-3"
            />
          )}
        </>
      )}
    </div>
  );
};

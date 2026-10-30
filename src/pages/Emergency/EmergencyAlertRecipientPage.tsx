import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { incidentService } from '../../services/incidentService';
import { notificationService, verifySecureEmergencyToken } from '../../services/notificationService';
import { Incident } from '../../types';
import { MapView } from '../../components/maps/MapView';
import { ResponderCard } from '../../components/emergency/ResponderCard';
import { Button } from '../../components/common/Button';
import { RakshaLogo } from '../../components/common/RakshaLogo';
import { formatIncidentType, formatRelativeTime, formatTimeOnly } from '../../utils/formatters';
import {
  playEmergencyAlertSound,
  stopEmergencyAlertSound,
} from '../../utils/emergencyAudio';
import {
  MapPin,
  Phone,
  Volume2,
  VolumeX,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
} from 'lucide-react';

export const EmergencyAlertRecipientPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [contactName, setContactName] = useState('Trusted Contact');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // 1. Validate Token and Fetch Authorized Incident Information
  useEffect(() => {
    if (!id) {
      setAuthError('Missing incident reference.');
      setLoading(false);
      return;
    }

    // Verify token validity
    const tokenResult = verifySecureEmergencyToken(id, token);
    if (!tokenResult.valid) {
      setAuthError(tokenResult.error || 'Access Denied: Invalid or expired emergency tracking token.');
      setLoading(false);
      return;
    }

    // Fetch incident details
    incidentService.getIncident(id).then((inc) => {
      if (!inc) {
        setAuthError('Emergency incident record not found or has been purged.');
      } else {
        setIncident(inc);

        // Check if already acknowledged
        notificationService.getIncidentNotifications(id).then((records) => {
          const matching = records.find(
            (r) => r.secureToken === token || (tokenResult.contactId && r.contactId === tokenResult.contactId)
          );
          if (matching) {
            setContactName(matching.contactName);
            if (matching.status === 'ACKNOWLEDGED') {
              setIsAcknowledged(true);
            }
          }
        });
      }
      setLoading(false);
    });

    // Clean up audio on unmount
    return () => {
      stopEmergencyAlertSound();
    };
  }, [id, token]);

  // Attempt to play emergency alert sound on load or prompt user
  const handleToggleSound = async () => {
    if (isPlayingAudio) {
      stopEmergencyAlertSound();
      setIsPlayingAudio(false);
    } else {
      const success = await playEmergencyAlertSound({ loop: true });
      setIsPlayingAudio(success);
    }
  };

  // 2. Contact Acknowledgement Handler
  const handleAcknowledge = async () => {
    if (!incident || !token) return;
    setIsAcknowledging(true);

    const res = await notificationService.acknowledgeAlert(incident.id, token, contactName);
    setIsAcknowledging(false);

    if (res.success) {
      setIsAcknowledged(true);
      stopEmergencyAlertSound();
      setIsPlayingAudio(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF5F8] flex flex-col items-center justify-center p-4">
        <RakshaLogo variant="full" size="md" className="mb-4" />
        <div className="w-8 h-8 rounded-full border-2 border-[#E91E63] border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-bold text-[#2D1B24] uppercase tracking-wider">
          Verifying Emergency Security Token...
        </p>
      </div>
    );
  }

  // Unauthorized or Expired Link State
  if (authError || !incident) {
    return (
      <div className="min-h-screen bg-[#FFF5F8] text-[#2D1B24] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-white border border-[#F3D9E2] rounded-3xl p-6 shadow-xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200 shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-[#2D1B24] mb-2">Restricted Emergency Information</h2>
          <p className="text-xs text-[#7A6570] leading-relaxed mb-6">
            {authError || 'You do not have authorization to view this citizen location or incident details.'}
          </p>

          <div className="p-3 bg-[#FFF5F8] border border-[#F3D9E2] rounded-2xl text-[11px] text-[#7A6570] text-left mb-6 space-y-1">
            <p className="font-semibold text-[#2D1B24] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#E91E63]" /> Privacy &amp; Location Safeguards:
            </p>
            <p>• Emergency GPS telemetry is only accessible with a valid, non-expired authorization link sent directly to registered trusted contacts.</p>
            <p>• Contact the citizen directly via telephone if you believe this is an emergency.</p>
          </div>

          <Button
            variant="primary"
            size="md"
            className="w-full font-bold shadow-md shadow-[#E91E63]/25"
            onClick={() => navigate('/')}
          >
            Go to Raksha Home
          </Button>
        </div>
      </div>
    );
  }

  const hasLocation = incident.location && (incident.location.latitude !== 0 || incident.location.longitude !== 0);

  return (
    <div className="min-h-screen bg-[#FFF5F8] text-[#2D1B24] flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#F3D9E2] shadow-sm px-4 py-2.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <RakshaLogo variant="full" size="sm" showTagline={true} />
          <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
            <ShieldAlert className="w-3 h-3" /> HIGH-PRIORITY
          </span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 space-y-4 text-left">
        {/* Emergency Alert Banner */}
        <div className="p-5 rounded-3xl bg-gradient-to-b from-red-50 via-white to-white border-2 border-red-500 shadow-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-widest text-red-600">
              EMERGENCY SOS ALERT
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-[#2D1B24] mb-1">
            Your Trusted Contact Needs Help
          </h1>
          <p className="text-xs text-[#7A6570] mb-4">
            Incident Reference: <span className="font-mono font-bold text-[#2D1B24]">#{incident.id}</span> • {formatRelativeTime(incident.createdAt)}
          </p>

          {/* Emergency Audio Alarm Controller */}
          <div className="mb-4 flex items-center justify-center">
            <button
              onClick={handleToggleSound}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                isPlayingAudio
                  ? 'bg-red-600 text-white animate-pulse shadow-red-500/30'
                  : 'bg-white border border-[#F3D9E2] text-[#2D1B24] hover:bg-[#FFF5F8]'
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <Volume2 className="w-4 h-4 animate-bounce" />
                  <span>Mute Emergency Alert Sound</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-[#E91E63]" />
                  <span>Play Emergency Alert Tone (EAS)</span>
                </>
              )}
            </button>
          </div>

          {/* Acknowledgement Status / Action */}
          {isAcknowledged ? (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 text-left flex items-start gap-2.5 shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-900">Acknowledgement Confirmed!</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  The citizen and emergency responders have been notified that you are responding to this alert.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={handleAcknowledge}
                disabled={isAcknowledging}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-500/30 transition-transform active:scale-[0.98]"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <span>{isAcknowledging ? 'Recording Acknowledgement...' : "I've Seen This Alert — I Am Responding"}</span>
              </button>
              <p className="text-[10px] text-[#7A6570]">
                Tapping confirms to the victim and responders that you received the alert.
              </p>
            </div>
          )}
        </div>

        {/* Location & Map Section */}
        <div className="bg-white border border-[#F3D9E2] shadow-sm rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#E91E63]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D1B24]">
                Available Incident Location
              </h3>
            </div>
            {incident.location?.accuracyMeters && (
              <span className="text-[10px] font-mono text-[#7A6570] bg-[#FFF5F8] border border-[#F3D9E2] px-2 py-0.5 rounded-full">
                ±{incident.location.accuracyMeters}m
              </span>
            )}
          </div>

          {hasLocation ? (
            <>
              <div className="rounded-xl overflow-hidden border border-[#F3D9E2]">
                <MapView incidentLocation={incident.location} height="220px" zoom={15} />
              </div>
              <p className="text-xs font-medium text-[#2D1B24] bg-[#FFF5F8] p-2.5 rounded-xl border border-[#F3D9E2]">
                📍 {incident.location.addressText || `${incident.location.latitude.toFixed(5)}, ${incident.location.longitude.toFixed(5)}`}
              </p>
            </>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <p className="font-bold">Precise GPS coordinates are currently unavailable</p>
              <p className="text-[11px] text-amber-700 mt-1">
                The victim may be indoors or location permission was not granted. Responders are using the last known city beacon.
              </p>
            </div>
          )}
        </div>

        {/* Assigned Responder Status (if unit en route) */}
        {incident.assignedResponder && (
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A6570] px-1">
              Official Response Coordination
            </h3>
            <ResponderCard responder={incident.assignedResponder} />
          </div>
        )}

        {/* Incident Summary Card */}
        <div className="bg-white border border-[#F3D9E2] shadow-sm rounded-2xl p-4 text-xs space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-[#7A6570]">Emergency Classification</span>
            <span className="font-bold text-[#E91E63] bg-[#FFF5F8] px-2 py-0.5 rounded-full border border-[#F3D9E2]">
              {formatIncidentType(incident.type)}
            </span>
          </div>

          {incident.description && (
            <div className="pt-2 border-t border-[#F3D9E2]">
              <span className="text-[#7A6570] block mb-0.5">Victim Note / Hazard Details:</span>
              <p className="text-[#2D1B24] font-medium italic">&quot;{incident.description}&quot;</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-[#F3D9E2]">
            <span className="text-[#7A6570]">Dispatched At:</span>
            <span className="font-mono text-[#2D1B24]">{formatTimeOnly(incident.createdAt)}</span>
          </div>
        </div>

        {/* Direct Emergency Telephony Call Shortcuts */}
        <div className="pt-2 space-y-2">
          <a
            href="tel:112"
            className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-2xl border border-red-200 flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Phone className="w-4 h-4 text-red-600" />
            <span>Call National Emergency Helpline 112</span>
          </a>

          <div className="p-3 bg-white border border-[#F3D9E2] rounded-2xl text-[10px] text-[#7A6570] text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
            Official Raksha Emergency Telemetry Service • Encrypted Link
          </div>
        </div>
      </main>
    </div>
  );
};

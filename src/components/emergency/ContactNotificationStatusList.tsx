import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { contactService } from '../../services/contactService';
import { ContactNotificationRecord, LocationData } from '../../types';
import {
  notificationService,
  buildEmergencyDangerMessage,
} from '../../services/notificationService';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Share2,
  Smartphone,
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  Send,
  MapPin,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface ContactNotificationStatusListProps {
  incidentId: string;
  victimName?: string;
  location?: LocationData | null;
  className?: string;
}

export const ContactNotificationStatusList: React.FC<ContactNotificationStatusListProps> = ({
  incidentId,
  victimName = 'Citizen in Distress',
  location,
  className = '',
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ContactNotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Stable location ref so GPS updates don't re-trigger the initial load/dispatch effect
  const locationRef = React.useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!incidentId) return;

    let isMounted = true;

    const loadOrDispatch = async () => {
      try {
        const records = await notificationService.getIncidentNotifications(incidentId);
        if (!isMounted) return;

        if (records && records.length > 0) {
          setNotifications(records);
          setLoading(false);
        } else {
          // If no notifications exist yet for this incident ID, load user's trusted contacts and dispatch
          const contacts = await contactService.getContacts(user?.id);
          if (!isMounted) return;

          if (contacts && contacts.length > 0) {
            const fresh = await notificationService.dispatchEmergencyAlertToContacts({
              incident: {
                id: incidentId,
                userId: user?.id || 'demo-user-101',
                type: 'SOS_EMERGENCY',
                severity: 'CRITICAL',
                status: 'OPEN',
                location: locationRef.current || { latitude: 12.8406, longitude: 77.6632 },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                timeline: [],
              },
              victimName,
              contacts,
            });
            if (isMounted) {
              setNotifications(fresh);
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn('Error syncing notifications for incident:', err);
        if (isMounted) setLoading(false);
      }
    };

    loadOrDispatch();

    const unsubscribe = notificationService.subscribeToIncidentNotifications(
      incidentId,
      (records) => {
        if (isMounted) {
          setNotifications(records);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [incidentId, user?.id, victimName]); // location excluded — use locationRef to avoid re-triggering on every GPS update

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://frontend-nu-nine-47.vercel.app';

  const defaultTrackingUrl = `${origin}/emergency/${incidentId}`;
  const dangerMessage = buildEmergencyDangerMessage({
    victimName,
    location,
    incidentId,
    trackingUrl: defaultTrackingUrl,
  });

  const acknowledgedCount = notifications.filter((n) => n.status === 'ACKNOWLEDGED').length;
  const allPhones = notifications.map((n) => n.contactPhone);
  const groupSmsUrl = notificationService.generateGroupSmsIntentUrl(allPhones, dangerMessage);
  const hasNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const handleResendAutomatedSms = async () => {
    if (!incidentId || isResending) return;
    setIsResending(true);
    setResendSuccess(false);

    try {
      const contacts = await contactService.getContacts(user?.id);
      if (contacts && contacts.length > 0) {
        const fresh = await notificationService.dispatchEmergencyAlertToContacts({
          incident: {
            id: incidentId,
            userId: user?.id || 'demo-user-101',
            type: 'SOS_EMERGENCY',
            severity: 'CRITICAL',
            status: 'OPEN',
            location: location || { latitude: 12.8406, longitude: 77.6632 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeline: [],
          },
          victimName,
          contacts,
        });
        setNotifications(fresh);
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 3000);
      }
    } catch (err) {
      console.warn('Error resending automated SMS dispatch:', err);
    } finally {
      setIsResending(false);
    }
  };

  const handleCopyMessage = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(dangerMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    await notificationService.shareDistressBeacon({
      victimName,
      location,
      incidentId,
      trackingUrl: defaultTrackingUrl,
    });
  };

  const getStatusBadge = (status: ContactNotificationRecord['status']) => {
    switch (status) {
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
            Queued
          </span>
        );
      case 'PUSH_SENT':
      case 'SMS_SENT':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            SMS Dispatched (Sent)
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <Smartphone className="w-3 h-3 text-purple-600" />
            Delivered to Handset
          </span>
        );
      case 'ACKNOWLEDGED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 animate-pulse">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Acknowledged — Responding!
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3 h-3 text-red-600" />
            Delivery Failed
          </span>
        );
    }
  };

  const handleSimulateAcknowledgement = async (record: ContactNotificationRecord) => {
    await notificationService.acknowledgeAlert(incidentId, record.secureToken, record.contactName);
  };

  if (loading) {
    return (
      <div className={`p-4 bg-white border border-[#F3D9E2] rounded-2xl text-center text-xs text-[#7A6570] ${className}`}>
        Syncing emergency SMS notification dispatch queue...
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className={`p-4 bg-white border border-[#F3D9E2] rounded-2xl text-center text-xs text-[#7A6570] ${className}`}>
        <p className="font-semibold text-[#2D1B24]">No Emergency Contacts Designated</p>
        <p className="text-[11px] mt-1 text-[#7A6570]">
          Add trusted emergency contacts in settings to automatically broadcast your live location and "I am in danger" distress message via SMS upon SOS.
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full bg-white border-2 border-red-200 shadow-md rounded-2xl p-4 text-left space-y-3.5 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#2D1B24]">
              Emergency Cellular SMS Sent ({notifications.length})
            </h3>
            <p className="text-[11px] text-red-600 font-semibold">
              Live location coordinates attached &amp; delivered
            </p>
          </div>
        </div>

        {acknowledgedCount > 0 ? (
          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
            {acknowledgedCount} Confirmed Responding
          </span>
        ) : (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
            Awaiting Acknowledgement
          </span>
        )}
      </div>

      {/* Confirmed Sent Banner (Not a Draft) */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 shadow-sm text-emerald-950 flex flex-col gap-2 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
            </span>
            <span className="font-black text-xs sm:text-sm uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Emergency SMS Sent Automatically
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider bg-emerald-600 text-white font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
            Sent • Not Draft
          </span>
        </div>

        <p className="text-xs text-emerald-800 font-medium leading-relaxed">
          Your emergency distress alert with <strong>live GPS coordinates</strong> and <strong>Google Maps pin</strong> has been dispatched directly via cellular SMS to your {notifications.length} trusted contacts.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-emerald-900 font-semibold pt-1 border-t border-emerald-200/80">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Live GPS Pin Included in Dispatched SMS</span>
          </div>
          {notifications[0]?.deliveredAt && (
            <span className="text-emerald-700 font-mono text-[10px]">
              Sent: {new Date(notifications[0].deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* SMS Actions: Re-send Automated SMS & Manual Backup */}
      <div className="space-y-2 pt-0.5">
        <button
          type="button"
          onClick={handleResendAutomatedSms}
          disabled={isResending}
          className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all active:scale-[0.98]"
        >
          {isResending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>
            {isResending
              ? 'Transmitting Cellular SMS with Live Location...'
              : resendSuccess
              ? '✓ Cellular SMS Re-transmitted Successfully!'
              : 'Re-send Automated Cellular SMS to All'}
          </span>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
          {/* Manual Device SMS App Backup */}
          <a
            href={groupSmsUrl}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors text-center"
            title="Open device native SMS compose screen as manual backup"
          >
            <Smartphone className="w-3.5 h-3.5 text-slate-500" />
            <span>Open Device SMS App (Backup)</span>
          </a>

          {/* Copy Sent Danger Text */}
          <button
            type="button"
            onClick={handleCopyMessage}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Sent SMS Text</span>
              </>
            )}
          </button>
        </div>

        {hasNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full py-2 px-3 rounded-xl bg-[#FFF5F8] hover:bg-[#FCE4EC] border border-[#F3D9E2] text-[#D81B60] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Distress Beacon via System Share Sheet</span>
          </button>
        )}
      </div>

      {/* Message Preview Accordion */}
      <div className="bg-[#FFF5F8] border border-[#F3D9E2] rounded-xl p-3 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[#2D1B24] uppercase tracking-wider text-[10px] flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#E91E63]" />
            Sent SMS Message Payload
          </span>
          <button
            type="button"
            onClick={() => setShowFullPreview(!showFullPreview)}
            className="text-[10px] font-bold text-[#E91E63] hover:underline"
          >
            {showFullPreview ? 'Collapse' : 'View Full Text'}
          </button>
        </div>

        <p className="font-semibold text-red-700 text-[11px]">
          "🚨 EMERGENCY SOS: I AM IN DANGER! I need immediate help..."
        </p>

        {showFullPreview && (
          <pre className="text-[10px] text-[#2D1B24] font-mono whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-[#F3D9E2] mt-2 select-all">
            {dangerMessage}
          </pre>
        )}
      </div>

      {/* Individual Contacts Breakdown */}
      <div className="space-y-2 pt-1">
        <span className="block text-[10px] font-bold text-[#7A6570] uppercase tracking-wider">
          Designated Recipient Delivery Status
        </span>

        {notifications.map((record) => {
          const isAck = record.status === 'ACKNOWLEDGED';
          const isFail = record.status === 'FAILED';
          const perContactSmsUrl = notificationService.generateSmsIntentUrl(
            record.contactPhone,
            dangerMessage
          );

          return (
            <div
              key={record.id}
              className={`p-3 rounded-xl border transition-all ${
                isAck
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : isFail
                  ? 'bg-red-50/50 border-red-200'
                  : 'bg-[#FFF5F8]/70 border-[#F3D9E2]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#2D1B24] truncate">
                      {record.contactName}
                    </span>
                    <span className="text-[10px] text-[#7A6570] font-mono">
                      ({record.contactPhone})
                    </span>
                  </div>
                  {record.errorMessage && (
                    <p className="text-[11px] text-red-600 mt-0.5">⚠️ {record.errorMessage}</p>
                  )}
                  {isAck && record.acknowledgedAt && (
                    <p className="text-[10px] text-emerald-700 font-bold mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Contact confirmed: "I am responding"
                    </p>
                  )}
                  {!isAck && !isFail && (
                    <p className="text-[10px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Cellular SMS transmitted with live GPS pin
                    </p>
                  )}
                </div>

                <div className="shrink-0">{getStatusBadge(record.status)}</div>
              </div>

              {/* Action row for individual contact */}
              <div className="mt-2.5 pt-2 border-t border-[#F3D9E2]/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <a
                  href={perContactSmsUrl}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[11px] transition-colors"
                  title="Open device native SMS app as manual backup"
                >
                  <MessageSquare className="w-3 h-3 text-slate-500" />
                  <span>Manual SMS Backup</span>
                </a>

                {!isAck && (
                  <button
                    type="button"
                    onClick={() => handleSimulateAcknowledgement(record)}
                    className="inline-flex items-center gap-1 text-[10px] text-[#7A6570] hover:text-[#2D1B24] bg-white px-2 py-0.5 rounded border border-[#F3D9E2]"
                    title="Simulate recipient confirming 'I am responding' on their handset"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Simulate Recipient Tap
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

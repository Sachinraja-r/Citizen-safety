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
  BellRing,
  Smartphone,
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  Send,
  MapPin,
  AlertTriangle,
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
                location: location || { latitude: 12.8406, longitude: 77.6632 },
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
  }, [incidentId, user?.id, victimName, location]);

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
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            <BellRing className="w-3 h-3 text-indigo-600" />
            Push Dispatched
          </span>
        );
      case 'SMS_SENT':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <MessageSquare className="w-3 h-3 text-blue-600" />
            SMS Dispatched
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
        Syncing trusted contact notification dispatch queue...
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className={`p-4 bg-white border border-[#F3D9E2] rounded-2xl text-center text-xs text-[#7A6570] ${className}`}>
        <p className="font-semibold text-[#2D1B24]">No Emergency Contacts Designated</p>
        <p className="text-[11px] mt-1 text-[#7A6570]">
          Add trusted emergency contacts in settings to automatically broadcast your live location and "I am in danger" distress message upon SOS.
        </p>
      </div>
    );
  }

  const acknowledgedCount = notifications.filter((n) => n.status === 'ACKNOWLEDGED').length;
  const allPhones = notifications.map((n) => n.contactPhone);
  const groupSmsUrl = notificationService.generateGroupSmsIntentUrl(allPhones, dangerMessage);
  const hasNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

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
              Emergency Contact Alert Dispatched ({notifications.length})
            </h3>
            <p className="text-[11px] text-red-600 font-semibold">
              Live location &amp; "I am in danger" message active
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

      {/* Broadcast Quick Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        {/* Send SMS to all */}
        <a
          href={groupSmsUrl}
          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-colors text-center"
          title="Open cellular SMS app with danger message and contacts pre-filled"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send SMS: I'm in Danger</span>
        </a>

        {/* Native Web Share */}
        {hasNativeShare ? (
          <button
            type="button"
            onClick={handleNativeShare}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#FFF5F8] hover:bg-[#FCE4EC] border border-[#F3D9E2] text-[#D81B60] font-bold text-xs transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share via Apps</span>
          </button>
        ) : (
          <a
            href={notificationService.generateWhatsAppUrl(
              allPhones[0] || '',
              dangerMessage
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp Distress</span>
          </a>
        )}

        {/* Copy Danger Message */}
        <button
          type="button"
          onClick={handleCopyMessage}
          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Danger Text</span>
            </>
          )}
        </button>
      </div>

      {/* Message Preview Accordion */}
      <div className="bg-[#FFF5F8] border border-[#F3D9E2] rounded-xl p-3 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[#2D1B24] uppercase tracking-wider text-[10px] flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#E91E63]" />
            Dispatched Message Payload
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
          Designated Recipient Status
        </span>

        {notifications.map((record) => {
          const isAck = record.status === 'ACKNOWLEDGED';
          const isFail = record.status === 'FAILED';
          const perContactSmsUrl = notificationService.generateSmsIntentUrl(
            record.contactPhone,
            dangerMessage
          );
          const perContactWhatsAppUrl = notificationService.generateWhatsAppFallbackUrl(
            record.contactPhone,
            victimName,
            incidentId,
            record.secureToken,
            location
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
                </div>

                <div className="shrink-0">{getStatusBadge(record.status)}</div>
              </div>

              {/* Action Buttons for this individual contact */}
              <div className="mt-2.5 pt-2 border-t border-[#F3D9E2]/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <a
                    href={perContactSmsUrl}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#F3D9E2] text-[#2D1B24] hover:border-red-400 font-bold text-[10px] shadow-2xs"
                    title="Send cellular SMS to this contact"
                  >
                    <MessageSquare className="w-3 h-3 text-red-500" />
                    <span>SMS: I'm in Danger</span>
                  </a>

                  <a
                    href={perContactWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px]"
                    title="Open pre-filled WhatsApp danger dispatch"
                  >
                    <Share2 className="w-3 h-3 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                </div>

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

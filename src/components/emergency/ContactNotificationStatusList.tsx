import React, { useEffect, useState } from 'react';
import { ContactNotificationRecord } from '../../types';
import { notificationService } from '../../services/notificationService';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Share2,
  BellRing,
  Smartphone,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface ContactNotificationStatusListProps {
  incidentId: string;
  victimName?: string;
  className?: string;
}

export const ContactNotificationStatusList: React.FC<ContactNotificationStatusListProps> = ({
  incidentId,
  victimName = 'Citizen in Distress',
  className = '',
}) => {
  const [notifications, setNotifications] = useState<ContactNotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!incidentId) return;

    const unsubscribe = notificationService.subscribeToIncidentNotifications(
      incidentId,
      (records) => {
        setNotifications(records);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [incidentId]);

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
        <p className="text-[11px] mt-1">Add trusted emergency contacts in settings to broadcast automatic high-priority alerts.</p>
      </div>
    );
  }

  const acknowledgedCount = notifications.filter((n) => n.status === 'ACKNOWLEDGED').length;

  return (
    <div className={`w-full bg-white border border-[#F3D9E2] shadow-sm rounded-2xl p-4 text-left ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#E91E63]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D1B24]">
            Trusted Contacts Alert Dispatch ({notifications.length})
          </h3>
        </div>
        {acknowledgedCount > 0 ? (
          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {acknowledgedCount} Confirmed Responding
          </span>
        ) : (
          <span className="text-[10px] font-medium text-[#7A6570]">
            Awaiting Confirmation
          </span>
        )}
      </div>

      <p className="text-[11px] text-[#7A6570] mb-3 leading-snug">
        Alerts with distinct emergency signals and secure tracking links have been sent. Provider acceptance does not guarantee the contact heard the sound.
      </p>

      <div className="space-y-2.5">
        {notifications.map((record) => {
          const isAck = record.status === 'ACKNOWLEDGED';
          const isFail = record.status === 'FAILED';
          const whatsappUrl = notificationService.generateWhatsAppFallbackUrl(
            record.contactPhone,
            victimName,
            incidentId,
            record.secureToken
          );

          return (
            <div
              key={record.id}
              className={`p-3 rounded-xl border transition-all ${
                isAck
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : isFail
                  ? 'bg-red-50/40 border-red-200'
                  : 'bg-[#FFF5F8] border-[#F3D9E2]'
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
                    <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                      ✓ Confirmed receipt &amp; response
                    </p>
                  )}
                </div>

                <div className="shrink-0">{getStatusBadge(record.status)}</div>
              </div>

              {/* Action Buttons for this contact */}
              <div className="mt-2 pt-2 border-t border-[#F3D9E2]/60 flex items-center justify-between text-[11px]">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#E91E63] hover:text-[#D81B60] font-semibold"
                  title="Open pre-filled WhatsApp message"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Manual WhatsApp Relay</span>
                </a>

                {!isAck && (
                  <button
                    onClick={() => handleSimulateAcknowledgement(record)}
                    className="inline-flex items-center gap-1 text-[10px] text-[#7A6570] hover:text-[#2D1B24] bg-white px-2 py-0.5 rounded border border-[#F3D9E2]"
                    title="Simulate recipient tapping 'I am responding' on their handset"
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

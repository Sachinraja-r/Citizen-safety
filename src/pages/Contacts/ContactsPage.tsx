import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { contactService } from '../../services/contactService';
import { notificationService } from '../../services/notificationService';
import {
  playEmergencyAlertSound,
  stopEmergencyAlertSound,
} from '../../utils/emergencyAudio';
import { TrustedContact } from '../../types';
import { ContactCard } from '../../components/contacts/ContactCard';
import { ContactModal } from '../../components/contacts/ContactModal';
import { Button } from '../../components/common/Button';
import {
  Users,
  UserPlus,
  Bell,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

export const ContactsPage: React.FC = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<TrustedContact | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Emergency Sound & Push Notification States
  const [permission, setPermission] = useState<NotificationPermission>(
    notificationService.getPermissionState()
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const fetchContacts = async () => {
    const list = await contactService.getContacts(user?.id);
    setContacts(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
    setPermission(notificationService.getPermissionState());
    return () => {
      stopEmergencyAlertSound();
    };
  }, [user?.id]);

  const handleTestSound = async () => {
    if (isPlayingAudio) {
      stopEmergencyAlertSound();
      setIsPlayingAudio(false);
    } else {
      const ok = await playEmergencyAlertSound({ durationMs: 4000 });
      setIsPlayingAudio(ok);
      if (ok) {
        setTimeout(() => setIsPlayingAudio(false), 4000);
      }
    }
  };

  const handleEnablePush = async () => {
    setSubscribing(true);
    await notificationService.subscribeToPush(user?.id);
    setPermission(notificationService.getPermissionState());
    setSubscribing(false);
  };

  const handleOpenAdd = () => {
    setEditingContact(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact: TrustedContact) => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this emergency contact?')) {
      const res = await contactService.deleteContact(id, user?.id);
      if (res.error) {
        setFeedback({ type: 'error', message: res.error.message });
      } else {
        setFeedback({ type: 'success', message: 'Emergency contact removed.' });
        setTimeout(() => setFeedback(null), 3000);
      }
      await fetchContacts();
    }
  };

  const handleSaveContact = async (
    data: Omit<TrustedContact, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    setModalLoading(true);
    try {
      if (existingId) {
        const res = await contactService.updateContact({ ...data, id: existingId }, user?.id);
        if (res.error) throw res.error;
        setFeedback({
          type: 'success',
          message: `Emergency contact "${data.name}" updated successfully.`,
        });
      } else {
        const res = await contactService.addContact(data, user?.id);
        if (res.error) throw res.error;
        setFeedback({
          type: 'success',
          message: `Emergency contact "${data.name}" added to your safety circle.`,
        });
      }

      setIsModalOpen(false);
      await fetchContacts();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      console.error('Failed to save contact:', err);
      // Re-throw so ContactModal displays the error and stays open for the user to edit
      throw err;
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="w-full text-left animate-fade-in space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D81B60] block mb-0.5">
            Emergency Safety Circle
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-[#2D1B24]">Trusted Contacts</h1>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={handleOpenAdd}
          disabled={contacts.length >= 5}
          leftIcon={<UserPlus className="w-4 h-4" />}
          className="shadow-md shadow-[#E91E63]/25"
        >
          Add Contact
        </Button>
      </div>

      <p className="text-xs text-[#7A6570]">
        You can designate up to 5 verified contacts. In an emergency SOS, automated SMS alerts and telephony calls will be dispatched according to your priority list.
      </p>

      {/* Real-time Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-2xl flex items-center justify-between text-xs animate-fade-in transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
            aria-label="Dismiss feedback"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Contact count notice */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-[#F3D9E2] shadow-sm text-xs">
        <span className="text-[#2D1B24] font-medium">Designated Contacts</span>
        <span className="font-bold text-[#E91E63]">{contacts.length} / 5</span>
      </div>

      {/* Emergency Alert Beep & Web Push Notification Channel */}
      <div className="bg-white border border-[#F3D9E2] shadow-sm rounded-2xl p-4 text-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#E91E63]" />
            <h3 className="font-bold text-[#2D1B24] uppercase tracking-wider text-[11px]">
              Emergency Alert Sound &amp; Push Channel
            </h3>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              permission === 'granted'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : permission === 'denied'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {permission === 'granted'
              ? 'Push Alerts Enabled'
              : permission === 'denied'
              ? 'Permission Denied'
              : 'Permission Required'}
          </span>
        </div>

        <p className="text-[11px] text-[#7A6570] leading-relaxed">
          When an SOS is activated, recipients receive a high-priority notification with an unmistakable dual-tone acoustic alert (853 Hz + 960 Hz) wherever device settings permit it.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          {permission !== 'granted' ? (
            <Button
              size="sm"
              variant="primary"
              className="flex-1 font-bold shadow-sm"
              onClick={handleEnablePush}
              isLoading={subscribing}
              leftIcon={<Bell className="w-3.5 h-3.5" />}
            >
              Enable Browser Push Notifications
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px] py-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Web Push active on this device
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={handleTestSound}
            leftIcon={
              isPlayingAudio ? (
                <VolumeX className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#E91E63]" />
              )
            }
          >
            {isPlayingAudio ? 'Stop Alert Tone' : 'Test Emergency Beep & Vibrate'}
          </Button>
        </div>

        <p className="text-[10px] text-[#7A6570] italic pt-0.5">
          Note: Web browsers cannot override hardware silent switches or OS Do Not Disturb modes.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-[#7A6570]">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="py-12 px-6 rounded-2xl bg-white border border-[#F3D9E2] shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-[#FFF5F8] text-[#E91E63] flex items-center justify-center mx-auto mb-3 border border-[#F3D9E2]">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#2D1B24] mb-1">No Trusted Contacts Added</h3>
          <p className="text-xs text-[#7A6570] max-w-xs mx-auto mb-4">
            Having trusted contacts ensures your family and friends receive immediate notification when you trigger SOS.
          </p>
          <Button variant="primary" size="sm" onClick={handleOpenAdd} className="shadow-md shadow-[#E91E63]/25">
            Add First Emergency Contact
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Contact modal */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveContact}
        initialData={editingContact}
        isLoading={modalLoading}
      />
    </div>
  );
};

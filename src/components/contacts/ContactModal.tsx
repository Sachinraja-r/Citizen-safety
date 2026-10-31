import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TrustedContact } from '../../types';
import { validatePhone, validateRequired } from '../../utils/validators';
import { AlertCircle } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Omit<TrustedContact, 'id' | 'createdAt'>, existingId?: string) => Promise<void>;
  initialData?: TrustedContact | null;
  isLoading?: boolean;
}

const RELATIONSHIPS = [
  'Parent / Guardian',
  'Spouse / Partner',
  'Sibling',
  'Child',
  'Friend / Colleague',
  'Neighbor / Roommate',
  'Doctor / Healthcare',
  'Other',
];

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0]);
  const [priority, setPriority] = useState<number>(1);
  const [notifySms, setNotifySms] = useState(true);
  const [notifyCall, setNotifyCall] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPhone(initialData.phone);
      setRelationship(initialData.relationship);
      setPriority(initialData.priority);
      setNotifySms(initialData.notifySms);
      setNotifyCall(initialData.notifyCall);
    } else {
      setName('');
      setPhone('');
      setRelationship(RELATIONSHIPS[0]);
      setPriority(1);
      setNotifySms(true);
      setNotifyCall(true);
    }
    setErrors({});
    setSubmitError(null);
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const nameVal = validateRequired(name, 'Full Name');
    const phoneVal = validatePhone(phone);

    if (!nameVal.valid || !phoneVal.valid) {
      setErrors({
        name: nameVal.error,
        phone: phoneVal.error,
      });
      setSubmitError(phoneVal.error || nameVal.error || 'Please fill in all required fields correctly.');
      return;
    }

    try {
      await onSave(
        {
          name: name.trim(),
          phone: (phoneVal.clean || phone).trim(),
          relationship,
          priority: Number(priority),
          notifySms,
          notifyCall,
        },
        initialData?.id
      );
    } catch (err: unknown) {
      console.error('Failed to save trusted contact:', err);
      setSubmitError((err as Error).message || 'Failed to save contact. Please verify details and try again.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Trusted Contact' : 'Add Trusted Contact'}
      description="Trusted contacts are immediately notified via SMS and emergency telemetry during an SOS."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {submitError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{submitError}</span>
          </div>
        )}

        <Input
          label="Full Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          placeholder="e.g. Maya Sharma"
          required
          error={errors.name}
        />

        <Input
          label="Phone Number"
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
          }}
          placeholder="e.g. 98765 43210 or +91 98765 43210"
          required
          error={errors.phone}
          helperText="Enter 10-digit mobile number with or without +91 country code"
        />

        <div>
          <label className="block text-xs font-bold text-[#2D1B24] mb-1.5 uppercase tracking-wider">
            Relationship
          </label>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full bg-white text-[#2D1B24] text-sm rounded-xl px-3.5 py-3 border border-[#F3D9E2] focus:outline-none focus:border-[#E91E63] shadow-sm"
          >
            {RELATIONSHIPS.map((rel) => (
              <option key={rel} value={rel}>
                {rel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#2D1B24] mb-1.5 uppercase tracking-wider">
            Contact Priority (1 = Primary Dispatch)
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="w-full bg-white text-[#2D1B24] text-sm rounded-xl px-3.5 py-3 border border-[#F3D9E2] focus:outline-none focus:border-[#E91E63] shadow-sm"
          >
            <option value={1}>1 - Primary Emergency Contact</option>
            <option value={2}>2 - Secondary Contact</option>
            <option value={3}>3 - Tertiary Contact</option>
            <option value={4}>4 - Alternate Contact</option>
            <option value={5}>5 - Backup Contact</option>
          </select>
        </div>

        <div className="pt-2 space-y-2 border-t border-[#F3D9E2]">
          <label className="flex items-center gap-2.5 text-xs text-[#2D1B24] cursor-pointer">
            <input
              type="checkbox"
              checked={notifySms}
              onChange={(e) => setNotifySms(e.target.checked)}
              className="rounded bg-white border-[#F3D9E2] text-[#E91E63] focus:ring-0"
            />
            <span>Send automated SMS with live GPS link on SOS</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs text-[#2D1B24] cursor-pointer">
            <input
              type="checkbox"
              checked={notifyCall}
              onChange={(e) => setNotifyCall(e.target.checked)}
              className="rounded bg-white border-[#F3D9E2] text-[#E91E63] focus:ring-0"
            />
            <span>Trigger automated priority telephony voice call</span>
          </label>
        </div>

        <div className="flex gap-2.5 pt-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="flex-1" isLoading={isLoading}>
            Save Contact
          </Button>
        </div>
      </form>
    </Modal>
  );
};

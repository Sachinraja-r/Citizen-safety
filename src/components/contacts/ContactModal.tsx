import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { TrustedContact } from '../../types';
import { validatePhone, validateRequired } from '../../utils/validators';

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
      setPhone('+91 ');
      setRelationship(RELATIONSHIPS[0]);
      setPriority(1);
      setNotifySms(true);
      setNotifyCall(true);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameVal = validateRequired(name, 'Full Name');
    const phoneVal = validatePhone(phone);

    if (!nameVal.valid || !phoneVal.valid) {
      setErrors({
        name: nameVal.error,
        phone: phoneVal.error,
      });
      return;
    }

    await onSave(
      {
        name: name.trim(),
        phone: phone.trim(),
        relationship,
        priority: Number(priority),
        notifySms,
        notifyCall,
      },
      initialData?.id
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Trusted Contact' : 'Add Trusted Contact'}
      description="Trusted contacts are directly alerted when you activate emergency SOS."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <Input
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Maya Sharma"
          required
          error={errors.name}
        />

        <Input
          label="Phone Number"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
          required
          error={errors.phone}
          helperText="Include country code for rapid international / cellular relay"
        />

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Relationship
          </label>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full bg-white text-slate-900 text-sm rounded-xl px-3.5 py-3 border border-slate-200 focus:outline-none focus:border-pink-500 shadow-sm"
          >
            {RELATIONSHIPS.map((rel) => (
              <option key={rel} value={rel}>
                {rel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Contact Priority (1 = Highest)
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="w-full bg-white text-slate-900 text-sm rounded-xl px-3.5 py-3 border border-slate-200 focus:outline-none focus:border-pink-500 shadow-sm"
          >
            <option value={1}>1 - Primary Emergency Contact</option>
            <option value={2}>2 - Secondary Contact</option>
            <option value={3}>3 - Tertiary Contact</option>
            <option value={4}>4 - Alternate Contact</option>
            <option value={5}>5 - Backup Contact</option>
          </select>
        </div>

        <div className="pt-2 space-y-2 border-t border-slate-100">
          <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={notifySms}
              onChange={(e) => setNotifySms(e.target.checked)}
              className="rounded bg-white border-slate-300 text-pink-600 focus:ring-0"
            />
            <span>Send automated SMS with live GPS link on SOS</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyCall}
              onChange={(e) => setNotifyCall(e.target.checked)}
              className="rounded bg-white border-slate-300 text-pink-600 focus:ring-0"
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

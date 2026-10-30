import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { AlertTriangle } from 'lucide-react';

interface CancelIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

const REASONS = [
  'Accidental button trigger / False alarm',
  'Situation resolved / I am in a safe location now',
  'Assistance arrived on scene',
  'Triggered for test / drill purposes',
];

export const CancelIncidentModal: React.FC<CancelIncidentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);

  const handleConfirm = async () => {
    await onConfirm(selectedReason || 'Alert cancelled by citizen');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Emergency Alert?"
      description="Only cancel if you are safe and no longer require responder dispatch."
      maxWidth="md"
    >
      <div className="text-left space-y-4">
        <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>Cancelling will immediately notify dispatchers and returning units that the alert was called off.</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
            Select Cancellation Reason
          </label>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                  selectedReason === r
                    ? 'bg-slate-800 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <input
                  type="radio"
                  name="cancel_reason"
                  checked={selectedReason === r}
                  onChange={() => setSelectedReason(r)}
                  className="text-blue-600 focus:ring-0"
                />
                <span>{r}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5 pt-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            Keep Active
          </Button>
          <Button
            type="button"
            variant="danger"
            className="flex-1"
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            Confirm Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};

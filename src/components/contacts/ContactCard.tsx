import React from 'react';
import { TrustedContact } from '../../types';
import { Phone, Edit2, Trash2, MessageSquare } from 'lucide-react';

interface ContactCardProps {
  contact: TrustedContact;
  onEdit: (contact: TrustedContact) => void;
  onDelete: (id: string) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({ contact, onEdit, onDelete }) => {
  return (
    <div className="bg-white border border-[#F3D9E2] shadow-sm rounded-2xl p-4 text-left transition-all hover:border-[#F8BBD0]">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold text-[#2D1B24] truncate">{contact.name}</h4>
            {contact.priority === 1 ? (
              <span className="text-[10px] bg-[#FFF5F8] text-[#D81B60] font-bold px-2 py-0.5 rounded-full border border-[#F3D9E2]">
                Primary
              </span>
            ) : (
              <span className="text-[10px] bg-[#FFF5F8] text-[#7A6570] font-medium px-2 py-0.5 rounded-full border border-[#F3D9E2]">
                Priority {contact.priority}
              </span>
            )}
          </div>
          <p className="text-xs text-[#7A6570] mt-0.5">{contact.relationship}</p>
          <p className="text-xs font-mono text-[#2D1B24] mt-1 font-semibold">{contact.phone}</p>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(contact)}
            className="p-2 rounded-lg text-[#7A6570] hover:text-[#E91E63] hover:bg-[#FFF5F8] transition-colors"
            aria-label={`Edit ${contact.name}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(contact.id)}
            className="p-2 rounded-lg text-[#7A6570] hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label={`Delete ${contact.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Permissions / notification badges & call action */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F3D9E2] text-[11px]">
        <div className="flex items-center gap-2 text-[#7A6570]">
          {contact.notifySms && (
            <span className="flex items-center gap-1 text-[#2D1B24] font-medium">
              <MessageSquare className="w-3 h-3 text-[#E91E63]" /> SMS Alert
            </span>
          )}
          {contact.notifyCall && (
            <span className="flex items-center gap-1 text-[#2D1B24] font-medium">
              <Phone className="w-3 h-3 text-[#E91E63]" /> Voice Call
            </span>
          )}
        </div>

        <a
          href={`tel:${contact.phone}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FFF5F8] text-[#D81B60] border border-[#F3D9E2] hover:bg-[#F8BBD0]/30 font-bold shadow-xs transition-colors"
        >
          <Phone className="w-3.5 h-3.5" /> Call Now
        </a>
      </div>
    </div>
  );
};

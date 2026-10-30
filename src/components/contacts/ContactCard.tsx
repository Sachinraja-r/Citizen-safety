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
    <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl p-4 text-left transition-all hover:border-pink-300">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">{contact.name}</h4>
            {contact.priority === 1 ? (
              <span className="text-[10px] bg-pink-50 text-pink-700 font-bold px-2 py-0.5 rounded-full border border-pink-200">
                Primary
              </span>
            ) : (
              <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full border border-slate-200">
                Priority {contact.priority}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{contact.relationship}</p>
          <p className="text-xs font-mono text-slate-700 mt-1 font-semibold">{contact.phone}</p>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(contact)}
            className="p-2 rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-colors"
            aria-label={`Edit ${contact.name}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(contact.id)}
            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label={`Delete ${contact.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Permissions / notification badges & call action */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-[11px]">
        <div className="flex items-center gap-2 text-slate-500">
          {contact.notifySms && (
            <span className="flex items-center gap-1 text-slate-700 font-medium">
              <MessageSquare className="w-3 h-3 text-pink-600" /> SMS Alert
            </span>
          )}
          {contact.notifyCall && (
            <span className="flex items-center gap-1 text-slate-700 font-medium">
              <Phone className="w-3 h-3 text-pink-600" /> Voice Call
            </span>
          )}
        </div>

        <a
          href={`tel:${contact.phone}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 font-bold shadow-xs transition-colors"
        >
          <Phone className="w-3.5 h-3.5" /> Call Now
        </a>
      </div>
    </div>
  );
};

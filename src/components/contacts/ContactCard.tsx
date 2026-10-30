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
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 text-left transition-all hover:border-slate-700">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold text-white truncate">{contact.name}</h4>
            {contact.priority === 1 ? (
              <span className="text-[10px] bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded-full border border-red-500/30">
                Primary
              </span>
            ) : (
              <span className="text-[10px] bg-slate-800 text-slate-400 font-medium px-2 py-0.5 rounded-full border border-slate-700">
                Priority {contact.priority}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{contact.relationship}</p>
          <p className="text-xs font-mono text-slate-300 mt-1">{contact.phone}</p>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(contact)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label={`Edit ${contact.name}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(contact.id)}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
            aria-label={`Delete ${contact.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Permissions / notification badges & call action */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
        <div className="flex items-center gap-2 text-slate-400">
          {contact.notifySms && (
            <span className="flex items-center gap-1 text-slate-300">
              <MessageSquare className="w-3 h-3 text-blue-400" /> SMS Alert
            </span>
          )}
          {contact.notifyCall && (
            <span className="flex items-center gap-1 text-slate-300">
              <Phone className="w-3 h-3 text-emerald-400" /> Voice Call
            </span>
          )}
        </div>

        <a
          href={`tel:${contact.phone}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 font-semibold"
        >
          <Phone className="w-3.5 h-3.5" /> Call Now
        </a>
      </div>
    </div>
  );
};

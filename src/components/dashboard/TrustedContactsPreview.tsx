import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrustedContact } from '../../types';
import { contactService } from '../../services/contactService';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Phone, ChevronRight, UserPlus } from 'lucide-react';

export const TrustedContactsPreview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contactService.getContacts(user?.id).then((data) => {
      setContacts(data);
      setLoading(false);
    });
  }, [user?.id]);

  return (
    <div className="w-full text-left my-5 bg-white border border-slate-200/90 shadow-sm rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-pink-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Trusted Emergency Contacts ({contacts.length}/5)
          </h3>
        </div>
        <button
          onClick={() => navigate('/app/contacts')}
          className="text-xs text-pink-600 font-bold hover:text-pink-700 flex items-center gap-0.5"
        >
          Manage <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="py-3 text-center text-xs text-slate-400">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-xs text-slate-500 mb-2">No trusted contacts added yet.</p>
          <button
            onClick={() => navigate('/app/contacts')}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Emergency Contact
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.slice(0, 2).map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 truncate">{contact.name}</span>
                  {contact.priority === 1 && (
                    <span className="text-[10px] bg-pink-50 text-pink-700 font-bold px-1.5 py-0.2 rounded border border-pink-200">
                      Primary
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">{contact.phone} • {contact.relationship}</p>
              </div>

              <a
                href={`tel:${contact.phone}`}
                className="p-2 rounded-lg bg-white hover:bg-pink-50 text-pink-600 transition-colors border border-slate-200"
                aria-label={`Call ${contact.name}`}
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

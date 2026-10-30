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
    <div className="w-full text-left my-5 bg-white border border-[#F3D9E2] shadow-sm rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#E91E63]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D1B24]">
            Trusted Emergency Contacts ({contacts.length}/5)
          </h3>
        </div>
        <button
          onClick={() => navigate('/app/contacts')}
          className="text-xs text-[#E91E63] font-bold hover:text-[#D81B60] flex items-center gap-0.5"
        >
          Manage <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="py-3 text-center text-xs text-[#7A6570]">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-xs text-[#7A6570] mb-2">No trusted contacts added yet.</p>
          <button
            onClick={() => navigate('/app/contacts')}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-[#FFF5F8] text-[#D81B60] border border-[#F3D9E2] hover:bg-[#F8BBD0]/40 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Emergency Contact
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.slice(0, 2).map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFF5F8] border border-[#F3D9E2]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2D1B24] truncate">{contact.name}</span>
                  {contact.priority === 1 && (
                    <span className="text-[10px] bg-[#F8BBD0]/30 text-[#D81B60] font-bold px-1.5 py-0.2 rounded border border-[#F3D9E2]">
                      Primary
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#7A6570]">{contact.phone} • {contact.relationship}</p>
              </div>

              <a
                href={`tel:${contact.phone}`}
                className="p-2 rounded-lg bg-white hover:bg-[#F8BBD0]/20 text-[#E91E63] transition-colors border border-[#F3D9E2]"
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

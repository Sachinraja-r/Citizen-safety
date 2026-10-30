import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { contactService } from '../../services/contactService';
import { TrustedContact } from '../../types';
import { ContactCard } from '../../components/contacts/ContactCard';
import { ContactModal } from '../../components/contacts/ContactModal';
import { Button } from '../../components/common/Button';
import { Users, UserPlus } from 'lucide-react';

export const ContactsPage: React.FC = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<TrustedContact | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchContacts = async () => {
    const list = await contactService.getContacts(user?.id);
    setContacts(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, [user?.id]);

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
      await contactService.deleteContact(id, user?.id);
      await fetchContacts();
    }
  };

  const handleSaveContact = async (
    data: Omit<TrustedContact, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    setModalLoading(true);
    if (existingId) {
      await contactService.updateContact({ ...data, id: existingId }, user?.id);
    } else {
      await contactService.addContact(data, user?.id);
    }
    setModalLoading(false);
    setIsModalOpen(false);
    await fetchContacts();
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

      {/* Contact count notice */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-[#F3D9E2] shadow-sm text-xs">
        <span className="text-[#2D1B24] font-medium">Designated Contacts</span>
        <span className="font-bold text-[#E91E63]">{contacts.length} / 5</span>
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

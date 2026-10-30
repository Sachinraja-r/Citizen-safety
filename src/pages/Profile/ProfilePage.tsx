import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { usePWA } from '../../hooks/usePWA';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { AlertBanner } from '../../components/common/AlertBanner';
import {
  MapPin,
  Lock,
  Download,
  LogOut,
  Edit2,
  CheckCircle2,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isDemo, logout, updateProfile } = useAuth();
  const { location, accuracy, permission, requestLocation } = useLocation();
  const { isInstallable, isInstalled, triggerInstall } = usePWA();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || 'O+');
  const [allergies, setAllergies] = useState(user?.allergies || '');
  const [medicalNotes, setMedicalNotes] = useState(user?.medicalNotes || '');
  const [saveLoading, setSaveLoading] = useState(false);

  const handleOpenEdit = () => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone || '');
      setBloodGroup(user.bloodGroup || 'O+');
      setAllergies(user.allergies || '');
      setMedicalNotes(user.medicalNotes || '');
    }
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    await updateProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      bloodGroup,
      allergies,
      medicalNotes,
    });
    setSaveLoading(false);
    setIsEditModalOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="w-full text-left animate-fade-in space-y-4 pb-14">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D81B60] block mb-0.5">
            Citizen Account
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-[#2D1B24]">Profile &amp; Settings</h1>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={handleOpenEdit}
          leftIcon={<Edit2 className="w-3.5 h-3.5" />}
        >
          Edit Profile
        </Button>
      </div>

      {isDemo && (
        <AlertBanner
          type="info"
          title="Demo Mode Account"
          message="You are signed in as a local demo citizen. All features, maps, and simulations are functional for evaluation."
        />
      )}

      {/* Profile Card */}
      <div className="bg-white border border-[#F3D9E2] shadow-sm rounded-2xl p-4">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#FFF5F8] text-[#D81B60] border border-[#F3D9E2] flex items-center justify-center font-bold text-lg shadow-xs">
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="text-base font-bold text-[#2D1B24]">{user?.fullName || 'Citizen User'}</h3>
            <p className="text-xs text-[#7A6570]">{user?.email}</p>
            <p className="text-xs font-mono text-[#2D1B24] mt-0.5 font-medium">{user?.phone || 'No phone added'}</p>
          </div>
        </div>

        {/* Medical & Emergency info */}
        <div className="pt-3 border-t border-[#F3D9E2] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#7A6570]">Blood Group:</span>
            <span className="font-bold text-[#D81B60] bg-[#FFF5F8] px-2 py-0.5 rounded border border-[#F3D9E2]">
              {user?.bloodGroup || 'Not specified'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#7A6570]">Known Allergies:</span>
            <span className="text-[#2D1B24] font-medium">{user?.allergies || 'None reported'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#7A6570]">Medical Notes:</span>
            <span className="text-[#2D1B24] font-medium">{user?.medicalNotes || 'None'}</span>
          </div>
        </div>
      </div>

      {/* Location Diagnostics Card */}
      <div className="bg-white border border-[#F3D9E2] shadow-sm rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#E91E63]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D1B24]">
              GPS Location Diagnostics
            </h3>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              permission === 'granted'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {permission === 'granted' ? 'Permission Active' : 'Permission Required'}
          </span>
        </div>

        <p className="text-xs text-[#7A6570] leading-relaxed">
          The browser Geolocation API supplies GPS coordinates to arriving units. PWAs cannot force device hardware GPS on automatically if disabled in OS settings.
        </p>

        {location && (
          <div className="bg-[#FFF5F8] p-2.5 rounded-xl border border-[#F3D9E2] text-xs font-mono text-[#2D1B24]">
            Latitude: {typeof location.latitude === 'number' ? location.latitude.toFixed(6) : 'N/A'} | Longitude: {typeof location.longitude === 'number' ? location.longitude.toFixed(6) : 'N/A'}
            {accuracy && <div className="text-[11px] text-[#7A6570] mt-1 font-sans">Accuracy: ±{accuracy} meters</div>}
          </div>
        )}

        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => requestLocation()}>
          Test &amp; Re-verify GPS Coordinates
        </Button>
      </div>

      {/* PWA Installation Card */}
      <div className="bg-white border border-[#F3D9E2] shadow-sm rounded-2xl p-4">
        <div className="flex items-center gap-2.5 mb-2">
          <Download className="w-4 h-4 text-[#E91E63]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D1B24]">
            Progressive Web App (PWA)
          </h3>
        </div>

        <p className="text-xs text-[#7A6570] leading-relaxed mb-3">
          Install Raksha on your home screen for rapid 1-touch access during emergencies without opening browser tabs.
        </p>

        {isInstalled ? (
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> App is installed in standalone mode
          </div>
        ) : isInstallable ? (
          <Button size="sm" variant="primary" className="w-full font-bold shadow-md shadow-[#E91E63]/25" onClick={triggerInstall}>
            Install App to Home Screen
          </Button>
        ) : (
          <p className="text-[11px] text-[#7A6570]">
            To install manually on iOS or Android: tap the browser menu (or share button on Safari) and select &quot;Add to Home Screen&quot;.
          </p>
        )}
      </div>

      {/* Security & Privacy Disclosures */}
      <div className="bg-white border border-[#F3D9E2] shadow-sm rounded-2xl p-4 text-xs text-[#7A6570] space-y-2">
        <div className="flex items-center gap-2 text-[#2D1B24] font-bold mb-1">
          <Lock className="w-4 h-4 text-emerald-600" /> Security &amp; Privacy Safeguards
        </div>
        <p>• Data is protected with Supabase Row Level Security (RLS) preventing unauthorized access.</p>
        <p>• Live GPS coordinates are only broadcasted when an emergency SOS alert is actively triggered.</p>
        <p>• Medical notes are never displayed publicly without explicit citizen authorization.</p>
      </div>

      {/* Logout button */}
      <div className="pt-2">
        <Button
          variant="outline"
          className="w-full border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          onClick={handleLogout}
          leftIcon={<LogOut className="w-4 h-4" />}
        >
          Sign Out of Account
        </Button>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Citizen Profile"
        description="Update your emergency contact information and medical details."
      >
        <form onSubmit={handleSaveProfile} className="space-y-3.5 text-left">
          <Input
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Blood Group
            </label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full bg-white text-slate-900 text-sm rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-none focus:border-pink-500 shadow-sm"
            >
              {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Allergies"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="e.g. Penicillin"
          />

          <Input
            label="Medical Notes"
            value={medicalNotes}
            onChange={(e) => setMedicalNotes(e.target.value)}
            placeholder="e.g. Asthma, Diabetic"
          />

          <div className="flex gap-2.5 pt-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1 font-bold" isLoading={saveLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

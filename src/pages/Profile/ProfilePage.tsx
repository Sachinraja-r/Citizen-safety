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
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Citizen Account
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white">Profile & Settings</h1>
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
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-lg">
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{user?.fullName || 'Citizen User'}</h3>
            <p className="text-xs text-slate-400">{user?.email}</p>
            <p className="text-xs font-mono text-slate-300 mt-0.5">{user?.phone || 'No phone added'}</p>
          </div>
        </div>

        {/* Medical & Emergency info */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Blood Group:</span>
            <span className="font-bold text-red-400 bg-red-950/30 px-2 py-0.5 rounded border border-red-500/20">
              {user?.bloodGroup || 'Not specified'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Known Allergies:</span>
            <span className="text-slate-200">{user?.allergies || 'None reported'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Medical Notes:</span>
            <span className="text-slate-200">{user?.medicalNotes || 'None'}</span>
          </div>
        </div>
      </div>

      {/* Location Diagnostics Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              GPS Location Diagnostics
            </h3>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              permission === 'granted'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}
          >
            {permission === 'granted' ? 'Permission Active' : 'Permission Required'}
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          The browser Geolocation API supplies GPS coordinates to arriving units. PWAs cannot force device hardware GPS on automatically if disabled in OS settings.
        </p>

        {location && (
          <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
            Latitude: {location.latitude.toFixed(6)} | Longitude: {location.longitude.toFixed(6)}
            {accuracy && <div className="text-[11px] text-slate-400 mt-1 font-sans">Accuracy: ±{accuracy} meters</div>}
          </div>
        )}

        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => requestLocation()}>
          Test & Re-verify GPS Coordinates
        </Button>
      </div>

      {/* PWA Installation Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2.5 mb-2">
          <Download className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Progressive Web App (PWA)
          </h3>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          Install Raksha on your home screen for rapid 1-touch access during emergencies without opening browser tabs.
        </p>

        {isInstalled ? (
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4" /> App is installed in standalone mode
          </div>
        ) : isInstallable ? (
          <Button size="sm" variant="primary" className="w-full font-bold" onClick={triggerInstall}>
            Install App to Home Screen
          </Button>
        ) : (
          <p className="text-[11px] text-slate-500">
            To install manually on iOS or Android: tap the browser menu (or share button on Safari) and select "Add to Home Screen".
          </p>
        )}
      </div>

      {/* Security & Privacy Disclosures */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-200 font-bold mb-1">
          <Lock className="w-4 h-4 text-emerald-400" /> Security & Privacy Safeguards
        </div>
        <p>• Data is protected with Supabase Row Level Security (RLS) preventing unauthorized access.</p>
        <p>• Live GPS coordinates are only broadcasted when an emergency SOS alert is actively triggered.</p>
        <p>• Medical notes are never displayed publicly without explicit citizen authorization.</p>
      </div>

      {/* Logout button */}
      <div className="pt-2">
        <Button
          variant="outline"
          className="w-full border-rose-500/30 text-rose-400 hover:bg-rose-950/20"
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
              className="w-full bg-[#111827] text-slate-100 text-sm rounded-xl px-3 py-2.5 border border-slate-800 focus:outline-none focus:border-blue-500"
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

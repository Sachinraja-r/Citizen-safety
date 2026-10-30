import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { contactService } from '../../services/contactService';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { AlertBanner } from '../../components/common/AlertBanner';
import { validatePhone, validateRequired } from '../../utils/validators';
import { MapPin, Users, CheckCircle2 } from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { location, accuracy, requestLocation, error: locationError } = useLocation();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '+91 ');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || 'O+');
  const [allergies, setAllergies] = useState(user?.allergies || '');
  const [medicalNotes, setMedicalNotes] = useState(user?.medicalNotes || '');
  const [shareMedical, setShareMedical] = useState(true);

  // Initial Contact setup in Step 3
  const [contactName, setContactName] = useState('Rajesh Sharma');
  const [contactPhone, setContactPhone] = useState('+91 98450 11223');
  const [contactRelation, setContactRelation] = useState('Brother');

  const [errors, setErrors] = useState<{ fullName?: string; phone?: string; contact?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    const nameVal = validateRequired(fullName, 'Full Name');
    const phoneVal = validatePhone(phone);

    if (!nameVal.valid || !phoneVal.valid) {
      setErrors({ fullName: nameVal.error, phone: phoneVal.error });
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleStep2Next = () => {
    setStep(3);
  };

  const handleComplete = async () => {
    setLoading(true);

    // Save profile
    await updateProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      dateOfBirth,
      bloodGroup,
      allergies,
      medicalNotes,
      emergencyNotesShared: shareMedical,
      isOnboarded: true,
    });

    // Save initial contact if provided
    if (contactName && contactPhone) {
      await contactService.addContact(
        {
          name: contactName.trim(),
          phone: contactPhone.trim(),
          relationship: contactRelation,
          priority: 1,
          notifySms: true,
          notifyCall: true,
        },
        user?.id
      );
    }

    setLoading(false);
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center px-4 py-8">
      <div className="w-full max-w-md mx-auto text-left bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600">
              Setup Step {step} of 3
            </span>
            <h2 className="text-lg font-black text-slate-900">
              {step === 1 && 'Citizen Safety Profile'}
              {step === 2 && 'Location Permission'}
              {step === 3 && 'Trusted Contact Setup'}
            </h2>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-6 h-1.5 rounded-full transition-colors ${
                  s === step ? 'bg-pink-600' : s < step ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Basic Info & Medical */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} className="space-y-4">
            <Input
              label="Full Name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              error={errors.fullName}
            />

            <Input
              label="Phone Number"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              error={errors.phone}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full bg-white text-slate-900 text-sm rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-none focus:border-pink-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
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
            </div>

            <Input
              label="Known Allergies (Optional)"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. Penicillin, Peanuts"
            />

            <Input
              label="Emergency Medical Notes (Optional)"
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="e.g. Asthma, diabetic, carries EpiPen"
            />

            <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={shareMedical}
                onChange={(e) => setShareMedical(e.target.checked)}
                className="rounded bg-white border-slate-300 text-pink-600 focus:ring-0 mt-0.5"
              />
              <span>
                Share medical notes with emergency paramedics only when a Medical Emergency SOS is triggered.
              </span>
            </label>

            <Button type="submit" variant="primary" size="lg" className="w-full mt-4 font-bold shadow-md shadow-pink-500/25">
              Continue to Location Permission
            </Button>
          </form>
        )}

        {/* STEP 2: Location Permission */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center mx-auto mb-3 border border-pink-200">
                <MapPin className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Why Raksha Needs GPS Location</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                When you press SOS, emergency dispatchers and police patrol vehicles need your coordinates to reach you. Without location, responders cannot identify where you are in distress.
              </p>

              {location ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left text-xs">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Location Granted Successfully
                  </div>
                  <p className="text-slate-700">
                    Coordinates: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </p>
                  {accuracy && <p className="text-slate-500 text-[11px]">Accuracy: ±{accuracy}m</p>}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  className="w-full font-bold shadow-md shadow-pink-500/25"
                  onClick={() => requestLocation()}
                >
                  Grant Browser Location Access
                </Button>
              )}
            </div>

            {locationError && (
              <AlertBanner
                type="warning"
                title="Location Access Limitation"
                message="Location was not granted or is blocked. You can still proceed to use Raksha, but SOS alerts will use approximate city landmark fallbacks until enabled."
              />
            )}

            <div className="flex gap-2.5 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="button" variant="primary" className="flex-1 font-bold shadow-md shadow-pink-500/25" onClick={handleStep2Next}>
                {location ? 'Continue' : 'Skip & Continue with Fallback'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Trusted Contact */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-pink-50 border border-pink-200 text-xs text-pink-800 flex items-start gap-2.5">
              <Users className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
              <span>
                Add your primary trusted emergency contact. When you trigger SOS, this person receives high-priority notification with your live coordinates.
              </span>
            </div>

            <Input
              label="Contact Full Name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Maya Sharma"
            />

            <Input
              label="Contact Phone Number"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Relationship
              </label>
              <select
                value={contactRelation}
                onChange={(e) => setContactRelation(e.target.value)}
                className="w-full bg-white text-slate-900 text-sm rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-none focus:border-pink-500 shadow-sm"
              >
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Parent">Parent</option>
                <option value="Spouse">Spouse</option>
                <option value="Friend">Friend</option>
                <option value="Neighbor">Neighbor</option>
              </select>
            </div>

            <div className="flex gap-2.5 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1 font-bold shadow-md shadow-pink-500/25"
                onClick={handleComplete}
                isLoading={loading}
              >
                Complete Onboarding
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, MapPin, Users, ArrowRight, Zap } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loginDemo } = useAuth();

  const handleDemoAccess = () => {
    loginDemo();
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col justify-between selection:bg-red-600">
      {/* Top Banner */}
      <header className="w-full max-w-5xl mx-auto px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Raksha Logo" className="w-9 h-9 drop-shadow-md" />
          <div>
            <span className="font-black text-xl text-white tracking-wider">RAKSHA</span>
            <span className="text-[10px] text-red-400 block -mt-1 font-bold">EMERGENCY RESPONSE</span>
          </div>
        </div>

        <div>
          {user ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => navigate('/app')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Open Safety Dashboard
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/login')}
            >
              Citizen Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-3xl mx-auto px-5 py-8 text-center flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-semibold mb-6 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>Rapid Community & Police Emergency Telemetry</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight sm:leading-none mb-4">
          Instant Emergency Assistance <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-amber-400">
            When Every Second Counts.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed mb-8">
          Raksha connects distressed citizens directly with nearby verified responders, police patrol vehicles, and trusted contacts with real-time GPS telemetry and instant dispatch coordination.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-md mx-auto mb-12">
          <Button
            size="lg"
            variant="danger"
            className="w-full sm:flex-1 text-base font-bold shadow-sos"
            onClick={() => navigate('/login')}
            leftIcon={<Zap className="w-5 h-5 text-amber-300" />}
          >
            Get Protected Now
          </Button>

          <Button
            size="lg"
            variant="secondary"
            className="w-full sm:flex-1 text-sm font-semibold border-slate-700"
            onClick={handleDemoAccess}
          >
            Try Reviewer Demo Mode
          </Button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center mb-3 border border-red-500/30">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">One-Touch SOS</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Immediate distress beacon dispatching high-accuracy GPS coordinates without delays.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-3 border border-blue-500/30">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Live Patrol Tracking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track assigned Pink Hoysala units and medical responders live on an interactive map.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/30">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Trusted Circles</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant priority SMS and automated telephony relay to your designated emergency contacts.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 py-5 text-center text-xs text-slate-500">
        <p>Raksha Safety Platform • Mobile PWA & Emergency Dispatch Architecture</p>
      </footer>
    </div>
  );
};

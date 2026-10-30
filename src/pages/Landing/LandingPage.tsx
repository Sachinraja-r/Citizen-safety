import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, MapPin, Users, ArrowRight, Zap } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { RakshaLogo } from '../../components/common/RakshaLogo';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loginDemo } = useAuth();

  const handleDemoAccess = () => {
    loginDemo();
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5F8] via-white to-[#FFF5F8] text-[#2D1B24] flex flex-col justify-between selection:bg-[#E91E63] selection:text-white">
      {/* Top Banner */}
      <header className="w-full max-w-5xl mx-auto px-5 py-5 flex items-center justify-between">
        <RakshaLogo variant="full" size="md" showTagline={true} />

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
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF5F8] border border-[#F3D9E2] text-[#D81B60] text-xs font-bold mb-6 shadow-sm animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#E91E63] animate-ping" />
          <span>Rapid Community &amp; Pink Hoysala Emergency Telemetry</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-[#2D1B24] tracking-tight leading-tight sm:leading-none mb-4">
          Instant Emergency Assistance <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6F91] to-[#E91E63]">
            When Every Second Counts.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-[#7A6570] max-w-xl mx-auto leading-relaxed mb-8">
          Raksha connects distressed citizens directly with nearby verified responders, police patrol vehicles, and trusted contacts with real-time GPS telemetry and instant dispatch coordination.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-md mx-auto mb-12">
          <Button
            size="lg"
            variant="danger"
            className="w-full sm:flex-1 text-base font-bold shadow-xl shadow-red-500/30"
            onClick={() => navigate('/login')}
            leftIcon={<Zap className="w-5 h-5 text-amber-200" />}
          >
            Get Protected Now
          </Button>

          <Button
            size="lg"
            variant="secondary"
            className="w-full sm:flex-1 text-sm font-semibold border-[#F3D9E2] shadow-sm"
            onClick={handleDemoAccess}
          >
            Try Reviewer Demo Mode
          </Button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          <div className="p-4 rounded-2xl bg-white border border-[#F3D9E2] shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3 border border-red-200">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#2D1B24] mb-1">One-Touch SOS</h3>
            <p className="text-xs text-[#7A6570] leading-relaxed">
              Immediate distress beacon dispatching high-accuracy GPS coordinates without delays.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#F3D9E2] shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-[#FFF5F8] text-[#E91E63] flex items-center justify-center mb-3 border border-[#F3D9E2]">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#2D1B24] mb-1">Live Patrol Tracking</h3>
            <p className="text-xs text-[#7A6570] leading-relaxed">
              Track assigned Pink Hoysala units and medical responders live on an interactive map.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#F3D9E2] shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-[#FFF5F8] text-[#E91E63] flex items-center justify-center mb-3 border border-[#F3D9E2]">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#2D1B24] mb-1">Trusted Circles</h3>
            <p className="text-xs text-[#7A6570] leading-relaxed">
              Instant priority SMS and automated telephony relay to your designated emergency contacts.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#F3D9E2] py-5 text-center text-xs text-[#7A6570] bg-white/60">
        <p>Raksha Safety Platform • Mobile PWA &amp; Emergency Dispatch Architecture</p>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a
            href="/responder/dashboard"
            className="text-[#E91E63] hover:text-[#D81B60] underline underline-offset-2 transition-colors font-semibold"
          >
            🚔 Responder Command Center →
          </a>
          <span className="text-[#F3D9E2]">|</span>
          <a
            href="/responder/dev"
            className="text-[#7A6570] hover:text-[#2D1B24] underline underline-offset-2 transition-colors font-medium"
          >
            🛠 Developer Operations →
          </a>
          <span className="text-[#F3D9E2]">|</span>
          <a
            href="/api/triage"
            className="text-[#7A6570] hover:text-[#2D1B24] underline underline-offset-2 transition-colors font-medium"
          >
            🤖 AI Triage API Console →
          </a>
        </p>
      </footer>
    </div>
  );
};

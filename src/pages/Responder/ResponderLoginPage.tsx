import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { responderAuthService, DEMO_RESPONDERS } from '../../services/responderAuthService';
import { ShieldCheck, Code2 } from 'lucide-react';
import { ResponderRole } from '../../types/responder';

const ROLE_ICONS: Record<ResponderRole, React.ReactNode> = {
  PINK_HOYSALA: <div className="text-pink-400">🚓</div>,
  POLICE_OFFICER: <div className="text-blue-400">👮</div>,
  PARAMEDIC: <div className="text-emerald-400">🚑</div>,
  COMMUNITY_GUARDIAN: <div className="text-amber-400">🛡️</div>,
  DEV_ADMIN: <Code2 className="w-5 h-5 text-purple-400" />,
};

const ROLE_LABEL: Record<ResponderRole, string> = {
  PINK_HOYSALA: 'Pink Hoysala Officer',
  POLICE_OFFICER: 'Police Officer',
  PARAMEDIC: 'Paramedic / KSEMS',
  COMMUNITY_GUARDIAN: 'Community Guardian',
  DEV_ADMIN: 'Developer Admin',
};

export const ResponderLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleLogin = () => {
    if (!selectedId) return;
    const session = responderAuthService.login(selectedId);
    if (!session) return;

    if (session.role === 'DEV_ADMIN') {
      navigate('/responder/dev');
    } else {
      navigate('/responder/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <img src="/logo.svg" alt="Raksha" className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">RAKSHA</h1>
            <p className="text-xs text-slate-400">Responder & Operations Portal</p>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Responder Sign-In</h2>
          </div>
          <p className="text-xs text-slate-400 mb-6">
            Select your unit to access the emergency dispatch dashboard.
          </p>

          {/* Demo Responder List */}
          <div className="space-y-2 mb-6">
            {DEMO_RESPONDERS.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  selectedId === r.id
                    ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-950/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'
                }`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border ${
                  selectedId === r.id ? 'bg-blue-600/20 border-blue-500/40' : 'bg-slate-800 border-slate-700'
                }`}>
                  {ROLE_ICONS[r.role]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">{r.name}</span>
                    {r.isOnDuty && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                        On Duty
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{r.unitType}</p>
                  <p className="text-[11px] font-mono text-slate-500">Badge: {r.badgeNumber}</p>
                </div>

                <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                  r.role === 'DEV_ADMIN'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {ROLE_LABEL[r.role]}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={handleLogin}
            disabled={!selectedId}
            className="w-full py-3 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-lg shadow-blue-950/40"
          >
            Enter Dashboard →
          </button>

          <p className="text-center text-xs text-slate-500 mt-4">
            This is a Raksha hackathon demo portal. All units and incidents are pre-seeded.
          </p>
        </div>

        {/* Back link */}
        <p className="text-center text-xs text-slate-500 mt-5">
          Citizen view?{' '}
          <a href="/" className="text-blue-400 hover:underline">
            Go to Citizen App →
          </a>
        </p>
      </div>
    </div>
  );
};

import React from 'react';
import { ShieldCheck, VolumeX, Navigation } from 'lucide-react';

export const SafetyTips: React.FC = () => {
  return (
    <div className="w-full text-left my-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        Emergency Safety Guidelines
      </h3>

      <div className="space-y-2.5 text-xs text-slate-300">
        <div className="flex items-start gap-2.5">
          <VolumeX className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-200">Silent SOS:</strong> Activating SOS triggers silent high-priority telemetry dispatch to nearby patrol units without playing loud alarms on your handset.
          </p>
        </div>

        <div className="flex items-start gap-2.5">
          <Navigation className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-200">Live Beacon:</strong> Keep browser open after SOS so your live GPS coordinates can stream directly to arriving patrol vehicles.
          </p>
        </div>
      </div>
    </div>
  );
};

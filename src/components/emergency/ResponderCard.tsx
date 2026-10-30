import React from 'react';
import { Responder } from '../../types';
import { formatResponderType } from '../../utils/formatters';
import { ShieldCheck, Phone, Clock, Car } from 'lucide-react';

interface ResponderCardProps {
  responder?: Responder | null;
}

export const ResponderCard: React.FC<ResponderCardProps> = ({ responder }) => {
  if (!responder) {
    return (
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 text-left">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 shrink-0 border border-amber-500/20">
            <Car className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-200">Matching Nearest Emergency Unit</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Broadcasting incident coordinates to nearby police patrol vehicles and medical units...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isFemaleUnit = responder.type === 'FEMALE_OFFICER_UNIT';

  return (
    <div className="bg-[#111827] border border-blue-500/30 rounded-2xl p-4 text-left shadow-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 rounded-xl border ${
            isFemaleUnit ? 'bg-pink-950/30 border-pink-500/30 text-pink-400' : 'bg-blue-950/30 border-blue-500/30 text-blue-400'
          }`}>
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-bold text-white">{responder.name}</h4>
            </div>
            <p className="text-xs text-slate-400">{formatResponderType(responder.type)}</p>
          </div>
        </div>

        {/* Verification badge */}
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          Verified Unit
        </span>
      </div>

      {/* ETA and details grid */}
      <div className="grid grid-cols-2 gap-2 my-3 text-xs">
        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-0.5">Estimated Arrival</span>
          <div className="flex items-center gap-1.5 font-bold text-white text-sm">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>{responder.etaMinutes !== undefined ? `${responder.etaMinutes} min(s)` : 'En Route'}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-0.5">Unit Status</span>
          <span className="font-bold text-emerald-400 text-sm">
            {responder.status === 'EN_ROUTE' ? 'Driving to Scene' : responder.status}
          </span>
        </div>
      </div>

      {/* Call Responder Action */}
      {responder.contactPhone && (
        <a
          href={`tel:${responder.contactPhone}`}
          className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
        >
          <Phone className="w-4 h-4" />
          Call Responder Directly ({responder.contactPhone})
        </a>
      )}
    </div>
  );
};

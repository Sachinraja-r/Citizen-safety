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
      <div className="bg-white border border-[#F3D9E2] shadow-sm rounded-2xl p-4 text-left">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#FFF5F8] rounded-xl text-[#E91E63] shrink-0 border border-[#F3D9E2]">
            <Car className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#2D1B24]">Matching Nearest Emergency Unit</h4>
            <p className="text-xs text-[#7A6570] mt-0.5">
              Broadcasting incident coordinates to nearby police patrol vehicles and medical units...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isFemaleUnit = responder.type === 'FEMALE_OFFICER_UNIT';

  return (
    <div className="bg-white border border-[#F3D9E2] rounded-2xl p-4 text-left shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 rounded-xl border ${
            isFemaleUnit ? 'bg-[#FFF5F8] border-[#F3D9E2] text-[#E91E63]' : 'bg-blue-50 border-blue-200 text-blue-600'
          }`}>
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-bold text-[#2D1B24]">{responder.name}</h4>
            </div>
            <p className="text-xs text-[#7A6570]">{formatResponderType(responder.type)}</p>
          </div>
        </div>

        {/* Verification badge */}
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Verified Unit
        </span>
      </div>

      {/* ETA and details grid */}
      <div className="grid grid-cols-2 gap-2 my-3 text-xs">
        <div className="bg-[#FFF5F8] p-2.5 rounded-xl border border-[#F3D9E2]">
          <span className="text-[#7A6570] text-[10px] uppercase font-semibold block mb-0.5">Estimated Arrival</span>
          <div className="flex items-center gap-1.5 font-bold text-[#2D1B24] text-sm">
            <Clock className="w-4 h-4 text-[#E91E63]" />
            <span>{responder.etaMinutes !== undefined ? `${responder.etaMinutes} min(s)` : 'En Route'}</span>
          </div>
        </div>

        <div className="bg-[#FFF5F8] p-2.5 rounded-xl border border-[#F3D9E2]">
          <span className="text-[#7A6570] text-[10px] uppercase font-semibold block mb-0.5">Unit Status</span>
          <span className="font-bold text-emerald-700 text-sm">
            {responder.status === 'EN_ROUTE' ? 'Driving to Scene' : responder.status}
          </span>
        </div>
      </div>

      {/* Call Responder Action */}
      {responder.contactPhone && (
        <a
          href={`tel:${responder.contactPhone}`}
          className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[#FFF5F8] hover:bg-[#F8BBD0]/30 text-[#D81B60] font-bold text-xs rounded-xl border border-[#F3D9E2] shadow-sm transition-colors"
        >
          <Phone className="w-4 h-4 text-[#E91E63]" />
          Call Responder Directly ({responder.contactPhone})
        </a>
      )}
    </div>
  );
};

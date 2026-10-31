import React from 'react';
import { Responder, IncidentStatus } from '../../types';
import { formatResponderType } from '../../utils/formatters';
import { ShieldCheck, Phone, Clock, Car, Siren, CheckCircle2, HeartPulse } from 'lucide-react';

interface ResponderCardProps {
  responder?: Responder | null;
  incidentStatus?: IncidentStatus;
}

export const ResponderCard: React.FC<ResponderCardProps> = ({ responder, incidentStatus }) => {
  const isOnScene = incidentStatus === 'ON_SCENE' || responder?.status === 'BUSY' || responder?.etaMinutes === 0;
  const isResolved = incidentStatus === 'RESOLVED';

  if (!responder) {
    return (
      <div className="bg-white border border-[#F3D9E2] shadow-sm rounded-2xl p-4 text-left">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#FFF5F8] rounded-xl text-[#E91E63] shrink-0 border border-[#F3D9E2]">
            <Siren className="w-5 h-5 animate-pulse text-red-500" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#2D1B24]">Connecting Nearest Emergency Responders</h4>
            <p className="text-xs text-[#7A6570] mt-0.5">
              Distress coordinates actively broadcasted to Bangalore City Police Control (112) &amp; Emergency Ambulance (108)...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isFemaleUnit = responder.type === 'FEMALE_OFFICER_UNIT';
  const isAmbulance = responder.type === 'AMBULANCE';

  return (
    <div className={`bg-white rounded-2xl p-4 text-left shadow-sm border transition-all ${
      isOnScene
        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
        : isResolved
        ? 'border-blue-500'
        : 'border-[#F3D9E2]'
    }`}>
      {/* On-Scene Arrival Banner */}
      {isOnScene && !isResolved && (
        <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>UNIT HAS ARRIVED ON SCENE — Providing Direct Assistance</span>
        </div>
      )}

      {/* Case Resolved Banner */}
      {isResolved && (
        <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-blue-800 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>CASE RESOLVED — Citizen Secured Safely by Responders</span>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 rounded-xl border ${
            isAmbulance
              ? 'bg-rose-50 border-rose-200 text-rose-600'
              : isFemaleUnit
              ? 'bg-[#FFF5F8] border-[#F3D9E2] text-[#E91E63]'
              : 'bg-blue-50 border-blue-200 text-blue-600'
          }`}>
            {isAmbulance ? (
              <HeartPulse className="w-6 h-6 animate-pulse" />
            ) : (
              <Car className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-bold text-[#2D1B24]">{responder.name}</h4>
            </div>
            <p className="text-xs text-[#7A6570] font-medium">{formatResponderType(responder.type)}</p>
          </div>
        </div>

        {/* Verification badge */}
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
          isOnScene
            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          {isOnScene ? 'On Scene' : 'Verified Unit'}
        </span>
      </div>

      {/* ETA and details grid */}
      <div className="grid grid-cols-2 gap-2 my-3 text-xs">
        <div className="bg-[#FFF5F8] p-2.5 rounded-xl border border-[#F3D9E2]">
          <span className="text-[#7A6570] text-[10px] uppercase font-semibold block mb-0.5">Estimated Arrival</span>
          <div className="flex items-center gap-1.5 font-bold text-[#2D1B24] text-sm">
            <Clock className="w-4 h-4 text-[#E91E63]" />
            <span>
              {isResolved
                ? 'Case Closed'
                : isOnScene
                ? 'Arrived'
                : responder.etaMinutes !== undefined
                ? `${responder.etaMinutes} min(s)`
                : 'En Route'}
            </span>
          </div>
        </div>

        <div className="bg-[#FFF5F8] p-2.5 rounded-xl border border-[#F3D9E2]">
          <span className="text-[#7A6570] text-[10px] uppercase font-semibold block mb-0.5">Unit Status</span>
          <span className={`font-bold text-sm ${
            isResolved
              ? 'text-blue-700'
              : isOnScene
              ? 'text-emerald-700 font-extrabold'
              : 'text-emerald-700'
          }`}>
            {isResolved
              ? 'Situation Resolved'
              : isOnScene
              ? '✅ Arrived On Scene'
              : responder.status === 'EN_ROUTE'
              ? 'Driving to Scene'
              : responder.status}
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

import React from 'react';
import { IncidentEvent, IncidentStatus } from '../../types';
import { formatTimeOnly } from '../../utils/formatters';
import { CheckCircle2, Clock, Radio, Shield, XCircle } from 'lucide-react';

interface IncidentTimelineProps {
  currentStatus: IncidentStatus;
  events: IncidentEvent[];
}

export const IncidentTimeline: React.FC<IncidentTimelineProps> = ({ currentStatus: _currentStatus, events }) => {
  const getStepIcon = (status: IncidentStatus) => {
    switch (status) {
      case 'OPEN':
        return <Radio className="w-4 h-4 text-amber-400" />;
      case 'ASSIGNED':
        return <Shield className="w-4 h-4 text-blue-400" />;
      case 'ON_SCENE':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'RESOLVED':
        return <CheckCircle2 className="w-4 h-4 text-slate-400" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className="bg-white border border-[#F3D9E2] shadow-sm rounded-2xl p-4 text-left">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#D81B60] mb-4 flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-[#E91E63]" />
        Live Emergency Timeline
      </h3>

      <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#F3D9E2]">
        {events.map((evt) => (
          <div key={evt.id} className="relative">
            {/* Step marker */}
            <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border border-[#F3D9E2] flex items-center justify-center shadow-xs">
              {getStepIcon(evt.status)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-[#2D1B24]">{evt.title}</h4>
                <span className="text-[10px] text-[#7A6570] font-mono">
                  {formatTimeOnly(evt.timestamp)}
                </span>
              </div>
              <p className="text-xs text-[#7A6570] mt-1 leading-relaxed">{evt.description}</p>
              {evt.actor && (
                <span className="inline-block mt-1 text-[10px] text-[#7A6570] bg-[#FFF5F8] border border-[#F3D9E2] px-2 py-0.5 rounded font-medium">
                  Source: {evt.actor}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

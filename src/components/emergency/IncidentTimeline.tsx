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
    <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl p-4 text-left">
      <h3 className="text-xs font-bold uppercase tracking-wider text-pink-700 mb-4 flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-pink-600" />
        Live Emergency Timeline
      </h3>

      <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-pink-100">
        {events.map((evt) => (
          <div key={evt.id} className="relative">
            {/* Step marker */}
            <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs">
              {getStepIcon(evt.status)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-slate-800">{evt.title}</h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatTimeOnly(evt.timestamp)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{evt.description}</p>
              {evt.actor && (
                <span className="inline-block mt-1 text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">
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

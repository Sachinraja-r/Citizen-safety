import React from 'react';
import { IncidentStatus } from '../../types';
import { formatIncidentStatus } from '../../utils/formatters';

interface StatusBadgeProps {
  status: IncidentStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const meta = formatIncidentStatus(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${meta.bgColor} ${meta.borderColor} ${meta.color} ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${status === 'OPEN' || status === 'ASSIGNED' ? 'animate-pulse' : ''} ${
        status === 'OPEN' ? 'bg-amber-400' :
        status === 'ASSIGNED' ? 'bg-blue-400' :
        status === 'ON_SCENE' ? 'bg-emerald-400' :
        status === 'RESOLVED' ? 'bg-slate-400' : 'bg-rose-400'
      }`} />
      {meta.label}
    </span>
  );
};

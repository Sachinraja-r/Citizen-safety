import { IncidentStatus, IncidentType, ResponderType } from '../types';

export function formatIncidentStatus(status: IncidentStatus): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  switch (status) {
    case 'OPEN':
      return {
        label: 'Broadcasting to Responders',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
      };
    case 'ASSIGNED':
      return {
        label: 'Responder Dispatched & En Route',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
      };
    case 'ON_SCENE':
      return {
        label: 'Responder On Scene',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
      };
    case 'RESOLVED':
      return {
        label: 'Incident Resolved',
        color: 'text-slate-300',
        bgColor: 'bg-slate-700/20',
        borderColor: 'border-slate-600/30',
      };
    case 'CANCELLED':
      return {
        label: 'Alert Cancelled',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/30',
      };
  }
}

export function formatIncidentType(type: IncidentType): string {
  switch (type) {
    case 'SOS_EMERGENCY':
      return 'Immediate SOS Emergency';
    case 'PHYSICAL_HARASSMENT_STALKING':
      return 'Physical Harassment / Stalking';
    case 'VERBAL_ABUSE':
      return 'Verbal Threat / Abuse';
    case 'DOMESTIC_VIOLENCE':
      return 'Domestic Violence Alert';
    case 'MEDICAL_EMERGENCY':
      return 'Medical Emergency';
    case 'SUSPICIOUS_ACTIVITY':
      return 'Suspicious Activity';
    case 'SAFE_JOURNEY_ALERT':
      return 'Safe Journey Deviation Alert';
    case 'THEFT_OR_ROBBERY':
      return 'Theft or Robbery';
    case 'OTHER':
      return 'General Emergency';
  }
}

export function formatResponderType(type: ResponderType): string {
  switch (type) {
    case 'FEMALE_OFFICER_UNIT':
      return 'Pink Hoysala (Specialized Women Unit)';
    case 'PATROL_CAR':
      return 'Police Patrol Vehicle';
    case 'BIKE_PATROL':
      return 'Rapid Bike Patrol';
    case 'AMBULANCE':
      return 'Emergency Medical Ambulance';
    case 'COMMUNITY_GUARDIAN':
      return 'Verified Community Guardian';
  }
}

export function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export function formatTimeOnly(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

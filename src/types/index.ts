// Types aligned with Member 2 (Backend) and Member 3 (AI Engine)

export type IncidentType =
  | 'SOS_EMERGENCY'
  | 'PHYSICAL_HARASSMENT_STALKING'
  | 'VERBAL_ABUSE'
  | 'DOMESTIC_VIOLENCE'
  | 'MEDICAL_EMERGENCY'
  | 'SUSPICIOUS_ACTIVITY'
  | 'SAFE_JOURNEY_ALERT'
  | 'THEFT_OR_ROBBERY'
  | 'OTHER';

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type IncidentStatus = 'OPEN' | 'ASSIGNED' | 'ON_SCENE' | 'RESOLVED' | 'CANCELLED';

export type ResponderType =
  | 'PATROL_CAR'
  | 'BIKE_PATROL'
  | 'FEMALE_OFFICER_UNIT'
  | 'AMBULANCE'
  | 'COMMUNITY_GUARDIAN';

export type ResponderStatus = 'AVAILABLE' | 'EN_ROUTE' | 'BUSY' | 'OFF_DUTY';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  addressText?: string;
  timestamp?: number;
}

export interface Responder {
  id: string;
  name: string;
  type: ResponderType;
  badgeNumber?: string;
  status: ResponderStatus;
  location?: LocationData;
  contactPhone?: string;
  etaMinutes?: number;
  verifiedLevel: 'VERIFIED_OFFICER' | 'VERIFIED_PARAMEDIC' | 'COMMUNITY_VOLUNTEER';
  isFemaleOfficerAvailable?: boolean;
}

export interface IncidentEvent {
  id: string;
  timestamp: string;
  status: IncidentStatus;
  title: string;
  description: string;
  actor?: string;
}

export interface AITriageSummary {
  severityScore: number;
  confidence: number;
  summaryEn: string;
  detectedLanguage?: string;
  recommendedAction?: string;
  isLikelyFake?: boolean;
}

export interface Incident {
  id: string;
  userId: string;
  type: IncidentType;
  severity: SeverityLevel;
  status: IncidentStatus;
  description?: string;
  location: LocationData;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  assignedResponder?: Responder;
  timeline: IncidentEvent[];
  aiTriage?: AITriageSummary;
}

export interface TrustedContact {
  id: string;
  userId?: string;
  name: string;
  phone: string;
  relationship: string;
  priority: number; // 1 = Primary, 2 = Secondary, etc.
  notifySms: boolean;
  notifyCall: boolean;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  allergies?: string;
  medicalNotes?: string;
  emergencyNotesShared?: boolean;
  isOnboarded: boolean;
  createdAt?: string;
}

export interface GeolocationState {
  coords: LocationData | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  permission: 'prompt' | 'granted' | 'denied' | 'unsupported';
  lastUpdated: number | null;
}

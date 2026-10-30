// Additional shared types for Police/Responder and Dev dashboards

export type ResponderRole = 'POLICE_OFFICER' | 'PINK_HOYSALA' | 'PARAMEDIC' | 'COMMUNITY_GUARDIAN' | 'DEV_ADMIN';

export interface ResponderSession {
  id: string;
  name: string;
  badgeNumber: string;
  role: ResponderRole;
  unitType: string;
  isOnDuty: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    lastUpdated: string;
  };
}

export interface LiveIncidentFeed {
  id: string;
  type: string;
  severity: string;
  status: string;
  description?: string;
  reportedByUserId: string;
  reportedByName?: string;
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    addressText?: string;
  };
  createdAt: string;
  updatedAt: string;
  assignedResponderId?: string;
  assignedResponderName?: string;
  timeline: Array<{
    id: string;
    timestamp: string;
    status: string;
    title: string;
    description: string;
    actor?: string;
  }>;
}

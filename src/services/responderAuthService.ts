// Responder/Police session service
// Manages who is logged in as a responder (officer, pink hoysala unit, paramedic)

import { ResponderSession } from '../types/responder';

const RESPONDER_SESSION_KEY = 'raksha_responder_session';

export const DEMO_RESPONDERS: ResponderSession[] = [
  {
    id: 'resp-pink-01',
    name: 'Sub-Insp. Priya Menon',
    badgeNumber: 'KA-01-G-4491',
    role: 'PINK_HOYSALA',
    unitType: 'Pink Hoysala Unit 14 (Women\'s Safety)',
    isOnDuty: true,
    currentLocation: {
      latitude: 12.9826,
      longitude: 77.6008,
      lastUpdated: new Date().toISOString(),
    },
  },
  {
    id: 'resp-police-02',
    name: 'SI. Rajan Kumar',
    badgeNumber: 'KA-02-C-8823',
    role: 'POLICE_OFFICER',
    unitType: 'Patrol Car Unit 08',
    isOnDuty: true,
    currentLocation: {
      latitude: 12.9602,
      longitude: 77.5780,
      lastUpdated: new Date().toISOString(),
    },
  },
  {
    id: 'resp-para-03',
    name: 'Paramedic Suresh V.',
    badgeNumber: 'KSEMS-0312',
    role: 'PARAMEDIC',
    unitType: 'KSEMS Ambulance 03',
    isOnDuty: true,
    currentLocation: {
      latitude: 12.9250,
      longitude: 77.6150,
      lastUpdated: new Date().toISOString(),
    },
  },
  {
    id: 'dev-admin-01',
    name: 'Developer (Admin View)',
    badgeNumber: 'DEV-001',
    role: 'DEV_ADMIN',
    unitType: 'System Administrator',
    isOnDuty: true,
  },
];

export const responderAuthService = {
  login(responderId: string): ResponderSession | null {
    const responder = DEMO_RESPONDERS.find(r => r.id === responderId);
    if (!responder) return null;
    localStorage.setItem(RESPONDER_SESSION_KEY, JSON.stringify(responder));
    return responder;
  },

  getCurrentSession(): ResponderSession | null {
    const raw = localStorage.getItem(RESPONDER_SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  logout(): void {
    localStorage.removeItem(RESPONDER_SESSION_KEY);
  },

  updateLocation(lat: number, lon: number): void {
    const session = this.getCurrentSession();
    if (!session) return;
    session.currentLocation = {
      latitude: lat,
      longitude: lon,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(RESPONDER_SESSION_KEY, JSON.stringify(session));
  },
};

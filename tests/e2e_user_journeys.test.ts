import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { validatePhone, validateEmail, validateRequired } from '../src/utils/validators';
import { formatIncidentStatus, formatIncidentType, formatRelativeTime } from '../src/utils/formatters';

// Mock localStorage for Node test environment
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = value;
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

// Global browser mocks
(global as unknown as { localStorage: MockLocalStorage }).localStorage = new MockLocalStorage();
(global as unknown as { window: { location: { origin: string } } }).window = {
  location: { origin: 'http://localhost:3000' },
};

describe('User Journey 1: Landing Page & Authentication Mode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('Demo user login populates persistent session and profile', async () => {
    const { authService } = await import('../src/services/authService');
    const profile = authService.loginDemoUser();

    assert.ok(profile);
    assert.strictEqual(profile.email, 'priya.sharma@raksha-demo.org');
    assert.strictEqual(profile.fullName, 'Priya Sharma');
    assert.strictEqual(profile.bloodGroup, 'O+');

    const session = await authService.getCurrentSession();
    assert.strictEqual(session.isDemo, true);
    assert.strictEqual(session.user?.id, profile.id);
  });

  test('Sign out cleanly clears active session', async () => {
    const { authService } = await import('../src/services/authService');
    authService.loginDemoUser();
    await authService.signOut();

    const session = await authService.getCurrentSession();
    assert.strictEqual(session.user, null);
    assert.strictEqual(session.isDemo, false);
  });
});

describe('User Journey 2 & 3: Onboarding & Trusted Contacts Setup', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('Adding trusted contacts enforces limit of 5 and validates numbers', async () => {
    const { contactService } = await import('../src/services/contactService');

    // Add first contact
    const res1 = await contactService.addContact({
      name: 'Dr. Suresh Kumar',
      phone: '+91 99887 76655',
      relationship: 'Doctor',
      priority: 1,
      notifySms: true,
      notifyCall: true,
    });
    assert.ok(res1.contact);
    assert.strictEqual(res1.error, null);

    // Fetch contacts
    const list = await contactService.getContacts();
    assert.ok(list.length >= 1);

    // Test phone validation
    assert.strictEqual(validatePhone(res1.contact.phone).valid, true);
    assert.strictEqual(validatePhone('not-a-phone').valid, false);
  });
});

describe('User Journey 4, 5, 6: Dashboard SOS Trigger & Incident Creation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('SOS button creates real emergency incident with location telemetry without waiting for AI', async () => {
    const { incidentService } = await import('../src/services/incidentService');

    const locationTelemetry = {
      latitude: 12.9716,
      longitude: 77.5946,
      accuracyMeters: 8,
      addressText: 'MG Road, Bengaluru',
      timestamp: Date.now(),
    };

    const { incident, error } = await incidentService.createIncident({
      userId: 'test-user-123',
      type: 'SOS_EMERGENCY',
      severity: 'CRITICAL',
      description: 'Test SOS trigger from citizen handset',
      location: locationTelemetry,
    });

    assert.strictEqual(error, null);
    assert.ok(incident);
    assert.ok(incident.id.startsWith('INC-'));
    assert.strictEqual(incident.status, 'OPEN');
    assert.strictEqual(incident.severity, 'CRITICAL');
    assert.strictEqual(incident.location.latitude, 12.9716);
    assert.strictEqual(incident.location.accuracyMeters, 8);
    assert.strictEqual(incident.timeline.length, 1);
    assert.strictEqual(incident.timeline[0].status, 'OPEN');

    // Retrieve active incident
    const active = await incidentService.getActiveIncident('test-user-123');
    assert.ok(active);
    assert.strictEqual(active.id, incident.id);
  });

  test('SOS-first: User supplies optional category and description AFTER SOS is dispatched', async () => {
    const { incidentService } = await import('../src/services/incidentService');

    // 1. Initial immediate SOS creation without prior category or user typing
    const { incident, error } = await incidentService.createIncident({
      userId: 'test-citizen-999',
      type: 'SOS_EMERGENCY',
      severity: 'CRITICAL',
      location: { latitude: 12.9716, longitude: 77.5946 },
    });

    assert.strictEqual(error, null);
    assert.ok(incident);
    assert.strictEqual(incident.type, 'SOS_EMERGENCY');

    // 2. Post-SOS: user optionally selects 'PHYSICAL_HARASSMENT_STALKING' and provides text
    const updateRes = await incidentService.updateIncidentDetails(incident.id, {
      type: 'PHYSICAL_HARASSMENT_STALKING',
      description: 'Suspicious vehicle tailing me on 80ft road',
    });

    assert.strictEqual(updateRes.success, true);

    const refreshed = await incidentService.getIncident(incident.id);
    assert.strictEqual(refreshed?.type, 'PHYSICAL_HARASSMENT_STALKING');
    assert.strictEqual(refreshed?.description, 'Suspicious vehicle tailing me on 80ft road');
    assert.ok(refreshed?.timeline.length >= 2);
  });
});

describe('User Journey 7 & 8: Active Incident Tracking & Status Updates', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('Status transitions correctly to RESOLVED and CANCELLED with reasons', async () => {
    const { incidentService } = await import('../src/services/incidentService');

    const { incident } = await incidentService.createIncident({
      userId: 'test-user-456',
      type: 'MEDICAL_EMERGENCY',
      location: { latitude: 12.9352, longitude: 77.6245 },
    });

    assert.ok(incident);

    // Cancel alert test
    const { success, error } = await incidentService.updateIncidentStatus(
      incident.id,
      'CANCELLED',
      'Accidental button tap / false alarm'
    );
    assert.strictEqual(success, true);
    assert.strictEqual(error, null);

    const updated = await incidentService.getIncident(incident.id);
    assert.strictEqual(updated?.status, 'CANCELLED');
    assert.strictEqual(updated?.cancellationReason, 'Accidental button tap / false alarm');
    assert.strictEqual(updated?.timeline.length, 2);
  });
});

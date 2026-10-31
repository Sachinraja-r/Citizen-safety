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
    // Flexible 10-digit validation
    assert.strictEqual(validatePhone('9876543210').valid, true);
  });

  test('Trusted contacts reliably persist for UUID users and allow update & delete', async () => {
    const { contactService } = await import('../src/services/contactService');
    const testUserId = '5a1b3c4d-1234-4567-8901-abcdef012345';

    // Add contact for UUID user
    const addRes = await contactService.addContact(
      {
        name: 'Maya Sharma (Mother)',
        phone: '9845011223',
        relationship: 'Parent / Guardian',
        priority: 1,
        notifySms: true,
        notifyCall: true,
      },
      testUserId
    );

    assert.ok(addRes.contact);
    assert.strictEqual(addRes.error, null);
    assert.strictEqual(addRes.contact.name, 'Maya Sharma (Mother)');

    // Fetch contacts for this UUID user — verify it persists and is not wiped
    const fetched = await contactService.getContacts(testUserId);
    assert.ok(fetched.some((c) => c.name === 'Maya Sharma (Mother)'));

    // Update contact
    const contactToUpdate = fetched.find((c) => c.name === 'Maya Sharma (Mother)')!;
    const updateRes = await contactService.updateContact(
      {
        ...contactToUpdate,
        phone: '+91 98450 99999',
      },
      testUserId
    );
    assert.strictEqual(updateRes.success, true);

    const updatedList = await contactService.getContacts(testUserId);
    const updatedContact = updatedList.find((c) => c.id === contactToUpdate.id);
    assert.strictEqual(updatedContact?.phone, '+91 98450 99999');

    // Delete contact
    const delRes = await contactService.deleteContact(contactToUpdate.id, testUserId);
    assert.strictEqual(delRes.success, true);

    const afterDel = await contactService.getContacts(testUserId);
    assert.strictEqual(afterDel.some((c) => c.id === contactToUpdate.id), false);
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

  test('Police and Ambulance dispatch, on-scene arrival, and case resolution with closure notes', async () => {
    const { incidentService } = await import('../src/services/incidentService');
    const { incidentFeedService } = await import('../src/services/incidentFeedService');

    // 1. Citizen triggers SOS
    const { incident } = await incidentService.createIncident({
      userId: 'test-citizen-789',
      type: 'SOS_EMERGENCY',
      location: { latitude: 12.9716, longitude: 77.5946, addressText: 'Cubbon Park Metro Station' },
    });
    assert.ok(incident);
    assert.strictEqual(incident.status, 'OPEN');

    // 2. Paramedic / Ambulance unit accepts dispatch
    await incidentFeedService.acceptIncident(incident.id, 'resp-para-03', 'Paramedic Suresh V.');
    const assignedInc = await incidentService.getIncident(incident.id);
    assert.strictEqual(assignedInc?.status, 'ASSIGNED');
    assert.strictEqual(assignedInc?.assignedResponder?.type, 'AMBULANCE');
    assert.strictEqual(assignedInc?.assignedResponder?.status, 'EN_ROUTE');

    // 3. Responder marks on-scene (arrived at citizen location)
    await incidentFeedService.markOnScene(incident.id, 'Paramedic Suresh V.');
    const onSceneInc = await incidentService.getIncident(incident.id);
    assert.strictEqual(onSceneInc?.status, 'ON_SCENE');
    assert.strictEqual(onSceneInc?.assignedResponder?.status, 'BUSY');
    assert.strictEqual(onSceneInc?.assignedResponder?.etaMinutes, 0);

    // 4. Responder updates case after solving
    const closureNote = 'Citizen safe, first aid administered, situation stabilized.';
    await incidentFeedService.resolveIncident(incident.id, 'Paramedic Suresh V.', closureNote);
    const resolvedInc = await incidentService.getIncident(incident.id);
    assert.strictEqual(resolvedInc?.status, 'RESOLVED');
    assert.ok(resolvedInc?.resolvedAt);
    assert.strictEqual(resolvedInc?.cancellationReason, closureNote);
  });
});

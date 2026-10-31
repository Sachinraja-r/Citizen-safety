import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  generateSecureEmergencyToken,
  verifySecureEmergencyToken,
  notificationService,
} from '../src/services/notificationService';
import { incidentService } from '../src/services/incidentService';
import { contactService } from '../src/services/contactService';
import { Incident, TrustedContact } from '../src/types';

// Mock localStorage for Node environment
class MockStorage {
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
(global as unknown as { localStorage: MockStorage }).localStorage = new MockStorage();
(global as unknown as { window: { location: { origin: string } } }).window = {
  location: { origin: 'http://localhost:3000' },
};

describe('Emergency Notifications & Trusted Contact Alert Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Scenario 1: Immediate SOS Incident Creation
  test('1. SOS triggers incident creation immediately without waiting for notification or AI', async () => {
    const startTime = Date.now();
    const { incident, error } = await incidentService.createIncident({
      userId: 'victim-001',
      type: 'SOS_EMERGENCY',
      location: { latitude: 12.9716, longitude: 77.5946, accuracyMeters: 5 },
      victimName: 'Priya Sharma',
    });
    const elapsed = Date.now() - startTime;

    assert.strictEqual(error, null);
    assert.ok(incident);
    assert.strictEqual(incident.status, 'OPEN');
    assert.ok(incident.id.startsWith('INC-'));
    // Immediate return in under 100ms
    assert.ok(elapsed < 200, `Incident creation took ${elapsed}ms, expected immediate return`);
  });

  // Scenario 2: Multiple Trusted Contacts Notified
  test('2. Multiple registered trusted contacts receive emergency notifications', async () => {
    const incident: Incident = {
      id: 'INC-777888',
      userId: 'victim-002',
      type: 'SOS_EMERGENCY',
      severity: 'CRITICAL',
      status: 'OPEN',
      location: { latitude: 12.9716, longitude: 77.5946 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [],
    };

    const contacts: TrustedContact[] = [
      {
        id: 'c-1',
        name: 'Rajesh Sharma (Brother)',
        phone: '+91 98450 11223',
        relationship: 'Brother',
        priority: 1,
        notifySms: true,
        notifyCall: true,
      },
      {
        id: 'c-2',
        name: 'Ananya Verma (Roommate)',
        phone: '+91 97312 99887',
        relationship: 'Roommate',
        priority: 2,
        notifySms: false,
        notifyCall: false,
      },
    ];

    const records = await notificationService.dispatchEmergencyAlertToContacts({
      incident,
      victimName: 'Priya Sharma',
      contacts,
    });

    assert.strictEqual(records.length, 2);
    assert.strictEqual(records[0].contactId, 'c-1');
    assert.strictEqual(records[0].channel, 'SMS');
    assert.strictEqual(records[1].contactId, 'c-2');
    assert.strictEqual(records[1].channel, 'PUSH');
    assert.ok(records[0].secureToken);
    assert.ok(records[1].secureToken);
  });

  // Scenario 3: Recipient has granted notification permission
  test('3. Recipient with granted notification permission accepts push alerts', async () => {
    const mockNotif = {
      permission: 'granted',
      requestPermission: async () => 'granted',
    };
    (global as unknown as { Notification: typeof mockNotif }).Notification = mockNotif;
    (global as unknown as { window: { Notification: typeof mockNotif } }).window.Notification = mockNotif;

    const perm = notificationService.getPermissionState();
    assert.strictEqual(perm, 'granted');
  });

  // Scenario 4: Recipient has denied notification permission
  test('4. Recipient with denied permission falls back gracefully with clear notice', async () => {
    const mockNotif = {
      permission: 'denied',
      requestPermission: async () => 'denied',
    };
    (global as unknown as { Notification: typeof mockNotif }).Notification = mockNotif;
    (global as unknown as { window: { Notification: typeof mockNotif } }).window.Notification = mockNotif;

    const res = await notificationService.subscribeToPush('user-denied');
    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes('denied'));
  });

  // Scenario 5 & 6: Invalid or Expired Subscription
  test('5 & 6. Expired or unconfigured push subscription handling', async () => {
    const sub = await notificationService.getPushSubscription();
    // In headless test environment, pushManager is null/mocked
    assert.strictEqual(sub, null);

    const unsubOk = await notificationService.unsubscribeFromPush();
    assert.strictEqual(unsubOk, true);
  });

  // Scenario 7: SMS & WhatsApp fallback formatting
  test('7. WhatsApp and SMS fallbacks generate clean pre-filled links', () => {
    const url = notificationService.generateWhatsAppFallbackUrl(
      '+91 98450 11223',
      'Priya',
      'INC-123456',
      'mock-token-xyz'
    );
    assert.ok(url.startsWith('https://wa.me/919845011223'));
    assert.ok(url.includes('Priya'));
    assert.ok(url.includes('INC-123456'));
    assert.ok(url.includes('mock-token-xyz'));

    const waBroadcast = notificationService.generateWhatsAppBroadcastUrl('🚨 EMERGENCY SOS: I AM IN DANGER!');
    assert.ok(waBroadcast.startsWith('https://api.whatsapp.com/send?text='));
    assert.ok(waBroadcast.includes('EMERGENCY'));
  });

  // Scenario 8: One contact fails while others succeed
  test('8. One contact with invalid number fails while valid contacts succeed', async () => {
    const incident: Incident = {
      id: 'INC-PARTIAL',
      userId: 'victim-003',
      type: 'SOS_EMERGENCY',
      severity: 'CRITICAL',
      status: 'OPEN',
      location: { latitude: 12.9716, longitude: 77.5946 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [],
    };

    const mixedContacts: TrustedContact[] = [
      {
        id: 'c-valid',
        name: 'Valid Contact',
        phone: '+91 98450 11223',
        relationship: 'Father',
        priority: 1,
        notifySms: true,
        notifyCall: true,
      },
      {
        id: 'c-invalid',
        name: 'Broken Contact',
        phone: '12', // Too short / invalid phone
        relationship: 'Unknown',
        priority: 2,
        notifySms: true,
        notifyCall: false,
      },
    ];

    const records = await notificationService.dispatchEmergencyAlertToContacts({
      incident,
      victimName: 'Priya Sharma',
      contacts: mixedContacts,
    });

    const validRecord = records.find((r) => r.contactId === 'c-valid');
    const invalidRecord = records.find((r) => r.contactId === 'c-invalid');

    assert.ok(validRecord);
    assert.strictEqual(validRecord.status, 'SMS_SENT');

    assert.ok(invalidRecord);
    assert.strictEqual(invalidRecord.status, 'FAILED');
    assert.ok(invalidRecord.errorMessage?.includes('Invalid phone number'));
  });

  // Scenario 9: Idempotency (prevent duplicate alerts on retry)
  test('9. Idempotency prevents duplicate notifications when SOS dispatch is retried', async () => {
    const incident: Incident = {
      id: 'INC-IDEMPOTENT',
      userId: 'victim-004',
      type: 'SOS_EMERGENCY',
      severity: 'CRITICAL',
      status: 'OPEN',
      location: { latitude: 12.9716, longitude: 77.5946 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [],
    };

    const contacts: TrustedContact[] = [
      {
        id: 'c-same',
        name: 'Single Contact',
        phone: '+91 99999 88888',
        relationship: 'Friend',
        priority: 1,
        notifySms: true,
        notifyCall: false,
      },
    ];

    // First dispatch
    const firstRun = await notificationService.dispatchEmergencyAlertToContacts({
      incident,
      victimName: 'Priya',
      contacts,
    });
    assert.strictEqual(firstRun.length, 1);

    // Second dispatch (retry attempt)
    const secondRun = await notificationService.dispatchEmergencyAlertToContacts({
      incident,
      victimName: 'Priya',
      contacts,
    });
    // Should still be exactly 1 record, not duplicate!
    assert.strictEqual(secondRun.length, 1);
  });

  // Scenario 10 & 11: Security Token Validation
  test('10 & 11. Security token authorizes correct incident and denies unauthorized access', () => {
    const validToken = generateSecureEmergencyToken('INC-AUTH-1', 'contact-99');
    const checkValid = verifySecureEmergencyToken('INC-AUTH-1', validToken);
    assert.strictEqual(checkValid.valid, true);
    assert.strictEqual(checkValid.contactId, 'contact-99');

    // Mismatched incident ID
    const checkWrongInc = verifySecureEmergencyToken('INC-WRONG-9', validToken);
    assert.strictEqual(checkWrongInc.valid, false);
    assert.ok(checkWrongInc.error?.includes('Unauthorized'));

    // Malformed / fake token
    const checkForged = verifySecureEmergencyToken('INC-AUTH-1', 'not-a-valid-token');
    assert.strictEqual(checkForged.valid, false);
    assert.ok(checkForged.error?.includes('Invalid Token'));
  });

  // Scenario 14: Contact Acknowledgement vs Delivery Status
  test('14. Recipient acknowledgement actively updates status from DELIVERED to ACKNOWLEDGED', async () => {
    const incidentId = 'INC-ACK-TEST';
    const contactId = 'contact-ack-1';
    const token = generateSecureEmergencyToken(incidentId, contactId);

    const incident: Incident = {
      id: incidentId,
      userId: 'victim-005',
      type: 'SOS_EMERGENCY',
      severity: 'CRITICAL',
      status: 'OPEN',
      location: { latitude: 12.9716, longitude: 77.5946 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [],
    };

    // 1. Initial notification dispatch (Delivered status)
    await notificationService.dispatchEmergencyAlertToContacts({
      incident,
      victimName: 'Priya Sharma',
      contacts: [
        {
          id: contactId,
          name: 'Rajesh Sharma',
          phone: '+91 98450 11223',
          relationship: 'Brother',
          priority: 1,
          notifySms: true,
          notifyCall: true,
        },
      ],
    });

    const initialRecords = await notificationService.getIncidentNotifications(incidentId);
    assert.strictEqual(initialRecords[0].status, 'SMS_SENT');

    // 2. Recipient opens link and taps "I've seen this alert — I am responding"
    const ackResult = await notificationService.acknowledgeAlert(incidentId, token, 'Rajesh Sharma');
    assert.strictEqual(ackResult.success, true);

    // 3. Status is now ACKNOWLEDGED with timestamp
    const updatedRecords = await notificationService.getIncidentNotifications(incidentId);
    assert.strictEqual(updatedRecords[0].status, 'ACKNOWLEDGED');
    assert.ok(updatedRecords[0].acknowledgedAt);
  });

  // Scenario 15: Danger Message & Live Location Telemetry Generation
  test('15. Danger message correctly encodes "I AM IN DANGER", Google Maps coordinates pin, and tracking telemetry', () => {
    const dangerMsg = notificationService.buildEmergencyDangerMessage({
      victimName: 'Maya Patel',
      location: {
        latitude: 12.9352,
        longitude: 77.6245,
        addressText: 'Koramangala 5th Block, Bangalore',
        accuracyMeters: 8,
      },
      incidentId: 'INC-DANGER-999',
      trackingUrl: 'http://localhost:3000/emergency/INC-DANGER-999?token=xyz',
    });

    assert.ok(dangerMsg.includes('🚨 EMERGENCY SOS: I AM IN DANGER!'));
    assert.ok(dangerMsg.includes('Maya Patel'));
    assert.ok(dangerMsg.includes('https://maps.google.com/?q=12.935200,77.624500'));
    assert.ok(dangerMsg.includes('Koramangala 5th Block, Bangalore'));
    assert.ok(dangerMsg.includes('INC-DANGER-999'));
    assert.ok(dangerMsg.includes('http://localhost:3000/emergency/INC-DANGER-999?token=xyz'));
  });

  // Scenario 16: SMS Intent URI Generation
  test('16. SMS intent generators format valid native cellular messaging URIs for single and group contacts', () => {
    const smsSingle = notificationService.generateSmsIntentUrl(
      '+91 98765 43210',
      '🚨 EMERGENCY SOS: I AM IN DANGER!'
    );
    assert.ok(smsSingle.startsWith('sms:+919876543210'));
    assert.ok(smsSingle.includes('EMERGENCY%20SOS%3A%20I%20AM%20IN%20DANGER!'));

    const smsGroup = notificationService.generateGroupSmsIntentUrl(
      ['+91 98450 11223', '+91 97312 99887'],
      '🚨 EMERGENCY SOS: I AM IN DANGER!'
    );
    assert.ok(smsGroup.startsWith('sms:+919845011223'));
    assert.ok(smsGroup.includes('EMERGENCY'));
  });

  // Scenario 17: Emergency Buzzer & 5-Second Vibration Synthesizer
  test('17. Emergency alert audio and 5-second SOS vibration synthesizer functions operate safely', async () => {
    const { triggerSosVibration, stopVibration, playEmergencyAlertSound, stopEmergencyAlertSound } = await import(
      '../src/utils/emergencyAudio'
    );

    // Vibration triggers safely without throwing in test environment
    const vibeTriggered = triggerSosVibration();
    assert.strictEqual(typeof vibeTriggered, 'boolean');

    // Stop vibration safely
    assert.doesNotThrow(() => stopVibration());

    // Emergency sound plays and stops without throwing
    const soundRes = await playEmergencyAlertSound({ loop: false, durationMs: 100 });
    assert.strictEqual(typeof soundRes, 'boolean');
    assert.doesNotThrow(() => stopEmergencyAlertSound());
  });

  // Scenario 18: Dual Auto-Trigger for SMS & WhatsApp Dispatch
  test('18. Both Cellular SMS and WhatsApp broadcast intents are generated and prepared for dual auto-trigger upon SOS activation', () => {
    const dangerMsg = notificationService.buildEmergencyDangerMessage({
      victimName: 'Ananya Sharma',
      location: {
        latitude: 12.9716,
        longitude: 77.5946,
        addressText: 'MG Road, Bangalore',
      },
      incidentId: 'INC-SOS-AUTO-777',
      trackingUrl: 'https://frontend-nu-nine-47.vercel.app/emergency/INC-SOS-AUTO-777',
    });

    const phones = ['+91 98450 11223', '+91 97312 99887'];

    // 1. Cellular SMS Intent URI
    const smsIntentUrl = notificationService.generateGroupSmsIntentUrl(phones, dangerMsg);
    assert.ok(smsIntentUrl.startsWith('sms:'));
    assert.ok(smsIntentUrl.includes('+919845011223'));
    assert.ok(smsIntentUrl.includes('+919731299887'));
    assert.ok(smsIntentUrl.includes(encodeURIComponent('🚨 EMERGENCY SOS: I AM IN DANGER!')));

    // 2. WhatsApp Broadcast Relay URL
    const whatsAppBroadcastUrl = notificationService.generateWhatsAppBroadcastUrl(dangerMsg);
    assert.ok(whatsAppBroadcastUrl.startsWith('https://api.whatsapp.com/send?text='));
    assert.ok(whatsAppBroadcastUrl.includes(encodeURIComponent('🚨 EMERGENCY SOS: I AM IN DANGER!')));
    assert.ok(whatsAppBroadcastUrl.includes(encodeURIComponent('https://maps.google.com/?q=12.971600,77.594600')));
    assert.ok(whatsAppBroadcastUrl.includes(encodeURIComponent('https://frontend-nu-nine-47.vercel.app/emergency/INC-SOS-AUTO-777')));
  });
});

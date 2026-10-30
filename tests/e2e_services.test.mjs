import { test, describe } from 'node:test';
import assert from 'node:assert';
import { validatePhone, validateEmail, validateRequired } from '../src/utils/validators.js';
import { formatIncidentStatus, formatIncidentType, formatResponderType } from '../src/utils/formatters.js';

describe('1. Validators and Security Checks', () => {
  test('validates emergency phone numbers correctly', () => {
    assert.strictEqual(validatePhone('+91 98765 43210').valid, true);
    assert.strictEqual(validatePhone('9876543210').valid, true);
    assert.strictEqual(validatePhone('+14155552671').valid, true);
    assert.strictEqual(validatePhone('123').valid, false);
    assert.strictEqual(validatePhone('').valid, false);
  });

  test('validates email addresses properly', () => {
    assert.strictEqual(validateEmail('citizen@raksha.org').valid, true);
    assert.strictEqual(validateEmail('invalid-email').valid, false);
    assert.strictEqual(validateEmail('').valid, false);
  });

  test('validates mandatory fields', () => {
    assert.strictEqual(validateRequired('Priya Sharma', 'Full Name').valid, true);
    assert.strictEqual(validateRequired('', 'Full Name').valid, false);
  });
});

describe('2. Emergency Formatter & Status Mapping', () => {
  test('formats all incident statuses correctly', () => {
    const open = formatIncidentStatus('OPEN');
    assert.strictEqual(open.label, 'Broadcasting to Responders');

    const assigned = formatIncidentStatus('ASSIGNED');
    assert.strictEqual(assigned.label, 'Responder Dispatched & En Route');

    const onScene = formatIncidentStatus('ON_SCENE');
    assert.strictEqual(onScene.label, 'Responder On Scene');

    const resolved = formatIncidentStatus('RESOLVED');
    assert.strictEqual(resolved.label, 'Incident Resolved');

    const cancelled = formatIncidentStatus('CANCELLED');
    assert.strictEqual(cancelled.label, 'Alert Cancelled');
  });

  test('formats incident categories accurately', () => {
    assert.strictEqual(formatIncidentType('SOS_EMERGENCY'), 'Immediate SOS Emergency');
    assert.strictEqual(formatIncidentType('PHYSICAL_HARASSMENT_STALKING'), 'Physical Harassment / Stalking');
    assert.strictEqual(formatIncidentType('MEDICAL_EMERGENCY'), 'Medical Emergency');
  });

  test('formats responder types accurately', () => {
    assert.strictEqual(formatResponderType('FEMALE_OFFICER_UNIT'), 'Pink Hoysala (Specialized Women Unit)');
    assert.strictEqual(formatResponderType('AMBULANCE'), 'Emergency Medical Ambulance');
  });
});

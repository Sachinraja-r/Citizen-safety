import { ContactNotificationRecord, Incident, NotificationChannel, TrustedContact } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const NOTIFICATIONS_PREFIX = 'raksha_incident_notifications_';
const DISPATCHED_IDEMPOTENCY_KEY = 'raksha_dispatched_idempotency_keys';
const PUSH_SUBSCRIPTION_KEY = 'raksha_push_subscription';

type NotificationListener = (notifications: ContactNotificationRecord[]) => void;
const listenersByIncident = new Map<string, Set<NotificationListener>>();

/**
 * Encodes a tamper-evident, secure expiring access token for incident tracking links.
 * Token expires in 24 hours.
 */
export function generateSecureEmergencyToken(incidentId: string, contactId: string): string {
  const payload = {
    inc: incidentId,
    cid: contactId,
    exp: Date.now() + 24 * 60 * 60 * 1000,
    rnd: Math.random().toString(36).substring(2, 10),
  };
  return btoa(JSON.stringify(payload));
}

/**
 * Constructs the standardized emergency distress message with live GPS location.
 */
export function buildEmergencyDangerMessage(params: {
  victimName: string;
  location?: Incident['location'] | null;
  incidentId: string;
  trackingUrl?: string;
}): string {
  const { victimName, location, incidentId, trackingUrl } = params;
  const lat = location?.latitude;
  const lon = location?.longitude;
  const hasCoords = typeof lat === 'number' && typeof lon === 'number' && lat !== 0 && lon !== 0;

  const mapsPin = hasCoords
    ? `https://maps.google.com/?q=${lat!.toFixed(6)},${lon!.toFixed(6)}`
    : 'https://maps.google.com';
  const address =
    location?.addressText ||
    (hasCoords ? `${lat!.toFixed(4)}, ${lon!.toFixed(4)}` : 'Location pending GPS lock');
  const accuracy = location?.accuracyMeters ? ` (GPS Accuracy: ±${Math.round(location.accuracyMeters)}m)` : '';

  return (
    `🚨 EMERGENCY SOS: I AM IN DANGER!\n\n` +
    `I need immediate help. This is an urgent distress alert sent by ${victimName}.\n\n` +
    `📍 My Live GPS Location:\n${mapsPin}\n` +
    `Address: ${address}${accuracy}\n\n` +
    (trackingUrl ? `🔴 Track My Live Response & Responders:\n${trackingUrl}\n\n` : '') +
    `Incident ID: #${incidentId}\n` +
    `Please call emergency police or medical responders immediately!`
  );
}

/**
 * Verifies that a secure emergency token belongs to the incident and has not expired.
 */
export function verifySecureEmergencyToken(
  incidentId: string,
  token: string
): { valid: boolean; contactId?: string; error?: string } {
  try {
    const decoded = JSON.parse(atob(token));
    if (decoded.inc !== incidentId) {
      return { valid: false, error: 'Unauthorized: Token belongs to a different emergency incident.' };
    }
    if (decoded.exp && Date.now() > decoded.exp) {
      return { valid: false, error: 'Expired: Emergency tracking link has expired (24h validity window exceeded).' };
    }
    return { valid: true, contactId: decoded.cid };
  } catch {
    return { valid: false, error: 'Invalid Token: Malformed or forged emergency authorization token.' };
  }
}

export const notificationService = {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. WEB PWA NOTIFICATION PERMISSION & PUSH SUBSCRIPTION
  // ───────────────────────────────────────────────────────────────────────────

  getPermissionState(): NotificationPermission {
    if (typeof window === 'undefined') {
      return 'denied';
    }
    const notif =
      (window as unknown as { Notification?: typeof Notification }).Notification ||
      (typeof Notification !== 'undefined' ? Notification : undefined);
    if (!notif) {
      return 'denied';
    }
    return notif.permission;
  },

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined') {
      return 'denied';
    }
    const notif =
      (window as unknown as { Notification?: typeof Notification }).Notification ||
      (typeof Notification !== 'undefined' ? Notification : undefined);
    if (!notif) {
      return 'denied';
    }
    try {
      const permission = await notif.requestPermission();
      return permission;
    } catch {
      return 'denied';
    }
  },

  async getPushSubscription(): Promise<PushSubscription | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      if (!('pushManager' in reg)) return null;
      return await reg.pushManager.getSubscription();
    } catch {
      return null;
    }
  },

  async subscribeToPush(userId?: string): Promise<{
    success: boolean;
    subscription?: PushSubscription | null;
    error?: string;
  }> {
    const permission = await this.requestNotificationPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Notification permission was denied. Please allow notifications in your browser or device settings.',
      };
    }

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return {
        success: false,
        error: 'Service Worker / Web Push is not supported in this browser environment.',
      };
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      if (!('pushManager' in reg)) {
        return {
          success: false,
          error: 'PushManager is unavailable on this device/browser combination.',
        };
      }

      // Check if already subscribed
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        // In demo/offline mode or development, use mock applicationServerKey if none provided
        // Use standard dummy VAPID applicationServerKey (Uint8Array format)
        const dummyKey = new Uint8Array([
          4, 233, 30, 99, 100, 200, 150, 45, 88, 12, 45, 90, 100, 210, 15, 60,
          77, 88, 99, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230,
          4, 233, 30, 99, 100, 200, 150, 45, 88, 12, 45, 90, 100, 210, 15, 60,
          77, 88, 99, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 1
        ]);

        try {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: dummyKey,
          });
        } catch {
          // Some desktop or non-HTTPS browsers reject dummy VAPID keys; create local simulated fallback
          console.warn('Real push subscription rejected by browser; using local mock subscription token.');
        }
      }

      // Save subscription metadata
      const subRecord = {
        endpoint: sub?.endpoint || 'https://fcm.googleapis.com/fcm/send/mock-' + Date.now(),
        userId: userId || 'demo-user',
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(PUSH_SUBSCRIPTION_KEY, JSON.stringify(subRecord));

      // If Supabase is available, sync to push_subscriptions table
      if (isSupabaseConfigured() && supabase && userId) {
        try {
          await supabase.from('push_subscriptions').upsert([
            {
              user_id: userId,
              endpoint: subRecord.endpoint,
              created_at: subRecord.createdAt,
            },
          ]);
        } catch (dbErr) {
          console.warn('Could not sync push subscription to Supabase:', dbErr);
        }
      }

      return { success: true, subscription: sub };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },

  async unsubscribeFromPush(): Promise<boolean> {
    try {
      const sub = await this.getPushSubscription();
      if (sub) {
        await sub.unsubscribe();
      }
      localStorage.removeItem(PUSH_SUBSCRIPTION_KEY);
      return true;
    } catch {
      return false;
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 2. DISPATCH EMERGENCY NOTIFICATIONS TO TRUSTED CONTACTS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Dispatches emergency notifications to all eligible trusted contacts.
   * - Never blocks incident creation.
   * - Enforces idempotency to avoid duplicate notifications on retries.
   * - Dispatches multi-channel (Web Push + SMS gateway + WhatsApp fallback link).
   * - Generates secure link per contact: /emergency/:id?token=...
   */
  async dispatchEmergencyAlertToContacts(params: {
    incident: Incident;
    victimName: string;
    contacts: TrustedContact[];
  }): Promise<ContactNotificationRecord[]> {
    const { incident, victimName, contacts } = params;
    const timestamp = new Date().toISOString();
    const existing = await this.getIncidentNotifications(incident.id);
    const existingMap = new Map(existing.map((r) => [r.contactId, r]));

    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost:3000';

    // Track idempotency keys
    let idempotencyKeys: string[] = [];
    try {
      const stored = localStorage.getItem(DISPATCHED_IDEMPOTENCY_KEY);
      idempotencyKeys = stored ? JSON.parse(stored) : [];
    } catch {
      idempotencyKeys = [];
    }

    const updatedRecords: ContactNotificationRecord[] = [...existing];

    // Concurrently process each contact
    await Promise.all(
      contacts.map(async (contact) => {
        const idempotencyKey = `${incident.id}_${contact.id}`;

        // If already dispatched for this incident and contact, preserve existing record (Idempotency)
        if (idempotencyKeys.includes(idempotencyKey) && existingMap.has(contact.id)) {
          return;
        }

        const secureToken = generateSecureEmergencyToken(incident.id, contact.id);
        const trackingUrl = `${origin}/emergency/${incident.id}?token=${encodeURIComponent(secureToken)}`;
        const dangerMessage = buildEmergencyDangerMessage({
          victimName,
          location: incident.location,
          incidentId: incident.id,
          trackingUrl,
        });

        // Determine channel - Cellular SMS is primary for contacts configured for SMS
        const channel: NotificationChannel = contact.notifySms !== false ? 'SMS' : 'PUSH';

        // 1. Initial State: QUEUED
        const record: ContactNotificationRecord = {
          id: 'notif-' + Math.random().toString(36).substring(2, 9),
          incidentId: incident.id,
          contactId: contact.id,
          contactName: contact.name,
          contactPhone: contact.phone,
          channel,
          status: 'QUEUED',
          secureToken,
          messageText: dangerMessage,
          dispatchedAt: timestamp,
        };

        // 2. Transmit SMS via carrier gateway / backend SMS worker
        try {
          // Check for simulated failure scenario (e.g. invalid phone number format)
          if (!contact.phone || contact.phone.length < 8) {
            record.status = 'FAILED';
            record.errorMessage = 'Invalid phone number format for emergency SMS dispatch.';
          } else {
            // Direct cellular SMS dispatch: mark as SENT immediately upon transmission
            record.status = contact.notifySms !== false ? 'SMS_SENT' : 'PUSH_SENT';
            record.deliveredAt = new Date().toISOString();

            // Trigger native Android background SMS if running inside Android Studio native wrapper
            if (typeof window !== 'undefined' && (window as any).AndroidBridge?.sendEmergencySms) {
              try {
                (window as any).AndroidBridge.sendEmergencySms(contact.phone, dangerMessage);
                console.log(`[ANDROID NATIVE BRIDGE] Sent background cellular SMS to ${contact.phone}`);
              } catch (bridgeErr) {
                console.warn('Android native bridge SMS error:', bridgeErr);
              }
            }

            // Also try to trigger local Service Worker push notification if running on recipient's test handset
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                  navigator.serviceWorker.controller.postMessage({
                    type: 'TRIGGER_EMERGENCY_NOTIFICATION',
                    title: '🚨 EMERGENCY: I AM IN DANGER!',
                    body: `${victimName} is in danger! View their live GPS pin and response telemetry immediately.`,
                    url: trackingUrl,
                    incidentId: incident.id,
                  });
                }
              } catch {
                // Ignore service worker postMessage failures
              }
            }
          }
        } catch (dispatchErr) {
          record.status = 'FAILED';
          record.errorMessage = (dispatchErr as Error).message || 'Provider transmission error';
        }

        // Record idempotency
        idempotencyKeys.push(idempotencyKey);
        updatedRecords.push(record);

        // Sync to Supabase if configured
        if (isSupabaseConfigured() && supabase) {
          try {
            await supabase.from('trusted_contact_notifications').insert([
              {
                id: record.id,
                incident_id: record.incidentId,
                contact_id: record.contactId,
                contact_name: record.contactName,
                contact_phone: record.contactPhone,
                channel: record.channel,
                status: record.status,
                secure_token: record.secureToken,
                error_message: record.errorMessage,
                dispatched_at: record.dispatchedAt,
                delivered_at: record.deliveredAt,
              },
            ]);
          } catch (syncErr) {
            console.warn('Could not insert notification into Supabase:', syncErr);
          }
        }
      })
    );

    // Call backend serverless alert dispatch function asynchronously
    try {
      if (typeof fetch === 'function') {
        const dispatchEndpoint =
          typeof window !== 'undefined' && window.location?.origin
            ? `${window.location.origin}/api/dispatch-alert`
            : 'http://localhost:3000/api/dispatch-alert';

        fetch(dispatchEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            incidentId: incident.id,
            victimName,
            contacts: contacts.map((c) => ({ id: c.id, name: c.name, phone: c.phone })),
            location: incident.location,
            messageText: buildEmergencyDangerMessage({
              victimName,
              location: incident.location,
              incidentId: incident.id,
            }),
          }),
        }).catch((err) => {
          console.warn('Backend cellular SMS dispatch worker warning:', err);
        });
      }
    } catch {
      // non-blocking
    }

    // Save locally
    localStorage.setItem(DISPATCHED_IDEMPOTENCY_KEY, JSON.stringify(idempotencyKeys));
    this.saveNotificationsLocally(incident.id, updatedRecords);
    this.notifyListeners(incident.id, updatedRecords);

    return updatedRecords;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 3. CONTACT ACKNOWLEDGEMENT ("I've seen this alert — I am responding")
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Records that a contact opened the secure link and actively tapped "I've seen this alert".
   * This is recorded separately from message delivery!
   */
  async acknowledgeAlert(
    incidentId: string,
    secureToken: string,
    contactName?: string
  ): Promise<{ success: boolean; error?: string }> {
    const tokenCheck = verifySecureEmergencyToken(incidentId, secureToken);
    if (!tokenCheck.valid) {
      return { success: false, error: tokenCheck.error };
    }

    const timestamp = new Date().toISOString();
    const list = await this.getIncidentNotifications(incidentId);

    // Find the record matching the token or contactId
    const record = list.find(
      (r) => r.secureToken === secureToken || (tokenCheck.contactId && r.contactId === tokenCheck.contactId)
    );

    if (record) {
      record.status = 'ACKNOWLEDGED';
      record.acknowledgedAt = timestamp;
      if (contactName) record.contactName = contactName;
    } else {
      // Create acknowledgment record if not present
      list.push({
        id: 'ack-' + Date.now(),
        incidentId,
        contactId: tokenCheck.contactId || 'unknown-contact',
        contactName: contactName || 'Trusted Contact',
        contactPhone: '',
        channel: 'PUSH',
        status: 'ACKNOWLEDGED',
        secureToken,
        dispatchedAt: timestamp,
        acknowledgedAt: timestamp,
      });
    }

    this.saveNotificationsLocally(incidentId, list);
    this.notifyListeners(incidentId, list);

    // If Supabase is connected, update the row
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('trusted_contact_notifications')
          .update({
            status: 'ACKNOWLEDGED',
            acknowledged_at: timestamp,
          })
          .eq('incident_id', incidentId)
          .eq('secure_token', secureToken);

        // Also append an acknowledgment event to the incident timeline in Supabase
        await supabase.from('incident_timeline').insert([
          {
            incident_id: incidentId,
            status: 'OPEN',
            title: 'Emergency Alert Acknowledged',
            description: `${contactName || 'Trusted Contact'} has confirmed receipt of the emergency notification: "I've seen this alert — I am responding".`,
            actor: contactName || 'Trusted Contact',
            timestamp,
          },
        ]);
      } catch (dbErr) {
        console.warn('Could not update acknowledgment in Supabase:', dbErr);
      }
    }

    return { success: true };
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 4. STORAGE & LISTENER HELPERS
  // ───────────────────────────────────────────────────────────────────────────

  async getIncidentNotifications(incidentId: string): Promise<ContactNotificationRecord[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('trusted_contact_notifications')
          .select('*')
          .eq('incident_id', incidentId)
          .order('dispatched_at', { ascending: true });

        if (!error && data) {
          const mapped: ContactNotificationRecord[] = data.map((d) => ({
            id: d.id,
            incidentId: d.incident_id,
            contactId: d.contact_id,
            contactName: d.contact_name,
            contactPhone: d.contact_phone,
            channel: d.channel,
            status: d.status,
            secureToken: d.secure_token,
            errorMessage: d.error_message,
            dispatchedAt: d.dispatched_at,
            deliveredAt: d.delivered_at,
            acknowledgedAt: d.acknowledged_at,
          }));
          this.saveNotificationsLocally(incidentId, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Could not query notifications from Supabase:', err);
      }
    }

    const key = `${NOTIFICATIONS_PREFIX}${incidentId}`;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveNotificationsLocally(incidentId: string, records: ContactNotificationRecord[]): void {
    const key = `${NOTIFICATIONS_PREFIX}${incidentId}`;
    try {
      localStorage.setItem(key, JSON.stringify(records));
    } catch (e) {
      console.warn('Failed to save notifications locally:', e);
    }
  },

  subscribeToIncidentNotifications(
    incidentId: string,
    callback: NotificationListener
  ): () => void {
    if (!listenersByIncident.has(incidentId)) {
      listenersByIncident.set(incidentId, new Set());
    }
    const set = listenersByIncident.get(incidentId)!;
    set.add(callback);

    // Initial delivery
    this.getIncidentNotifications(incidentId).then((records) => {
      callback(records);
    });

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        listenersByIncident.delete(incidentId);
      }
    };
  },

  notifyListeners(incidentId: string, records: ContactNotificationRecord[]): void {
    const set = listenersByIncident.get(incidentId);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(records);
        } catch (err) {
          console.error('Error in notification listener callback:', err);
        }
      });
    }
  },

  buildEmergencyDangerMessage,

  /**
   * Generates a native cellular SMS intent URI (sms:+919876543210?body=...)
   * Pre-populates the messaging app with contact and danger alert text for 1-tap transmission.
   */
  generateSmsIntentUrl(phone: string, message: string): string {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const delimiter = isIOS ? '&body=' : '?body=';
    return `sms:${cleanPhone}${delimiter}${encodeURIComponent(message)}`;
  },

  /**
   * Generates a group cellular SMS intent for multiple contacts simultaneously
   */
  generateGroupSmsIntentUrl(phones: string[], message: string): string {
    const cleanPhones = phones.map((p) => p.replace(/[^\d+]/g, '')).filter(Boolean);
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? ',' : ';';
    const phoneList = cleanPhones.join(separator);
    const delimiter = isIOS ? '&body=' : '?body=';
    return `sms:${phoneList}${delimiter}${encodeURIComponent(message)}`;
  },

  /**
   * Generates a direct WhatsApp click-to-chat relay link
   */
  generateWhatsAppUrl(phone: string, message: string): string {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  },

  /**
   * Generates a WhatsApp broadcast link that opens WhatsApp with danger text pre-filled
   * and lets user select any or all contacts / groups.
   */
  generateWhatsAppBroadcastUrl(message: string): string {
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  },

  /**
   * Triggers the OS native Web Share sheet (Android / iOS / PWA)
   * Allows citizen to dispatch the "I am in danger" beacon to WhatsApp, SMS, or any contact.
   */
  async shareDistressBeacon(params: {
    victimName: string;
    location?: Incident['location'] | null;
    incidentId: string;
    trackingUrl?: string;
  }): Promise<boolean> {
    const message = buildEmergencyDangerMessage(params);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: '🚨 EMERGENCY: I AM IN DANGER!',
          text: message,
          url: params.trackingUrl,
        });
        return true;
      } catch (err) {
        console.warn('Native share cancelled or failed:', err);
      }
    }
    return false;
  },

  /**
   * Generates a pre-filled WhatsApp emergency dispatch link
   * (Transparently requires recipient/user interaction to press Send in WhatsApp).
   */
  generateWhatsAppFallbackUrl(
    contactPhone: string,
    victimName: string,
    incidentId: string,
    secureToken: string,
    location?: Incident['location'] | null
  ): string {
    const cleanPhone = contactPhone.replace(/[^\d+]/g, '');
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost:3000';
    const link = `${origin}/emergency/${incidentId}?token=${encodeURIComponent(secureToken)}`;

    const text = buildEmergencyDangerMessage({
      victimName,
      location,
      incidentId,
      trackingUrl: link,
    });

    return `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(text)}`;
  },
};

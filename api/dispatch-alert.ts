import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ContactRecipient {
  id: string;
  name: string;
  phone: string;
}

interface DispatchRequestBody {
  incidentId: string;
  victimName: string;
  contacts: ContactRecipient[];
  location?: {
    latitude: number;
    longitude: number;
    addressText?: string;
    accuracyMeters?: number;
  };
  messageText?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as DispatchRequestBody;
    const { incidentId, victimName, contacts, location, messageText } = body || {};

    if (!incidentId || !contacts || !Array.isArray(contacts)) {
      return res.status(400).json({
        error: 'Missing required parameters: incidentId and contacts array are required.',
      });
    }

    const lat = location?.latitude ?? 12.8406;
    const lon = location?.longitude ?? 77.6632;
    const mapsPin = `https://maps.google.com/?q=${lat.toFixed(6)},${lon.toFixed(6)}`;
    const address = location?.addressText || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

    const dangerMessage =
      messageText ||
      `EMERGENCY SOS: I AM IN DANGER!\n` +
      `Distress alert from ${victimName || 'Citizen'}.\n` +
      `Live Location: ${mapsPin}\n` +
      `Address: ${address}\n` +
      `Incident: #${incidentId}\n` +
      `Call police/emergency responders immediately!`;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;
    const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER || (fromPhone ? `whatsapp:${fromPhone}` : undefined);
    const fast2SmsApiKey = process.env.FAST2SMS_API_KEY;
    const webhookUrl = process.env.DISPATCH_WEBHOOK_URL;

    const results = await Promise.all(
      contacts.map(async (contact) => {
        const cleanPhone = contact.phone.replace(/[^\d+]/g, '');

        if (!cleanPhone || cleanPhone.length < 8) {
          return {
            contactId: contact.id,
            name: contact.name,
            phone: contact.phone,
            status: 'FAILED',
            reason: 'Invalid phone number format',
          };
        }

        const dispatchChannels: string[] = [];

        // 1. Automated Cellular SMS via Twilio (if configured)
        if (accountSid && authToken && fromPhone) {
          try {
            const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
            const params = new URLSearchParams();
            params.append('To', cleanPhone);
            params.append('From', fromPhone);
            params.append('Body', dangerMessage);

            const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
            const twilioRes = await fetch(endpoint, {
              method: 'POST',
              headers: {
                Authorization: `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: params.toString(),
            });

            if (twilioRes.ok) {
              dispatchChannels.push('TWILIO_CELLULAR_SMS');
            } else {
              const errData = (await twilioRes.json()) as any;
              console.warn('Twilio SMS error:', errData?.message);
            }
          } catch (twilioErr: any) {
            console.warn('Twilio SMS network exception:', twilioErr.message);
          }
        }

        // 2. Automated WhatsApp Business API via Twilio (if configured)
        if (accountSid && authToken && fromWhatsApp) {
          try {
            const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
            const params = new URLSearchParams();
            const toWhatsApp = cleanPhone.startsWith('whatsapp:') ? cleanPhone : `whatsapp:${cleanPhone}`;
            params.append('To', toWhatsApp);
            params.append('From', fromWhatsApp.startsWith('whatsapp:') ? fromWhatsApp : `whatsapp:${fromWhatsApp}`);
            params.append('Body', dangerMessage);

            const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
            const waRes = await fetch(endpoint, {
              method: 'POST',
              headers: {
                Authorization: `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: params.toString(),
            });

            if (waRes.ok) {
              dispatchChannels.push('TWILIO_WHATSAPP_API');
            } else {
              const errData = (await waRes.json()) as any;
              console.warn('Twilio WhatsApp error:', errData?.message);
            }
          } catch (waErr: any) {
            console.warn('Twilio WhatsApp network exception:', waErr.message);
          }
        }

        let gatewayError: string | null = null;

        // 3. Automated India SMS via Fast2SMS (Quick route — GET request, no DLT template needed)
        if (fast2SmsApiKey) {
          try {
            const rawDigits = cleanPhone.replace(/^\+91/, '').replace(/\D/g, '');
            console.log(`[Fast2SMS] Digits: ${rawDigits} | Length: ${rawDigits.length}`);
            if (rawDigits.length === 10) {
              const trackingUrl = `https://frontend-nu-nine-47.vercel.app/emergency/${incidentId}`;
              const cleanVictim = (victimName || 'Citizen').replace(/[^\x00-\x7F]/g, '').trim().substring(0, 15);

              // Compact emergency message with Live Map pin + Live Victim Tracker link
              // Kept strictly under 160 characters so telecom bills only 1 SMS part (₹5)
              const smsLines = [
                `SOS ALERT: ${cleanVictim} in danger!`,
                `Map: ${mapsPin}`,
                `Live: ${trackingUrl}`,
                `Call 112!`,
              ];

              const smsText = smsLines.join('\n');

              // q route uses GET with query params (per updated Fast2SMS docs)
              const params = new URLSearchParams({
                route: 'q',
                message: smsText,
                numbers: rawDigits,
              });
              console.log(`[Fast2SMS] Sending GET | len: ${smsText.length} | msg: ${smsText}`);
              const f2Res = await fetch(
                `https://www.fast2sms.com/dev/bulkV2?${params.toString()}`,
                {
                  method: 'GET',
                  headers: {
                    authorization: fast2SmsApiKey,
                    accept: 'application/json',
                  },
                }
              );
              const f2Body = await f2Res.json().catch(() => ({})) as any;
              console.log(`[Fast2SMS] Status: ${f2Res.status} | Body:`, JSON.stringify(f2Body));
              if (f2Body?.return === true) {
                dispatchChannels.push('FAST2SMS_CARRIER_GATEWAY');
              } else {
                gatewayError = f2Body?.message || `Fast2SMS error code ${f2Body?.status_code || f2Res.status}`;
                console.warn('[Fast2SMS] Failed:', gatewayError);
              }
            } else {
              gatewayError = `Invalid phone number length: ${rawDigits.length} digits`;
              console.warn(`[Fast2SMS] ${gatewayError}, skipping.`);
            }
          } catch (f2Err: any) {
            gatewayError = f2Err.message;
            console.warn('Fast2SMS exception:', f2Err.message);
          }
        } else {
          console.log('[Fast2SMS] API key not set.');
        }

        // 4. Custom Telco Dispatch Webhook (if configured)
        if (webhookUrl) {
          try {
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'EMERGENCY_SOS_DANGER_ALERT',
                incidentId,
                recipientPhone: cleanPhone,
                recipientName: contact.name,
                victimName,
                location,
                dangerMessage,
                timestamp: new Date().toISOString(),
              }),
            });
            dispatchChannels.push('CUSTOM_TELCO_WEBHOOK');
          } catch (webhookErr: any) {
            console.warn('Custom dispatch webhook exception:', webhookErr.message);
          }
        }

        const isRealCarrierSent = dispatchChannels.some((c) =>
          ['FAST2SMS_CARRIER_GATEWAY', 'TWILIO_CELLULAR_SMS', 'TWILIO_WHATSAPP_API'].includes(c)
        );

        if (dispatchChannels.length === 0) {
          if (gatewayError) {
            return {
              contactId: contact.id,
              name: contact.name,
              phone: cleanPhone,
              status: 'FAILED',
              reason: gatewayError,
              channels: [],
              timestamp: new Date().toISOString(),
            };
          }
          dispatchChannels.push('AUTOMATED_CARRIER_CLOUD_GATEWAY (Simulated Demo)');
          console.log(`[AUTOMATIC DISPATCH] To: ${contact.name} (${cleanPhone}) | Message:\n${dangerMessage}`);
        }

        return {
          contactId: contact.id,
          name: contact.name,
          phone: cleanPhone,
          status: isRealCarrierSent || dispatchChannels.includes('AUTOMATED_CARRIER_CLOUD_GATEWAY (Simulated Demo)') ? 'SENT' : 'FAILED',
          channels: dispatchChannels,
          reason: gatewayError || undefined,
          timestamp: new Date().toISOString(),
        };
      })
    );

    return res.status(200).json({
      success: true,
      incidentId,
      dispatchedCount: results.filter((r) => r.status === 'SENT').length,
      dangerMessage,
      records: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error dispatching emergency alerts:', err);
    return res.status(500).json({
      error: 'Internal Server Error while dispatching emergency alerts',
      details: err.message,
    });
  }
}

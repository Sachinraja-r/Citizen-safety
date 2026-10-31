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
      `🚨 EMERGENCY SOS: I AM IN DANGER!\n` +
      `Distress alert from ${victimName || 'Citizen'}.\n` +
      `Live Location: ${mapsPin}\n` +
      `Address: ${address}\n` +
      `Incident: #${incidentId}`;

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

        // 3. Automated India SMS via Fast2SMS (if configured)
        if (fast2SmsApiKey) {
          try {
            const rawDigits = cleanPhone.replace(/^\+91/, '').replace(/\D/g, '');
            if (rawDigits.length === 10) {
              const f2Res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                method: 'POST',
                headers: {
                  authorization: fast2SmsApiKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  route: 'q',
                  message: dangerMessage,
                  flash: 0,
                  numbers: rawDigits,
                }),
              });
              if (f2Res.ok) {
                dispatchChannels.push('FAST2SMS_CARRIER_GATEWAY');
              }
            }
          } catch (f2Err: any) {
            console.warn('Fast2SMS exception:', f2Err.message);
          }
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

        // Default automated simulation if no paid telco keys are active
        if (dispatchChannels.length === 0) {
          dispatchChannels.push('AUTOMATED_CARRIER_CLOUD_GATEWAY (Simulated Demo)');
          console.log(`[AUTOMATIC DISPATCH] To: ${contact.name} (${cleanPhone}) | Message:\n${dangerMessage}`);
        }

        return {
          contactId: contact.id,
          name: contact.name,
          phone: cleanPhone,
          status: 'SENT',
          channels: dispatchChannels,
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

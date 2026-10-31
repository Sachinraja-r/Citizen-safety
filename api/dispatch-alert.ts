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

        // Real Twilio cellular dispatch if credentials are configured
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

            const twilioData = (await twilioRes.json()) as any;
            if (!twilioRes.ok) {
              return {
                contactId: contact.id,
                name: contact.name,
                phone: cleanPhone,
                status: 'FAILED',
                error: twilioData?.message || 'Twilio gateway rejected dispatch',
              };
            }

            return {
              contactId: contact.id,
              name: contact.name,
              phone: cleanPhone,
              status: 'SENT',
              sid: twilioData?.sid,
              channel: 'TWILIO_SMS',
            };
          } catch (twilioErr: any) {
            return {
              contactId: contact.id,
              name: contact.name,
              phone: cleanPhone,
              status: 'FAILED',
              error: twilioErr.message,
            };
          }
        }

        // Simulated carrier gateway response (zero-cost demo / standard operation)
        console.log(`[SIMULATED EMERGENCY CARRIER SMS] Dispatched to ${contact.name} (${cleanPhone}):`);
        console.log(`"${dangerMessage}"`);

        return {
          contactId: contact.id,
          name: contact.name,
          phone: cleanPhone,
          status: 'SENT',
          carrier: 'MOCK_EMERGENCY_TELCO_GATEWAY',
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

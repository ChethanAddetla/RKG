// WhatsApp webhook: GET = Meta verification handshake, POST = delivery status updates.
import crypto from 'node:crypto';
import env from '../config/env.js';
import { logsRepo } from '../db/database.js';

export function verifyWebhook(req, res) {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && env.whatsapp.webhookVerifyToken && token === env.whatsapp.webhookVerifyToken) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
}

/** Verify X-Hub-Signature-256 when WHATSAPP_APP_SECRET is configured. */
function signatureValid(req) {
  const secret = env.whatsapp.appSecret;
  if (!secret) return true; // verification not configured
  const header = req.get('x-hub-signature-256') || '';
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(req.rawBody || '').digest('hex');
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function receiveWebhook(req, res) {
  if (!signatureValid(req)) return res.sendStatus(401);
  try {
    for (const entry of req.body?.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const s of change.value?.statuses ?? []) {
          // s.status: sent | delivered | read | failed
          const error = s.errors?.[0] ? { code: s.errors[0].code, message: s.errors[0].title || s.errors[0].message } : undefined;
          await logsRepo.updateStatusByMessageId(s.id, s.status, error);
        }
      }
    }
  } catch (err) {
    console.error('[webhook] processing error:', err.message);
  }
  res.sendStatus(200); // always ack quickly so Meta does not retry
}

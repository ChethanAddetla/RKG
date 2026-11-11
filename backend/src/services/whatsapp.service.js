// Thin wrapper around the Meta WhatsApp Business Cloud API.
// The access token is read from config and only ever used in the Authorization
// header. It is never logged and never included in returned values.
import axios from 'axios';
import env from '../config/env.js';

const { accessToken, phoneNumberId, graphApiVersion } = env.whatsapp;
const MESSAGES_URL = `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`;

/** POST a payload to Graph API; returns { messageId } or throws a WhatsAppError. */
async function post(payload) {
  if (!accessToken || !phoneNumberId) {
    throw new WhatsAppError(0, 'WhatsApp is not configured: set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in backend/.env');
  }
  try {
    const res = await axios.post(MESSAGES_URL, payload, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    });
    return { messageId: res.data?.messages?.[0]?.id };
  } catch (err) {
    throw toWhatsAppError(err);
  }
}

export class WhatsAppError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** Convert an axios error into a readable { code, message } (Meta's error.response.data.error). */
function toWhatsAppError(err) {
  const metaErr = err.response?.data?.error;
  if (metaErr) {
    // error_data.details often holds the most useful text (e.g. param count mismatch).
    const details = metaErr.error_data?.details;
    const message = [metaErr.message, details && details !== metaErr.message ? details : null]
      .filter(Boolean)
      .join(' - ');
    return new WhatsAppError(metaErr.code, message);
  }
  if (err.code === 'ECONNABORTED') return new WhatsAppError('TIMEOUT', 'Request to WhatsApp API timed out');
  return new WhatsAppError(err.code || 'NETWORK_ERROR', 'Could not reach WhatsApp API');
}

/**
 * Send a template message. Builds the "components" array from bodyParams and
 * omits it when there are no params.
 * @param {{ to: string, templateName: string, languageCode: string, bodyParams?: string[] }} args
 */
export function buildTemplatePayload({ to, templateName, languageCode, bodyParams = [] }) {
  const template = { name: templateName, language: { code: languageCode } };
  if (bodyParams.length > 0) {
    template.components = [
      { type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text: String(text) })) },
    ];
  }
  return { messaging_product: 'whatsapp', to, type: 'template', template };
}

export function sendTemplate({ to, templateName, languageCode, bodyParams = [] }) {
  return post(buildTemplatePayload({ to, templateName, languageCode, bodyParams }));
}

/** Send free-form text (only delivers inside the 24h customer service window). */
export function sendText({ to, body }) {
  return post({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body },
  });
}

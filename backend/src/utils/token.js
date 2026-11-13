// Minimal signed token (HMAC-SHA256), JWT-style but dependency-free.
// Format: base64url(payload).base64url(signature). Payload = { sub, exp }.
import crypto from 'node:crypto';

const b64 = (buf) => Buffer.from(buf).toString('base64url');

function sign(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

export function createToken(sub, secret, ttlSeconds) {
  const payload = b64(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${payload}.${sign(payload, secret)}`;
}

/** @returns {{ sub: string } | null} null when invalid, tampered or expired */
export function verifyToken(token, secret) {
  if (typeof token !== 'string') return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: data.sub };
  } catch {
    return null;
  }
}

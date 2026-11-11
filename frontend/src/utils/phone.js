// Mirror of backend/src/utils/phone.js - keep both in sync.
const DEFAULT_CC = (import.meta.env.VITE_DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, '');

/** @returns {{ ok: true, phone: string } | { ok: false, error: string }} */
export function normalizePhone(raw, defaultCountryCode = DEFAULT_CC) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { ok: false, error: 'Phone number is required' };
  }
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'Phone number must contain digits' };
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 10) digits = `${defaultCountryCode}${digits}`;
  if (digits.length < 11 || digits.length > 15) {
    return {
      ok: false,
      error: 'Invalid phone number: enter a 10-digit number or full number with country code (11-15 digits)',
    };
  }
  if (digits.startsWith('0')) return { ok: false, error: 'Invalid phone number: country code cannot start with 0' };
  return { ok: true, phone: digits };
}

/** Replace {{name}} / {{phone}} for preview purposes (backend does the real substitution). */
export function resolvePlaceholders(text, contact) {
  if (!contact) return text;
  return text
    .replace(/\{\{\s*name\s*\}\}/gi, () => contact.name)
    .replace(/\{\{\s*phone\s*\}\}/gi, () => contact.phone);
}

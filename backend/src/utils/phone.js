// Phone normalization. Mirrored in frontend/src/utils/phone.js - keep both in sync.
// Output format: E.164 digits only (no "+", spaces, dashes), e.g. 916302746267.

/**
 * @param {string} raw
 * @param {string} defaultCountryCode digits only, e.g. "91"
 * @returns {{ ok: true, phone: string } | { ok: false, error: string }}
 */
export function normalizePhone(raw, defaultCountryCode = '91') {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { ok: false, error: 'Phone number is required' };
  }
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) {
    return { ok: false, error: 'Phone number must contain digits' };
  }
  // Strip international "00" prefix (e.g. 0091...)
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Plain 10-digit national number -> prefix default country code
  if (digits.length === 10) digits = `${defaultCountryCode}${digits}`;
  // E.164 allows max 15 digits; anything below 11 here lacks a country code.
  if (digits.length < 11 || digits.length > 15) {
    return {
      ok: false,
      error: 'Invalid phone number: enter a 10-digit number or full number with country code (11-15 digits)',
    };
  }
  if (digits.startsWith('0')) {
    return { ok: false, error: 'Invalid phone number: country code cannot start with 0' };
  }
  return { ok: true, phone: digits };
}

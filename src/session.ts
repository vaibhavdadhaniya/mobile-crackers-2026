// Pure session helpers (unit tested).

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Minimal base64 -> latin1 string decoder (no atob/Buffer dependency).
function decodeBase64(s: string): string {
  let out = '';
  let bits = 0;
  let value = 0;
  for (const ch of s) {
    if (ch === '=') break;
    const idx = B64.indexOf(ch);
    if (idx < 0) throw new Error('bad base64');
    value = ((value << 6) | idx) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((value >> bits) & 0xff);
    }
  }
  return out;
}

// Expiry (ms since epoch) from a JWT's payload, or null if it can't be read.
export function jwtExpiry(token: string | null | undefined): number | null {
  if (!token) return null;
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const json = decodeBase64(b64);
    const exp = JSON.parse(json).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

// Refresh a little before the access token runs out.
export const REFRESH_MARGIN_MS = 10 * 60 * 1000;
export function needsRefresh(token: string | null | undefined, now = Date.now(), margin = REFRESH_MARGIN_MS): boolean {
  const exp = jwtExpiry(token);
  return exp != null && exp - now < margin;
}

// What to do with a 401 from the API.
export type AuthFailure = 'refresh' | 'end';
export function on401(code: string | undefined): AuthFailure {
  return code === 'ACCOUNT_DISABLED' ? 'end' : 'refresh';
}

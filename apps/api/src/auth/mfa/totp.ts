import { createHmac, randomBytes } from 'crypto';

/**
 * Self-contained TOTP (RFC 6238 over HOTP RFC 4226, HMAC-SHA1, 6 digits, 30s).
 * Implemented on Node's crypto so no third-party OTP dependency is required.
 */

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x1_0000_0000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const digest = createHmac('sha1', secret).update(buf).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

export function generateTotp(secretB32: string, time = Date.now(), period = 30): string {
  return hotp(base32Decode(secretB32), Math.floor(time / 1000 / period));
}

/** Verifies a token, tolerating ±`window` steps of clock drift. */
export function verifyTotp(
  secretB32: string,
  token: string,
  window = 1,
  time = Date.now(),
  period = 30,
): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const secret = base32Decode(secretB32);
  const counter = Math.floor(time / 1000 / period);
  for (let error = -window; error <= window; error++) {
    if (hotp(secret, counter + error) === token) return true;
  }
  return false;
}

export function randomBase32Secret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

/** Builds the otpauth:// URI that authenticator apps scan as a QR code. */
export function otpauthUrl(email: string, secretB32: string, issuer = 'PrivacyPresenceManager'): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret: secretB32,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

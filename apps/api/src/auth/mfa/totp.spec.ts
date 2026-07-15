import {
  base32Encode,
  base32Decode,
  generateTotp,
  verifyTotp,
  randomBase32Secret,
} from './totp';

describe('totp', () => {
  it('base32 round-trips', () => {
    const buf = Buffer.from('hello world');
    expect(base32Decode(base32Encode(buf)).toString()).toBe('hello world');
  });

  it('matches the RFC 6238 SHA-1 test vector at T=59s', () => {
    // RFC 6238 shared secret "12345678901234567890"; 8-digit code is 94287082,
    // so the 6-digit truncation is 287082.
    const secret = base32Encode(Buffer.from('12345678901234567890'));
    expect(generateTotp(secret, 59 * 1000)).toBe('287082');
  });

  it('verifies a freshly generated code', () => {
    const secret = randomBase32Secret();
    const now = Date.now();
    expect(verifyTotp(secret, generateTotp(secret, now), 1, now)).toBe(true);
  });

  it('tolerates one step of clock drift', () => {
    const secret = randomBase32Secret();
    const now = Date.now();
    const previousStep = generateTotp(secret, now - 30_000);
    expect(verifyTotp(secret, previousStep, 1, now)).toBe(true);
  });

  it('rejects an incorrect or malformed code', () => {
    const secret = randomBase32Secret();
    const now = Date.now();
    const code = generateTotp(secret, now);
    const wrong = code === '000000' ? '000001' : '000000';
    expect(verifyTotp(secret, wrong, 1, now)).toBe(false);
    expect(verifyTotp(secret, 'abcdef', 1, now)).toBe(false);
  });
});

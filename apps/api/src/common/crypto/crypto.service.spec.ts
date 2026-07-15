import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

const key = 'ZGV2LW9ubHktMzItYnl0ZS1rZXktY2hhbmdlbWUhISE='; // 32 bytes base64

function makeService() {
  const config = { get: (k: string) => (k === 'encryptionKey' ? key : undefined) } as ConfigService;
  return new CryptoService(config);
}

describe('CryptoService', () => {
  it('round-trips AES-256-GCM encryption', () => {
    const svc = makeService();
    const plaintext = 'alice@example.com';
    const enc = svc.encrypt(plaintext);
    expect(enc).not.toContain(plaintext);
    expect(enc.split('.')).toHaveLength(3);
    expect(svc.decrypt(enc)).toBe(plaintext);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const svc = makeService();
    expect(svc.encrypt('same')).not.toBe(svc.encrypt('same'));
  });

  it('hashes deterministically and case-insensitively', () => {
    const svc = makeService();
    expect(svc.hash('User@Example.com ')).toBe(svc.hash('user@example.com'));
  });

  it('rejects a wrong-length key', () => {
    const config = { get: () => 'c2hvcnQ=' } as unknown as ConfigService;
    expect(() => new CryptoService(config)).toThrow(/32-byte/);
  });
});

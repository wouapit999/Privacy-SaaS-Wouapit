/**
 * Client-side "Have I Been Pwned" password check using k-anonymity.
 *
 * The password is SHA-1 hashed IN THE BROWSER; only the first 5 hex characters
 * of the hash are sent to api.pwnedpasswords.com/range/{prefix}. HIBP returns
 * every hash suffix sharing that prefix, and we match the remaining 35 chars
 * locally. The password — and its full hash — never leave the device.
 */
export async function checkPasswordPwned(password: string): Promise<number> {
  if (!password) return 0;

  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    // Padding hides the true result count from the network observer.
    headers: { 'Add-Padding': 'true' },
  });
  if (!res.ok) throw new Error('Breach service is unavailable right now.');

  const text = await res.text();
  for (const line of text.split('\n')) {
    const [suf, count] = line.trim().split(':');
    if (suf === suffix) return Number(count) || 0;
  }
  return 0;
}

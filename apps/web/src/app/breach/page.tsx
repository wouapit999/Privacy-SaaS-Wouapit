'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { checkPasswordPwned } from '@/lib/pwned';
import { Button, Card, Input } from '@/components/ui';

interface Identity {
  id: string;
  type: string;
  displayValue: string;
}
interface Breach {
  name: string;
  domain: string | null;
  date: string | null;
  dataClasses: string[];
}

export default function BreachPage() {
  // ── Password check (client-side, keyless) ──
  const [pw, setPw] = useState('');
  const [pwResult, setPwResult] = useState<number | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  async function checkPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwResult(null);
    setPwBusy(true);
    try {
      setPwResult(await checkPasswordPwned(pw));
    } catch (err) {
      setPwError((err as Error).message);
    } finally {
      setPwBusy(false);
    }
  }

  // ── Email breach check (server-side, key-gated) ──
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [emails, setEmails] = useState<Identity[]>([]);
  const [selected, setSelected] = useState('');
  const [breaches, setBreaches] = useState<Breach[] | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    api.breachStatus().then((s) => setConfigured(s.emailCheckConfigured)).catch(() => setConfigured(false));
    api
      .listIdentities()
      .then((list) => {
        const mails = (list as Identity[]).filter((i) => i.type === 'EMAIL');
        setEmails(mails);
        if (mails[0]) setSelected(mails[0].id);
      })
      .catch(() => {});
  }, []);

  async function checkEmail() {
    setEmailError(null);
    setBreaches(null);
    setEmailBusy(true);
    try {
      const res = await api.emailBreaches(selected);
      setBreaches(res.breaches);
    } catch (err) {
      setEmailError((err as Error).message);
    } finally {
      setEmailBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Breach exposure</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Check whether your passwords or email have appeared in known data breaches.
        </p>
      </div>

      <Card>
        <h2 className="font-semibold">Password check</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Runs entirely in your browser using k-anonymity — your password is hashed locally
          and only the first 5 characters of the hash are sent. Your password never leaves
          this device or touches our server.
        </p>
        <form onSubmit={checkPassword} className="mt-4 flex gap-2">
          <Input
            type="password"
            placeholder="Enter a password to check"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <Button type="submit" disabled={pwBusy || !pw}>
            {pwBusy ? 'Checking…' : 'Check'}
          </Button>
        </form>
        {pwError && <p className="mt-2 text-sm text-red-600">{pwError}</p>}
        {pwResult !== null &&
          (pwResult > 0 ? (
            <p className="mt-3 text-sm text-red-600">
              ⚠️ Found in <strong>{pwResult.toLocaleString()}</strong> breaches. Stop using this
              password and change it anywhere you&apos;ve used it.
            </p>
          ) : (
            <p className="mt-3 text-sm text-green-600">
              ✓ Not found in any known breach. (Still, use a unique password per site.)
            </p>
          ))}
      </Card>

      <Card>
        <h2 className="font-semibold">Email breach check</h2>
        {configured === false && (
          <p className="mt-1 text-sm text-neutral-500">
            Not available — this requires a Have I Been Pwned API key
            (<code>HIBP_API_KEY</code>) on the server.
          </p>
        )}
        {configured && emails.length === 0 && (
          <p className="mt-1 text-sm text-neutral-500">
            Add an email under <a href="/identities" className="text-brand hover:underline">Identities</a> first.
          </p>
        )}
        {configured && emails.length > 0 && (
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
              >
                {emails.map((m) => (
                  <option key={m.id} value={m.id}>{m.displayValue}</option>
                ))}
              </select>
              <Button onClick={checkEmail} disabled={emailBusy || !selected}>
                {emailBusy ? 'Checking…' : 'Check breaches'}
              </Button>
            </div>
            {emailError && <p className="text-sm text-red-600">{emailError}</p>}
            {breaches && breaches.length === 0 && (
              <p className="text-sm text-green-600">✓ No known breaches for this email.</p>
            )}
            {breaches && breaches.length > 0 && (
              <ul className="space-y-2 text-sm">
                {breaches.map((b) => (
                  <li key={b.name} className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                    <div className="font-medium">{b.name}{b.domain ? ` (${b.domain})` : ''}</div>
                    <div className="text-xs text-neutral-500">
                      {b.date ?? 'unknown date'} · exposed: {b.dataClasses.join(', ') || 'unknown'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

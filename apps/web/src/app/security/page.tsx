'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button, Card, Input } from '@/components/ui';

export default function SecurityPage() {
  const [enroll, setEnroll] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function begin() {
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      setEnroll(await api.mfaEnroll());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError(null);
    setBusy(true);
    try {
      await api.mfaConfirm(code);
      setStatus('Two-factor authentication is now enabled. ✅');
      setEnroll(null);
      setCode('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setError(null);
    setBusy(true);
    try {
      await api.mfaDisable(code);
      setStatus('Two-factor authentication disabled.');
      setCode('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Security</h1>

      <Card>
        <h2 className="font-semibold">Two-factor authentication (TOTP)</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Add a second factor with any authenticator app (Google Authenticator, 1Password,
          Authy…). You&apos;ll enter a 6-digit code when signing in.
        </p>

        {!enroll ? (
          <Button className="mt-4" onClick={begin} disabled={busy}>
            {busy ? 'Working…' : 'Set up authenticator'}
          </Button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm">
              Scan this URI in your authenticator app, or enter the secret manually:
            </p>
            <code className="block break-all rounded-md bg-neutral-100 p-3 text-xs dark:bg-neutral-800">
              {enroll.otpauthUrl}
            </code>
            <p className="text-sm">
              Secret: <span className="font-mono">{enroll.secret}</span>
            </p>
            <Input
              inputMode="numeric"
              placeholder="Enter the 6-digit code to confirm"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            <Button onClick={confirm} disabled={busy || code.length !== 6}>
              Confirm &amp; enable
            </Button>
          </div>
        )}

        <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <p className="text-sm text-neutral-500">
            Already enabled? Enter a current code to turn it off:
          </p>
          <div className="mt-2 flex gap-2">
            <Input
              inputMode="numeric"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            <Button variant="ghost" onClick={disable} disabled={busy || code.length !== 6}>
              Disable
            </Button>
          </div>
        </div>
      </Card>

      {status && <p className="text-sm text-green-600">{status}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

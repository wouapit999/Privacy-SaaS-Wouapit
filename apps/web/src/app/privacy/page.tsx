'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, clearToken } from '@/lib/api';
import { Button, Card, Input } from '@/components/ui';

export default function PrivacyPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');

  async function exportData() {
    setError(null);
    setBusy(true);
    try {
      const bundle = await api.exportData();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ppm-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setError(null);
    setBusy(true);
    try {
      await api.deleteAccount({
        password: password || undefined,
        confirm: confirmText || undefined,
      });
      clearToken();
      router.push('/?deleted=1');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Privacy &amp; your data</h1>

      <Card>
        <h2 className="font-semibold">Export your data</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Download everything we hold about you (GDPR Art. 15 / CCPA) as a JSON file.
        </p>
        <Button className="mt-4" onClick={exportData} disabled={busy}>
          {busy ? 'Preparing…' : 'Download my data'}
        </Button>
      </Card>

      <Card>
        <h2 className="font-semibold text-red-600">Delete your account</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Permanently erases your account and all associated data (GDPR Art. 17). This
          cannot be undone.
        </p>
        {!confirming ? (
          <Button variant="ghost" className="mt-4" onClick={() => setConfirming(true)}>
            Delete my account…
          </Button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm">
              Confirm with your password, or type <code>DELETE</code> if you signed up with
              Google/Microsoft.
            </p>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              placeholder='Type "DELETE"'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                className="bg-red-600"
                onClick={deleteAccount}
                disabled={busy || (!password && confirmText !== 'DELETE')}
              >
                {busy ? 'Deleting…' : 'Permanently delete'}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

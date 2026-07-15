'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button, Card, Input } from '@/components/ui';

interface Identity {
  id: string;
  type: string;
  displayValue: string;
  verifiedAt: string | null;
}

export default function IdentitiesPage() {
  const [items, setItems] = useState<Identity[]>([]);
  const [type, setType] = useState('DOMAIN');
  const [value, setValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await api.listIdentities());
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Surface the outcome of an OAuth identity-verification round-trip.
    const verified = new URLSearchParams(window.location.search).get('verified');
    if (verified === 'true') setMessage('Identity verified via your connected account. ✅');
    else if (verified === 'false')
      setError('That account did not match the identity, so it was not verified.');
  }, [refresh]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.addIdentity(type, value);
      setValue('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function startVerify(id: string) {
    setMessage(null);
    try {
      const res: any = await api.startVerify(id);
      setMessage(
        res.instructions
          ? `Add DNS TXT record → host: ${res.instructions.host}, value: ${res.instructions.value}. Then click Confirm.`
          : res.message,
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function confirmVerify(id: string) {
    setError(null);
    const token = window.prompt('Enter the token from your email (leave blank for DNS check):') ?? undefined;
    try {
      await api.confirmVerify(id, token || undefined);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function verifyViaGoogle(id: string) {
    setError(null);
    try {
      const { url } = await api.linkOAuthIdentity('google', id);
      window.location.href = url; // full-page redirect into the OAuth flow
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function scan(id: string) {
    setMessage(null);
    try {
      const { scanId } = await api.startScan(id);
      setMessage(`Scan started (${scanId}). Open the Dashboard shortly to see results.`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Your identities</h1>

      <Card>
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-neutral-500">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
            >
              <option>DOMAIN</option>
              <option>EMAIL</option>
              <option>USERNAME</option>
              <option>SOCIAL_HANDLE</option>
              <option>NAME</option>
            </select>
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-neutral-500">Value</span>
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="example.com" required />
          </label>
          <Button type="submit">Add identity</Button>
        </form>
      </Card>

      {message && <p className="rounded-md bg-brand/10 p-3 text-sm">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        {items.map((it) => (
          <Card key={it.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium">{it.displayValue}</div>
                <div className="text-xs text-neutral-500">
                  {it.type} · {it.verifiedAt ? '✅ verified' : '⏳ unverified'}
                </div>
              </div>
              <div className="flex gap-2">
                {!it.verifiedAt && (
                  <>
                    <Button variant="ghost" onClick={() => startVerify(it.id)}>Verify</Button>
                    <Button variant="ghost" onClick={() => confirmVerify(it.id)}>Confirm</Button>
                    {(it.type === 'EMAIL' || it.type === 'NAME') && (
                      <Button variant="ghost" onClick={() => verifyViaGoogle(it.id)}>
                        Verify via Google
                      </Button>
                    )}
                  </>
                )}
                {it.verifiedAt && <Button onClick={() => scan(it.id)}>Run scan</Button>}
              </div>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-neutral-500">No identities yet. Add one above to begin.</p>
        )}
      </div>
    </div>
  );
}

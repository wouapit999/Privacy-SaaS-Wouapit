'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

interface Broker {
  id: string;
  name: string;
  domain: string;
  optOutUrl: string;
  method: 'EMAIL' | 'FORM';
  jurisdiction: 'CCPA' | 'GDPR';
  notes?: string;
}

interface OptOut {
  broker: { name: string };
  kind: string;
  method: 'EMAIL' | 'FORM';
  sendTo: string | null;
  body: string;
  guidance: string;
}

export default function BrokersPage() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<OptOut | null>(null);

  useEffect(() => {
    api.brokers().then(setBrokers).catch((e) => setError((e as Error).message));
  }, []);

  async function generate(id: string) {
    setError(null);
    setBusy(id);
    setResult(null);
    try {
      setResult(await api.brokerOptOut(id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function copy() {
    if (result) navigator.clipboard?.writeText(result.body);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data brokers</h1>
        <p className="mt-1 text-sm text-neutral-500">
          People-search sites and data brokers that may list your personal information.
          Generate a CCPA/GDPR opt-out request for any of them — then send it yourself.
          We never contact a broker on your behalf.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {brokers.map((b) => (
          <Card key={b.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-neutral-500">{b.domain}</div>
                <span className="mt-2 inline-block rounded bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">
                  {b.jurisdiction} · {b.method === 'EMAIL' ? 'email' : 'web form'}
                </span>
              </div>
              <Button onClick={() => generate(b.id)} disabled={busy === b.id}>
                {busy === b.id ? '…' : 'Opt out'}
              </Button>
            </div>
            {b.notes && <p className="mt-2 text-xs text-neutral-500">{b.notes}</p>}
          </Card>
        ))}
      </div>

      {result && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              {result.kind} request for {result.broker.name}
            </h2>
            <Button variant="ghost" onClick={copy}>Copy</Button>
          </div>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{result.guidance}</p>
          {result.sendTo && (
            <p className="mt-2 text-sm">
              Send to:{' '}
              <a href={result.method === 'EMAIL' ? `mailto:${result.sendTo}` : result.sendTo}
                 target="_blank" rel="noreferrer" className="text-brand hover:underline">
                {result.sendTo}
              </a>
            </p>
          )}
          <pre className="mt-3 whitespace-pre-wrap rounded-md bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
            {result.body}
          </pre>
        </Card>
      )}
    </div>
  );
}

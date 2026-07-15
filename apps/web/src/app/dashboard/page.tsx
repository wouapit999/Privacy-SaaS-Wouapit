'use client';

import { useEffect, useState } from 'react';
import type { DashboardDTO } from '@/lib/shared-types';
import { api } from '@/lib/api';
import { Button, Card, Input, Stat } from '@/components/ui';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('What information about me is public?');
  const [answer, setAnswer] = useState<string | null>(null);

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError((e as Error).message));
  }, []);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setAnswer('Thinking…');
    try {
      const res = await api.askCopilot(question);
      setAnswer(res.answer);
    } catch (err) {
      setAnswer((err as Error).message);
    }
  }

  if (error) return <p className="text-sm text-red-600">Not signed in? {error}</p>;
  if (!data) return <p className="text-sm text-neutral-500">Loading dashboard…</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Privacy dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Exposure score" value={`${data.exposureScore}/100`} tone="warn" />
        <Stat label="Risk score" value={`${data.riskScore}/100`} tone={data.riskScore > 60 ? 'danger' : 'neutral'} />
        <Stat label="Public profiles" value={data.counts.profiles} />
        <Stat label="Public posts" value={data.counts.posts} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Public emails" value={data.counts.publicEmails} tone={data.counts.publicEmails ? 'danger' : 'neutral'} />
        <Stat label="Public phones" value={data.counts.publicPhones} tone={data.counts.publicPhones ? 'danger' : 'neutral'} />
        <Stat label="Public addresses" value={data.counts.publicAddresses} tone={data.counts.publicAddresses ? 'danger' : 'neutral'} />
      </div>

      <Card>
        <h2 className="font-semibold">Highest-risk findings</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {data.topRisks.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3">
              <a href={r.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                {r.title ?? r.url}
              </a>
              <span className="text-xs text-neutral-500">{r.source} · {Math.round(r.confidence * 100)}%</span>
            </li>
          ))}
          {data.topRisks.length === 0 && <li className="text-neutral-500">No findings yet — run a scan.</li>}
        </ul>
      </Card>

      <Card>
        <h2 className="font-semibold">AI copilot</h2>
        <form onSubmit={ask} className="mt-3 flex gap-2">
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
          <Button type="submit">Ask</Button>
        </form>
        {answer && <pre className="mt-3 whitespace-pre-wrap rounded-md bg-neutral-100 p-3 text-sm dark:bg-neutral-800">{answer}</pre>}
      </Card>
    </div>
  );
}

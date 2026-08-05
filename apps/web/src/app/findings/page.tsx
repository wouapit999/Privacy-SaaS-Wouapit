'use client';

import { useEffect, useState } from 'react';
import type { FindingDTO, Severity } from '@/lib/shared-types';
import { api } from '@/lib/api';
import { Button, Card } from '@/components/ui';

const SEVERITY: Record<Severity, { label: string; cls: string }> = {
  critical: { label: 'Critical', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  high: { label: 'High', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
  medium: { label: 'Medium', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-500' },
  low: { label: 'Low', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
};

const REMOVAL_KINDS = [
  { value: 'GDPR', label: 'GDPR erasure' },
  { value: 'CCPA', label: 'CCPA deletion' },
  { value: 'PROFILE_REMOVAL', label: 'Profile removal' },
  { value: 'PRIVACY_SETTINGS', label: 'Privacy settings guide' },
];

function ActionKit({ finding, onRemoved }: { finding: FindingDTO; onRemoved: (id: string) => void }) {
  const [kind, setKind] = useState('GDPR');
  const [request, setRequest] = useState<{ body: string; guidance: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.createRemoval(finding.id, kind);
      setRequest({ body: r.body, guidance: r.guidance });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function markRemoved() {
    setBusy(true);
    try {
      await api.markFindingRemoved(finding.id);
      onRemoved(finding.id);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const pii = [finding.hasEmail && 'email', finding.hasPhone && 'phone', finding.hasAddress && 'address']
    .filter(Boolean)
    .join(', ');

  return (
    <div className="mt-3 space-y-3 border-t border-neutral-200 pt-3 text-sm dark:border-neutral-800">
      {finding.evidence ? (
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Evidence</div>
          <p className="mt-1 rounded bg-neutral-100 p-2 text-xs dark:bg-neutral-800">{finding.evidence}</p>
        </div>
      ) : (
        <p className="text-xs text-neutral-500">
          Not yet confirmed — we couldn’t verify your identifier in this page’s content.
        </p>
      )}
      {pii && <p className="text-xs text-neutral-500">Exposed data: {pii}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <a href={finding.url} target="_blank" rel="noreferrer">
          <Button variant="ghost">Open page</Button>
        </a>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-md border border-neutral-300 bg-transparent px-2 py-2 text-sm dark:border-neutral-700"
        >
          {REMOVAL_KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
        <Button onClick={generate} disabled={busy}>Generate request</Button>
        <Button variant="ghost" onClick={markRemoved} disabled={busy}>Mark removed</Button>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {request && (
        <div>
          <p className="text-xs text-neutral-500">{request.guidance}</p>
          <pre className="mt-2 whitespace-pre-wrap rounded-md bg-neutral-100 p-3 text-xs dark:bg-neutral-800">
            {request.body}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function FindingsPage() {
  const [findings, setFindings] = useState<FindingDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api.findings().then(setFindings).catch((e) => setError((e as Error).message));
  }, []);

  const onRemoved = (id: string) => setFindings((f) => f.filter((x) => x.id !== id));

  const confirmed = findings.filter((f) => f.verified);
  const review = findings.filter((f) => !f.verified);

  const section = (title: string, list: FindingDTO[], hint: string) => (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-neutral-500">{title} ({list.length})</h2>
      {list.length === 0 && <p className="text-sm text-neutral-500">{hint}</p>}
      {list.map((f) => (
        <Card key={f.id}>
          <button
            className="flex w-full items-start justify-between gap-3 text-left"
            onClick={() => setOpen(open === f.id ? null : f.id)}
          >
            <div>
              <div className="font-medium">{f.title ?? f.url}</div>
              <div className="text-xs text-neutral-500">{f.source} · {Math.round(f.confidence * 100)}% match</div>
            </div>
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${SEVERITY[f.severity].cls}`}>
              {SEVERITY[f.severity].label}
            </span>
          </button>
          {open === f.id && <ActionKit finding={f} onRemoved={onRemoved} />}
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Findings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Review each finding, see the evidence, and generate a removal request to send yourself —
          or mark it removed once you’ve handled it.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {section('Confirmed', confirmed, 'No confirmed findings yet — run a scan from Identities.')}
      {section('Needs review', review, 'Nothing pending review.')}
    </div>
  );
}

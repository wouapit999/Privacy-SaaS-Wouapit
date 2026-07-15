'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui';

function ConfirmInner() {
  const params = useSearchParams();
  const token = params.get('token');
  return (
    <Card>
      <h1 className="text-xl font-semibold">Email verification</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {token
          ? 'Copy the token below and paste it into the "Confirm" prompt on the Identities page.'
          : 'No token found in the link.'}
      </p>
      {token && (
        <code className="mt-4 block break-all rounded-md bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
          {token}
        </code>
      )}
    </Card>
  );
}

export default function ConfirmPage() {
  return (
    <div className="mx-auto max-w-md">
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
        <ConfirmInner />
      </Suspense>
    </div>
  );
}

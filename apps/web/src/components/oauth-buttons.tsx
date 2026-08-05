'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { api, oauthStartUrl } from '@/lib/api';

/**
 * Renders "Continue with …" buttons ONLY for providers the API reports as
 * configured, so we never show a button that would dead-end on an OAuth error.
 * When real Google/Microsoft credentials are set on the API, the matching
 * button appears automatically. If nothing is configured, this renders nothing
 * (including the divider), leaving a clean email/password form.
 *
 * These are plain links because OAuth begins with a full-page browser redirect.
 */
export function OAuthButtons() {
  const [providers, setProviders] = useState<{ google: boolean; microsoft: boolean } | null>(null);

  useEffect(() => {
    api
      .oauthProviders()
      .then(setProviders)
      .catch(() => setProviders({ google: false, microsoft: false }));
  }, []);

  // Nothing to show while loading, or when no provider is configured.
  if (!providers || (!providers.google && !providers.microsoft)) return null;

  return (
    <>
      <div className="mt-6 flex items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" /> or
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div className="mt-4 space-y-2">
        {providers.google && (
          <a href={oauthStartUrl('google')} className="block">
            <Button variant="ghost" className="w-full">Continue with Google</Button>
          </a>
        )}
        {providers.microsoft && (
          <a href={oauthStartUrl('microsoft')} className="block">
            <Button variant="ghost" className="w-full">Continue with Microsoft</Button>
          </a>
        )}
      </div>
    </>
  );
}

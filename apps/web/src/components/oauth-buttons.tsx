'use client';

import { Button } from '@/components/ui';
import { oauthStartUrl } from '@/lib/api';

/**
 * These are plain links (not fetch) because OAuth begins with a full-page
 * browser redirect to the provider. If a provider is not configured on the API,
 * the start endpoint returns a 400 that the callback surfaces on /login.
 */
export function OAuthButtons() {
  return (
    <div className="mt-4 space-y-2">
      <a href={oauthStartUrl('google')} className="block">
        <Button variant="ghost" className="w-full">Continue with Google</Button>
      </a>
      <a href={oauthStartUrl('microsoft')} className="block">
        <Button variant="ghost" className="w-full">Continue with Microsoft</Button>
      </a>
    </div>
  );
}

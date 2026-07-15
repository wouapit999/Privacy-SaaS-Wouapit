'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveToken } from '@/lib/api';
import { Card } from '@/components/ui';

/**
 * The API redirects here after OAuth with tokens in the URL *fragment*
 * (#accessToken=...&refreshToken=...). Fragments are never sent to servers, so
 * the tokens don't land in access logs. We read them client-side and store the
 * access token, then continue to the dashboard.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const accessToken = params.get('accessToken');
    if (!accessToken) {
      setError('No token returned from the provider.');
      return;
    }
    saveToken(accessToken);
    // Clear the fragment so tokens don't linger in the address bar / history.
    window.history.replaceState(null, '', '/oauth/callback');

    // If this was an identity-verification connect, return to the identities
    // page with the outcome; otherwise go to the dashboard.
    const identityVerified = params.get('identityVerified');
    if (identityVerified !== null) {
      router.replace(`/identities?verified=${identityVerified}`);
    } else {
      router.replace('/dashboard');
    }
  }, [router]);

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-xl font-semibold">Signing you in…</h1>
        {error ? (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">Completing OAuth sign-in.</p>
        )}
      </Card>
    </div>
  );
}

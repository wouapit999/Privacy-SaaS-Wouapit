'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, saveToken, isMfaChallenge } from '@/lib/api';
import { Button, Card, Input } from '@/components/ui';
import { OAuthButtons } from '@/components/oauth-buttons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (isMfaChallenge(res)) {
        setMfaToken(res.mfaToken); // password ok — now ask for the 6-digit code
      } else {
        saveToken(res.accessToken);
        router.push('/dashboard');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaToken) return;
    setError(null);
    setLoading(true);
    try {
      const { accessToken } = await api.mfaLogin(mfaToken, code);
      saveToken(accessToken);
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (mfaToken) {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <h1 className="text-xl font-semibold">Two-factor authentication</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Enter the 6-digit code from your authenticator app.
          </p>
          <form onSubmit={onSubmitMfa} className="mt-6 space-y-3">
            <Input
              inputMode="numeric"
              placeholder="123456"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading || code.length !== 6} className="w-full">
              {loading ? 'Verifying…' : 'Verify'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <Input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <OAuthButtons />
        <p className="mt-4 text-sm text-neutral-500">
          No account? <Link href="/register" className="text-brand hover:underline">Register</Link>
        </p>
      </Card>
    </div>
  );
}

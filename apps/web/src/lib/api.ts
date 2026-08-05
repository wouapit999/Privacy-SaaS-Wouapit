'use client';

import type { AuthTokens, DashboardDTO } from './shared-types';

export type LoginResult = AuthTokens | { mfaRequired: true; mfaToken: string };
export const isMfaChallenge = (r: LoginResult): r is { mfaRequired: true; mfaToken: string } =>
  'mfaRequired' in r;

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'ppm.accessToken';

/** Browser-navigable URL that begins the OAuth flow for a provider. */
export const oauthStartUrl = (provider: 'google' | 'microsoft') =>
  `${BASE}/auth/oauth/${provider}`;

export function saveToken(t: string) {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, t);
}
export function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
}
export function clearToken() {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (email: string, password: string, name?: string) =>
    request<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  oauthProviders: () =>
    request<{ google: boolean; microsoft: boolean }>('/auth/oauth/providers'),
  login: (email: string, password: string) =>
    request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  mfaLogin: (mfaToken: string, token: string) =>
    request<AuthTokens>('/auth/mfa/login', {
      method: 'POST',
      body: JSON.stringify({ mfaToken, token }),
    }),
  mfaEnroll: () =>
    request<{ secret: string; otpauthUrl: string }>('/auth/mfa/enroll', { method: 'POST' }),
  mfaConfirm: (token: string) =>
    request<{ enabled: boolean }>('/auth/mfa/confirm', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  mfaDisable: (token: string) =>
    request<{ enabled: boolean }>('/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  listIdentities: () => request<any[]>('/identity'),
  addIdentity: (type: string, value: string) =>
    request('/identity', { method: 'POST', body: JSON.stringify({ type, value }) }),
  startVerify: (id: string) => request(`/identity/${id}/verify/start`, { method: 'POST' }),
  linkOAuthIdentity: (provider: 'google' | 'microsoft', identityId: string) =>
    request<{ url: string }>(`/auth/oauth/${provider}/link`, {
      method: 'POST',
      body: JSON.stringify({ identityId }),
    }),
  confirmVerify: (id: string, token?: string) =>
    request(`/identity/${id}/verify/confirm`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  startScan: (identityId: string) =>
    request<{ scanId: string; status: string }>('/scan/start', {
      method: 'POST',
      body: JSON.stringify({ identityId }),
    }),
  scanResults: (scanId: string) => request<any>(`/scan/results?scanId=${scanId}`),
  dashboard: () => request<DashboardDTO>('/dashboard'),
  askCopilot: (question: string) =>
    request<{ answer: string; citations: string[] }>('/copilot/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
  findings: () => request<import('./shared-types').FindingDTO[]>('/findings'),
  markFindingRemoved: (id: string) =>
    request<{ removed: boolean }>(`/findings/${id}/removed`, { method: 'POST' }),
  createRemoval: (discoveredProfileId: string, kind: string) =>
    request<{ id: string; kind: string; status: string; body: string; guidance: string }>(
      '/removal/create',
      { method: 'POST', body: JSON.stringify({ discoveredProfileId, kind }) },
    ),
  breachStatus: () => request<{ emailCheckConfigured: boolean }>('/breach/status'),
  emailBreaches: (identityId: string) =>
    request<{
      identity: string;
      breaches: { name: string; domain: string | null; date: string | null; dataClasses: string[] }[];
    }>('/breach/email', { method: 'POST', body: JSON.stringify({ identityId }) }),
  brokers: () =>
    request<
      {
        id: string;
        name: string;
        domain: string;
        optOutUrl: string;
        method: 'EMAIL' | 'FORM';
        jurisdiction: 'CCPA' | 'GDPR';
        notes?: string;
      }[]
    >('/brokers'),
  brokerOptOut: (id: string) =>
    request<{
      id: string;
      broker: { id: string; name: string; domain: string };
      kind: string;
      method: 'EMAIL' | 'FORM';
      sendTo: string | null;
      body: string;
      guidance: string;
    }>(`/brokers/${id}/opt-out`, { method: 'POST' }),
  exportData: () => request<Record<string, unknown>>('/account/export'),
  deleteAccount: (opts: { password?: string; confirm?: string }) =>
    request<{ deleted: boolean }>('/account/delete', {
      method: 'POST',
      body: JSON.stringify(opts),
    }),
};

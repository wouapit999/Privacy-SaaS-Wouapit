export interface OAuthProfile {
  providerUserId: string;
  email: string | null;
  name: string | null;
}

export interface OAuthProviderDef {
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  mapProfile: (raw: any) => OAuthProfile;
}

/**
 * Standards-based OpenID Connect provider definitions. We use the authorization
 * code flow and read only openid/email/profile — no broad data-access scopes.
 */
export const OAUTH_PROVIDERS: Record<'google' | 'microsoft', OAuthProviderDef> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
    mapProfile: (raw) => ({
      providerUserId: String(raw.sub),
      email: raw.email ?? null,
      name: raw.name ?? null,
    }),
  },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
    scope: 'openid email profile',
    mapProfile: (raw) => ({
      providerUserId: String(raw.sub ?? raw.oid),
      email: raw.email ?? raw.preferred_username ?? null,
      name: raw.name ?? null,
    }),
  },
};

export type OAuthProviderName = keyof typeof OAUTH_PROVIDERS;

export const isOAuthProvider = (v: string): v is OAuthProviderName =>
  v === 'google' || v === 'microsoft';

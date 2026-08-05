// Shared domain types used by both the API and the web app.

export type IdentityType = 'EMAIL' | 'DOMAIN' | 'USERNAME' | 'SOCIAL_HANDLE' | 'NAME';

export type VerificationMethod = 'EMAIL' | 'DNS' | 'OAUTH';

export type ScanStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type DiscoveredKind =
  | 'PROFILE'
  | 'POST'
  | 'COMMENT'
  | 'IMAGE'
  | 'VIDEO'
  | 'ARTICLE'
  | 'CACHED_PAGE';

export type RemovalKind = 'GDPR' | 'CCPA' | 'PROFILE_REMOVAL' | 'PRIVACY_SETTINGS';

export type MonitorFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface DiscoveredResultDTO {
  id: string;
  url: string;
  title: string | null;
  source: string;
  kind: DiscoveredKind;
  confidence: number; // 0..1
  verified?: boolean; // evidence-confirmed the identifier appears at the URL
  discoveredAt: string;
}

export interface DashboardDTO {
  exposureScore: number; // 0..100
  riskScore: number; // 0..100
  counts: {
    profiles: number; // confirmed (evidence-verified) profiles
    unconfirmed: number; // hits pending review (identifier not confirmed in content)
    posts: number;
    publicEmails: number;
    publicPhones: number;
    publicAddresses: number;
  };
  topRisks: DiscoveredResultDTO[];
}

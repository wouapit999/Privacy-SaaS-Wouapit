// Local copy of the DTO shapes the web app consumes from the API. Kept here
// (rather than importing @ppm/shared) so apps/web builds standalone on Vercel
// without needing the pnpm workspace root. Keep in sync with packages/shared.

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type DiscoveredKind =
  | 'PROFILE'
  | 'POST'
  | 'COMMENT'
  | 'IMAGE'
  | 'VIDEO'
  | 'ARTICLE'
  | 'CACHED_PAGE';

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
  verified?: boolean;
  severity?: Severity;
  discoveredAt: string;
}

export interface FindingDTO {
  id: string;
  url: string;
  title: string | null;
  source: string;
  kind: DiscoveredKind;
  confidence: number;
  verified: boolean;
  evidence: string | null;
  severity: Severity;
  hasEmail: boolean;
  hasPhone: boolean;
  hasAddress: boolean;
  discoveredAt: string;
}

export interface DashboardDTO {
  exposureScore: number; // 0..100
  riskScore: number; // 0..100
  counts: {
    profiles: number;
    unconfirmed: number;
    posts: number;
    publicEmails: number;
    publicPhones: number;
    publicAddresses: number;
  };
  severityCounts: Record<Severity, number>;
  topRisks: DiscoveredResultDTO[];
}

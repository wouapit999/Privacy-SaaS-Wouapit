import { DiscoveredKind } from '@ppm/shared';

export interface DiscoveryHit {
  url: string;
  title: string | null;
  source: string;
  kind: DiscoveredKind;
  confidence: number; // 0..1
  // Set by connectors that confirm via an authoritative API. Left undefined for
  // page-based hits, which the EvidenceService verifies by content match.
  verified?: boolean;
  evidence?: string | null;
}

export interface DiscoveryQuery {
  type: 'EMAIL' | 'DOMAIN' | 'USERNAME' | 'SOCIAL_HANDLE' | 'NAME';
  value: string;
}

/**
 * A connector searches ONE public source for the user's own verified identity.
 * Implementations must:
 *  - use only official/public APIs or robots-permitted pages,
 *  - never submit credentials, solve CAPTCHAs, or bypass access controls.
 */
export interface PresenceConnector {
  readonly source: string;
  supports(query: DiscoveryQuery): boolean;
  search(query: DiscoveryQuery): Promise<DiscoveryHit[]>;
}

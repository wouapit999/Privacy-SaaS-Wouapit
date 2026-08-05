import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryHit, DiscoveryQuery } from './connectors/connector.interface';

export interface Evidence {
  verified: boolean;
  evidence?: string | null;
}

/**
 * Evidence-based verification (BLT-Vanish principle): "a live URL is not enough —
 * the content must contain the identifier, or an authoritative API must confirm
 * it." For hits a connector didn't already confirm, we fetch the page (the URL
 * has already passed the robots.txt check in DiscoveryService) and look for the
 * identifier in the text, capturing a short snippet as evidence.
 */
@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);
  private readonly userAgent: string;
  private static readonly MAX_BYTES = 500_000;

  constructor(config: ConfigService) {
    this.userAgent = config.get<string>('discovery.userAgent')!;
  }

  async verify(query: DiscoveryQuery, hit: DiscoveryHit): Promise<Evidence> {
    // A connector using an authoritative API already confirmed the match.
    if (hit.verified) return { verified: true, evidence: hit.evidence ?? null };

    try {
      const res = await fetch(hit.url, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(6000),
        redirect: 'follow',
      });
      if (!res.ok) return { verified: false };

      const contentType = res.headers.get('content-type') ?? '';
      if (!/text|html|json|xml/i.test(contentType)) return { verified: false };

      const text = (await res.text()).slice(0, EvidenceService.MAX_BYTES);
      const match = this.findIdentifier(query, text);
      return match ? { verified: true, evidence: match } : { verified: false };
    } catch (err) {
      this.logger.debug(`Evidence fetch failed for ${hit.url}: ${(err as Error).message}`);
      return { verified: false };
    }
  }

  /** Case-insensitive substring match; names also match with collapsed whitespace. */
  private findIdentifier(query: DiscoveryQuery, rawText: string): string | null {
    const text = rawText.toLowerCase();
    const needle = query.value.trim().toLowerCase();
    if (!needle) return null;

    let idx = text.indexOf(needle);
    if (idx === -1 && query.type === 'NAME') {
      // Names can be split by markup/whitespace; retry against collapsed text.
      const collapsed = text.replace(/\s+/g, ' ');
      const n = needle.replace(/\s+/g, ' ');
      idx = collapsed.indexOf(n);
      if (idx !== -1) return this.snippet(collapsed, idx, n.length);
      return null;
    }
    if (idx === -1) return null;
    return this.snippet(rawText.replace(/\s+/g, ' '), idx, needle.length);
  }

  private snippet(text: string, idx: number, len: number): string {
    const start = Math.max(0, idx - 60);
    const end = Math.min(text.length, idx + len + 60);
    return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
  }
}

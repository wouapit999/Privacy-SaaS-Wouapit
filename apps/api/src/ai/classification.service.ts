import { Injectable, Logger } from '@nestjs/common';
import { DiscoveredKind } from '@ppm/shared';
import { AiProvider } from '../copilot/ai-provider';

export interface ClassifyInput {
  url: string;
  title: string | null;
  source: string;
  excerpt?: string | null;
}

export interface Classification {
  kind: DiscoveredKind;
  tags: string[];
  hasEmail: boolean;
  hasPhone: boolean;
  hasAddress: boolean;
  riskScore: number; // 0..1
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/;
const ADDRESS_RE = /\b\d{1,5}\s+([A-Za-z0-9.]+\s){1,4}(street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd)\b/i;

/**
 * Assigns a content kind, topic tags, and PII flags to a discovered item.
 * Works fully offline via heuristics; when an OpenAI-compatible provider is
 * configured it enriches tags/kind with the model. Also provides identity
 * correlation (username matching) for resolution confidence.
 */
@Injectable()
export class ClassificationService {
  private readonly logger = new Logger(ClassificationService.name);

  constructor(private readonly ai: AiProvider) {}

  async classify(input: ClassifyInput): Promise<Classification> {
    const base = this.heuristic(input);
    const enriched = await this.enrichWithAi(input, base);
    return enriched;
  }

  /**
   * Username correlation / identity resolution: how confident are we this hit is
   * really the same person as `identityValue`? Exact handle in the URL scores
   * high; a looser textual match scores lower.
   */
  correlationConfidence(identityValue: string, input: ClassifyInput): number {
    const needle = identityValue.replace(/^[@u/]+/, '').toLowerCase();
    if (!needle) return 0.3;
    const haystack = `${input.url} ${input.title ?? ''}`.toLowerCase();
    if (new RegExp(`(^|[/@])${escapeRegex(needle)}($|[/?#])`).test(input.url.toLowerCase())) {
      return 0.95; // handle is a path/segment match
    }
    if (haystack.includes(needle)) return 0.6;
    return 0.3;
  }

  private heuristic(input: ClassifyInput): Classification {
    const text = `${input.title ?? ''} ${input.excerpt ?? ''}`;
    const url = input.url.toLowerCase();

    const kind = this.inferKind(url, input.source);
    const hasEmail = EMAIL_RE.test(text);
    const hasPhone = PHONE_RE.test(text);
    const hasAddress = ADDRESS_RE.test(text);

    const tags = [input.source, kind.toLowerCase()];
    if (hasEmail) tags.push('has-email');
    if (hasPhone) tags.push('has-phone');
    if (hasAddress) tags.push('has-address');

    return {
      kind,
      tags: Array.from(new Set(tags)),
      hasEmail,
      hasPhone,
      hasAddress,
      riskScore: this.risk(kind, hasEmail, hasPhone, hasAddress),
    };
  }

  private inferKind(url: string, source: string): DiscoveredKind {
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(url)) return 'IMAGE';
    if (/\.(mp4|mov|webm)(\?|$)/.test(url) || /youtube|vimeo|tiktok/.test(url)) return 'VIDEO';
    if (/\/comments?\//.test(url)) return 'COMMENT';
    if (/\/status\/|\/posts?\/|\/p\//.test(url)) return 'POST';
    if (/\/(wiki|article|blog|news)\//.test(url)) return 'ARTICLE';
    if (source === 'web-search') return 'CACHED_PAGE';
    return 'PROFILE';
  }

  private risk(kind: DiscoveredKind, email: boolean, phone: boolean, address: boolean): number {
    const kindWeight: Record<DiscoveredKind, number> = {
      PROFILE: 0.6,
      ARTICLE: 0.5,
      POST: 0.4,
      COMMENT: 0.3,
      IMAGE: 0.4,
      VIDEO: 0.4,
      CACHED_PAGE: 0.35,
    };
    let score = kindWeight[kind];
    if (email) score += 0.15;
    if (phone) score += 0.25;
    if (address) score += 0.3;
    return Math.min(1, Math.round(score * 100) / 100);
  }

  private async enrichWithAi(
    input: ClassifyInput,
    base: Classification,
  ): Promise<Classification> {
    // The stub provider returns non-JSON guidance; only trust real JSON output.
    try {
      const raw = await this.ai.chat([
        {
          role: 'system',
          content:
            'Classify the web item as JSON: {"kind": one of ' +
            'PROFILE|POST|COMMENT|IMAGE|VIDEO|ARTICLE|CACHED_PAGE, "tags": string[] }. ' +
            'Only output JSON. If unsure, keep it minimal.',
        },
        { role: 'user', content: `title="${input.title ?? ''}" url=${input.url} source=${input.source}` },
      ]);
      const parsed = JSON.parse(raw) as { kind?: DiscoveredKind; tags?: string[] };
      if (parsed.kind) base.kind = parsed.kind;
      if (Array.isArray(parsed.tags)) {
        base.tags = Array.from(new Set([...base.tags, ...parsed.tags.map(String)]));
      }
    } catch {
      // Heuristic result stands (stub mode or non-JSON output).
    }
    return base;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Minimal, dependency-free robots.txt fetch + parse.
 * The discovery engine MUST consult this before requesting any URL. There is no
 * code path that fetches content when the rule set disallows it.
 */
@Injectable()
export class RobotsService {
  private readonly logger = new Logger(RobotsService.name);
  private readonly cache = new Map<string, Rule[]>();
  private readonly userAgent: string;
  private readonly enabled: boolean;

  constructor(config: ConfigService) {
    this.userAgent = config.get<string>('discovery.userAgent')!;
    this.enabled = config.get<boolean>('discovery.respectRobots')!;
  }

  async isAllowed(rawUrl: string): Promise<boolean> {
    if (!this.enabled) {
      // Compliance is a product guarantee; refuse to run with it disabled.
      throw new Error('robots.txt compliance is required and cannot be disabled.');
    }
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return false;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;

    const rules = await this.rulesFor(url.origin);
    return this.evaluate(rules, url.pathname || '/');
  }

  private async rulesFor(origin: string): Promise<Rule[]> {
    if (this.cache.has(origin)) return this.cache.get(origin)!;

    let rules: Rule[] = [];
    try {
      const res = await fetch(`${origin}/robots.txt`, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        rules = this.parse(await res.text());
      }
      // A missing/blocked robots.txt is treated as "allow" per the standard.
    } catch (err) {
      this.logger.warn(`robots.txt fetch failed for ${origin}: ${(err as Error).message}`);
    }
    this.cache.set(origin, rules);
    return rules;
  }

  /** Parses only the groups that apply to our UA or the `*` wildcard. */
  private parse(text: string): Rule[] {
    const lines = text.split('\n').map((l) => l.replace(/#.*$/, '').trim());
    const rules: Rule[] = [];
    let applies = false;

    for (const line of lines) {
      const [rawField, ...rest] = line.split(':');
      if (!rawField || rest.length === 0) continue;
      const field = rawField.toLowerCase();
      const value = rest.join(':').trim();

      if (field === 'user-agent') {
        applies = value === '*' || this.userAgent.toLowerCase().startsWith(value.toLowerCase());
      } else if (applies && (field === 'disallow' || field === 'allow')) {
        rules.push({ allow: field === 'allow', path: value });
      }
    }
    return rules;
  }

  private evaluate(rules: Rule[], path: string): boolean {
    // Longest-match wins; an empty Disallow means "allow all".
    let decision = true;
    let matchLen = -1;
    for (const rule of rules) {
      if (rule.path === '') continue;
      if (path.startsWith(rule.path) && rule.path.length > matchLen) {
        matchLen = rule.path.length;
        decision = rule.allow;
      }
    }
    return decision;
  }
}

interface Rule {
  allow: boolean;
  path: string;
}

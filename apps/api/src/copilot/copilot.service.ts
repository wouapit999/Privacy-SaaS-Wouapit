import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiProvider, ChatMessage } from './ai-provider';

@Injectable()
export class CopilotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiProvider,
  ) {}

  /**
   * RAG over the caller's OWN discovered records. We only ever retrieve rows
   * scoped to the authenticated user — the model never sees anyone else's data.
   */
  async ask(userId: string, question: string) {
    const profiles = await this.prisma.discoveredProfile.findMany({
      where: { identity: { userId }, removedAt: null },
      orderBy: { riskScore: 'desc' },
      take: 40,
      select: {
        url: true,
        title: true,
        source: true,
        kind: true,
        confidence: true,
        hasEmail: true,
        hasPhone: true,
        hasAddress: true,
      },
    });

    const context = profiles
      .map(
        (p, i) =>
          `[${i + 1}] ${p.title ?? '(untitled)'} — ${p.source} — ${p.url} ` +
          `(kind=${p.kind}, confidence=${p.confidence}, ` +
          `pii=${[p.hasEmail && 'email', p.hasPhone && 'phone', p.hasAddress && 'address']
            .filter(Boolean)
            .join(',') || 'none'})`,
      )
      .join('\n');

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You are a privacy copilot. Answer ONLY from the user\'s discovered ' +
          'records below. Never speculate about third parties. Records:\n' +
          (context || '(no records yet — suggest running a scan)'),
      },
      { role: 'user', content: question },
    ];

    const answer = await this.ai.chat(messages);
    return { answer, citations: profiles.slice(0, 5).map((p) => p.url) };
  }
}

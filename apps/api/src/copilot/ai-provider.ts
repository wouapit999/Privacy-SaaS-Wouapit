import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI-compatible provider abstraction.
 * - AI_PROVIDER=stub  → deterministic canned answers (no network, no key needed).
 * - AI_PROVIDER=openai → calls AI_BASE_URL /chat/completions with AI_API_KEY.
 *
 * Swapping providers is a config change only; no code path leaks user data to a
 * provider unless the user has explicitly configured one.
 */
@Injectable()
export class AiProvider {
  private readonly logger = new Logger(AiProvider.name);

  constructor(private readonly config: ConfigService) {}

  async chat(messages: ChatMessage[]): Promise<string> {
    const provider = this.config.get<string>('ai.provider');
    if (provider !== 'openai' || !this.config.get<string>('ai.apiKey')) {
      return this.stubAnswer(messages);
    }

    try {
      const res = await fetch(`${this.config.get('ai.baseUrl')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.get('ai.apiKey')}`,
        },
        body: JSON.stringify({
          model: this.config.get('ai.model'),
          messages,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`provider ${res.status}`);
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      return data.choices[0]?.message?.content ?? '(no answer)';
    } catch (err) {
      this.logger.error(`AI provider call failed: ${(err as Error).message}`);
      return this.stubAnswer(messages);
    }
  }

  private stubAnswer(messages: ChatMessage[]): string {
    const context = messages.find((m) => m.role === 'system')?.content ?? '';
    const question = messages.find((m) => m.role === 'user')?.content ?? '';
    const urlCount = (context.match(/https?:\/\//g) ?? []).length;
    return (
      `(stub copilot — set AI_PROVIDER=openai + AI_API_KEY for real answers)\n\n` +
      `Based on ${urlCount} discovered record(s) tied to your verified identities, ` +
      `here is a summary for: "${question}".\n\n` +
      `Highest-confidence public items appear first in your dashboard. Consider ` +
      `generating a removal request for anything you did not intend to be public.`
    );
  }
}

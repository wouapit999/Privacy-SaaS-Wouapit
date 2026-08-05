export interface RedisConnection {
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls?: Record<string, never>;
  // ioredis address family; 0 lets it use IPv6, required for Railway/Upstash
  // internal hostnames (*.railway.internal) that only resolve over IPv6.
  family?: number;
}

function buildRedis(): { host: string; port: number; connection: RedisConnection } {
  const url = process.env.REDIS_URL;
  let connection: RedisConnection;
  if (url) {
    const u = new URL(url);
    connection = {
      host: u.hostname,
      port: Number(u.port || 6379),
      username: u.username || undefined,
      password: u.password || undefined,
      tls: u.protocol === 'rediss:' ? {} : undefined,
      family: 0, // allow IPv6 for managed Redis internal hostnames
    };
  } else {
    connection = {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    };
  }
  return { host: connection.host, port: connection.port, connection };
}

export const configuration = () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
    accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
    refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 1_209_600),
  },
  encryptionKey:
    process.env.FIELD_ENCRYPTION_KEY ??
    'ZGV2LW9ubHktMzItYnl0ZS1rZXktY2hhbmdlbWUhISE=',
  // Prefer a single REDIS_URL (managed Redis on Railway/Upstash provides one,
  // often with a password and TLS via the rediss:// scheme). Fall back to
  // discrete host/port for local/docker.
  redis: buildRedis(),
  // Have I Been Pwned API key (paid) — enables the email breach check. The
  // password check is client-side/keyless and needs nothing here.
  hibp: { apiKey: process.env.HIBP_API_KEY ?? '' },
  ai: {
    provider: (process.env.AI_PROVIDER ?? 'stub') as 'stub' | 'openai',
    baseUrl: process.env.AI_BASE_URL ?? 'https://api.openai.com/v1',
    apiKey: process.env.AI_API_KEY ?? '',
    model: process.env.AI_MODEL ?? 'gpt-4o-mini',
    embeddingModel: process.env.AI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
  },
  discovery: {
    userAgent:
      process.env.DISCOVERY_USER_AGENT ??
      'PrivacyPresenceManagerBot/0.1 (+https://example.com/bot)',
    // Hard-enforced: robots.txt compliance cannot be turned off via config in prod.
    respectRobots: process.env.DISCOVERY_RESPECT_ROBOTS !== 'false',
    maxPagesPerScan: Number(process.env.DISCOVERY_MAX_PAGES_PER_SCAN ?? 50),
  },
  social: {
    // Connectors self-disable when their credential is blank.
    xBearerToken: process.env.X_BEARER_TOKEN ?? '',
    linkedinClientId: process.env.LINKEDIN_CLIENT_ID ?? '',
    redditClientId: process.env.REDDIT_CLIENT_ID ?? '', // Reddit public JSON needs no key
  },
  mail: {
    provider: (process.env.MAIL_PROVIDER ?? 'stub') as 'stub' | 'smtp' | 'resend',
    from: process.env.MAIL_FROM ?? 'Privacy Presence Manager <noreply@example.com>',
    apiKey: process.env.MAIL_API_KEY ?? '',
  },
  oauth: {
    // Public base URL the provider redirects back to (must match provider config).
    callbackBase: process.env.OAUTH_CALLBACK_BASE ?? 'http://localhost:4000',
    // Where the API sends the browser after a successful OAuth login.
    successRedirect:
      process.env.OAUTH_SUCCESS_REDIRECT ??
      `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}/oauth/callback`,
    // Signs the short-lived CSRF `state` value (falls back to the access secret).
    stateSecret:
      process.env.OAUTH_STATE_SECRET ??
      process.env.JWT_ACCESS_SECRET ??
      'dev-access-secret-change-me',
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID ?? '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? '',
    },
  },
  monitoring: {
    // Registering repeatable schedulers can be disabled (e.g. in tests/CI).
    enabled: process.env.MONITORING_ENABLED !== 'false',
    dailyScanCron: process.env.MONITORING_DAILY_CRON ?? '0 3 * * *',
    weeklyReportCron: process.env.MONITORING_WEEKLY_CRON ?? '0 4 * * 1',
    monthlyReportCron: process.env.MONITORING_MONTHLY_CRON ?? '0 5 1 * *',
  },
});

export type AppConfig = ReturnType<typeof configuration>;

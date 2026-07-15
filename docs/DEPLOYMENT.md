# Deployment runbook

This app has **two deployable pieces** that must run on **different hosts**:

| Piece | What it is | Host | Why |
| --- | --- | --- | --- |
| `apps/web` | Next.js 15 frontend | **Vercel** | Perfect fit for Next.js |
| `apps/api` | NestJS server **+ BullMQ workers** | **Railway** | Long-lived process with Redis/Postgres connections and background workers — Vercel's serverless model can't run it |

> The API process runs the HTTP server **and** the scan/monitoring workers in one
> process, so a single Railway service covers both. No separate worker service needed.

The frontend talks to the backend over HTTP via `NEXT_PUBLIC_API_URL`, so deploy
the **API first**, then point the web app at it.

---

## 0. Prerequisites (one-time, interactive — run these yourself)

These need a browser login, so they can't be automated:

```bash
gh auth login          # authenticate the GitHub CLI
```

Accounts you'll need: GitHub, Vercel, Railway (all have free tiers).

---

## 1. Push to GitHub (private repo)

From the project root:

```bash
gh repo create privacy-presence-manager --private --source=. --remote=origin --push
```

That creates the private repo, adds it as `origin`, and pushes `main`.
(If you prefer to do it by hand: create the repo in the GitHub UI, then
`git remote add origin <url> && git push -u origin main`.)

---

## 2. Deploy the API to Railway

1. **New Project → Deploy from GitHub repo →** pick `privacy-presence-manager`.
2. Railway reads [`railway.json`](../railway.json) and builds `apps/api/Dockerfile`.
3. **Add a database:** New → **PostgreSQL**. It provides `DATABASE_URL`.
4. **Add Redis:** New → **Redis**. It provides `REDIS_URL`.
5. On the **API service → Variables**, set:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | reference the Postgres service's `DATABASE_URL` |
   | `REDIS_URL` | reference the Redis service's `REDIS_URL` |
   | `NODE_ENV` | `production` |
   | `JWT_ACCESS_SECRET` | a long random string |
   | `JWT_REFRESH_SECRET` | a different long random string |
   | `FIELD_ENCRYPTION_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `OAUTH_STATE_SECRET` | another long random string |
   | `WEB_ORIGIN` | your Vercel URL (fill in after step 3) |
   | `OAUTH_CALLBACK_BASE` | this API's public Railway URL |
   | `OAUTH_SUCCESS_REDIRECT` | `<WEB_ORIGIN>/oauth/callback` |

   Optional (leave unset to keep stubs): `AI_PROVIDER`/`AI_API_KEY`,
   `MAIL_PROVIDER`/`MAIL_API_KEY`, `GOOGLE_*`, `MICROSOFT_*`, social connector keys.

6. On the API service → **Settings → Networking → Generate Domain** to get its
   public URL. The container `CMD` runs `prisma migrate deploy` before starting,
   so the schema is created automatically on first boot.
7. Verify: open `https://<api-domain>/health` → `{"status":"ok","db":"up"}`.

> **Secrets generator:** `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

---

## 3. Deploy the web app to Vercel

1. **Add New → Project →** import `privacy-presence-manager`.
2. **Root Directory:** set to **`apps/web`** (important — it's a monorepo).
   Vercel auto-detects Next.js and installs the pnpm workspace from the repo root.
3. **Environment Variables:**

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | your Railway API URL from step 2.6 |

4. Deploy. Note the resulting `https://<project>.vercel.app` URL.

Or via CLI from the repo root:
```bash
cd apps/web
vercel --prod        # first run links/creates the project; set root dir when prompted
```

---

## 4. Close the loop

1. Back in **Railway**, set `WEB_ORIGIN` to the Vercel URL and
   `OAUTH_SUCCESS_REDIRECT` to `<vercel-url>/oauth/callback`; redeploy the API
   (CORS and OAuth redirects depend on these).
2. If you enabled Google/Microsoft OAuth, register the callback URLs
   `<api-domain>/auth/oauth/{google,microsoft}/callback` in each provider console.

---

## CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs lint + Prisma
migrate + unit + e2e + build on every push/PR using ephemeral Postgres/Redis
service containers. Deploys are triggered by Vercel's and Railway's own GitHub
integrations on push to `main`.

## Notes & caveats
- `next.config.mjs` sets `output: 'standalone'` (for the Docker path); Vercel
  ignores it and uses its own build — that's expected.
- Free-tier Railway/Vercel are fine for a demo; for production add managed
  backups, a secrets manager, and review [`SECURITY.md`](SECURITY.md).

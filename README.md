# Privacy Presence Manager

Help users **discover and manage their own public online presence** — safely, with
consent, and only for identities the authenticated user has verified they own.

> ⚖️ **Ethics & scope.** This tool only scans identities a user has *claimed and
> verified*. It performs **no** third-party surveillance or profiling, respects
> `robots.txt` and site Terms of Service, uses only publicly available information
> and approved APIs, and never bypasses authentication, CAPTCHAs, paywalls, or
> access controls. These constraints are enforced in code (see
> `apps/api/src/discovery/robots.service.ts` and the ownership checks in the
> identity module), not just documented here.

---

## What is in this repository

This is a **runnable vertical slice**, not a finished product. The goal is a
coherent foundation that actually starts with `docker compose up`, with one
feature path working end to end:

**Sign up / log in → verify an identity you own → run a consent-gated discovery
scan → see results and an exposure score on the dashboard.**

| Area | Status |
| --- | --- |
| Monorepo + tooling (pnpm workspaces, TS, ESLint) | ✅ implemented |
| Postgres schema (Prisma) for all required tables | ✅ implemented |
| Auth (email/password + JWT) | ✅ implemented |
| MFA (TOTP 2FA: enroll/confirm/disable + second-factor login) | ✅ implemented |
| Google/Microsoft OAuth (OIDC auth-code flow, account linking) | ✅ implemented (needs provider keys) |
| Identity verification (email + DNS TXT ownership proof) | ✅ implemented |
| Discovery engine (robots.txt-respecting, BullMQ worker) | ✅ core / 🟡 connectors stubbed |
| Risk / exposure scoring | ✅ implemented |
| Removal workflow templates (GDPR / CCPA) | ✅ implemented |
| Dashboard (Next.js 15) | ✅ core |
| AI copilot (RAG over discovered records) | 🟡 interface + stub provider |
| AI classification (kind, tags, PII flags, correlation) | ✅ heuristic + optional LLM enrich |
| Social API connectors — GitHub, Reddit | ✅ live (public APIs) |
| Social API connectors — X, LinkedIn | 🟡 env-gated (need token / member OAuth) |
| Scheduled monitoring (daily sweep + new/removed diff) | ✅ implemented |
| Weekly/monthly reports + notifications + email | ✅ core / 🟡 email provider stubbed |
| Data subject rights (GDPR/CCPA export + account erasure) | ✅ implemented |
| Docker Compose, CI, Terraform | ✅ implemented / 🟡 minimal |
| Unit + integration tests | ✅ representative coverage |

🟡 = scaffolded with clear interfaces and `TODO` markers; safe to run without real
API keys.

---

## Architecture

```
privacy-presence-manager/
├─ apps/
│  ├─ api/            NestJS API + BullMQ workers + Prisma
│  └─ web/            Next.js 15 (App Router) + Tailwind + shadcn-style UI
├─ packages/
│  └─ shared/         Shared TypeScript types / DTOs
├─ infra/
│  └─ terraform/      Minimal AWS deployment skeleton
├─ .github/workflows/ CI pipeline
├─ docker-compose.yml Postgres + Redis + API + Web
└─ .env.example
```

Backend: **Node.js · NestJS · PostgreSQL · Redis · BullMQ · Prisma**
Frontend: **Next.js 15 · React · TypeScript · TailwindCSS · shadcn/ui patterns**
Auth: **Auth.js patterns · JWT · Google / Microsoft / email+password**

---

## Quick start

### 1. Prerequisites
- Node.js ≥ 20, pnpm ≥ 9
- Docker + Docker Compose

### 2. Configure environment
```bash
cp .env.example .env
# The defaults work locally out of the box. Add real provider keys only when you
# want live OAuth / LLM / social-API calls.
```

### 3. Run everything with Docker
```bash
docker compose up --build
```
- Web:  http://localhost:3000
- API:  http://localhost:4000  (health: `/health`, docs: `/docs`)
- Postgres: localhost:5432, Redis: localhost:6379

### 4. Or run locally without Docker
```bash
pnpm install
pnpm --filter @ppm/api prisma:migrate
pnpm dev            # runs api + web concurrently
```

### 5. Try the vertical slice
1. Open http://localhost:3000 and register an account.
2. Add an identity you own (email address or a domain).
3. Prove ownership (email link, or add the printed DNS `TXT` record).
4. Start a scan → watch results populate → open the dashboard for your exposure score.

### 6. Try scheduled monitoring (feature #9)
Cron schedulers (daily scan, weekly/monthly reports) register automatically on
API boot. To exercise them without waiting:
```bash
# Run a monitoring sweep over your own verified identities right now:
curl -X POST http://localhost:4000/monitoring/run -H "Authorization: Bearer <accessToken>"
# Preview your weekly report text:
curl -X POST http://localhost:4000/monitoring/report/preview -H "Authorization: Bearer <accessToken>"
# See resulting notifications:
curl http://localhost:4000/notifications -H "Authorization: Bearer <accessToken>"
```
Emails are logged by the stub mail provider (watch the API logs). Set
`MONITORING_ENABLED=false` to skip registering schedulers.

---

## Deploy
Frontend → **Vercel**, backend + workers → **Railway** (Vercel can't run the
long-lived NestJS/BullMQ process). Full step-by-step runbook, including the exact
`gh`/Vercel/Railway commands and every environment variable, is in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Tests
```bash
pnpm --filter @ppm/api test        # unit
pnpm --filter @ppm/api test:e2e    # integration (spins up a test DB)
```

---

## Security posture
See [`docs/SECURITY.md`](docs/SECURITY.md). Highlights: argon2 password hashing,
JWT access/refresh split, RBAC guard, per-user rate limiting, AES-256-GCM
field encryption for sensitive identity data, audit logging on every mutation,
and OWASP-aligned input validation.

## API documentation
OpenAPI/Swagger is served at `/docs` when the API is running. A static copy of
the endpoint contract is in [`docs/API.md`](docs/API.md).

## License
See [`LICENSE`](LICENSE). Use responsibly and lawfully.

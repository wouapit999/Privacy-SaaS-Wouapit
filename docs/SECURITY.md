# Security posture

Privacy Presence Manager handles sensitive personal identity data, so security and
privacy are first-class. This document summarizes controls implemented in the
vertical slice and those planned.

## Ethical scanning guarantees (enforced in code)
- **Ownership-gated.** A scan can only target a `verified_identities` row whose
  `verifiedAt` is set and whose `userId` matches the caller. See
  `apps/api/src/scan/scan.service.ts`.
- **robots.txt honored.** `DiscoveryRobotsService` fetches and parses `robots.txt`
  per origin and refuses disallowed paths. `DISCOVERY_RESPECT_ROBOTS` cannot be
  disabled through the API.
- **No auth/CAPTCHA/paywall bypass.** Connectors use only public endpoints and
  official APIs; there is no code path that submits credentials to third parties.
- **No third-party profiling.** There is no endpoint that accepts an arbitrary
  person to investigate — every query is bound to the caller's verified identities.

## AuthN / AuthZ
- Passwords hashed with **argon2id**.
- Short-lived **JWT access tokens** + rotating **refresh tokens**.
- **RBAC** via `RolesGuard` and `@Roles()` (roles: `USER`, `ADMIN`).
- MFA (TOTP) hooks present in the user model (`mfaSecret`, `mfaEnabled`); enrolment
  flow is scaffolded.

## Data protection
- **Encryption at rest:** sensitive identity values (email/handle) are stored
  encrypted with **AES-256-GCM** (`CryptoService`), plus DB-level encryption in
  the Terraform RDS config.
- **Encryption in transit:** TLS terminated at the load balancer (infra), HSTS in
  the API's Helmet config.
- **Field-level access:** raw values are never returned in list endpoints; only
  redacted/derived values.

## Application hardening (OWASP-aligned)
- `helmet` security headers, strict CORS to `WEB_ORIGIN`.
- Global `ValidationPipe` (whitelist + forbid unknown properties) on all DTOs.
- **Rate limiting** via `@nestjs/throttler` (per-IP) and a per-user BullMQ scan
  quota.
- **Audit logging:** every mutating action writes an `audit_logs` row via the
  `AuditInterceptor`.
- Parameterized queries only (Prisma) — no string-built SQL.

## Data subject rights
- Users can export and delete their own data (GDPR/CCPA); removal templates are
  generated for third-party platforms.

## Known gaps in this slice
- OAuth provider verification and social connectors are stubbed.
- Secrets are read from env for local dev; move to a secrets manager in prod.
- MFA enrolment UI and WebAuthn are not yet built.

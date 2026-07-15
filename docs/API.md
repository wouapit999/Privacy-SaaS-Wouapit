# API contract

Base URL: `http://localhost:4000`. Interactive Swagger UI at `/docs`.
All endpoints except `/auth/*` and `/health` require `Authorization: Bearer <accessToken>`.

## Auth
| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{ email, password, name }` | Creates user, returns tokens |
| POST | `/auth/login` | `{ email, password }` | Returns `{ accessToken, refreshToken }`, or `{ mfaRequired: true, mfaToken }` if 2FA is on |
| POST | `/auth/refresh` | `{ refreshToken }` | Rotates tokens |
| POST | `/auth/mfa/login` | `{ mfaToken, token }` | Complete TOTP second factor → `{ accessToken, refreshToken }` |
| POST | `/auth/mfa/enroll` | — | **Auth** — start TOTP enrolment → `{ secret, otpauthUrl }` |
| POST | `/auth/mfa/confirm` | `{ token }` | **Auth** — verify a code and enable MFA |
| POST | `/auth/mfa/disable` | `{ token }` | **Auth** — verify a code and disable MFA |
| GET  | `/auth/oauth/:provider` | — | Start Google/Microsoft OAuth (302 → provider) |
| POST | `/auth/oauth/:provider/link` | `{ identityId? }` | **Auth** — returns a URL to link a provider; pass `identityId` to verify an EMAIL/NAME identity by matching the provider profile |
| GET  | `/auth/oauth/:provider/callback` | — | OAuth redirect target; 302 → web with tokens in URL fragment |

OAuth uses the OpenID Connect authorization-code flow (scopes: `openid email
profile`). The `state` value is a signed, 10-minute JWT (CSRF protection) and may
carry a `linkUserId` when an authenticated user connects an account. Register the
callback URLs `<OAUTH_CALLBACK_BASE>/auth/oauth/{google,microsoft}/callback` in
each provider console.

## Identity
| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/identity` | `{ type, value }` | Add a claimed identity (email/domain/username/handle) |
| GET  | `/identity` | — | List caller's identities |
| POST | `/identity/:id/verify/start` | — | Begin ownership proof (email link or DNS TXT) |
| POST | `/identity/:id/verify/confirm` | `{ token? }` | Confirm ownership |

EMAIL and NAME identities can alternatively be proven by connecting a matching
Google/Microsoft account — see `POST /auth/oauth/:provider/link` with `identityId`.

## Scans
| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/scan/start` | `{ identityId }` | Enqueue a discovery scan for a **verified** identity |
| GET  | `/scan/results?scanId=` | — | Poll results |

## Insights
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/risk/score` | Exposure + risk score for the caller |
| GET | `/dashboard` | Aggregated dashboard payload |

## Removal & monitoring
| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/removal/create` | `{ discoveredProfileId, kind }` | Generate GDPR/CCPA/removal template |
| POST | `/monitor/create` | `{ query, frequency }` | Create a monitoring rule |
| GET  | `/monitor` | — | List caller's monitoring rules |

## Scheduled monitoring (feature #9)
Repeatable BullMQ jobs run daily scans and weekly/monthly reports. Daily sweeps
diff new discovery hits against stored results and write `new_mention` /
`removed_page` notifications.

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/monitoring/run` | — | Run a sweep over the caller's own verified identities now |
| POST | `/monitoring/report/preview` | — | Return the caller's weekly report text (no email) |
| POST | `/monitoring/trigger` | `{ job }` | **ADMIN** — enqueue a global `daily-scan`/`weekly-report`/`monthly-report` now |

## Notifications
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/notifications` | List caller's notifications (new mentions, removed pages, reports) |
| POST | `/notifications/:id/read` | Mark a notification read |

## Account / data subject rights (GDPR/CCPA)
| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET  | `/account/export` | — | Full JSON export of the caller's data (Art. 15 / CCPA) |
| POST | `/account/delete` | `{ password? , confirm? }` | Erase the caller's account (Art. 17). Password required for local accounts; `confirm: "DELETE"` for OAuth-only accounts |

## Copilot
| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/copilot/ask` | `{ question }` | RAG over the caller's discovered records |

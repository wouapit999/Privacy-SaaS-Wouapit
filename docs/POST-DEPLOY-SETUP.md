# Post-deploy setup

The app is live:
- **Web:** https://privacy-saas-wouapit.vercel.app (Vercel)
- **API:** https://api-production-8cb2d.up.railway.app (Railway)

Two follow-ups need a browser (creating tokens / OAuth credentials) — they can't
be automated from a CLI. Each is a few minutes.

---

## 1. Auto-deploy on push (GitHub Actions)

Both Vercel's and Railway's native "connect GitHub repo" features are blocked
because their GitHub Apps aren't authorized on the private repo (and Vercel has
no GitHub login connection on the account). Instead, `.github/workflows/ci.yml`
now has a **`deploy`** job that deploys via CLI tokens after tests pass — no
GitHub-App authorization needed. It runs on every push to `main` and **skips
gracefully until you add the two secrets below.**

### Create the tokens
- **Railway:** dashboard → your project → **Settings → Tokens** → create a token
  (scope it to the `privacy-saas-wouapit` project). Copy it.
- **Vercel:** https://vercel.com/account/tokens → **Create Token** (scope: your
  team). Copy it.

### Add them as GitHub repo secrets
Run these (each prompts you to paste the value — you enter it, nothing is stored
in the repo):
```bash
gh secret set RAILWAY_TOKEN --repo wouapit999/Privacy-SaaS-Wouapit
gh secret set VERCEL_TOKEN  --repo wouapit999/Privacy-SaaS-Wouapit
```
The Vercel org/project IDs are already baked into the workflow (they aren't
secret). After adding both, the next push to `main` auto-deploys API + web.

> Prefer native integrations instead? You can connect the repo in each dashboard
> — but for **Vercel** you must also set **Root Directory → `apps/web`** (the CLI
> can't set it), and both need their GitHub App authorized on the repo. The
> Actions approach above avoids all of that.

---

## 2. Enable Google Sign-in

The OAuth code is done and the callback URLs are already configured on the API
(`OAUTH_CALLBACK_BASE`, `OAUTH_SUCCESS_REDIRECT`). It only needs Google
credentials.

### Create the credentials
1. https://console.cloud.google.com → create/select a project.
2. **APIs & Services → OAuth consent screen** → External → fill app name +
   support email → scopes `openid`, `email`, `profile` → save.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** →
   **Web application**.
4. **Authorized redirect URI** (exactly):
   ```
   https://api-production-8cb2d.up.railway.app/auth/oauth/google/callback
   ```
   (Optional) Authorized JavaScript origin: `https://privacy-saas-wouapit.vercel.app`
5. Copy the **Client ID** and **Client secret**.

### Set them on Railway
```bash
railway variables --service api \
  --set "GOOGLE_CLIENT_ID=<your-client-id>" \
  --set "GOOGLE_CLIENT_SECRET=<your-client-secret>"
```
(or Railway dashboard → api service → Variables). The API redeploys, and
**"Continue with Google"** on the login page starts working.

Microsoft is identical: set `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`
and register the redirect `.../auth/oauth/microsoft/callback` in Azure.

---

## Other providers (optional)
Same pattern — set the env var on the Railway `api` service and it activates:
- **AI copilot/classification:** `AI_PROVIDER=openai` + `AI_API_KEY=...`
- **Social connectors:** `LINKEDIN_CLIENT_ID/SECRET`, `X_BEARER_TOKEN`, etc.
- **Email (reports/verification):** `MAIL_PROVIDER=resend` + `MAIL_API_KEY=...`

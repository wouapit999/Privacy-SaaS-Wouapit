import { RemovalKind } from '@ppm/shared';

export interface TemplateContext {
  requesterName: string;
  requesterEmail: string;
  targetUrl: string;
  source: string;
}

/** Platform-agnostic legal request templates. Users review before sending. */
export function renderTemplate(kind: RemovalKind, ctx: TemplateContext): string {
  const date = new Date().toISOString().slice(0, 10);
  switch (kind) {
    case 'GDPR':
      return `Subject: GDPR Article 17 — Request for Erasure

Date: ${date}
To: Data Protection Officer, ${ctx.source}
From: ${ctx.requesterName} <${ctx.requesterEmail}>

I am a data subject under the EU General Data Protection Regulation (GDPR). I am
requesting the erasure of personal data relating to me, published at:

  ${ctx.targetUrl}

Under Article 17 (Right to Erasure), please delete this personal data and confirm
completion within one month. If you rely on a lawful basis to retain it, please
specify that basis under Article 6.

You may contact me at the email above to verify my identity.

Sincerely,
${ctx.requesterName}`;

    case 'CCPA':
      return `Subject: CCPA Request to Delete Personal Information

Date: ${date}
To: Privacy Team, ${ctx.source}
From: ${ctx.requesterName} <${ctx.requesterEmail}>

Under the California Consumer Privacy Act (CCPA/CPRA), I request that you delete
any personal information you have collected about me, including the content at:

  ${ctx.targetUrl}

Please confirm deletion and disclose the categories of information deleted within
45 days, as required by Cal. Civ. Code § 1798.105.

Sincerely,
${ctx.requesterName}`;

    case 'PROFILE_REMOVAL':
      return `Subject: Request to Remove My Profile / Content

Date: ${date}
To: Support, ${ctx.source}
From: ${ctx.requesterName} <${ctx.requesterEmail}>

I am the individual referenced at the URL below and I request removal of this
profile/content, which I did not intend to be public:

  ${ctx.targetUrl}

Please remove it and confirm. If you require identity verification, let me know
the accepted method.

Thank you,
${ctx.requesterName}`;

    case 'PRIVACY_SETTINGS':
      return `Privacy hardening guidance for ${ctx.source}

Target: ${ctx.targetUrl}

Recommended steps:
1. Set profile visibility to "private" or "connections only".
2. Disable search-engine indexing of your profile in privacy settings.
3. Remove public email / phone / address fields.
4. Review and revoke third-party app access.
5. Turn off activity broadcasting.

(These are general recommendations; exact labels vary by platform.)`;
    default: {
      // Exhaustiveness guard: if a new RemovalKind is added, this fails to compile.
      const exhaustive: never = kind;
      throw new Error(`Unknown removal kind: ${String(exhaustive)}`);
    }
  }
}

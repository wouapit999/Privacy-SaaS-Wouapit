import Link from 'next/link';
import { Button, Card } from '@/components/ui';

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          See what the internet knows about <span className="text-brand">you</span>.
        </h1>
        <p className="max-w-2xl text-neutral-600 dark:text-neutral-400">
          Privacy Presence Manager helps you discover and manage your <strong>own</strong> public
          online presence. Verify the identities you own, run consent-gated scans, understand your
          exposure, and generate removal requests — all without surveilling anyone else.
        </p>
        <div className="flex gap-3">
          <Link href="/register"><Button>Get started</Button></Link>
          <Link href="/login"><Button variant="ghost">Sign in</Button></Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <h3 className="font-semibold">1. Verify ownership</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Prove each email or domain is yours via email link or DNS record before anything is scanned.
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold">2. Discover</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            We search public sources and approved APIs — honoring robots.txt — for pages tied to you.
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold">3. Take control</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Review your exposure score and generate GDPR / CCPA removal requests you send yourself.
          </p>
        </Card>
      </section>
    </div>
  );
}

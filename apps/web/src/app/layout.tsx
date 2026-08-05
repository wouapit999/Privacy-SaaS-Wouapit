import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Privacy Presence Manager',
  description: 'Discover and manage your own public online presence — consent-first.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold">
              🛡️ Privacy Presence Manager
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/dashboard" className="hover:underline">Dashboard</Link>
              <Link href="/identities" className="hover:underline">Identities</Link>
              <Link href="/brokers" className="hover:underline">Data brokers</Link>
              <Link href="/privacy" className="hover:underline">Privacy</Link>
              <Link href="/security" className="hover:underline">Security</Link>
              <Link href="/login" className="hover:underline">Sign in</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-neutral-500">
          Only scans identities you have verified you own. Respects robots.txt and site terms.
        </footer>
      </body>
    </html>
  );
}

import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Space_Grotesk, IBM_Plex_Sans } from 'next/font/google';
import { getUserAndAdmin } from '@/lib/auth';

const headingFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700']
});

const bodyFont = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700']
});

export const metadata: Metadata = {
  title: 'FilterFit',
  description: 'Find the correct HVAC furnace air filter by size and MERV.'
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { user } = await getUserAndAdmin();

  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        <main>
          <header>
            <div>
              <Link href="/" className="brand">
                FilterFit
              </Link>
              <div className="badge" style={{ marginTop: '8px' }}>
                HVAC filter finder
              </div>
            </div>
            <nav>
              <Link href="/" className="button secondary">
                Search
              </Link>
              <Link href="/admin" className="button ghost">
                Admin
              </Link>
              {user ? (
                <Link href="/logout" className="button">
                  Logout
                </Link>
              ) : (
                <Link href="/login" className="button">
                  Login
                </Link>
              )}
            </nav>
          </header>
          {children}
          <div className="footer">FilterFit MVP · Built with Next.js + Supabase</div>
        </main>
      </body>
    </html>
  );
}

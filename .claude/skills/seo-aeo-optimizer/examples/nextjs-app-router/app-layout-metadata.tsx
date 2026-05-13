/**
 * app/layout.tsx — root metadata example for Next.js 13+ App Router.
 * Copy and adapt this for the target app. Replace placeholders.
 */

import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
const SITE_NAME = '[Brand]';
const TWITTER_HANDLE = '@brandhandle';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — [One-line tagline]`,
    template: `%s | ${SITE_NAME}`,
  },
  description: '[150–160 character description that includes primary keyword + value prop + CTA]',
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  generator: 'Next.js',
  keywords: ['[primary keyword]', '[secondary keyword]', '[brand category]'],
  referrer: 'origin-when-cross-origin',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — [One-line tagline]`,
    description: '[Same as meta description, or expanded slightly]',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — [One-line tagline]`,
    description: '[Same as meta description]',
    images: ['/og-default.png'],
    creator: TWITTER_HANDLE,
    site: TWITTER_HANDLE,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  // For static OG image: place at app/opengraph-image.png (1200×630)
  // For dynamic OG: see app/opengraph-image.tsx with edge runtime ImageResponse
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

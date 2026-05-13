# Next.js Implementation

Stack B Next.js — both App Router (preferred) and Pages Router (legacy).

---

## App Router (Next.js 13+)

### Root metadata

`app/layout.tsx`:

```tsx
import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: '[Brand] — [Tagline]', template: '%s | [Brand]' },
  description: '[150–160 char description]',
  openGraph: {
    type: 'website',
    siteName: '[Brand]',
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', creator: '@brandhandle' },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};
```

### Per-page metadata

Static:

```tsx
// app/pricing/page.tsx
export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Plans for solo producers and casting teams. Start free.',
  alternates: { canonical: '/pricing' },
};
```

Dynamic (e.g., a blog post):

```tsx
// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${params.slug}` },
    openGraph: { images: [{ url: post.coverImage, width: 1200, height: 630 }] },
  };
}
```

### Sitemap

`app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next';
import { getAllPostSlugs } from '@/lib/posts';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,         lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/features`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/pricing`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/blog`,     lastModified: new Date(), changeFrequency: 'daily',   priority: 0.7 },
  ];

  const slugs = await getAllPostSlugs();
  const dynamicRoutes: MetadataRoute.Sitemap = slugs.map((s) => ({
    url: `${SITE_URL}/blog/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...dynamicRoutes];
}
```

### Robots

`app/robots.ts`:

```ts
import type { MetadataRoute } from 'next';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api/private', '/_next', '/preview'] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
```

### JSON-LD reusable component

`components/JsonLd.tsx`:

```tsx
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

Usage:

```tsx
import { JsonLd } from '@/components/JsonLd';

export default function Homepage() {
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: '[Brand]',
        url: process.env.NEXT_PUBLIC_SITE_URL,
        logo: `${process.env.NEXT_PUBLIC_SITE_URL}/logo.png`,
      }} />
      {/* page content */}
    </>
  );
}
```

### Open Graph image (dynamic)

`app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '[Brand]';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG() {
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0a0a0a', color: 'white', alignItems: 'center', justifyContent: 'center', fontSize: 96 }}>
      [Brand]
    </div>,
    size
  );
}
```

### Shared SEO config

`lib/seo.ts`:

```ts
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
export const SITE_NAME = '[Brand]';
export const TWITTER_HANDLE = '@brandhandle';

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function articleSchema(post: { title: string; excerpt: string; publishedAt: string; updatedAt: string; slug: string; coverImage: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
  };
}
```

---

## Pages Router (legacy Next.js, still in production for some apps)

Less ergonomic but everything still possible.

### Per-page Head

```tsx
import Head from 'next/head';

export default function Pricing() {
  return (
    <>
      <Head>
        <title>Pricing | [Brand]</title>
        <meta name="description" content="..." />
        <link rel="canonical" href="https://example.com/pricing" />
      </Head>
      {/* page content */}
    </>
  );
}
```

### Dynamic sitemap via API route

`pages/api/sitemap.xml.ts`:

```ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>${SITE_URL}/pricing</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>
</urlset>`;
  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(xml);
}
```

Plus a rewrite in `next.config.js`:

```js
module.exports = {
  async rewrites() {
    return [{ source: '/sitemap.xml', destination: '/api/sitemap.xml' }];
  },
};
```

### Dynamic robots.txt — same pattern via API route, same rewrite mechanism.

---

## Validation commands

After adding the above:

```bash
npm run build && npm run start
curl -I http://localhost:3000/sitemap.xml   # confirm 200 + Content-Type: application/xml
curl -I http://localhost:3000/robots.txt    # confirm 200 + Content-Type: text/plain
curl http://localhost:3000/sitemap.xml | head -20   # confirm valid XML structure
```

Then run the skill validators: `npm run seo:validate`.

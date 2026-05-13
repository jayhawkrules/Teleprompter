# Firebase Implementation

Stack A — Vite + React on Firebase Hosting, with optional Firebase Functions for scheduled SEO cron.

---

## Firebase Hosting headers + rewrites

For Vite SPAs, the same `firebase.json` from `firebase-hosting-security` already covers SPA rewrites. Add SEO-specific entries:

```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      { "source": "/sitemap.xml", "destination": "/sitemap.xml" },
      { "source": "/robots.txt", "destination": "/robots.txt" },
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "/sitemap.xml",
        "headers": [
          { "key": "Content-Type", "value": "application/xml" },
          { "key": "Cache-Control", "value": "public, max-age=3600" }
        ]
      },
      {
        "source": "/robots.txt",
        "headers": [
          { "key": "Content-Type", "value": "text/plain" },
          { "key": "Cache-Control", "value": "public, max-age=3600" }
        ]
      }
    ]
  }
}
```

The CSP/HSTS/X-Frame-Options headers from `firebase-hosting-security` apply alongside.

## Vite SPA per-page metadata

Vite SPAs render client-side. Use `react-helmet-async` for per-route head management:

```tsx
// src/components/Seo.tsx
import { Helmet } from 'react-helmet-async';

export function Seo({ title, description, canonical, image }: { title: string; description: string; canonical: string; image?: string }) {
  const url = `https://yourdomain.com${canonical}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
```

**Important caveat for SPAs:** Googlebot now executes JS, but Facebook/X/Slack scrapers don't always. For pages where social sharing matters, consider:
- Pre-rendering (e.g., `vite-plugin-prerender`) to inject the `<head>` tags into static HTML at build time, OR
- Server-rendering the relevant routes (e.g., via Firebase App Hosting's SSR)

For most internal/admin Stack A apps, client-side metadata is fine.

## Sitemap generation at build time

`scripts/generate-sitemap.ts` (added to the app):

```ts
import { writeFileSync } from 'fs';
import { join } from 'path';

const SITE_URL = process.env.VITE_PUBLIC_SITE_URL || 'https://example.com';

const routes = [
  { path: '/',         changefreq: 'weekly',  priority: 1.0 },
  { path: '/features', changefreq: 'monthly', priority: 0.8 },
  { path: '/pricing',  changefreq: 'monthly', priority: 0.9 },
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(r => `  <url>
    <loc>${SITE_URL}${r.path}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

writeFileSync(join(process.cwd(), 'public', 'sitemap.xml'), xml, 'utf8');
console.log(`Wrote ${routes.length} URLs to public/sitemap.xml`);
```

Wire to `prebuild` script in `package.json`:

```json
{
  "scripts": {
    "prebuild": "tsx scripts/generate-sitemap.ts"
  }
}
```

Then `npm run build` regenerates the sitemap before each deploy.

## Static robots.txt

`public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /admin
Sitemap: https://yourdomain.com/sitemap.xml
```

## Firebase Scheduled Function for weekly SEO cron

If the app has a Firebase Functions backend, add a scheduled SEO audit:

`functions/src/seoCron.ts`:

```ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { execSync } from 'child_process';

export const weeklySeoCron = onSchedule({
  schedule: 'every monday 03:00',
  timeZone: 'America/New_York',
  retryCount: 1,
  region: 'us-central1',
}, async (event) => {
  logger.info('Starting weekly SEO audit cron', { event });

  try {
    // Note: scheduled functions can't open PRs directly; they post results to Firestore
    // and a separate GitHub Actions workflow polls and opens the PR.
    const auditOutput = execSync('npx tsx ~/.claude/skills/seo-aeo-optimizer/scripts/audit-site.ts --json', {
      encoding: 'utf-8',
    });
    const audit = JSON.parse(auditOutput);

    // Write to Firestore for monitoring
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    await db.collection('seoAudits').add({ runAt: new Date(), ...audit });

    logger.info('SEO audit completed', { score: audit.totalScore });
  } catch (err) {
    logger.error('SEO audit cron failed', err);
    throw err;
  }
});
```

Deploy alongside other functions: `firebase deploy --only functions:weeklySeoCron`.

**For most apps, prefer the GitHub Actions cron** (`examples/github-actions-cron.yml`) over Firebase Scheduled Functions. The GH Actions variant can directly open a PR; Firebase Functions can't (no GitHub auth in the function context without extra setup).

## BullMQ job queue integration

For repos that already use BullMQ (e.g., awardssubmission), add an SEO audit as a queued job:

```ts
// jobs/seoAuditJob.ts
import { Queue, Worker } from 'bullmq';
import { connection } from './queue-connection';

export const seoAuditQueue = new Queue('seo-audit', { connection });

export const seoAuditWorker = new Worker('seo-audit', async (job) => {
  const { execSync } = await import('child_process');
  const output = execSync('npm run seo:audit -- --json', { encoding: 'utf-8' });
  const audit = JSON.parse(output);
  // store + alert as needed
  return audit;
}, { connection });

// Enqueue weekly via cron job that runs `seoAuditQueue.add('weekly', {})`
```

## Firebase App Hosting (newer SSR offering)

If the app uses Firebase App Hosting (not classic Hosting), follow the Next.js patterns in `nextjs-implementation.md` instead — App Hosting runs Next.js SSR and the metadata API works as expected.

## Validation against deployed site

After Firebase deploy:

```bash
curl -I https://your-app.web.app/sitemap.xml      # confirm 200 + application/xml
curl -I https://your-app.web.app/robots.txt        # confirm 200 + text/plain
npm run seo:audit -- --url https://your-app.web.app
npm run seo:validate
```

Production Lighthouse:

```bash
npx lhci autorun --collect.url=https://your-app.web.app
```

## Reference repos

- Stack A with App Hosting + Capacitor: `~/GitHub/CastHub1`
- Stack A with classic Hosting: `~/GitHub/Producing-Hollywood-Invoicing`, `~/GitHub/holiday-lights`
- Stack A with Firebase + Firestore (no functions): `~/GitHub/backlothub`, `~/GitHub/toronadoentertainment`

#!/usr/bin/env tsx
/**
 * audit-site.ts — discover all public routes for a repo and produce a
 * machine-readable JSON audit report.
 *
 * Usage:
 *   npx tsx audit-site.ts                     # auto-detect from cwd, dry-run from filesystem
 *   npx tsx audit-site.ts --url https://...   # audit a deployed URL
 *   npx tsx audit-site.ts --json              # output JSON to stdout (default)
 *   npx tsx audit-site.ts --history           # also append to docs/seo/audit-history.jsonl
 *
 * Exits 0 if audit ran, 1 if the repo couldn't be classified.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getRepoContext, parseFlags, fetchUrl, appendJsonLine, failHard } from './_lib.js';

interface RouteAudit {
  url: string;
  status?: number;
  title?: string;
  description?: string;
  canonical?: string;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasOgImage: boolean;
  hasOgUrl: boolean;
  hasOgType: boolean;
  hasTwitterCard: boolean;
  hasTwitterTitle: boolean;
  hasTwitterDescription: boolean;
  hasTwitterImage: boolean;
  jsonLdSchemas: string[];
  hasNoindex: boolean;
  imagesWithoutAlt: number;
  internalLinkCount: number;
  issues: string[];
}

interface AuditReport {
  runAt: string;
  appName: string;
  framework: string;
  stack: string;
  packageManager: string;
  baseUrl: string | null;
  totalRoutes: number;
  routes: RouteAudit[];
  globalChecks: {
    hasSitemap: boolean;
    hasRobots: boolean;
    sitemapUrlCount?: number;
  };
}

async function discoverRoutesFromAppDir(appDir: string): Promise<string[]> {
  const routes: string[] = [];
  function walk(dir: string, base: string) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
      if (e.isDirectory()) {
        // Skip route groups like (marketing) — these don't add to the URL
        const segment = e.name.startsWith('(') ? '' : e.name;
        walk(join(dir, e.name), segment ? `${base}/${segment}` : base);
      } else if (e.isFile() && (e.name === 'page.tsx' || e.name === 'page.jsx' || e.name === 'page.js')) {
        routes.push(base || '/');
      }
    }
  }
  walk(appDir, '');
  return [...new Set(routes)];
}

async function discoverRoutesFromSitemap(sitemapPath: string): Promise<string[]> {
  if (!existsSync(sitemapPath)) return [];
  const xml = readFileSync(sitemapPath, 'utf8');
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
  return matches.map((m) => {
    try { return new URL(m[1]).pathname; } catch { return m[1]; }
  });
}

function extractMetaFromHtml(html: string): Partial<RouteAudit> {
  const get = (re: RegExp) => {
    const m = html.match(re);
    return m ? m[1].trim() : undefined;
  };
  const has = (re: RegExp) => re.test(html);
  const jsonLdMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)];
  const schemas: string[] = [];
  for (const m of jsonLdMatches) {
    try {
      const obj = JSON.parse(m[1]);
      const t = obj['@type'];
      if (typeof t === 'string') schemas.push(t);
      else if (Array.isArray(t)) schemas.push(...t.filter((x) => typeof x === 'string'));
    } catch { /* invalid JSON-LD; flagged elsewhere */ }
  }
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)];
  const imgsWithoutAlt = imgs.filter((m) => !/\salt=/.test(m[0])).length;
  const internalLinks = [...html.matchAll(/<a\b[^>]+href=["'](\/[^"']*)["']/g)].length;

  return {
    title: get(/<title[^>]*>([^<]+)<\/title>/i),
    description: get(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i),
    canonical: get(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i),
    hasOgTitle: has(/property=["']og:title["']/i),
    hasOgDescription: has(/property=["']og:description["']/i),
    hasOgImage: has(/property=["']og:image["']/i),
    hasOgUrl: has(/property=["']og:url["']/i),
    hasOgType: has(/property=["']og:type["']/i),
    hasTwitterCard: has(/name=["']twitter:card["']/i),
    hasTwitterTitle: has(/name=["']twitter:title["']/i),
    hasTwitterDescription: has(/name=["']twitter:description["']/i),
    hasTwitterImage: has(/name=["']twitter:image["']/i),
    jsonLdSchemas: schemas,
    hasNoindex: /noindex/i.test(html.match(/<meta\s+name=["']robots["'][^>]*>/i)?.[0] ?? ''),
    imagesWithoutAlt: imgsWithoutAlt,
    internalLinkCount: internalLinks,
  };
}

async function auditRoute(baseUrl: string, path: string): Promise<RouteAudit> {
  const url = baseUrl.replace(/\/$/, '') + path;
  try {
    const { status, body } = await fetchUrl(url);
    const meta = extractMetaFromHtml(body);
    const issues: string[] = [];
    if (!meta.title) issues.push('Missing <title>');
    else if (meta.title.length < 50 || meta.title.length > 60) issues.push(`Title length ${meta.title.length} outside 50-60`);
    if (!meta.description) issues.push('Missing meta description');
    else if (meta.description.length < 150 || meta.description.length > 160) issues.push(`Description length ${meta.description.length} outside 150-160`);
    if (!meta.canonical) issues.push('Missing canonical');
    else if (!meta.canonical.startsWith('https://')) issues.push('Canonical not absolute https://');
    if (!meta.hasOgTitle || !meta.hasOgDescription || !meta.hasOgImage || !meta.hasOgUrl || !meta.hasOgType) issues.push('Incomplete Open Graph');
    if (!meta.hasTwitterCard) issues.push('Missing Twitter card');
    if (meta.jsonLdSchemas?.length === 0) issues.push('No JSON-LD schema');
    if (meta.imagesWithoutAlt && meta.imagesWithoutAlt > 0) issues.push(`${meta.imagesWithoutAlt} images missing alt`);
    if (meta.hasNoindex) issues.push('Has noindex meta robots');

    return {
      url,
      status,
      hasOgTitle: false, hasOgDescription: false, hasOgImage: false, hasOgUrl: false, hasOgType: false,
      hasTwitterCard: false, hasTwitterTitle: false, hasTwitterDescription: false, hasTwitterImage: false,
      jsonLdSchemas: [],
      hasNoindex: false,
      imagesWithoutAlt: 0,
      internalLinkCount: 0,
      ...meta,
      issues,
    };
  } catch (err) {
    return {
      url, hasOgTitle: false, hasOgDescription: false, hasOgImage: false, hasOgUrl: false, hasOgType: false,
      hasTwitterCard: false, hasTwitterTitle: false, hasTwitterDescription: false, hasTwitterImage: false,
      jsonLdSchemas: [], hasNoindex: false, imagesWithoutAlt: 0, internalLinkCount: 0,
      issues: [`Fetch failed: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const ctx = getRepoContext();
  const baseUrl = (flags.url as string) || ctx.siteUrl || null;

  if (ctx.stack === 'F') {
    failHard('Stack F (empty/placeholder) — nothing to audit.');
  }
  if (ctx.stack === 'E') {
    failHard('Stack E (cron-driven automation) — no public surface to audit.');
  }

  let routes: string[] = [];
  if (ctx.hasNextAppRouter) {
    routes = await discoverRoutesFromAppDir(join(ctx.root, 'app'));
  } else if (ctx.hasNextPagesRouter) {
    routes = await discoverRoutesFromAppDir(join(ctx.root, 'pages'));
  } else {
    // Try sitemap.xml
    const sitemapPaths = [
      join(ctx.root, 'public', 'sitemap.xml'),
      join(ctx.root, 'dist', 'sitemap.xml'),
      join(ctx.root, 'out', 'sitemap.xml'),
    ];
    for (const p of sitemapPaths) {
      if (existsSync(p)) { routes = await discoverRoutesFromSitemap(p); break; }
    }
  }

  if (routes.length === 0) routes = ['/'];

  const report: AuditReport = {
    runAt: new Date().toISOString(),
    appName: require('path').basename(ctx.root),
    framework: ctx.hasNextAppRouter ? 'Next.js App Router' : ctx.hasNextPagesRouter ? 'Next.js Pages Router' : ctx.hasViteReact ? 'Vite + React' : 'Static HTML',
    stack: ctx.stack,
    packageManager: ctx.packageManager,
    baseUrl,
    totalRoutes: routes.length,
    routes: [],
    globalChecks: {
      hasSitemap: existsSync(join(ctx.root, 'public', 'sitemap.xml')) || existsSync(join(ctx.root, 'app', 'sitemap.ts')),
      hasRobots: existsSync(join(ctx.root, 'public', 'robots.txt')) || existsSync(join(ctx.root, 'app', 'robots.ts')),
    },
  };

  if (baseUrl) {
    for (const route of routes) {
      // eslint-disable-next-line no-await-in-loop
      const audit = await auditRoute(baseUrl, route);
      report.routes.push(audit);
    }
  } else {
    // No baseUrl — list routes only, can't audit live HTML
    report.routes = routes.map((r) => ({
      url: r,
      hasOgTitle: false, hasOgDescription: false, hasOgImage: false, hasOgUrl: false, hasOgType: false,
      hasTwitterCard: false, hasTwitterTitle: false, hasTwitterDescription: false, hasTwitterImage: false,
      jsonLdSchemas: [], hasNoindex: false, imagesWithoutAlt: 0, internalLinkCount: 0,
      issues: ['No baseUrl provided — pass --url https://yourdomain.com to audit live HTML'],
    }));
  }

  const json = JSON.stringify(report, null, 2);
  console.log(json);

  if (flags.history) {
    const histPath = join(ctx.root, 'docs', 'seo', 'audit-history.jsonl');
    appendJsonLine(histPath, { ...report });
    console.error(`Appended to ${histPath}`);
  }
}

main().catch((err) => failHard('audit-site failed', err instanceof Error ? err.message : err));

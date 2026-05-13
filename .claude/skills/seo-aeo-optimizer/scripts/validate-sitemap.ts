#!/usr/bin/env tsx
/**
 * validate-sitemap.ts — fetch /sitemap.xml, confirm 200 + XML, parse all URLs,
 * confirm each returns 200 and is absolute. Confirm sitemap is referenced in robots.txt.
 *
 * Usage:
 *   npx tsx validate-sitemap.ts --url https://yourdomain.com
 *   npx tsx validate-sitemap.ts --file public/sitemap.xml  # local file (skip URL HTTP checks)
 */

import { existsSync, readFileSync } from 'node:fs';
import { parseFlags, fetchUrl, failHard, passSoft } from './_lib.js';

interface SitemapEntry { loc: string; lastmod?: string; changefreq?: string; priority?: string }

function parseSitemap(xml: string): SitemapEntry[] {
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => {
    const block = m[1];
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim();
    const changefreq = block.match(/<changefreq>([^<]+)<\/changefreq>/)?.[1]?.trim();
    const priority = block.match(/<priority>([^<]+)<\/priority>/)?.[1]?.trim();
    return { loc: loc!, lastmod, changefreq, priority };
  });
  return urls.filter((u) => u.loc);
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const failures: string[] = [];

  let xml: string;
  let baseUrl: string | null = null;

  if (flags.file) {
    const path = String(flags.file);
    if (!existsSync(path)) failHard(`Sitemap file not found: ${path}`);
    xml = readFileSync(path, 'utf8');
  } else if (flags.url) {
    baseUrl = String(flags.url).replace(/\/$/, '');
    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    const { status, contentType, body } = await fetchUrl(sitemapUrl);
    if (status !== 200) failHard(`/sitemap.xml returned ${status}`);
    if (!contentType.includes('xml')) failures.push(`Content-Type "${contentType}" does not contain "xml"`);
    xml = body;

    // Check robots references the sitemap
    try {
      const robots = await fetchUrl(`${baseUrl}/robots.txt`);
      if (!robots.body.includes('Sitemap:')) failures.push('robots.txt does not reference Sitemap:');
    } catch (e) {
      failures.push(`robots.txt fetch failed: ${e}`);
    }
  } else {
    failHard('Must pass --url or --file');
  }

  const entries = parseSitemap(xml);
  if (entries.length === 0) failures.push('Sitemap has zero <url> entries');

  // URL-level checks
  const seen = new Set<string>();
  for (const e of entries) {
    if (!e.loc.startsWith('http://') && !e.loc.startsWith('https://')) {
      failures.push(`URL not absolute: ${e.loc}`);
    }
    if (e.loc.startsWith('http://')) failures.push(`URL not https: ${e.loc}`);
    if (seen.has(e.loc)) failures.push(`Duplicate URL: ${e.loc}`);
    seen.add(e.loc);
    if (/admin|preview|staging|_next|api\/private/i.test(e.loc)) {
      failures.push(`Suspect private URL in sitemap: ${e.loc}`);
    }
    if (!e.lastmod) failures.push(`Missing <lastmod> for ${e.loc}`);
  }

  // HTTP probe each URL (only if --probe and we have URLs)
  if (flags.probe && baseUrl) {
    for (const e of entries) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await fetchUrl(e.loc);
        if (res.status !== 200) failures.push(`${e.loc}: returned ${res.status}`);
      } catch (err) {
        failures.push(`${e.loc}: fetch failed (${err})`);
      }
    }
  }

  if (failures.length) failHard(`${failures.length} sitemap failures`, failures);
  passSoft(`Sitemap valid: ${entries.length} URLs, all absolute, no duplicates, no suspect private URLs`);
}

main().catch((err) => failHard('validate-sitemap failed', err instanceof Error ? err.message : err));

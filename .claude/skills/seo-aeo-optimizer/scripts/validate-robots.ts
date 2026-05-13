#!/usr/bin/env tsx
/**
 * validate-robots.ts — fetch /robots.txt and verify rules + sitemap reference.
 *
 * Usage:
 *   npx tsx validate-robots.ts --url https://yourdomain.com
 *   npx tsx validate-robots.ts --file public/robots.txt
 */

import { existsSync, readFileSync } from 'node:fs';
import { parseFlags, fetchUrl, failHard, passSoft } from './_lib.js';

const PRIVATE_PATHS_EXPECTED = ['/admin', '/api/private', '/_next', '/preview'];

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  let body: string;
  let baseUrl: string | null = null;

  if (flags.file) {
    const path = String(flags.file);
    if (!existsSync(path)) failHard(`robots.txt file not found: ${path}`);
    body = readFileSync(path, 'utf8');
  } else if (flags.url) {
    baseUrl = String(flags.url).replace(/\/$/, '');
    const { status, contentType, body: b } = await fetchUrl(`${baseUrl}/robots.txt`);
    if (status !== 200) failHard(`/robots.txt returned ${status}`);
    if (!contentType.includes('text/plain') && !contentType.includes('text')) {
      console.warn(`⚠ Content-Type "${contentType}" — expected text/plain`);
    }
    body = b;
  } else {
    failHard('Must pass --url or --file');
  }

  const failures: string[] = [];
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) failHard('robots.txt is empty');

  const userAgentBlocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (/^user-agent:/i.test(line)) {
      if (current.length) userAgentBlocks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) userAgentBlocks.push(current);

  // Find a User-agent: * block
  const wildcard = userAgentBlocks.find((block) => block.some((l) => /^user-agent:\s*\*/i.test(l)));
  if (!wildcard) failures.push('No User-agent: * block found');

  // Check no global Disallow: /
  const globalDisallow = wildcard?.find((l) => /^disallow:\s*\/\s*$/i.test(l));
  if (globalDisallow) failures.push('CRITICAL: User-agent: * has Disallow: / (entire site blocked from indexing)');

  // Check sitemap reference
  if (!body.match(/^sitemap:\s*\S+/im)) failures.push('No Sitemap: directive found');
  else {
    const sitemapLine = body.match(/^sitemap:\s*(\S+)/im)?.[1];
    if (sitemapLine && !sitemapLine.startsWith('https://')) failures.push(`Sitemap URL not https: ${sitemapLine}`);
  }

  // Recommend (warn) private path coverage
  const allDisallows = lines.filter((l) => /^disallow:/i.test(l)).map((l) => l.replace(/^disallow:\s*/i, ''));
  for (const expected of PRIVATE_PATHS_EXPECTED) {
    const covered = allDisallows.some((d) => expected.startsWith(d) || d.startsWith(expected));
    if (!covered) {
      console.warn(`⚠ Recommended Disallow not present: ${expected} (allowed if you confirm intentional)`);
    }
  }

  if (failures.length) failHard(`${failures.length} robots.txt failures`, failures);
  passSoft(`robots.txt valid (${userAgentBlocks.length} user-agent blocks, sitemap reference present)`);
}

main().catch((err) => failHard('validate-robots failed', err instanceof Error ? err.message : err));

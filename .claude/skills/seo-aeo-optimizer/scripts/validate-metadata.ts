#!/usr/bin/env tsx
/**
 * validate-metadata.ts — assert every public route has valid title, description,
 * canonical, OG, Twitter card metadata. Exits 1 on any failure.
 *
 * Usage:
 *   npx tsx validate-metadata.ts --url https://yourdomain.com
 *   npx tsx validate-metadata.ts --audit docs/seo/last-audit.json
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findRepoRoot, parseFlags, failHard, passSoft } from './_lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface RouteAudit {
  url: string;
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
  hasNoindex: boolean;
}

interface AuditReport { routes: RouteAudit[]; baseUrl: string | null }

function getAudit(flags: Record<string, string | boolean>, root: string): AuditReport {
  if (flags.audit) {
    const path = String(flags.audit);
    if (!existsSync(path)) failHard(`Audit file not found: ${path}`);
    return JSON.parse(readFileSync(path, 'utf8')) as AuditReport;
  }
  // Otherwise run audit-site.ts inline
  const auditScript = join(__dirname, 'audit-site.ts');
  const args = flags.url ? `--url ${flags.url}` : '';
  try {
    const stdout = execSync(`npx tsx ${auditScript} ${args}`, { cwd: root, encoding: 'utf8' });
    return JSON.parse(stdout) as AuditReport;
  } catch (e) {
    failHard('Inline audit-site.ts failed', e instanceof Error ? e.message : e);
  }
}

function validateRoute(r: RouteAudit): string[] {
  const failures: string[] = [];
  if (!r.title) failures.push(`${r.url}: missing <title>`);
  else if (r.title.length < 50 || r.title.length > 60) failures.push(`${r.url}: title length ${r.title.length} not in 50-60`);
  if (!r.description) failures.push(`${r.url}: missing meta description`);
  else if (r.description.length < 150 || r.description.length > 160) failures.push(`${r.url}: description length ${r.description.length} not in 150-160`);
  if (!r.canonical) failures.push(`${r.url}: missing canonical`);
  else if (!r.canonical.startsWith('https://')) failures.push(`${r.url}: canonical not absolute https://`);
  if (!r.hasOgTitle) failures.push(`${r.url}: missing og:title`);
  if (!r.hasOgDescription) failures.push(`${r.url}: missing og:description`);
  if (!r.hasOgImage) failures.push(`${r.url}: missing og:image`);
  if (!r.hasOgUrl) failures.push(`${r.url}: missing og:url`);
  if (!r.hasOgType) failures.push(`${r.url}: missing og:type`);
  if (!r.hasTwitterCard) failures.push(`${r.url}: missing twitter:card`);
  if (!r.hasTwitterTitle) failures.push(`${r.url}: missing twitter:title`);
  if (!r.hasTwitterDescription) failures.push(`${r.url}: missing twitter:description`);
  if (!r.hasTwitterImage) failures.push(`${r.url}: missing twitter:image`);
  if (r.hasNoindex) failures.push(`${r.url}: has noindex meta robots — verify intentional`);
  return failures;
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const root = findRepoRoot();
  const audit = getAudit(flags, root);
  const allFailures: string[] = [];
  for (const r of audit.routes) allFailures.push(...validateRoute(r));
  // Detect duplicate titles/descriptions
  const titles = audit.routes.map((r) => r.title).filter(Boolean);
  const descriptions = audit.routes.map((r) => r.description).filter(Boolean);
  const dupTitles = titles.filter((t, i) => titles.indexOf(t) !== i);
  const dupDescriptions = descriptions.filter((d, i) => descriptions.indexOf(d) !== i);
  if (dupTitles.length) allFailures.push(`Duplicate titles: ${[...new Set(dupTitles)].join(' | ')}`);
  if (dupDescriptions.length) allFailures.push(`Duplicate descriptions: ${[...new Set(dupDescriptions)].join(' | ')}`);

  if (allFailures.length) failHard(`${allFailures.length} metadata failures`, allFailures);
  passSoft(`Metadata valid for ${audit.routes.length} routes`);
}

main().catch((err) => failHard('validate-metadata failed', err instanceof Error ? err.message : err));

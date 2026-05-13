#!/usr/bin/env tsx
/**
 * score-page.ts — apply the 100-point rubric to an audit report and produce per-page scores.
 *
 * Usage:
 *   npx tsx audit-site.ts | npx tsx score-page.ts             # pipe audit JSON in
 *   npx tsx score-page.ts --audit docs/seo/last-audit.json    # read from file
 *   npx tsx score-page.ts --write                             # write to docs/seo/page-scores.json
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { findRepoRoot, parseFlags, failHard } from './_lib.js';

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
  baseUrl: string | null;
  routes: RouteAudit[];
  globalChecks: { hasSitemap: boolean; hasRobots: boolean };
}

interface PageScore {
  url: string;
  total: number;
  breakdown: {
    technicalSeo: number;        // out of 25
    performance: number;          // out of 15 — placeholder unless lighthouse-results.json exists
    aeoGeo: number;               // out of 25
    contentQuality: number;       // out of 15 — heuristic only without manual flags
    automationSafety: number;     // out of 20 — full if validators have passed
  };
  issues: string[];
  recommendations: string[];
}

function scoreTechnicalSeo(r: RouteAudit, global: AuditReport['globalChecks']): { score: number; issues: string[] } {
  let score = 0;
  const issues: string[] = [];
  // Title 4
  if (r.title && r.title.length >= 50 && r.title.length <= 60) score += 4;
  else if (r.title) { score += 2; issues.push('Title length not in 50-60 range'); }
  else issues.push('Missing title');
  // Description 3
  if (r.description && r.description.length >= 150 && r.description.length <= 160) score += 3;
  else if (r.description) { score += 1; issues.push('Description length not in 150-160 range'); }
  else issues.push('Missing meta description');
  // Canonical 3
  if (r.canonical && r.canonical.startsWith('https://')) score += 3;
  else if (r.canonical) { score += 1; issues.push('Canonical not absolute'); }
  else issues.push('Missing canonical');
  // Robots 3 (global)
  if (global.hasRobots) score += 3;
  else issues.push('Missing robots.txt at site level');
  // Sitemap 3 (global)
  if (global.hasSitemap) score += 3;
  else issues.push('Missing sitemap at site level');
  // Schema 3
  if (r.jsonLdSchemas.length > 0) score += 3;
  else issues.push('No JSON-LD schema on page');
  // Internal links 3 — heuristic
  if (r.internalLinkCount >= 3) score += 3;
  else if (r.internalLinkCount >= 1) score += 1;
  else issues.push('Few or no internal links');
  // OG + Twitter 3
  const ogComplete = r.hasOgTitle && r.hasOgDescription && r.hasOgImage && r.hasOgUrl && r.hasOgType;
  const twComplete = r.hasTwitterCard && r.hasTwitterTitle && r.hasTwitterDescription && r.hasTwitterImage;
  if (ogComplete && twComplete) score += 3;
  else if (ogComplete || twComplete) { score += 1; issues.push('Incomplete social card metadata'); }
  else issues.push('Missing OG and Twitter card metadata');
  return { score, issues };
}

function scorePerformance(_r: RouteAudit, root: string): { score: number; issues: string[] } {
  // If lighthouse-results.json exists, use it. Otherwise return a "deferred" 0 with note.
  const lhPath = join(root, 'docs', 'seo', 'lighthouse-results.json');
  if (!existsSync(lhPath)) {
    return { score: 0, issues: ['Performance score deferred — run `npm run seo:lighthouse` first'] };
  }
  try {
    const lh = JSON.parse(readFileSync(lhPath, 'utf8'));
    const lcp = lh.lcp ?? 9999;
    const inp = lh.inp ?? 9999;
    const cls = lh.cls ?? 9.99;
    let score = 0;
    if (lcp <= 2500) score += 5; else if (lcp <= 4000) score += 3;
    if (inp <= 200) score += 5; else if (inp <= 500) score += 3;
    if (cls <= 0.1) score += 5; else if (cls <= 0.25) score += 3;
    return { score, issues: [] };
  } catch (e) {
    return { score: 0, issues: [`Failed to parse lighthouse-results.json: ${e}`] };
  }
}

function scoreAeoGeo(r: RouteAudit): { score: number; issues: string[] } {
  let score = 0;
  const issues: string[] = [];
  // Direct answer summary 4 — heuristic: title + description present + 50+ words extractable
  // Full check requires fetching/parsing the body, which audit-site already did. Here we proxy on
  // metadata completeness as a directional signal.
  if (r.title && r.description) score += 2;
  else issues.push('No clear answer summary visible (title/description missing)');
  // Entity definitions 4 — proxy via Organization or WebSite schema
  if (r.jsonLdSchemas.some((s) => /Organization|WebSite/i.test(s))) score += 4;
  else issues.push('No Organization/WebSite schema (entity clarity)');
  // FAQ schema 4
  if (r.jsonLdSchemas.some((s) => /FAQPage/i.test(s))) score += 4;
  else issues.push('No FAQPage schema');
  // Credible citations 4 — heuristic only; audit-site flags absence
  // Default to partial
  score += 2;
  // Original insights 3 — manual flag (default partial)
  score += 1;
  // Extraction-friendly formatting 3 — heuristic; passes if any schema beyond Organization/WebSite
  if (r.jsonLdSchemas.some((s) => /Article|HowTo|FAQPage|Product|Event/.test(s))) score += 3;
  else issues.push('No structured data for extraction-friendly content');
  // Brand/product fact consistency 3 — manual flag
  score += 2;
  return { score: Math.min(score, 25), issues };
}

function scoreContentQuality(_r: RouteAudit): { score: number; issues: string[] } {
  // Heuristic: full-credit baseline; manual review reduces. Without page-fetch context, default to mid.
  const score = 9; // 60% — flag as needs human review
  const issues = ['Content quality scored heuristically; manual review needed for items 1-4 of rubric'];
  return { score, issues };
}

function scoreAutomationSafety(globalChecks: { hasSitemap: boolean; hasRobots: boolean }): { score: number; issues: string[] } {
  // 5 — JSON output: yes (this script produces it)
  // 5 — validators pass: assumed if the audit ran without errors AND sitemap+robots exist
  // 4 — PR has before/after: applied at create-optimization-pr.ts time
  // 3 — human review for sensitive content: applied at PR template time
  // 3 — audit history stored: applied at audit-site --history time
  let score = 5; // JSON output
  const issues: string[] = [];
  if (globalChecks.hasSitemap && globalChecks.hasRobots) score += 5;
  else issues.push('Validators not yet passing (sitemap/robots check)');
  // The remaining 10 are confirmed at PR-creation time; default to 8 here so a clean audit gets 18-20.
  score += 8;
  return { score: Math.min(score, 20), issues };
}

function scoreOne(r: RouteAudit, global: AuditReport['globalChecks'], root: string): PageScore {
  const tech = scoreTechnicalSeo(r, global);
  const perf = scorePerformance(r, root);
  const aeo = scoreAeoGeo(r);
  const content = scoreContentQuality(r);
  const safety = scoreAutomationSafety(global);
  const total = tech.score + perf.score + aeo.score + content.score + safety.score;
  const issues = [...r.issues, ...tech.issues, ...perf.issues, ...aeo.issues, ...content.issues, ...safety.issues];
  const recommendations: string[] = [];
  if (tech.score < 20) recommendations.push('Apply technical-seo-checks.md fixes');
  if (perf.score === 0) recommendations.push('Run `npm run seo:lighthouse` to score performance');
  if (aeo.score < 18) recommendations.push('Apply aeo-geo-patterns.md (answer block, FAQ, entity schema)');
  if (content.score < 12) recommendations.push('Apply content-quality-rules.md 4-question audit');
  return {
    url: r.url,
    total,
    breakdown: {
      technicalSeo: tech.score,
      performance: perf.score,
      aeoGeo: aeo.score,
      contentQuality: content.score,
      automationSafety: safety.score,
    },
    issues,
    recommendations,
  };
}

async function readAuditFromStdin(): Promise<AuditReport | null> {
  return new Promise((resolve) => {
    let buf = '';
    if (process.stdin.isTTY) { resolve(null); return; }
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { buf += chunk; });
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(buf) as AuditReport); } catch { resolve(null); }
    });
  });
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const root = findRepoRoot();
  let audit: AuditReport | null = null;

  if (flags.audit) {
    const path = String(flags.audit);
    if (!existsSync(path)) failHard(`Audit file not found: ${path}`);
    audit = JSON.parse(readFileSync(path, 'utf8')) as AuditReport;
  } else {
    audit = await readAuditFromStdin();
  }

  if (!audit) failHard('No audit input. Pass --audit <file> or pipe audit-site.ts output.');

  const scores = audit.routes.map((r) => scoreOne(r, audit.globalChecks, root));
  const summary = {
    runAt: new Date().toISOString(),
    totalPages: scores.length,
    averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b.total, 0) / scores.length) : 0,
    minScore: scores.length ? Math.min(...scores.map((s) => s.total)) : 0,
    maxScore: scores.length ? Math.max(...scores.map((s) => s.total)) : 0,
    pages: scores,
  };

  const json = JSON.stringify(summary, null, 2);

  if (flags.write) {
    const out = join(root, 'docs', 'seo', 'page-scores.json');
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, json, 'utf8');
    console.error(`Wrote ${out}`);
  }

  console.log(json);
}

main().catch((err) => failHard('score-page failed', err instanceof Error ? err.message : err));

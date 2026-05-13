#!/usr/bin/env tsx
/**
 * lighthouse-ci.ts — wraps lhci autorun. Asserts on performance, SEO, and CWV.
 * Writes results to docs/seo/lighthouse-results.json (consumed by score-page.ts).
 *
 * Usage:
 *   npx tsx lighthouse-ci.ts                       # uses .lighthouserc.json in repo root
 *   npx tsx lighthouse-ci.ts --url https://...     # override target URL
 *
 * Requires @lhci/cli installed in target repo or globally:
 *   npm install -D @lhci/cli
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { findRepoRoot, parseFlags, failHard } from './_lib.js';

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const root = findRepoRoot();

  const lhciConfig = join(root, '.lighthouserc.json');
  if (!existsSync(lhciConfig)) {
    console.warn(`⚠ No .lighthouserc.json found at ${lhciConfig}`);
    console.warn(`  Copy from ~/.claude/skills/seo-aeo-optimizer/templates/lighthouserc.json to start.`);
    failHard('Cannot run Lighthouse CI without .lighthouserc.json');
  }

  // Determine if @lhci/cli is available
  const lhciBin = join(root, 'node_modules', '.bin', 'lhci');
  const hasLocal = existsSync(lhciBin);

  if (!hasLocal) {
    console.warn('@lhci/cli not installed locally. Install with: npm install -D @lhci/cli');
    console.warn('Falling back to npx (slower; downloads on each run)');
  }

  const args = ['autorun'];
  if (flags.url) {
    // Override the URL via env var consumed by lhci
    process.env.LHCI_URL = String(flags.url);
  }

  const result = spawnSync(hasLocal ? lhciBin : 'npx', hasLocal ? args : ['--yes', '@lhci/cli', ...args], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env },
  });

  if (result.status !== 0) {
    failHard(`Lighthouse CI exited with code ${result.status}`);
  }

  // Persist a slim summary so score-page.ts can consume it
  const reportsDir = join(root, '.lighthouseci');
  if (existsSync(reportsDir)) {
    const files = readdirSync(reportsDir).filter((f) => f.startsWith('lhr-') && f.endsWith('.json'));
    if (files.length) {
      const latest = readFileSync(join(reportsDir, files[files.length - 1]), 'utf8');
      const lhr = JSON.parse(latest);
      const audits = lhr.audits || {};
      const summary = {
        runAt: new Date().toISOString(),
        url: lhr.requestedUrl || lhr.finalUrl,
        performance: lhr.categories?.performance?.score ?? null,
        seo: lhr.categories?.seo?.score ?? null,
        accessibility: lhr.categories?.accessibility?.score ?? null,
        bestPractices: lhr.categories?.['best-practices']?.score ?? null,
        lcp: audits['largest-contentful-paint']?.numericValue ?? null,
        cls: audits['cumulative-layout-shift']?.numericValue ?? null,
        inp: audits['interactive']?.numericValue ?? null, // closest LH metric
        tbt: audits['total-blocking-time']?.numericValue ?? null,
      };
      const out = join(root, 'docs', 'seo', 'lighthouse-results.json');
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, JSON.stringify(summary, null, 2), 'utf8');
      console.log(`✅ Wrote ${out}`);
    }
  }
}

main().catch((err) => failHard('lighthouse-ci failed', err instanceof Error ? err.message : err));

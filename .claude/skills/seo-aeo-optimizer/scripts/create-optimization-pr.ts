#!/usr/bin/env tsx
/**
 * create-optimization-pr.ts — open a GitHub PR with the SEO optimization changes.
 * Reads page-scores before/after, computes deltas, populates the PR body template,
 * labels the PR with the right risk level. Runs all validators first; refuses to
 * open the PR if any validator fails.
 *
 * Usage:
 *   npx tsx create-optimization-pr.ts                        # uses default settings
 *   npx tsx create-optimization-pr.ts --no-validate          # SKIP validators (NOT recommended)
 *   npx tsx create-optimization-pr.ts --base main --branch seo/audit-YYYY-MM-DD
 */

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findRepoRoot, parseFlags, failHard, detectPackageManager } from './_lib.js';

interface PageScore { url: string; total: number; breakdown: Record<string, number> }
interface PageScoresFile { runAt: string; averageScore: number; pages: PageScore[] }

function run(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] }).trim();
}

function runVoid(cmd: string, cwd: string): void {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function detectRiskLevel(diffSummary: string): 'low' | 'medium' | 'high' {
  // High risk: pricing, legal, awards, hero copy, testimonials, product capabilities
  const HIGH = /pricing|legal|terms|privacy|awards|hero|testimonial|featured.in|capabilities|claims|certifi/i;
  // Medium: content rewrites
  const MEDIUM = /\.(tsx|jsx|md)$/m;
  // Low: only metadata, sitemap, robots, schema, JSON-LD
  if (HIGH.test(diffSummary)) return 'high';
  // If diff is only docs/seo/ + sitemap + robots + tiny metadata edits → low
  const lowOnly = diffSummary.split('\n').every((line) => /^\s*M\s+(docs\/seo|public\/(sitemap|robots)|app\/(sitemap|robots)|.*Json[Ll]d|metadata)/i.test(line) || line.trim() === '');
  if (lowOnly) return 'low';
  if (MEDIUM.test(diffSummary)) return 'medium';
  return 'low';
}

function templatePrBody({ date, before, after, delta, validations, humanReview, risk, history }: {
  date: string; before: number; after: number; delta: number;
  validations: Record<string, boolean>; humanReview: string[]; risk: 'low' | 'medium' | 'high'; history: string;
}) {
  const tplPath = join(__dirname, '..', 'templates', 'pr-body.md');
  if (!existsSync(tplPath)) failHard(`PR body template not found: ${tplPath}`);
  let body = readFileSync(tplPath, 'utf8');
  body = body
    .replace('{{DATE}}', date)
    .replace('{{BEFORE_TOTAL}}', String(before))
    .replace('{{AFTER_TOTAL}}', String(after))
    .replace('{{DELTA}}', delta >= 0 ? `+${delta}` : String(delta))
    .replace('{{RISK_LABEL}}', risk)
    .replace('{{HUMAN_REVIEW_ITEMS}}', humanReview.length ? humanReview.map((x) => `- ${x}`).join('\n') : '_None._');
  // Validation checkboxes
  body = body.replace(/{{VALIDATIONS}}/g, Object.entries(validations).map(([k, v]) => `- [${v ? 'x' : ' '}] ${k}`).join('\n'));
  return body;
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const root = findRepoRoot();
  const pm = detectPackageManager(root);

  // 1. Run validators unless skipped
  const validations = { metadata: false, schema: false, sitemap: false, robots: false, lighthouse: false };
  if (!flags['no-validate']) {
    const runners: Array<[keyof typeof validations, string]> = [
      ['metadata', 'seo:validate:metadata'],
      ['schema', 'seo:validate:schema'],
      ['sitemap', 'seo:validate:sitemap'],
      ['robots', 'seo:validate:robots'],
    ];
    for (const [key, script] of runners) {
      const result = spawnSync(pm, ['run', script], { cwd: root, stdio: 'inherit' });
      validations[key] = result.status === 0;
    }
    // Lighthouse is optional — don't fail if missing config
    const lh = spawnSync(pm, ['run', 'seo:lighthouse'], { cwd: root, stdio: 'inherit' });
    validations.lighthouse = lh.status === 0;

    const failed = Object.entries(validations).filter(([k, v]) => !v && k !== 'lighthouse');
    if (failed.length) failHard(`Validators failed: ${failed.map(([k]) => k).join(', ')}. Refusing to open PR.`);
  }

  // 2. Read scores
  const scoresPath = join(root, 'docs', 'seo', 'page-scores.json');
  if (!existsSync(scoresPath)) failHard('docs/seo/page-scores.json not found. Run seo:audit + seo:score --write first.');
  const scores = JSON.parse(readFileSync(scoresPath, 'utf8')) as PageScoresFile;

  // Compare to previous if available
  const histPath = join(root, 'docs', 'seo', 'audit-history.jsonl');
  const history = existsSync(histPath) ? readFileSync(histPath, 'utf8').trim().split('\n').slice(-2) : [];
  let beforeAvg = scores.averageScore;
  if (history.length >= 2) {
    try { beforeAvg = (JSON.parse(history[history.length - 2]).averageScore as number) ?? scores.averageScore; } catch {}
  }
  const afterAvg = scores.averageScore;
  const delta = afterAvg - beforeAvg;

  // 3. Inspect git status
  let diffSummary = '';
  try { diffSummary = run('git status --short', root); } catch {}
  if (!diffSummary) {
    console.log('No changes to commit. Exiting cleanly.');
    process.exit(0);
  }

  const risk = detectRiskLevel(diffSummary);

  // 4. Determine human-review items
  const humanReview: string[] = [];
  if (risk === 'high') humanReview.push('High-risk changes detected (pricing/legal/awards/hero/testimonials) — see safety-guardrails.md');
  if (diffSummary.match(/(testimonial|review|featured[._-]?in|trusted[._-]?by)/i)) humanReview.push('Social-proof additions — verify all are real, attributable');
  if (diffSummary.match(/(award|nomination|emmy|webby)/i)) humanReview.push('Award claims — verify with original source');
  if (diffSummary.match(/(price|pricing|tier|plan)/i)) humanReview.push('Pricing changes — confirm match Stripe Price IDs in production');

  // 5. Branch + commit
  const date = new Date().toISOString().split('T')[0];
  const branch = (flags.branch as string) || `seo/audit-${date}`;
  const base = (flags.base as string) || 'main';
  try { runVoid(`git checkout -b ${branch}`, root); } catch {
    // Branch exists; switch to it
    try { runVoid(`git checkout ${branch}`, root); } catch (e) { failHard(`Could not create or switch to branch ${branch}`, e); }
  }
  runVoid('git add -A', root);
  runVoid(`git commit -m "seo: automated optimization run ${date}"`, root);

  // 6. Push
  runVoid(`git push -u origin ${branch}`, root);

  // 7. PR body
  const body = templatePrBody({
    date, before: beforeAvg, after: afterAvg, delta,
    validations, humanReview, risk,
    history: history.join('\n'),
  });

  // 8. Open PR via gh CLI if available
  const ghAvailable = (() => {
    const r = spawnSync('gh', ['--version'], { stdio: 'ignore' });
    return r.status === 0;
  })();

  if (ghAvailable) {
    runVoid(`gh pr create --title "seo: automated optimization run ${date}" --body "${body.replace(/"/g, '\\"')}" --base ${base} --label "risk: ${risk}"`, root);
  } else {
    console.log('');
    console.log('⚠ gh CLI not installed — cannot open PR automatically.');
    console.log(`Branch ${branch} pushed. Open PR manually with this body:`);
    console.log('');
    console.log('---');
    console.log(body);
    console.log('---');
  }
}

main().catch((err) => failHard('create-optimization-pr failed', err instanceof Error ? err.message : err));

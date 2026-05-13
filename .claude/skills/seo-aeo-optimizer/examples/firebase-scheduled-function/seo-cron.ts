/**
 * functions/src/seoCron.ts — Firebase Scheduled Function variant of the weekly SEO audit.
 *
 * For most apps, prefer the GitHub Actions cron at examples/github-actions-cron.yml
 * (it can directly open a PR; this one writes results to Firestore for a separate
 * GitHub Actions workflow to pick up).
 *
 * Deploy: firebase deploy --only functions:weeklySeoCron
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { execSync } from 'node:child_process';

initializeApp();

export const weeklySeoCron = onSchedule(
  {
    schedule: 'every monday 03:00',
    timeZone: 'America/New_York',
    retryCount: 1,
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (event) => {
    logger.info('Starting weekly SEO audit cron', { event });

    try {
      // Run the audit (this assumes the script + tsx are bundled; for production,
      // the audit script may need to be packaged with the function or run via a
      // separate worker invoked from here).
      const auditOutput = execSync(
        'npx tsx ~/.claude/skills/seo-aeo-optimizer/scripts/audit-site.ts --json',
        { encoding: 'utf-8' }
      );
      const audit = JSON.parse(auditOutput);

      // Write to Firestore for the GitHub Actions PR-creation workflow to consume
      const db = getFirestore();
      await db.collection('seoAudits').add({
        runAt: new Date(),
        triggerSource: 'firebase-scheduled-function',
        ...audit,
      });

      // Optional: notify on regression (score dropped vs last run)
      const recent = await db.collection('seoAudits').orderBy('runAt', 'desc').limit(2).get();
      if (recent.size === 2) {
        const [latest, previous] = recent.docs.map((d) => d.data());
        const delta = (latest.averageScore ?? 0) - (previous.averageScore ?? 0);
        if (delta < -3) {
          logger.warn(`SEO score regression: ${previous.averageScore} → ${latest.averageScore} (Δ${delta})`);
          // TODO: post to Slack / email / Sentry breadcrumb
        }
      }

      logger.info('SEO audit completed', { score: audit.averageScore });
    } catch (err) {
      logger.error('SEO audit cron failed', err);
      throw err; // Triggers Cloud Functions retry per retryCount config
    }
  }
);

/**
 * upload_to_firestore.js - Step 5 of the pipeline.
 *
 * Writes the validated brief to Firestore and appends an immutable
 * audit-log row. Emits a notification to the subject talent on every
 * create/refresh.
 *
 * Hard rules:
 *  - Audit row written BEFORE setting status: ready.
 *  - TTL via expiresAt = createdAt + 30 days.
 *  - Talent subject notification is non-negotiable per legal-language.md.
 *
 * Per safe-edit-policy: scaffold. Wire firebase-admin + GOOGLE_APPLICATION_CREDENTIALS
 * before running. NEVER push without Andrew's approval.
 */

import fs from 'node:fs';
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}
const db = getFirestore();

const TTL_DAYS = 30;
const PREFIX = process.env.RESEARCH_BRIEF_COLLECTION_PREFIX || '';
const NOTIF_COLLECTION =
  process.env.RESEARCH_BRIEF_NOTIFICATIONS_COLLECTION || 'talentNotifications';
const ANALYTICS_COLLECTION =
  process.env.RESEARCH_BRIEF_ANALYTICS_COLLECTION || 'analyticsEvents';
const SUBJECT_KIND = process.env.RESEARCH_BRIEF_SUBJECT_KIND || 'talent';

const BRIEFS = `${PREFIX}researchBriefs`;
const AUDIT = `${PREFIX}researchBriefAuditLog`;

export async function uploadBrief(briefPath) {
  const brief = JSON.parse(fs.readFileSync(briefPath, 'utf8'));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_DAYS * 24 * 60 * 60 * 1000);

  const briefDoc = {
    ...brief,
    createdAt: brief.createdAt || now.toISOString(),
    cacheRefreshedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    expiresAtTs: expiresAt,
  };

  const subjectId = brief.subjectId || brief.subjectTalentId; // backwards-compat

  // 1. Audit row FIRST (immutable).
  await db.collection(AUDIT).add({
    briefId: brief.briefId,
    subjectId,
    subjectKind: brief.subjectKind || SUBJECT_KIND,
    requestedBy: brief.requestedBy,
    requestedByOrg: brief.requestedByOrg,
    action: 'created',
    signalCount: (brief.signals || []).length,
    confidence: brief.confidence,
    loggedAt: FieldValue.serverTimestamp(),
  });

  // 2. Brief doc.
  await db.collection(BRIEFS).doc(brief.briefId).set(briefDoc, { merge: true });

  // 3. Subject notification (non-negotiable).
  await db.collection(NOTIF_COLLECTION).add({
    subjectId,
    subjectKind: brief.subjectKind || SUBJECT_KIND,
    kind: 'research_brief_generated',
    requestedByOrg: brief.requestedByOrg,
    briefId: brief.briefId,
    seen: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  // 4. Analytics event (analytics-event-map).
  await db.collection(ANALYTICS_COLLECTION).add({
    event: `${SUBJECT_KIND}_research_brief_created`,
    briefId: brief.briefId,
    subjectId,
    requestedByOrg: brief.requestedByOrg,
    confidence: brief.confidence,
    signalCount: (brief.signals || []).length,
    occurredAt: FieldValue.serverTimestamp(),
  });

  return { briefId: brief.briefId, status: 'persisted' };
}

const arg = process.argv[2];
if (arg) {
  uploadBrief(arg)
    .then((r) => console.log(JSON.stringify(r)))
    .catch((e) => {
      console.error(JSON.stringify({ error: e.message }));
      process.exit(1);
    });
}

#!/usr/bin/env node
/**
 * upload_to_firestore.js - Step 4 of the reality-casting-scout pipeline.
 *
 * Reads output/auto_listings.json + output/review_listings.json, upserts every
 * record into Firestore (project: casthub-1d833) under `castingCalls/{slug}`,
 * appends an immutable audit entry to `castingModerationLog`, and writes a run
 * summary line to output/scout_run_log.jsonl.
 *
 * Env:
 *   GOOGLE_APPLICATION_CREDENTIALS - path to service-account JSON
 *   FIREBASE_PROJECT_ID            - defaults to casthub-1d833
 *
 * Exports:
 *   uploadAll()  - for invocation from Firebase Scheduled Function or Cloud Run
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'casthub-1d833';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'output');
const AUTO_FILE = path.join(OUTPUT_DIR, 'auto_listings.json');
const REVIEW_FILE = path.join(OUTPUT_DIR, 'review_listings.json');
const RUN_LOG_FILE = path.join(OUTPUT_DIR, 'scout_run_log.jsonl');

function initAdmin() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID,
  });
}

function readJsonSafe(file) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    console.error(`[scout] failed to parse ${file}: ${err.message}`);
    return [];
  }
}

/**
 * Derive a stable content hash from the canonical identity fields of a
 * listing. Two records with the same show title + applyUrl are assumed to
 * be the same casting call even if they came from different sources.
 * Stored as `contentHash` on the Firestore doc and compared on each run
 * to skip unchanged records — prevents the scout from re-flooding the
 * moderation queue with listings that haven't changed since the last run.
 *
 * Hash is SHA-256 hex of a canonical string. Field order is fixed so the
 * hash is stable across runs even if the source object has different key
 * order. Whitespace-normalised + lowercased so minor formatting diffs in
 * the source don't bust the cache.
 *
 * PR F9 — content-hash dedup.
 */
function contentHash(record) {
  const canonical = [
    (record.showTitle || '').trim().toLowerCase(),
    (record.applyUrl  || '').trim().toLowerCase(),
    (record.network   || '').trim().toLowerCase(),
  ].join('|');
  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

/**
 * PR /99it Phase C3 — CD trust bump.
 *
 * If the listing's record.sourceHandle (set by the scraper when a
 * listing was discovered from a known IG/TikTok handle) matches an
 * approved or auto_approved casting director in castingDirectors/,
 * bump record.trustScore by that CD's trustBoostPoints (default 10).
 *
 * Slug match is via the same slugifyHandle pattern as
 * castingDirectorsRoutes.js. Cheap Firestore single-doc read per
 * listing; failure is fail-open (no bump rather than no upsert).
 */
async function applyCdTrustBump(db, record) {
  const handle = record.sourceHandle;
  if (!handle) return record;
  const slug = String(handle)
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  if (!slug) return record;

  try {
    const cdSnap = await db.collection('castingDirectors').doc(slug).get();
    if (!cdSnap.exists) return record;
    const cd = cdSnap.data();
    if (cd?.status !== 'approved' && cd?.status !== 'auto_approved') return record;

    const bumpPoints = typeof cd.trustBoostPoints === 'number' ? cd.trustBoostPoints : 10;
    const originalScore = record.trustScore ?? 0;
    const bumpedScore = Math.min(100, originalScore + bumpPoints);

    return {
      ...record,
      trustScore: bumpedScore,
      trustReasons: [
        ...(record.trustReasons || []),
        `+${bumpPoints} from approved CD @${cd.handle} (${cd.platform})`,
      ],
      cdTrustBumpApplied: true,
      cdTrustBumpSlug: slug,
      cdTrustBumpPoints: bumpPoints,
    };
  } catch (e) {
    console.warn(`[scout] CD trust-bump lookup failed for ${slug}:`, e?.message);
    return record;
  }
}

// Translate the Python scout's decision/status vocabulary into the
// canonical castingCalls.status values the rest of the backend reads.
// Pre-fix (2026-05-25 regression) the upload script wrote the raw
// Python values straight through, so 65 docs ingested today landed
// with statuses (pending_admin_review, auto_approve, quarantined) that
// no other reader queries for, stranding them in Firestore. The
// Railway-side scout (backend/realityCastingScoutJob.js) uses
// pending_review/published/quarantine — same shape as the moderation
// panel + publicCastingCallRoutes filters.
const STATUS_NORMALIZE = {
  pending_admin_review: 'pending_review',
  auto_approve:         'published',
  quarantined:          'quarantine',
};

function normalizeStatus(record) {
  const raw = record.status || record.decision || '';
  return STATUS_NORMALIZE[raw] || raw;
}

async function upsertCasting(db, record, runId) {
  const slug = record.slug;
  if (!slug) {
    console.warn('[scout] skipping record with no slug:', record.showTitle);
    return { skipped: true };
  }

  // PR /99it Phase C3 — CD trust bump runs BEFORE the state-preservation
  // guard so the refreshed trustScore lands on admin-mutated rows too
  // (admins want updated scores even when status is locked).
  record = await applyCdTrustBump(db, record);

  const ref = db.collection('castingCalls').doc(slug);
  const snap = await ref.get();
  const isNew = !snap.exists;
  const now = admin.firestore.FieldValue.serverTimestamp();

  // PR F9: content-hash dedup — skip the upsert if the listing hasn't
  // changed since the last run. A listing is "unchanged" when:
  //   1. The doc already exists (isNew === false)
  //   2. The stored contentHash matches the current record's hash
  //   3. The doc was written less than 7 days ago
  // This prevents the same pending-review listing from re-appearing in
  // the moderation queue on every scout run until an admin resolves it.
  const currentHash = contentHash(record);
  if (!isNew) {
    const existing = snap.data();
    const ageMs = existing?.updatedAt?.toMillis
      ? Date.now() - existing.updatedAt.toMillis()
      : Infinity;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (existing?.contentHash === currentHash && ageMs < sevenDaysMs) {
      console.log(`[scout] dedup skip: ${slug} (hash=${currentHash.slice(0,8)}, age=${Math.round(ageMs/3600000)}h)`);
      return { slug, isNew: false, decision: record.decision, deduped: true };
    }
  }

  // PR B — state-preservation guard. Without this, an admin who has
  // already approved a listing (status:'approved' + publicVisible:true)
  // would see those fields silently flipped back to the scout-computed
  // values (publicVisible:false for pending listings) on the next cron
  // run. Admin intent must beat scraper output once a human has touched
  // the row.
  //
  // Sentinel set: any row whose status was set by an admin (approved,
  // rejected, or dismissed) keeps its admin-set status + publicVisible
  // forever. Refresh only the metadata that's safe to update: trust
  // score (it can improve as more sources corroborate), lastSeenAt
  // (proves the listing is still live in source), description (admins
  // sometimes want the latest copy), and the rolling sourcesSeen union.
  const ADMIN_TERMINAL_STATUSES = new Set(['approved', 'rejected', 'dismissed']);
  const existingData = isNew ? null : snap.data();
  const isAdminMutated = !!existingData && ADMIN_TERMINAL_STATUSES.has(existingData.status);

  const fullPayload = {
    slug,
    contentHash: currentHash,
    showTitle: record.showTitle,
    network: record.network || '',
    castingCompany: record.castingCompany || '',
    description: record.description || '',
    applyUrl: record.applyUrl || '',
    deadline: record.deadline || '',
    location: record.location || '',
    pay: record.pay || '',
    sourceUrl: record.sourceUrl || '',
    sourceTier: record.sourceTier || 0,
    sourcesSeen: record.sourcesSeen || [],
    tags: record.tags || [],
    status: normalizeStatus(record),
    decision: record.decision,
    // scrapedAt / scrapedAtIso are required by the moderation panel's
    // onSnapshot orderBy('scrapedAt','desc') — without them the docs
    // are silently excluded from the panel even when status is right.
    scrapedAt:    now,
    scrapedAtIso: new Date().toISOString(),
    scrapedFrom:  record.scrapedFrom || record.sourceLabel || 'github-actions-scout',
    publicVisible: !!record.publicVisible,
    adminApprovalRequired: !!record.adminApprovalRequired,
    trustScore: record.trustScore ?? 0,
    trustTier: record.trustTier || 'low',
    trustReasons: record.trustReasons || [],
    redFlags: record.redFlags || [],
    buzzwordsMatched: record.buzzwordsMatched || [],
    moderatedAt: record.moderatedAt || new Date().toISOString(),
    updatedAt: now,
    lastRunId: runId,
  };

  // For admin-mutated rows, build a narrower payload that does NOT
  // include status/publicVisible/decision/adminApprovalRequired/moderatedAt.
  // Those four are the admin's prerogative. We still update trustScore,
  // tags, sourcesSeen, description, deadline, pay, lastRunId, updatedAt,
  // and contentHash so the row stays current as the source evolves.
  const adminSafePayload = isAdminMutated ? {
    slug,
    contentHash: currentHash,
    description: record.description || existingData.description || '',
    deadline: record.deadline || existingData.deadline || '',
    pay: record.pay || existingData.pay || '',
    tags: record.tags || existingData.tags || [],
    trustScore: record.trustScore ?? existingData.trustScore ?? 0,
    trustTier: record.trustTier || existingData.trustTier || 'low',
    trustReasons: record.trustReasons || [],
    sourcesSeen: record.sourcesSeen || [],
    updatedAt: now,
    lastRunId: runId,
    lastSeenInScrape: now,
  } : null;

  const payload = adminSafePayload || fullPayload;
  if (isNew) payload.createdAt = now;

  await ref.set(payload, { merge: true });

  if (isAdminMutated) {
    console.log(`[scout] state-preserved: ${slug} kept admin status=${existingData.status} (refreshed trust + lastSeen only)`);
  }

  return {
    slug,
    isNew,
    decision: record.decision,
    statePreserved: isAdminMutated,
  };
}

async function logModeration(db, record, isNew, runId) {
  await db.collection('castingModerationLog').add({
    castingSlug: record.slug,
    showTitle: record.showTitle,
    decision: record.decision,
    trustScore: record.trustScore ?? 0,
    trustTier: record.trustTier || 'low',
    trustReasons: record.trustReasons || [],
    redFlags: record.redFlags || [],
    isNew,
    loggedAt: admin.firestore.FieldValue.serverTimestamp(),
    runId,
    actor: 'reality-casting-scout',
  });
}

function appendRunLog(summary) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.appendFileSync(RUN_LOG_FILE, JSON.stringify(summary) + '\n');
}

async function uploadAll() {
  initAdmin();
  const db = admin.firestore();
  const runId = `run_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const startedAt = new Date().toISOString();

  const auto = readJsonSafe(AUTO_FILE);
  const review = readJsonSafe(REVIEW_FILE);
  const all = [...auto, ...review];

  console.log(`[scout] runId=${runId} project=${PROJECT_ID} records=${all.length} (auto=${auto.length} review=${review.length})`);

  let newCount = 0;
  let updatedCount = 0;
  let quarantinedCount = 0;
  let socialFlaggedCount = 0;
  const errors = [];

  for (const record of all) {
    try {
      const { isNew, decision, skipped, deduped } = await upsertCasting(db, record, runId);
      if (skipped) continue;
      // PR F9: skip moderation log for deduped unchanged records — prevents
      // the same pending listing from re-queueing on every run.
      if (deduped) continue;
      await logModeration(db, record, isNew, runId);
      if (isNew) newCount++; else updatedCount++;
      if (decision === 'quarantined') quarantinedCount++;
      if ((record.trustReasons || []).some((r) => r.startsWith('social-only'))) socialFlaggedCount++;
    } catch (err) {
      console.error(`[scout] upload failed for ${record.slug}:`, err.message);
      errors.push({ slug: record.slug, error: err.message });
    }
  }

  const summary = {
    runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    projectId: PROJECT_ID,
    counts: {
      total: all.length,
      newRecords: newCount,
      updatedRecords: updatedCount,
      autoApproved: auto.length,
      pendingReview: review.filter((r) => r.decision === 'pending_admin_review').length,
      quarantined: quarantinedCount,
      socialFlagged: socialFlaggedCount,
    },
    errorCount: errors.length,
    errors,
  };

  appendRunLog(summary);
  console.log('[scout] run summary:', JSON.stringify(summary.counts));

  // PR A3 — durable observability. Persist every run's summary to
  // Firestore so /admin/scout-health (next phase) can graph success
  // rate without depending on GitHub artifact retention (30d). Best
  // effort — failure here must not break the run, but is logged so
  // the operator sees the gap.
  try {
    await db.collection('scoutRunLog').doc(runId).set({
      ...summary,
      startedAt: admin.firestore.Timestamp.fromDate(new Date(summary.startedAt)),
      finishedAt: admin.firestore.Timestamp.fromDate(new Date(summary.finishedAt)),
    });
  } catch (e) {
    console.error('[scout] scoutRunLog write failed:', e.message);
  }

  // PR A3 — 0-listings alert. Four consecutive cron runs (2026-05-13/16/18/21)
  // produced 0 listings without anyone noticing because the workflow
  // exited 0. Loudest possible alert with no new infra: exit non-zero
  // so the workflow turns red. Andrew already gets GH Actions failure
  // emails; that's the alerting path until the full errorEscalations
  // wiring lands in Phase F (auto-heal).
  //
  // Also write a one-doc breadcrumb to appHealth so the AdminSettingsHub
  // health card can surface the zero-yield run without trawling logs.
  if (summary.counts.total === 0) {
    try {
      await db.collection('appHealth').doc(`scout-zero-yield-${runId}`).set({
        service: 'reality-casting-scout',
        severity: 'high',
        runId,
        message: 'Scout produced 0 listings — selectors may have drifted or all sources blocked/dead.',
        observedAt: admin.firestore.FieldValue.serverTimestamp(),
        runArtifact: `https://github.com/jayhawkrules/CastHub1/actions`,
      });
    } catch (e) {
      console.error('[scout] appHealth write failed:', e.message);
    }
    console.warn('[scout] WARNING: 0 listings produced this run. appHealth row written; scout-health admin panel will surface persistent zeros.');
    return { ...summary, zeroYield: true };
  }

  return summary;
}

if (require.main === module) {
  uploadAll()
    .then((result) => {
      // 2026-05-25 (Andrew): zero-yield was making EVERY manual run go
      // red even when 0 listings was legitimate (e.g. Playwright off,
      // sources between drops, weekend lull). The appHealth row +
      // scout-health admin panel are the right surfaces for "sources
      // are stuck" detection — they distinguish a one-off zero from
      // N-consecutive-zero. Exit 0 here keeps the workflow's overall
      // status green when the underlying scrape pipeline completed
      // cleanly even if it found nothing.
      //
      // FATAL errors still exit 1 below. Zero-yield is now a warning,
      // not a failure.
      process.exit(0);
    })
    .catch((err) => {
      console.error('[scout] fatal:', err);
      process.exit(1);
    });
}

module.exports = { uploadAll };

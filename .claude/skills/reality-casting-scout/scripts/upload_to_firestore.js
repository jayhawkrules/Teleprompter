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

async function upsertCasting(db, record, runId) {
  const slug = record.slug;
  if (!slug) {
    console.warn('[scout] skipping record with no slug:', record.showTitle);
    return { skipped: true };
  }

  const ref = db.collection('castingCalls').doc(slug);
  const snap = await ref.get();
  const isNew = !snap.exists;
  const now = admin.firestore.FieldValue.serverTimestamp();

  const payload = {
    slug,
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
    status: record.status || record.decision,
    decision: record.decision,
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

  if (isNew) payload.createdAt = now;

  await ref.set(payload, { merge: true });
  return { slug, isNew, decision: record.decision };
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
      const { isNew, decision, skipped } = await upsertCasting(db, record, runId);
      if (skipped) continue;
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
  return summary;
}

if (require.main === module) {
  uploadAll()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[scout] fatal:', err);
      process.exit(1);
    });
}

module.exports = { uploadAll };

/**
 * summarise_brief.js - Step 4 of the pipeline.
 *
 * Sends scored signals to Claude with the version-pinned system prompt,
 * receives a 2-paragraph narrative + bullets + redFlags. Validates
 * output against the locked rules before persisting.
 *
 * Per safe-edit-policy: scaffold. Wire ANTHROPIC_API_KEY before running.
 * Per claude-api skill: enable prompt caching on the system prompt block.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

const LEGAL_BANNER_VERSION = 'v1-2026-05';
const REQUIRED_CLOSING_SENTENCE =
  'This brief is public-internet research, not a background check. For employment decisions, run a check via a regulated provider.';

const BANNED_PHRASES = [
  /criminal record/i,
  /conviction/i,
  /\barrest\b/i,
  /\bcharge[ds]?\b/i,
  /\bvetted?\b/i,
  /\bcleared\b/i,
  /\bverified\b(?!\s+(?:instagram|tiktok|account))/i,
  /background check/i,
  /screening/i,
  /risk score/i,
  /pass\/fail/i,
];

// Preamble is the only app-configurable sentence in the system prompt.
// Adopters override via env. Default matches CastHub1 (Mythie).
const PROMPT_PREAMBLE =
  process.env.RESEARCH_BRIEF_PROMPT_PREAMBLE ||
  'You are a research assistant for Mythie, a reality-TV casting platform. You are summarising a "research brief" - an aggregation of publicly-available information about a talent profile - for a casting team that is considering the talent for a project.';

const SYSTEM_PROMPT = `${PROMPT_PREAMBLE}

This brief is PUBLIC-INTERNET RESEARCH ONLY. It is NOT a background check, screening tool, or consumer report. The requesting team is using it the way a careful researcher would use a Google search before a decision: to get a sense of the public footprint, not to make eligibility decisions.

ABSOLUTE RULES - violation invalidates the brief:

1. Never characterise any litigation reference as a criminal record, conviction, charge, or arrest, even if the underlying record could be interpreted that way. Use phrasing like "appears as a party in a public civil docket" or "publicly referenced in a court filing".

2. Never infer mental health, sexuality, religion, immigration status, medical condition, political affiliation, or membership in any protected class.

3. Never combine multiple signals to draw a conclusion that the individual signals do not support. If two signals are merely co-located in time or geography, do not infer a relationship.

4. If a signal's identityMatchConfidence is below 0.80, prefix every reference to it with "possibly the same person:" and explicitly note the uncertainty.

5. Every factual claim in your narrative must cite the originating signal by its signal_id (format: [s.{signal_id}]).

6. Tone: neutral, descriptive, journalistic. Never editorialise. Never use words like "concerning", "alarming", "impressive", "respected", "questionable".

7. Length: a 2-paragraph narrative (max 180 words total), followed by 3-7 bullet findings. No more.

8. End EXACTLY with this sentence, verbatim:

   "${REQUIRED_CLOSING_SENTENCE}"

INPUTS: You will receive a JSON object with the talent's on-file profile (name, city, profession) and an array of scored signals, each with: signal_id, source, sourceTier, kind, content, url, identityMatchConfidence, retrievedAt.

OUTPUT: A JSON object with three keys:
- narrative: string (2 paragraphs, max 180 words, citing signal IDs)
- bullets: string[] (3-7 items, each a single factual finding citing 1+ signal IDs)
- redFlags: string[] (factual public signals a careful casting team would want to discuss with the talent; never an inferred characterisation)

Return ONLY the JSON object. No preamble, no commentary.`;

function validate(output, signals) {
  if (!output || typeof output !== 'object') return ['empty_output'];
  const issues = [];
  const text = `${output.narrative || ''} ${(output.bullets || []).join(' ')} ${(output.redFlags || []).join(' ')}`;

  for (const re of BANNED_PHRASES) {
    if (re.test(text)) issues.push(`banned_phrase:${re}`);
  }

  if (!output.narrative || output.narrative.trim().split(/\s+/).length > 180) {
    issues.push('narrative_too_long_or_missing');
  }

  if (!(output.bullets || []).length || output.bullets.length > 7) {
    issues.push('bullet_count_out_of_range');
  }

  if (!output.narrative.trim().endsWith(REQUIRED_CLOSING_SENTENCE)) {
    issues.push('closing_sentence_missing');
  }

  const signalIds = new Set(signals.map((s) => s.signal_id));
  const cited = new Set([...text.matchAll(/\[s\.([^\]]+)\]/g)].map((m) => m[1]));
  for (const id of cited) {
    if (!signalIds.has(id)) issues.push(`unknown_signal_cited:${id}`);
  }

  for (const s of signals) {
    if (s.identityMatchConfidence < 0.8) {
      const ref = new RegExp(`possibly the same person.*?\\[s\\.${s.signal_id}\\]`, 'i');
      if (text.includes(`[s.${s.signal_id}]`) && !ref.test(text)) {
        issues.push(`low_confidence_signal_unflagged:${s.signal_id}`);
      }
    }
  }

  return issues;
}

async function summarise(scoredPath) {
  const scored = JSON.parse(fs.readFileSync(scoredPath, 'utf8'));
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const subject = {
    name: scored.subject?.name || '(redacted)',
    city: scored.subject?.city,
    profession: scored.subject?.profession,
  };

  const response = await client.messages.create({
    model: process.env.RESEARCH_BRIEF_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: JSON.stringify({ subject, signals: scored.signals }),
      },
    ],
  });

  const raw = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { briefId: scored.briefId, status: 'failed', issues: ['model_returned_non_json'] };
  }

  const issues = validate(parsed, scored.signals);
  if (issues.length) {
    return { briefId: scored.briefId, status: 'failed', issues };
  }

  const brief = {
    ...scored,
    aiSummaryNarrative: parsed.narrative,
    aiSummaryBullets: parsed.bullets,
    aiRedFlags: parsed.redFlags || [],
    legalBannerVersion: LEGAL_BANNER_VERSION,
    partnerCraCta: {
      label: 'Run a regulated check',
      href: process.env.PARTNER_CRA_URL || 'https://mythie.app/help/regulated-background-checks',
    },
    status: 'ready',
    summarisedAt: new Date().toISOString(),
  };

  const outPath = path.join(OUTPUT_DIR, `brief_${scored.briefId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(brief, null, 2));
  return { briefId: scored.briefId, status: 'ready', out: outPath };
}

const arg = process.argv[2];
if (!arg) {
  console.error('usage: node summarise_brief.js <scored.json>');
  process.exit(1);
}

summarise(arg)
  .then((r) => console.log(JSON.stringify(r)))
  .catch((e) => {
    console.error(JSON.stringify({ error: e.message }));
    process.exit(1);
  });

---
name: reality-casting-scout
description: Scrapes, scores, and uploads reality TV casting calls for Mythie (CastHub1). Auto-publishes high-trust listings to Firestore castingCalls collection. Routes low-trust and social-sourced listings to the Mythie admin review queue. Run every 3 days or on demand. Trigger phrases - "run the casting scout", "find new casting calls", "update casting listings", "scout casting calls for Mythie".
version: 2.0.0
last_reviewed: 2026-05-13
expires: 2026-11-01
primary-app: CastHub1 (Mythie)
repo: jayhawkrules/CastHub1
firebase-project: casthub-1d833
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Bash, WebFetch]
trigger_cadence: every 3 days (cron 0 8 */3 * *)
---

## v2.3 (2026-05-17) — trusted-apply-URL boost (PR BM)

> **Andrew's directive 2026-05-17:** *Social media search for casting calls is likely to be the main way producers find legitimate calls in 2026 — but the legitimacy floor on a posting is the apply form, not the platform it was discovered on.*

`TRUSTED_APPLY_DOMAINS` lists casting-industry intake forms that vouch for a listing's legitimacy regardless of the discovery surface. A Tier 4 (social) listing whose `applyUrl` lands on one of these gets `+30` (`WEIGHTS['trusted_apply_domain']`) and lifts the social-only score cap from `40` to `SOCIAL_ONLY_TRUSTED_APPLY_CAP = 75`.

Domains as of v2.3:

- `castitreach.com` — Magical Elves / Truly Original intake
- `castingcrane.com` — 2025+ specialist platform
- `castingnetworks.com` — industry standard talent + jobs
- `projectcasting.com` — reality-TV-focused aggregator
- `backstage.com` — large general aggregator
- `castingfrontier.com` — cross-platform with castingnetworks
- `stage32.com` — indie / unscripted
- `mandy.com` — UK-leaning
- `auditionsfree.com`, `lacasting.com` — Tier 2 overlap

**Explicitly excluded** (hub redirects, not forms — `AGGREGATOR_HUB_DOMAINS`): `linktr.ee`, `linkin.bio`, `beacons.ai`, `bio.link`, `lnk.bio`, `carrd.co`, `msha.ke`. A social post whose `applyUrl` is `linktr.ee/foo` isn't applying TO linktr.ee — it's redirecting somewhere; the trust signal must land on the actual form.

**Whitelist seed for admin UI** (`castingTrustedSourcesRoutes` accepts this shape):

```json
[
  { "type": "whitelist", "identifierKind": "domain", "identifier": "castitreach.com" },
  { "type": "whitelist", "identifierKind": "domain", "identifier": "castingcrane.com" },
  { "type": "whitelist", "identifierKind": "domain", "identifier": "castingfrontier.com" },
  { "type": "whitelist", "identifierKind": "domain", "identifier": "stage32.com" },
  { "type": "whitelist", "identifierKind": "domain", "identifier": "mandy.com" }
]
```

Tier 3 of `TRUSTED_DOMAINS` also gained the same four (`castingcrane`, `castingfrontier`, `mandy`, `stage32`) — v2 changelog promised them, never shipped, finally landed.

## v2 (2026-05-13) — what changed and why

The first production run on 2026-05-13 returned **0 raw listings** across every Tier-1 network: ABC / Netflix / CBS / NBC returned 200 but parsed empty (listings are client-rendered SPAs the plain `requests` scraper can't see); Bravo / MTV returned 404 (URLs retired); Discovery returned 403 (bot-blocked). v2 rebuilds the source side around that reality.

Concretely:

1. **Browser-like headers.** v1 sent `User-Agent: MythieCastingScout/1.0` which invited the Discovery 403. v2 rotates among real Chrome UAs + sends Accept-Language / Accept-Encoding the way a browser does. Polite (1.5s + jitter) but doesn't announce itself as a bot.
2. **Per-source engine flag.** Each row in `SOURCES` now declares `engine: "requests"` or `engine: "playwright"`. JS-rendered network sites use the Playwright engine; aggregators (Project Casting, Backstage, Mandy, etc.) stay on `requests`. The Playwright engine is opt-in via `--with-playwright` so a no-Chromium environment can still run the aggregator-only fast path.
3. **Retry + backoff** on 429 / 503 with exponential delay + jitter — handles transient rate-limiting on real aggregators without ditching the source.
4. **Per-source `status` column** (`working` / `verify` / `dead` / `js-required`) — the scraper logs the status alongside the listing count so the operator sees decay before listings disappear. `dead` sources are skipped automatically; the references manifest carries a note about why.
5. **New 2026-era aggregator sources** added to the manifest: Stage 32, Casting Crane, Casting Frontier, Mandy. These are 2025+ platforms that didn't exist when v1 was written.
6. **Known-dead URLs documented** in `references/sources.md` so v3 doesn't re-add them without research.

**Aggregator-first** is the v2 mantra: Tier-2 platforms are purpose-built to be machine-readable. They're where the real volume lives. Tier-1 networks now run on a slower (weekly) Playwright cadence — JS rendering is expensive, network pages turn over slowly, and the same listings appear on Tier 2 aggregators a day or two later.

**Still TODO** (next refinement cycle):

- Selector reality-check: even with Playwright rendering, the current `.casting-call, article.casting, .show-card` CSS selectors are guesses. Each Tier-1 parser needs its selectors validated against actual rendered HTML after the first Playwright-enabled run.
- RSS feed support for sources that publish one (Project Casting historically had `?rss=1`). Cheaper + more stable than HTML scraping.
- Trusted casting-director social handles list: Andrew to curate (see references/sources.md Tier 4).

---

# Reality Casting Scout

Scrapes trusted reality TV casting sources, scores each listing for trustworthiness, auto-publishes high-confidence listings to the Mythie public site, and routes the rest to a moderation queue for admin review.

> **Always load `safe-edit-policy` first.** This skill writes to two Firestore collections - `castingCalls` and `castingModerationLog` - in a live Mythie project. Without the safety contract loaded, a bad run can publish unverified listings to the public site.

## Overview - 5-step pipeline

1. **Scrape** -> `scripts/scrape_sources.py` pulls raw listings from Tier 1-3 sources with polite rate-limiting.
2. **Normalise** -> `scripts/normalise.py` deduplicates, extracts deadlines/pay, auto-tags by genre.
3. **Score & Triage** -> `scripts/score_trust.py` assigns trustScore, trustTier, decision, redFlags, trustReasons.
4. **Upload** -> `scripts/upload_to_firestore.js` upserts every record to `castingCalls`, sets `publicVisible` per decision, writes an immutable audit entry to `castingModerationLog`, appends to `output/scout_run_log.jsonl`.
5. **Admin Review** -> Pending listings appear at `/admin/casting-review` in the Mythie app for human approval.

This skill runs inside the CastHub1 Claude Code terminal or from the shared claude-skills hub.

## Trusted Source Tiers

### Tier 1 - official networks (auto-trust)
abc.com, bravotv.com, netflix.com, cbs.com, nbc.com, mtv.com, discovery.com, tlc.com, hbo.com, hulu.com, fox.com, peacocktv.com, paramountplus.com

### Tier 2 - industry aggregators (auto-trust if score >= 85)
projectcasting.com, backstage.com, castingnetworks.com, auditionsfree.com, lacasting.com

### Tier 3 - specialist platforms
castlyst.com, castitreach.com, realitytalentsearch.com

### Tier 4 - social (manual QA only, never auto-publish)
Instagram / TikTok / Facebook handles: `@castingrealitytv`, `@castingwithkeicon`, `@aintthatsomethingentertainment`

Full source list: `references/sources.md`.

## Step 1 - Scrape

Run `scripts/scrape_sources.py`. Targets Tier 1-3 sources with browser-like headers + 1.5s polite rate-limit (jittered) between requests. Retries on 429/503 with exponential backoff.

Flags:
- `--tier <1|2|3>` — limit to a tier
- `--max <N>` — cap listings per source (useful during a sanity-check run)
- `--with-playwright` — also run JS-rendered sources (network sites). Requires `pip install playwright && playwright install chromium`. Without this flag, `engine: playwright` sources are skipped and the run is aggregator-only (fast, no Chromium download).

Output: `output/raw_listings.json`.

Recommended cadence:
- **Every 3 days:** aggregator-only run (no `--with-playwright`). Fast, no extra deps.
- **Weekly:** full run including `--with-playwright`. Catches the network-direct listings that aggregators may not pick up. The GitHub Actions workflow at `.github/workflows/casting-scout.yml` should install Playwright on this slower cadence.

## Step 2 - Normalise

Run `scripts/normalise.py`. Deduplicates by slugified `showTitle`. Extracts:

- `deadline` - via `dateparser` on phrases like "apply by", "deadline", "submit by", "closes"
- `pay` - regex on `£/$/€` amounts plus terms like "paid", "per person", "per episode"
- `tags[]` - keyword matching for `dating`, `competition`, `cooking`, `talent`, `game-show`, etc.

At end, calls `score_trust.normalise_and_score()` and writes:

- `output/auto_listings.json` - decision == auto_approve
- `output/review_listings.json` - decision == pending_admin_review or quarantined

## Step 3 - Score & Triage

Run `scripts/score_trust.py`. Each record receives:

| Field | Type | Meaning |
|---|---|---|
| `trustScore` | int 0-100 | weighted sum of signals |
| `trustTier` | high / medium / low / quarantined | bucketed from score + flags |
| `decision` | auto_approve / pending_admin_review / quarantined | terminal verdict |
| `trustReasons[]` | string[] | positive signals (e.g. "tier 1 network domain") |
| `redFlags[]` | string[] | matched red-flag patterns |
| `publicVisible` | bool | the gate that controls Mythie frontend visibility |
| `adminApprovalRequired` | bool | true unless auto_approved |
| `moderatedAt` | ISO timestamp | when the decision was made |

### Thresholds

| Score | Decision | publicVisible |
|---|---|---|
| >= 85 | auto_approve | true |
| 0-84 | pending_admin_review | false |
| any hard red flag match | quarantined | false (permanent) |

### Hard red flag patterns (auto-quarantine, score ignored)

```
pay.*fee
admin.*fee
secure your spot
registration.*cost
send.*money
upfront.*payment
headshot.*package.*required
pay to audition
pay.*apply
```

### Social source rule

Listings sourced from Instagram, TikTok, or Facebook are capped at `pending_admin_review` even if score >= 85, **unless** the same `showTitle` is also confirmed on a Tier 1 or Tier 2 source within the same run.

Full pattern + weight reference: `references/admin-queue.md`.

## Step 4 - Upload to Firestore

Run `scripts/upload_to_firestore.js`. Uses `firebase-admin` against project `casthub-1d833`.

For each record:

1. Upsert into `castingCalls/{slug}`:
   - On insert: set `createdAt`
   - On every write: set `updatedAt`
   - Always set: `status`, `publicVisible`, `adminApprovalRequired`, `trustScore`, `trustTier`, `trustReasons`, `redFlags`, `moderatedAt`
2. Append an immutable doc to `castingModerationLog/{auto-id}`:
   - `castingSlug`, `showTitle`, `decision`, `trustScore`, `trustTier`, `trustReasons`, `redFlags`, `isNew`, `loggedAt`, `runId`
3. Write run summary to `output/scout_run_log.jsonl`.

Exports `uploadAll()` for invocation from a Firebase Scheduled Function or Cloud Run job.

## Step 5 - Admin Review

The Mythie admin UI lives at `/admin/casting-review`. Admin sees:

- `showTitle`, `network`, `description`, `applyUrl`
- `trustScore`, `trustTier`, `trustReasons`, `redFlags`
- Approve button -> sets `status: approved`, `publicVisible: true`, writes audit entry
- Reject button -> sets `status: rejected`, leaves `publicVisible: false`, writes audit entry
- Both actions append to `castingModerationLog`

Quarantined records show in a separate "Blocked" tab and cannot be approved.

## Scheduling

Three options (full detail in `references/scheduling.md`):

1. **Firebase Scheduled Function** (recommended) - `onSchedule('0 8 */3 * *')` in `functions/index.ts`
2. **Google Cloud Scheduler** + Cloud Run job invoking `uploadAll()`
3. **Manual** - paste a trigger phrase into the CastHub1 Claude Code terminal

Cron: `0 8 */3 * *` (every 3 days at 08:00 UTC). Peak casting seasons - **May upfronts** and **November sweeps** - warrant daily manual runs.

## Hard rules

1. Never auto-publish any listing whose only source is a social platform.
2. Never publish any listing matching a hard red-flag pattern, regardless of score.
3. Always write to `castingModerationLog` *before* setting `publicVisible: true`.
4. Never delete quarantined records - they are kept for audit and pattern learning.
5. Per `safe-edit-policy`: surface every file change as a manual task; never push without Andrew's approval.

## Output files

| File | Purpose |
|---|---|
| `output/raw_listings.json` | Step 1 output - scraped, un-normalised |
| `output/normalised_listings.json` | Step 2 output - deduped, tagged |
| `output/auto_listings.json` | Records that auto-approved |
| `output/review_listings.json` | Records pending admin review or quarantined |
| `output/scout_run_log.jsonl` | One JSON-per-line summary of every run |

## Composes with

- `safe-edit-policy` - load first
- `firestore-rbac-helpers` - `castingCalls.rules` and `castingModerationLog.rules` should both be `default-deny + admin-write-only`
- `vendor-consolidation-policy` - no new vendors required; uses existing Firebase admin SDK
- `analytics-event-map` - emit `casting_call_published`, `casting_call_quarantined`, `casting_call_admin_approved`
- `skill-auto-heal` - monthly check for dead source URLs

---
name: casting-research-brief
description: Reusable, portfolio-wide skill that generates an AI-summarised "research brief" on a subject profile (default subject term - "talent") from public-internet and on-file signals (press, public litigation references, sanctions/OFAC, social presence, identity-match sanity). This is **not** a background check, screening tool, or consumer report under the FCRA; it surfaces what a careful researcher would find in a thorough public-internet search, packaged consistently. Reference implementation - CastHub1 (Mythie), product-facing name "AI Talent Research", gated to the paid casting-team tier because each brief consumes Claude tokens + paid third-party API calls. Other portfolio apps adopt via `references/adoption-config.md`. Trigger phrases - "run AI Talent Research on {name}", "research this talent", "generate a research brief for {profile}", "build a pre-casting brief".
version: 1.1.0
last_reviewed: 2026-05-12
expires: 2026-11-12
reference_implementations:
  - app: CastHub1 (Mythie)
    repo: jayhawkrules/CastHub1
    firebase_project: casthub-1d833
    product_name: AI Talent Research
    subject_kind: talent
    plan_tier_min: casting_pro
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Bash, WebFetch]
classification: PUBLIC_RESEARCH_ONLY
fcra_status: NOT_A_CONSUMER_REPORT
portable: true
---

# Casting Research Brief

> **Portable skill.** This is a reusable feature any portfolio app can adopt. The reference implementation is CastHub1 (Mythie) where the product is themed as **AI Talent Research**. Other apps configure their own product name, subject term, collection prefix, plan-tier minimum, and partner-CRA destination via `references/adoption-config.md`.

> Engineering / skill-folder name stays `casting-research-brief` for git history continuity.

Generates a structured, AI-summarised research brief on a **subject profile** (Mythie names this kind `talent`; other apps may name it `creator`, `candidate`, `applicant`, etc.) by combining on-file app data with public-internet signals. Designed for teams who already perform manual googling on a profile before a decision - this skill makes that pass repeatable, auditable, and faster, without becoming a regulated consumer report.

**Gated to a paid tier** in every adopting app because each brief consumes Claude tokens and paid third-party API calls. Free / trial workspaces see the entry point but cannot run a brief; they are routed to the upgrade flow per `references/ui-copy.md`.

> **Always load `safe-edit-policy`, `legal-compliance-guardian`, and `vendor-consolidation-policy` first.** This skill writes to a live Firestore collection, processes information about real people, and integrates third-party data APIs. Without those three contracts loaded, a bad run can expose Mythie to FCRA, state-CRA, defamation, or vendor-sprawl risk.

## What this is - and is NOT

This skill produces a **research brief** - a structured summary of publicly-available signals plus on-file profile data, with an AI-generated narrative summary. Every brief carries a locked, non-removable disclaimer banner.

| It IS | It is NOT |
|---|---|
| A repeatable "deeper Google search" a casting team would do anyway | A background check |
| Identity-match sanity (is the profile a real person?) | An identity verification service |
| Public-internet aggregation + Claude summary | A criminal-records lookup |
| Press / litigation-public-reference / sanctions snapshot | A consumer report under FCRA / state-CRA laws |
| Cached per talent for 7 days, auto-purged at 30 | A permanent dossier |
| Always paired with a "for employment decisions, run a full check via [partner]" CTA | A substitute for an authorised CRA pull |

**The legal posture:** Mythie does NOT use this brief to make eligibility decisions about employment, housing, credit, or insurance, and explicit product copy directs casting teams to a regulated CRA (Checkr / Certn / similar) when they need a real check. The brief is positioned as research, not screening.

## When to use

- A user on the adopting app's paid tier has surfaced a subject profile and wants the standard "due diligence Google pass" run for them automatically.
- The subject has consented to research-permitted at sign-up (per the app's ToS, modelled on `references/legal-language.md`) AND the requesting user has the configured research role (default: `{subject_kind}_research:read`, e.g. `talent_research:read`).
- Periodic refresh - briefs older than 7 days are stale; over 30 days are auto-purged.

## When NOT to use

- Any flow that would inform an employment, credit, housing, or insurance decision - that requires a real CRA. The UI must offer a partner-CRA CTA at every decision point.
- Subjects who have opted out of research-permitted in their privacy settings.
- Minors - hard block at the gather step.
- Users without the configured research role.
- Any adopting app that has not completed `references/adoption-config.md` (collection prefix, plan-tier mapping, partner-CRA destination, product theming).

## Integration quickstart (for an adopting Claude Code session)

If you are a Claude Code session in an adopting app's repo and you've just loaded this skill, here is your sequence:

1. **Load safety contracts first** - `safe-edit-policy`, `legal-compliance-guardian`, `vendor-consolidation-policy`. Surface every file change as a 🔧 Manual Task.
2. **Read `references/adoption-config.md` in full** - it is the integration contract.
3. **Confirm the adopting app's stack and subject term with the user** before any file edits. CastHub1 = `talent`. Other apps differ.
4. **Inspect the app's existing subject doc shape** against §2 of `adoption-config.md`. Surface a 🔧 Manual Task listing any missing fields (`privacy.allowResearch`, `dateOfBirth`, etc).
5. **Inspect the app's existing user/role/plan-tier shape** against §3. Surface 🔧 Manual Tasks for missing pieces.
6. **Write `firestore.rules` snippets** per §4 via `firestore-rbac-helpers` - do not modify other rules.
7. **Scaffold the UI surfaces** per §5 via `ui-design-web-apps` and `feature-scaffold` - one PR per surface is fine.
8. **Wire the env vars** per §1 - never commit secrets; surface as 🔧 Manual Task: "Andrew - add these env vars in {deploy env}".
9. **Add the two ToS clauses** per §6 - copy verbatim from `references/legal-language.md` v1-2026-05.
10. **Wire the regression test corpus** per `references/prompt-templates.md` into the app's CI gate before any production traffic.
11. **Open a coordinated PR** in the adopting app's repo. NEVER push without Andrew's approval per `safe-edit-policy`.

You do NOT modify this hub skill from the adopting app's session. If the integration uncovers a portability gap, surface it as a 🔧 Manual Task: "open a hub PR in claude-skills against `casting-research-brief`".

## Adoption configuration

Every adopting app provides the following via env + a small in-repo theme file. Full template at `references/adoption-config.md`.

| Setting | Env var | Example (Mythie) | Purpose |
|---|---|---|---|
| Product name | `RESEARCH_BRIEF_PRODUCT_NAME` | `AI Talent Research` | Shown in UI, banners, notifications |
| Subject term (singular) | `RESEARCH_BRIEF_SUBJECT_KIND` | `talent` | Drives event names, role names, copy substitutions |
| Collection prefix | `RESEARCH_BRIEF_COLLECTION_PREFIX` | `` (empty) | Namespaces Firestore collections in shared projects |
| Minimum plan tier | `RESEARCH_BRIEF_MIN_TIER` | `casting_pro` | Plan-tier gate |
| Plan tier ladder (JSON) | `RESEARCH_BRIEF_PLAN_TIERS` | `{"free":0,"trial":0,"casting_starter":1,"casting_pro":2,"casting_enterprise":3}` | App's plan-name → rank map |
| Partner-CRA label | `RESEARCH_BRIEF_PARTNER_CRA_LABEL` | `Run a regulated check` | CTA button copy |
| Partner-CRA URL | `RESEARCH_BRIEF_PARTNER_CRA_URL` | `https://mythie.app/help/regulated-background-checks` | CTA destination |
| Notifications collection | `RESEARCH_BRIEF_NOTIFICATIONS_COLLECTION` | `talentNotifications` | Where subject notifications are written |
| Anthropic model | `RESEARCH_BRIEF_MODEL` | `claude-haiku-4-5-20251001` | Summarisation model |
| Prompt preamble | `RESEARCH_BRIEF_PROMPT_PREAMBLE` | (Mythie default) | First sentence of the Claude system prompt; only app-configurable sentence in it |

The locked legal banner copy, banned-phrase list, banned product terms, identity-match thresholds, and the locked Claude system prompt are **NOT configurable per app** - they are the safety perimeter of the skill and must be identical across every adopter.

## Overview - 5-step pipeline

1. **Gate** -> `scripts/gather_signals.py --gate` confirms talent consent, requester role, age >= 18, no opt-out, and cache freshness.
2. **Gather** -> `scripts/gather_signals.py` queries the tiered source matrix in parallel, with rate-limits and per-source timeouts.
3. **Score** -> `scripts/score_brief.py` assigns an identity-match confidence to every signal, drops signals below the threshold, and computes an overall brief confidence.
4. **Summarise** -> `scripts/summarise_brief.js` sends the surviving signals to Claude with a locked system prompt (see `references/prompt-templates.md`) and returns a 2-paragraph narrative + bulleted findings.
5. **Persist** -> `scripts/upload_to_firestore.js` writes the brief to `researchBriefs/{briefId}`, appends an immutable audit row to `researchBriefAuditLog/{auto-id}`, and emits an analytics event.

## Source tiers

Full source matrix, cost notes, ToS posture, and API key sourcing in `references/data-sources.md`. Summary:

### Tier A - identity & sanctions (always-on, near-free)
- **OpenSanctions** - OFAC SDN + global PEP/sanctions. Free for non-commercial; paid tier for Mythie scale. Hard-flag signal.
- **Google Programmable Search Engine (PSE)** - bounded site list (LinkedIn public, Instagram public, TikTok public, X public, news outlets). 100 free queries/day, then $5/1000.

### Tier B - press & news (high-signal, low-noise)
- **GDELT 2.0** - free, global news event database. Fuzzy-matched against subject identifiers.
- **NewsAPI / Mediastack** - one paid vendor only, picked via `vendor-consolidation-policy`.

### Tier C - public litigation references (clearly framed, not "criminal records")
- **CourtListener (RECAP)** - free federal civil case search. Returns "public mention in PACER record" framed signals only. **Never** rendered as "criminal record".
- **Judyrecords** - free-ish federal + some state civil. Same framing rules.

### Tier D - social presence (sanity, not surveillance)
- **Instagram public profile fetch** - via Mythie's existing scraper allowance (already used by `reality-casting-scout` Tier 4).
- **TikTok public display** - rate-limited public web fetch only.
- **LinkedIn public profile** - via PSE indexed result, no scraping behind login.

### Tier E - explicitly excluded
The following are **never** queried, even if a casting team requests them:
- Sex offender registries (NSOPW and state registries) - using these for any form of screening is regulated and a misuse triggers state-AG action.
- Driving records / DMV - regulated under DPPA.
- Credit reports / credit headers - regulated under FCRA.
- Federal / state criminal records databases - regulated under FCRA + state-CRA laws.
- Paid people-search aggregators that re-package non-public data (Spokeo, BeenVerified, TruthFinder, Intelius) - both legally fraught and brand-damaging to associate Mythie with.

If a casting team needs any Tier E signal, the UI routes them to the partner-CRA flow.

## The identity-match gate

Every signal must pass an identity-match check before reaching the AI summary. `scripts/score_brief.py` computes a per-signal confidence using:

- Name token match (full + nicknames + alternates from Mythie profile)
- City / region match against Mythie profile
- Approximate age band match (from DOB, +/- 3 years)
- Profession / industry token co-occurrence
- Cross-source corroboration (signal appears in 2+ independent sources)

Signal thresholds:

| Confidence | Action |
|---|---|
| >= 0.80 | Include in brief, attribute clearly |
| 0.50 - 0.79 | Include behind a "possible match - verify" expand |
| < 0.50 | Drop silently |

A brief whose top signal is < 0.50 is returned to the requester as "insufficient public signal" - NOT as a blank report or an inferred-negative result. **Absence of signal is never reported as evidence.**

## The locked AI summary prompt

The Claude summarisation step uses a system prompt that is version-pinned and never user-editable (see `references/prompt-templates.md`). Hard rules baked into the prompt:

1. Never characterise any litigation reference as a criminal record, conviction, charge, or arrest.
2. Never infer mental health, sexuality, religion, immigration status, or political affiliation from any signal.
3. Never combine signals to draw a conclusion the individual signals do not support.
4. If a signal's identity match is < 0.80, prefix the narrative reference with "possibly the same person:".
5. Every claim in the narrative must cite the originating signal ID.
6. End every brief with the locked CTA: "This brief is public-internet research, not a background check. For employment decisions, run a check via [partner-CRA link]."

## Firestore schema

Collection names are namespaced by the `COLLECTION_PREFIX` env var (default: empty, producing the canonical names below). Multi-tenant deploys set `COLLECTION_PREFIX={app}_` (e.g. `casthub_`).

```
{prefix}researchBriefs/{briefId}
  subjectId              string       Subject profile ID in the adopting app
  subjectKind            string       e.g. "talent", "creator", "candidate"
  subjectFingerprint     string       sha256(name+dob+city) - cache key
  requestedBy            string       Requesting user UID
  requestedByOrg         string       Requesting workspace / org ID
  status                 enum         queued | running | ready | failed | insufficient_signal
  confidence             enum         high | medium | low | insufficient
  signals                array        See research_brief.schema.json
  aiSummaryNarrative     string       Claude output, 2 paragraphs max
  aiSummaryBullets       array<str>   3-7 bullet findings
  legalBannerVersion     string       Pinned version, e.g. "v1-2026-05"
  partnerCraCta          object       {label, href} - locked CTA
  createdAt              timestamp
  expiresAt              timestamp    createdAt + 30 days; TTL purges
  cacheRefreshedAt       timestamp    Last source-gather run

{prefix}researchBriefAuditLog/{autoId}
  briefId                string
  subjectId              string
  subjectKind            string
  requestedBy            string
  requestedByOrg         string
  action                 enum         created | refreshed | viewed | exported | purged
  signalCount            number
  confidence             enum
  loggedAt               timestamp    immutable
```

`firestore.rules` for both collections: `default-deny + role-gated read ({subject_kind}_research:read) + admin-only write` per `firestore-rbac-helpers`. Schema file: `schemas/research_brief.schema.json`. Subject-notification collection name is also configurable - see `references/adoption-config.md`.

## Plan gating

This feature is **not available on free / trial workspaces in any adopting app** because each run costs real money (Claude tokens + paid third-party API calls). The gate is enforced in two places:

1. **At the gate step** (`scripts/gather_signals.py` gate function) - rejects with reason `workspace_plan_below_tier` if `requester.workspacePlanTier` is below the adopting app's configured minimum. The plan-tier ladder is configurable per app via env (`RESEARCH_BRIEF_PLAN_TIERS`); default ladder is `free < trial < starter < pro < enterprise`. Mythie sets `RESEARCH_BRIEF_MIN_TIER=casting_pro`; other apps set their own.
2. **In the UI** - free / trial workspaces see the entry-point button but it renders disabled with a `Pro` (or app-equivalent) badge and the upsell copy from the adopting app's themed copy file.

Plan-tier billing decisions are owned by `monetization-readiness-review`; cost accounting per run is owned by `analytics-event-map` event `{subject_kind}_research_brief_created` with attached `costUsd` and `tokensUsed` fields.

## Rate limits & abuse prevention

Per-tier defaults (each adopting app maps these to its own plan names):

| Plan tier (canonical) | Briefs / month | Per-user daily cap | Notes |
|---|---|---|---|
| free / trial | 0 | — | Locked. Upsell only. |
| starter (optional) | 10 | 5 | Soft cap; overage upsell. |
| pro (default minimum tier for this feature) | 100 | 20 | Default. |
| enterprise | custom | custom | Negotiated. |

CastHub1 maps these to `casting_pro` / `casting_enterprise` etc. See `references/adoption-config.md` for other example mappings.

Other limits regardless of tier:

- **Per subject (any tier):** Max 1 brief per requester per 7 days. Subsequent requests return the cached brief.
- **Per workspace:** soft cap configurable; hard cap matches billing tier.
- **Subject notification:** When a brief is generated on a subject, an in-app notification is written to that subject's inbox using app-themed copy (Mythie: "A casting team ran AI Talent Research on your profile. [Privacy settings]."). This is non-negotiable per `legal-compliance-guardian/references/consent-and-acceptance-rules.md`.

## Hard rules

1. Never query a Tier E source, regardless of casting team request.
2. Never write to `researchBriefs` without a passing identity-match on at least one signal.
3. Never strip, obscure, or alter the locked legal banner or partner-CRA CTA.
4. Never run a brief on a profile where the subject's `dateOfBirth` shows age < 18.
5. Never run a brief on a profile where `subject.privacy.allowResearch === false`.
6. Never run a brief from a workspace below the configured paid tier; the gate step must reject with `workspace_plan_below_tier`.
7. Always write the immutable audit row BEFORE marking a brief `ready`.
8. Always notify the subject talent on every `created` and `refreshed` event.
9. Per `safe-edit-policy`: surface every file change as a manual task; never push without Andrew's approval.

## UI copy (locked - do not paraphrase in product)

`references/ui-copy.md` is the **Mythie / CastHub1 reference theme** for this skill. Other adopting apps maintain their own themed copy file at `references/ui-copy.{app}.md` (or in-repo), but must respect the universal non-negotiables below. Key non-negotiables:

- The product feature name in any adopting app must NOT include "Background Check", "Screening", "Vetting", or "Verified". The Mythie product name is **"AI Talent Research"**; other apps pick a name that respects the same posture (e.g. "AI Profile Research", "AI Pre-Hire Research") and document it in `references/adoption-config.md`.
- The brief screen header carries the banner: *"Public-internet research only. Not a background check. For employment decisions, use a regulated check."*
- The partner-CRA CTA is **always** present and prominent, not buried in a footer.
- The opt-out for talents is one click away from the talent profile privacy panel.
- Free / trial workspaces see the entry-point button disabled with the locked-state upsell copy. The button is never hidden - visibility-of-system-status per `ui-design-web-apps` Nielsen #1.

## Output files

| File | Purpose |
|---|---|
| `output/brief_{briefId}.json` | Step 4 output - the brief before persistence |
| `output/gather_{briefId}.json` | Step 2 output - raw signals before scoring |
| `output/brief_run_log.jsonl` | One JSON-per-line summary of every run |

## Composes with

- `safe-edit-policy` - load first
- `legal-compliance-guardian` - owns the consent rules, banner copy, and jurisdiction watchlist
- `vendor-consolidation-policy` - gates every new data API vendor before adoption
- `firestore-rbac-helpers` - `researchBriefs.rules` and `researchBriefAuditLog.rules`
- `analytics-event-map` - emit `{subject_kind}_research_brief_created`, `{subject_kind}_research_brief_viewed`, `{subject_kind}_research_brief_partner_cta_clicked`, `{subject_kind}_research_brief_subject_notified` (Mythie substitutes `subject_kind=talent`)
- `payment-webhook-safety` - if briefs are metered/billed, the metering integration is a webhook path
- `error-tracking-system` - third-party API failures emit to `clientErrors`
- `reality-casting-scout` - distinct skill (scouts inbound casting calls); this skill researches subject profiles. CastHub1-only sibling.
- `skill-auto-heal` - quarterly check for dead API endpoints and changed source ToS

## Glossary distinction with reality-casting-scout

| Question | reality-casting-scout | casting-research-brief |
|---|---|---|
| What is being scored? | Inbound **casting call listing** (a project) | A **talent profile** (a person) |
| Who is the subject? | A show / network | A Mythie user |
| Direction? | External -> Mythie public listings | Internal Mythie profile + public web -> casting team |
| Failure mode if wrong? | A scam listing reaches users | A real person is misrepresented to a casting team |
| Regulatory exposure? | Low (publishing public listings) | High (legal-compliance-guardian gates) |

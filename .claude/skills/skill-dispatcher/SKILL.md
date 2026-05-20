---
name: skill-dispatcher
description: Use when Andrew describes a TASK (not a specific skill name) and you need to know which combination of skills should fire together. Recipe book of ~20 common task patterns mapped to the skill bundles they need. Lightweight router — not a full auto-dispatcher. Loads on phrases like "build a landing page", "launch the X feature", "rebuild the hero", "ship the pricing change", "audit X", "set up Y", "Cowork session on Z", "new app from scratch", "make X 99/100". Reduces the "did I remember to also invoke Y skill" cognitive load. Keywords - dispatcher, router, traffic control, which skill, what skills do I need, skill recipe, skill combination, skill stack, skill bundle, multi-skill, compose skills.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Grep, Glob]
---

# Skill Dispatcher

48 skills in the hub. Most tasks need 3-5 of them working together. The keyword-match system on individual skill `description:` fields catches some of this — but recurring task SHAPES (rebuild a landing page, launch new pricing, ship a feature to 99/100) need a deliberate recipe.

This skill is the recipe book. Not a full auto-router (those drift). A focused catalog of "for this task, here's the kit you need, in order."

## When to use

Use this skill EARLY in a session when Andrew describes a TASK — not when he names a specific skill. Read the table, identify the matching recipe, then proceed by loading those skills in order.

Phrases that should trigger this skill:
- "build / rebuild / launch / ship / audit / fix / polish / set up / start / spin up / 99 this"
- Anything that sounds like a project, not a single command

If Andrew names a specific skill (`/99it`, `/tighten`), DO NOT use this skill — go straight to the named one.

## When NOT to use

- Andrew named a specific skill → use that skill directly
- Single-line trivial change → no recipe needed
- Pure Q&A on the codebase → use [[codebase-qa-onboarding]] alone
- Internal debugging mid-task → don't switch into dispatcher mid-flight

## How to use the recipe

For the matching recipe:
1. **Confirm the recipe** to Andrew in one sentence: "Treating this as a 'landing page rebuild' — loading voice + offer + UI + demo skills."
2. **Load the skills in the listed order** — order matters because some skills produce inputs for others.
3. **If a recipe needs something not yet in the hub**, surface as a TODO with `[skill needed: X]`.
4. **If multiple recipes overlap** (often happens), pick the most specific one and note the secondary.

## The recipe book

### Category 1 — Foundation (every session)

| Recipe | Skill order | Notes |
|---|---|---|
| **New session on a repo** | `safe-edit-policy` → `codebase-qa-onboarding` → `claudemd-authoring` (if CLAUDE.md needs work) | These three open almost every serious session |
| **Cowork kickoff** | `cowork-kickoff` → embeds `safe-edit-policy` + references `parallel-claude-worktrees` | The kickoff generator IS the dispatcher for Cowork |
| **Fresh Claude Code chat** | `fresh-chat-handoff` → produces a kickoff that embeds the above | For when a long session compacts or you want a clean restart |
| **Parallel Claude sessions on one repo** | `parallel-claude-worktrees` FIRST → then normal recipe | Anytime Cowork + Claude Code touch the same repo |

### Category 2 — Building consumer-facing surfaces

| Recipe | Skill order |
|---|---|
| **Build / rebuild a landing page** | `voice-locker-per-app` → `offer-sharpener` → `ui-design-web-apps` → `premium-product-demo` → `agentic-feedback-loop` (Puppeteer screenshot diff) → `seo-aeo-optimizer` |
| **App Store / Google Play description** | `voice-locker-per-app` → `offer-sharpener` (capped to char limit) → `legal-compliance-guardian` (claims check) |
| **Push notification / email copy** | `voice-locker-per-app` → `offer-sharpener` (one-liner test) → `analytics-event-map` (track open/click) |
| **Hero section redesign** | `voice-locker-per-app` → `offer-sharpener` → `premium-product-demo` → `ui-design-web-apps` → `agentic-feedback-loop` |
| **Onboarding quiz / archetype quiz** | `gamified-quiz-design` → `voice-locker-per-app` → `ui-design-web-apps` → `analytics-event-map` |
| **Make X 99/100** | `99it` (drives the loop; will itself invoke `tighten`, `phased-shipping`, `shipping-efficiency-budget`) |

### Category 3 — Monetization work

| Recipe | Skill order |
|---|---|
| **Launch new pricing** | `monetization-readiness-review` → `pricing-stress-tester` → `offer-sharpener` (checkout copy) → `analytics-event-map` (conversion tracking) → `payment-webhook-safety` (if Stripe/Payhip touched) |
| **Stripe integration on new app** | `stripe-new-app-setup` → `payment-webhook-safety` → `monetization-readiness-review` → `vendor-onboarding-walkthrough` (secrets) → `database-link-and-permissions-audit` |
| **Pre-launch revenue readiness** | `monetization-readiness-review` → `payment-webhook-safety` → `analytics-event-map` → `human-simulation-testing` (frustrated + recovery personas) → `pricing-stress-tester` |
| **Conversion stall investigation** | `usage-pattern-analyst` → `analytics-event-map` → `offer-sharpener` → `pricing-stress-tester` → `ui-design-web-apps` |
| **Webhook handler new or audit** | `payment-webhook-safety` → `database-link-and-permissions-audit` → `production-error-to-regression` (cover the failure modes) |

### Category 4 — Quality / safety

| Recipe | Skill order |
|---|---|
| **Quarterly repo audit** | `repo-health-audit` → `claudemd-authoring` (sweep CLAUDE.md) → `database-link-and-permissions-audit` → `legal-compliance-guardian` (if consumer-facing) |
| **Portfolio-wide rollup (Mondays)** | `portfolio-health-audit` → `claude-sdk-in-ci` (weekly digest) |
| **Production error → permanent fix** | `production-error-to-regression` → `tighten` (root cause review) |
| **Pre-launch QA bar** | `qa-hardening` → `human-simulation-testing` → `landing-page-routing-audit` → `monetization-readiness-review` |
| **CI/CD setup or hardening** | `ci-gate-builder` → `firebase-actions-deploy` (if Stack A) → `claude-sdk-in-ci` (LLM-judgment jobs) → `shipping-efficiency-budget` (consolidate crons) |
| **Tighten / second opinion on recently-written code** | `tighten` (stand-alone; will pull in others as needed) |
| **Big refactor or system upgrade** | `phased-shipping` → `safe-edit-policy` (loaded throughout) → `shipping-efficiency-budget` (PR sizing) |

### Category 5 — Infrastructure / new repos

| Recipe | Skill order |
|---|---|
| **Bootstrap a brand new app** | `new-app-starter` → `new-repo-quality-bootstrap` → `claudemd-authoring` → `mcp-team-setup` → `firestore-rbac-helpers` (if Stack A) → `firebase-hosting-security` (if Stack A) → `stripe-new-app-setup` (if monetized) |
| **Add Puppeteer/Playwright to existing repo** | `mcp-team-setup` → `claudemd-authoring` (update CLAUDE.md to reference) → `agentic-feedback-loop` (now possible) |
| **New scheduled job (cron in GitHub Actions)** | `shipping-efficiency-budget` (consolidate into existing workflow) → `claude-sdk-in-ci` (if LLM-judgment needed) → `ci-gate-builder` |
| **New SaaS vendor evaluation** | `vendor-consolidation-policy` (whether) → if approved → `vendor-onboarding-walkthrough` (how) → `monetization-readiness-review` (cost vs revenue) |
| **New slash command for the team** | `slash-commands-authoring` → optionally `claude-sdk-in-ci` (if command runs in CI too) |
| **Custom Cowork session against a repo** | `cowork-kickoff` → `parallel-claude-worktrees` (if Claude Code also active) |

### Category 6 — CastHub1 / casting-app-specific

| Recipe | Skill order |
|---|---|
| **Scout casting calls** | `reality-casting-scout` (stand-alone; runs every 3 days or on demand) |
| **AI Talent Research brief** | `casting-research-brief` (note: distinct from background-check per [[project_casthub1_research_vs_bgcheck]]) |
| **Mythie copy / marketing** | `voice-locker-per-app` (Mythie voice.md) → `offer-sharpener` → `premium-product-demo` |
| **Error escalation pipeline work** | `error-tracking-system` → `claude-sdk-in-ci` (self-heal 3-tier per [[project_self_heal_3_tier_spec]]) → `production-error-to-regression` |

### Category 7 — Legal / compliance

| Recipe | Skill order |
|---|---|
| **Legal-language sweep** | `legal-compliance-guardian` (stand-alone; never edits live legal without explicit confirmation) |
| **GDPR / CCPA / DUAA change** | `legal-compliance-guardian` → `claudemd-authoring` (note jurisdictional gates in CLAUDE.md) |
| **New jurisdiction signups** | `legal-compliance-guardian` (jurisdiction gap detection) — see [[project_eu_uk_rep_tracker_armed]] |

## When NO recipe fits

If the task description doesn't match any recipe:
1. Use `safe-edit-policy` + `codebase-qa-onboarding` as the default opener
2. Ask Andrew to clarify the goal in one sentence
3. Build the recipe ad hoc from there
4. Consider adding it to this skill as a new recipe if it repeats

## When recipes need updating

This skill is the most likely in the hub to drift. Maintenance triggers:
- New skill added → check whether any recipes should include it
- Skill removed / merged → remove or update all recipe references
- `skill-auto-heal` monthly run → flag this skill for human review of recipe currency
- Andrew says "we need to combine X and Y a lot" → add a recipe

## What this is NOT

- **NOT** a full auto-router. It doesn't read the prompt and silently route. Andrew (or you, the assistant) reads the recipe and loads.
- **NOT** a replacement for `safe-edit-policy` — that's foundation, this is composition.
- **NOT** a list of every skill — only the ones that compose into common tasks.
- **NOT** a "skill picker" — it doesn't choose between two skills, it picks BUNDLES.

## Composition

This skill itself composes with:
- [[safe-edit-policy]] — loaded under every recipe by default
- [[claudemd-authoring]] — most repos list their relevant recipes in CLAUDE.md
- [[skill-auto-heal]] — keeps this skill from going stale
- [[fresh-chat-handoff]] / [[cowork-kickoff]] — kickoff prompts can reference recipes here

## Source

- Andrew's request 2026-05-20 — "cruise ship director" / traffic-control over the 48-skill library
- Battle-tested combinations from 6+ months of multi-skill workflows in CastHub1, awardssubmission, CRM-ai

---
name: app-training-manual
description: Product knowledge base and employee training system for all apps in Andrew Ward's portfolio. Handles staff onboarding, answers product questions, audits feature inventories, generates Gamma presentation prompts, and scaffolds reference files for new apps. Use when someone asks "how does [app] work", "train me on [app]", "what features does [app] have", "update the manual for [app]", "generate a deck for [app]", or "add [new app] to the manual". Never invents pricing, features, or promises.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Grep, Glob]
---

# App Training Manual

The single source of truth for product knowledge across Andrew Ward's portfolio. Staff onboarding, product Q&A, feature audits, Gamma deck prompts, and new-app scaffolding all flow through this skill — and every answer is traceable back to a verified reference file. This skill never invents pricing, features, or promises.

## When to use

- Someone asks "how does [app] work" / "what does [app] do"
- "Train me on [app]" / "onboard me to [app]"
- "What features does [app] have" / "is [feature] in [app]"
- "Update the manual for [app]" / "scrub features for [app]" / "audit [app]"
- "Generate a deck for [app]" / "make a Gamma presentation for [app]"
- "Add [new app] to the manual"

## When NOT to use

- Writing product code (use `feature-scaffold` instead)
- Repo-level health audits (use `repo-health-audit`)
- Cross-portfolio rollups (use `portfolio-health-audit`)
- Marketing copy generation that goes directly to customers without staff review

## What this skill does

Five workflows:

1. **Answer questions** — reads the relevant `references/[app].md` and answers from verified content only. If the answer is not in the file, says so.
2. **Onboard new staff** — walks through Overview → Features → Roles → Pricing → Workflows → FAQ for any app.
3. **Feature scrub / audit** — compares what the reference file says vs what Claude observes in the codebase; produces an Added / Changed / Removed / To Confirm table.
4. **New app from scratch** — uses `templates/new-app-template.md` to scaffold a new reference file via guided questions.
5. **Generate a Gamma deck** — outputs a ready-to-paste Gamma prompt using `templates/gamma-deck-prompt.md`.

## App roster

See `references/product-registry.md` for the canonical list of all apps, their live URLs, repos, brand ownership, and stack class. **Always read the registry before answering anything portfolio-wide.**

## Source of truth rules

- **NEVER invent pricing, feature availability, or roadmap commitments.**
- Any field marked `TBC` means "ask Andrew before stating it to staff or users."
- If content contradicts the codebase, flag it as ⚠️ CONFLICT — do not auto-resolve.
- Never say an app is "10 Lives Studios branded" unless `policy/brand-rules.md` explicitly marks it so.
- Read `policy/claims-and-promises.md` before answering any product question to staff or users.

## Workflow routing

| Trigger | Files to load | Action |
|---|---|---|
| Question about a specific app | `references/[app].md` + `policy/claims-and-promises.md` | Answer only from that content |
| Onboarding request | `references/[app].md` | Follow onboarding sequence in that file |
| Feature audit | `references/[app].md` + inspect repo codebase + `scripts/feature-audit.md` | Output diff table |
| New app | `templates/new-app-template.md` | Run guided scaffold |
| Gamma deck | `templates/gamma-deck-prompt.md` | Output the appropriate prompt |
| Anything portfolio-wide | `references/product-registry.md` | Use registry as canonical roster |

## Supporting files (load on demand only)

- `references/product-registry.md` — canonical app list, URLs, repos, brand flags
- `references/[app].md` — per-app identity, features, pricing, roles, workflows, FAQ, known issues, changelog
- `policy/brand-rules.md` — which apps carry "10 Lives Studios" brand vs neutral
- `policy/claims-and-promises.md` — what Claude may and may not promise about these apps
- `templates/gamma-deck-prompt.md` — ready-to-paste Gamma prompts for each app
- `templates/new-app-template.md` — blank schema for scaffolding a new app reference file
- `scripts/feature-audit.md` — step-by-step feature scrub workflow

## Onboarding sequence (use for any "train me on [app]" request)

1. **Overview** — read the "What it is" paragraph from `references/[app].md`
2. **Who uses it** — walk through the Roles table
3. **Features** — walk through the Feature Inventory table; flag 🚧 / ❌ statuses correctly
4. **Pricing & entitlements** — read directly from the Pricing table; if any row is `TBC`, say "pricing not yet confirmed — ask Andrew"
5. **Key workflows** — walk through each step-by-step workflow
6. **Navigation map** — show where each feature lives in the UI
7. **FAQ** — answer common new-staff questions
8. **Known issues / limitations** — flag anything broken or partial
9. **End** with: "Anything I just walked through that you'd like to dig deeper on?"

## Common mistakes to avoid

- Reading from memory instead of from the reference file (always re-read each session)
- Stating a price that says `TBC` in the file
- Saying "coming soon" without a Changelog entry to back it
- Calling a non-10-Lives app a "10 Lives Studios product"
- Auto-updating a reference file after a feature audit (always surface as 🔧 manual task — never edit silently)

## Composes with

- `safe-edit-policy` — required foundation; never violate the no-fake-completion rule when describing features
- `market-research-competitive-intel` — when answering "how does our app compare to X", pull from market research reports
- `premium-product-demo` — Gamma deck prompts pair with demo components for visual decks
- `vendor-consolidation-policy` — answer integration questions with the house-stack policy in mind

## Self-healing

- `expires: 2026-11-10` — re-audit every reference file against the live app at this date
- `drift_sentinels`: changes in pricing pages, signup flows, or `package.json` `version` fields in any portfolio repo
- `auto_heal_checks`: every quarter, run feature-audit on each app and surface 🔧 manual tasks

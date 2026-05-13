---
name: new-repo-quality-bootstrap
description: Use when adding any new repo to the portfolio (after `new-app-starter` has scaffolded the stack). Composes the adoption pack — CLAUDE.md, QA_RULES.md, AI_DEFINITION_OF_DONE.md, testing/, .github/workflows/ci.yml, PR template, bug template, regression template, launch checklist, monetization checklist — so the repo starts at portfolio parity from commit one. Distinct from `new-app-starter` (which is Vite+React+Firebase scaffolding only). Stack-conditional. Keywords: new repo, bootstrap, parity, smart from zero, adoption pack, scaffold quality, day-one quality, CI from start, tests from start, CLAUDE.md.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# New Repo Quality Bootstrap

Bring a brand-new (or recently created) repo to portfolio parity in one pass. Every repo gets the same baseline: CLAUDE.md, definition-of-done contract, QA rules, CI gate, test scaffold, PR + issue templates, launch + monetization checklists.

`new-app-starter` handles the *stack* (Vite + Firebase). This skill handles the *quality envelope* around any stack.

Always load `safe-edit-policy` first.

## When to use

- Right after `new-app-starter` (Stack A) or any other scaffolding step
- After cloning an existing repo that's missing baseline files (per memory: 9 of 23 portfolio repos have no CLAUDE.md as of 2026-05-10)
- When promoting a "weekend project" repo to portfolio status

## When NOT to use

- Mid-feature work — the bootstrap rewrites several config files and would conflict
- Stack F (empty/placeholder) — confirm the repo is real first
- A repo where you don't have approval to add files

## Step 0 — Inspect (per safe-edit-policy)

```bash
# What's already there
ls -la
[ -f CLAUDE.md ] && echo "CLAUDE.md exists — will diff, not overwrite"
[ -d .github ] && ls .github/
[ -f .github/pull_request_template.md ] && echo "PR template exists — will diff"
[ -d tests ] || [ -d e2e ] || [ -d __tests__ ] && echo "tests dir exists — will preserve"
ls .github/workflows/ 2>/dev/null
```

If a file already exists, **diff before overwrite**. Surface the diff and ask before replacing.

## Step 1 — Detect stack

Per `safe-edit-policy` Step 2. Stack determines which adoption-pack templates apply.

## Step 2 — Apply adoption pack templates

The templates live at `~/GitHub/claude-skills/portfolio-adoption-pack/`. Copy each, substitute placeholders, write to the new repo.

| Template | Destination | Always / Stack-conditional |
|---|---|---|
| `CLAUDE.md.template` | `CLAUDE.md` | Always |
| `QA_RULES.md.template` | `QA_RULES.md` | Always |
| `AI_DEFINITION_OF_DONE.md.template` | `AI_DEFINITION_OF_DONE.md` | Always |
| `APP_PROFILE.md.template` | `APP_PROFILE.md` | Always |
| `LAUNCH_READINESS_CHECKLIST.md.template` | `LAUNCH_READINESS_CHECKLIST.md` | Always |
| `MONETIZATION_READINESS_CHECKLIST.md.template` | `MONETIZATION_READINESS_CHECKLIST.md` | If revenue-bearing |
| `testing/human-simulation-matrix.md.template` | `testing/human-simulation-matrix.md` | Stack A/B (UI apps) |
| `.github/pull_request_template.md.template` | `.github/pull_request_template.md` | Always |
| `.github/ISSUE_TEMPLATE/bug_report.md.template` | `.github/ISSUE_TEMPLATE/bug_report.md` | Always |
| `.github/ISSUE_TEMPLATE/regression_check.md.template` | `.github/ISSUE_TEMPLATE/regression_check.md` | Always |

Substitutions to perform (use grep/sed):
- `{{repo_name}}` → directory name
- `{{stack_class}}` → A/B/C/D/E
- `{{primary_url}}` → ask user for the live or planned URL
- `{{vendors}}` → comma list from `.env.example` parse

## Step 3 — Add CI gate

Use `ci-gate-builder` skill. Generate the right `.github/workflows/ci.yml` for the stack.

## Step 4 — Add test scaffold

Use `qa-hardening` skill. Install Vitest + Playwright (Stack A/B) or linkinator + html-validate (Stack C) or PHPCS (Stack D) or dry-run script (Stack E).

Write **one starter test per stack** so the test suite isn't empty:
- Stack A/B: a "smoke" test asserting the home page loads without console errors
- Stack C: a linkinator pass over all `.html` files
- Stack D/E: a fixture-based dry-run

## Step 5 — Add the human simulation matrix

Use `human-simulation-testing` skill. Copy the template; fill in the persona × journey matrix scaffold.

## Step 6 — Wire up observability

Per `vendor-onboarding-walkthrough`, set up at minimum:
- **Sentry** (any UI app) — error capture, user feedback widget
- **Analytics** — per `analytics-event-map`, choose one of PostHog / Firebase Analytics / Plausible
- **Langfuse** (if app calls LLMs) — trace every Anthropic/OpenAI/Gemini call
- **ConfigCat or LaunchDarkly** (if launch is staged) — feature flags for kill switches

Each surfaces as a **🔧 MANUAL TASK** for the API key + dashboard setup.

## Step 7 — Add commit + push, branch protection

```bash
git add -A
git commit -m "chore: portfolio quality bootstrap (CLAUDE.md, QA, CI, tests, templates)"
# Push? Only if approved per safe-edit-policy
```

🔧 MANUAL TASK: enable branch protection on `main` per `ci-gate-builder` "Branch protection settings" section.

## Step 8 — Update the hub registry

Edit `~/GitHub/claude-skills/PORTFOLIO_ADOPTION_STATUS.md` to add the new repo's row.

## Step 9 — First post-bootstrap PR

The first feature PR after bootstrap should be a **definition-of-done dry run** — pick one small feature, follow `feature-scaffold`, complete every step in `AI_DEFINITION_OF_DONE.md`. This proves the system works before higher-stakes work lands.

## Output format

```
NEW REPO BOOTSTRAP — [repo] — [date] — Stack [A/B/C/D/E]

EXISTING (preserved)
 - [file]: [reason kept as-is]

CREATED
 - CLAUDE.md
 - QA_RULES.md
 - AI_DEFINITION_OF_DONE.md
 - APP_PROFILE.md
 - LAUNCH_READINESS_CHECKLIST.md
 - MONETIZATION_READINESS_CHECKLIST.md (if revenue-bearing)
 - testing/human-simulation-matrix.md (if UI)
 - .github/pull_request_template.md
 - .github/ISSUE_TEMPLATE/bug_report.md
 - .github/ISSUE_TEMPLATE/regression_check.md
 - .github/workflows/ci.yml
 - [test scaffold path]
 - [observability setup]

PR DESCRIPTION (ready to paste)
 [...]

🔧 MANUAL TASKS FOR ANDREW: [per safe-edit-policy Step 8]
 - Branch protection on main
 - Sentry/PostHog/etc API keys → GitHub Secrets
 - Add row to PORTFOLIO_ADOPTION_STATUS.md
 - First post-bootstrap PR exercise
```

## Common mistakes

1. **Overwriting existing CLAUDE.md** — diff first, merge intent. The existing file may have repo-specific context worth preserving.
2. **Adding tests scaffold but no actual test** — empty `tests/` directory rots. Always include one passing starter test.
3. **Skipping branch protection** — CI gate without branch protection is theater.
4. **Bootstrapping a repo Andrew hasn't decided to keep** — for ambiguous repos (`gemini_project`, `googlegenai`, `studio`), confirm before bootstrapping.
5. **One mega-commit** — split into 3 PRs: (a) docs/templates, (b) CI + tests, (c) observability + analytics. Easier review.

## Source of truth in this portfolio

- Reference baseline: CastHub1 (most complete adoption — CLAUDE.md, MANUAL_TASKS.md, .claude/skills, 5 workflows)
- Adoption-pack templates: `~/GitHub/claude-skills/portfolio-adoption-pack/`
- Sibling skills: `new-app-starter` (stack scaffolding), `safe-edit-policy` (must be loaded), `ci-gate-builder`, `qa-hardening`, `human-simulation-testing`, `analytics-event-map`, `vendor-onboarding-walkthrough`, `monetization-readiness-review` (for revenue-bearing repos)
- Repos that need this skill applied first (no CLAUDE.md as of 2026-05-10): `CRM-ai`, `noelly-app`, `10-Lives-Invoicing`, `ProducingHollywood`, `studio`, `NFLHOFKnocks`, `ReleaseMaster-Pro`, `invoice-hub` (if not archiving)

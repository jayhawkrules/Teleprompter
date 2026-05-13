---
name: repo-health-audit
description: Use when auditing any repo in the portfolio for upgrade opportunities, deprecations, security holes, dead code, observability gaps, and stale documentation. Produces a prioritized fix list and offers to open PRs. Run quarterly or before major feature work. Keywords: audit, health check, technical debt, npm outdated, deprecation, dead code, security audit, upgrade, refactor, dependency update, observability gap.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Repo Health Audit

> **Always load `safe-edit-policy` first.** This skill is per-repo deep dive. For the cross-portfolio rollup (which repo to audit first, money-while-sleeping checklist), use `portfolio-health-audit` instead.

Systematic scan of a repo for things that should be upgraded, fixed, or cleaned up. The output is a prioritized punch list — not auto-fixes. Each item gets a recommendation and the user decides what to act on.

## Step 0 — Detect stack class FIRST

Per `safe-edit-policy` Step 2, classify the repo into one of A/B/C/D/E/F before running any check below. The 12-point audit assumes Stack A. For other stacks:

- **Stack B (Next.js / Hono / Express, no Firebase):** skip checks 7 (firestore.rules) and any Firebase-specific item in 8. Replace with: API-route auth checks, DB schema migrations status, missing-route guard tests.
- **Stack C (HTML/static):** run only checks 4 (dead files), 9 (link checker = `npx linkinator`), 10 (docs freshness), 12 (stale branches). Skip the rest.
- **Stack D (PHP/WordPress):** run only checks 4, 10, 12. Add: backup recency check.
- **Stack E (cron-driven JS):** run checks 4, 5 (TODOs), 9 (env sync), 12. Add: workflow runtime + failure rate review.
- **Stack F (empty/placeholder):** stop. Ask Andrew before auditing — likely needs `new-repo-quality-bootstrap`, not an audit.

## When to use
- Quarterly maintenance pass
- Before starting a major new feature (start clean, not on top of debt)
- After a long stretch of feature work where shortcuts accumulated
- When deciding whether to deprecate or invest in a repo

## When NOT to use
- Mid-feature work — auditing while something is half-built creates noise
- Repos under 100 commits — not enough surface to audit yet, focus on shipping

## Prerequisite: sync first

Before any check below, sync the local clone with the remote so findings reflect current state, not a stale copy:

```bash
git fetch origin && git status   # surface any local divergence
git pull --rebase origin main    # only if working tree is clean
```

Skipping this caused a real false-positive run on Producing-Hollywood-Invoicing on 2026-05-04 — the audit reported missing CSP and raw auth checks that had already been fixed weeks earlier on the remote.

## The 12-point audit

Run each check, capture findings, then rank.

### 1. Dependency drift
```bash
npm outdated
npm audit --omit=dev
```
- **Major version drift** (e.g., React 17 → 19): plan migration
- **Security vulnerabilities** with available fix: PR within a week
- **Patch/minor drift**: bundle into a quarterly bump PR

### 2. Deprecation warnings
- Run `npm run build` and `npm run dev`, capture stderr
- Common deprecations to look for:
  - `firebase-functions/v1` → migrate to `v2`
  - `React.FC` usage (style preference, not strict deprecation)
  - `react-router-dom` v5 patterns (`Switch`, `useHistory`)
  - `@firebase/app-compat` (v8 namespace) — should be modular v9+
  - Node engine in `package.json` not matching what Functions / Railway runs

### 3. Unused dependencies
```bash
npx depcheck
```
- True unused: remove with PR
- "Used in tests only": move to `devDependencies`
- False positives (depcheck misses dynamic imports): document as `.depcheckrc` ignore

### 4. Dead files
```bash
git ls-files | grep -iE "(\.bak|\.old|copy|backup|tmp|test_|_old)"
find . -name "*.bak" -o -name "*.old" -o -name "*~" 2>/dev/null
```
- Files referenced nowhere in code: delete
- Orphaned route/component files: confirm with `grep -r` before deleting

### 5. Stale comments and TODOs
```bash
git grep -nE "(TODO|FIXME|HACK|XXX)" -- ':!node_modules' | head -50
```
- TODOs older than 6 months (check `git blame`): convert to issues or delete
- `console.log` / `debugger` statements: remove from src/, keep only in scripts/

### 6. Test coverage gaps
- List all `services/*.ts` files
- For each, check if a corresponding `__tests__/[name].test.ts` exists
- Untested service files with mutations (writes to Firestore, payments, emails) are highest priority

### 7. firestore.rules audit
```bash
grep -nE "if true|allow.*: if true" firestore.rules
```
- Any `if true` rules: justify or remove
- Missing helper functions (raw `request.auth != null` in places): refactor to use helpers from `firestore-rbac-helpers` skill
- Collections with no `update` rule: implicitly all-or-nothing — confirm intentional

### 8. Observability gaps
- `grep -r "Sentry.init" src/` — confirm Sentry is initialized
- `grep -r "ErrorBoundary" src/` — confirm app is wrapped
- Backend: confirm Express has Sentry middleware before routes
- AI calls: confirm each is wrapped with Langfuse trace
- Missing: file an issue or PR with the missing init

### 9. .env.example sync
```bash
diff <(grep -oE "VITE_[A-Z_]+" .env 2>/dev/null | sort -u) <(grep -oE "VITE_[A-Z_]+" .env.example | sort -u)
```
- Vars in `.env` but not `.env.example`: add (with empty value + comment)
- Vars in `.env.example` but not used in code: remove

### 10. Documentation freshness
- `CLAUDE.md`: when was it last updated? `git log -1 --format=%cs CLAUDE.md`
  - If >90 days, audit for accuracy
  - If `>180 days`, full rewrite likely needed
- `README.md`: does the "How to run locally" section still work? Try it.

### 11. Bundle size
```bash
npm run build
du -sh dist/
ls -lhS dist/assets/ | head -10
```
- Largest chunk over 500KB: candidate for code-splitting
- Check `import` of heavy libs (lodash, moment) for tree-shaking opportunities

### 12. Stale GitHub branches
```bash
git fetch --all --prune
git branch -r --merged main | grep -v "main\|HEAD" | head -10
```
- Merged branches: candidates for deletion
- Branches with no commits in 90+ days: candidates for archive or deletion

## Output format

After running the audit, produce a prioritized list:

```markdown
# Repo Health Audit — [repo-name] — [date]

## P0 (do this week)
- [ ] CVE in `axios@1.4.x` — `npm audit fix` resolves (Section 1)
- [ ] firestore.rules: `allow read: if true` on `/internalDocs` (Section 7)

## P1 (do this month)
- [ ] React 18 → 19 migration (Section 1)
- [ ] 3 untested service files: `billingService`, `stripeService`, `emailService` (Section 6)

## P2 (do this quarter)
- [ ] Bundle: vendor chunk is 1.2MB — split lodash, moment (Section 11)
- [ ] CLAUDE.md last updated 2026-01-12 (>90d) (Section 10)

## Skipped (intentional or low-value)
- [ ] depcheck flagged 4 deps — all are dynamic imports, false positives
```

## Self-healing extension (optional)

After producing the list, offer to auto-open PRs for the lowest-risk items:
- `npm audit fix` PR
- `.env.example` sync PR
- Dead file deletion PR (after grep-confirm)
- TODO cleanup PR (the trivially-resolvable ones)

Hold off on auto-PR for any item that touches: `firestore.rules`, `firebase.json`, billing code, auth flows, or anything else that could break prod silently.

## Common mistakes

1. **Auditing without a fix budget** — produces a giant list nobody acts on. Cap output at 15 items, highest-priority only.
2. **Bundling many small fixes into one PR** — review becomes a hairball. One concern per PR.
3. **Auto-fixing breaking changes** — `npm audit fix --force` ships breaking major bumps. Use it manually, never in this audit.
4. **Skipping the "intentional" column** — items that look like findings but are deliberate need to be documented so the next audit doesn't refile them.

## Source of truth in this portfolio

- This skill is the canonical per-repo audit. For cross-repo rollup, use `portfolio-health-audit`.
- Sibling skills: `safe-edit-policy` (must be loaded), `qa-hardening` (closes test gaps surfaced by check 6), `ci-gate-builder` (closes CI gaps), `monetization-readiness-review` (closes revenue gaps), `firestore-rbac-helpers` (Stack A only — closes check 7 gaps).

Run this against each repo. Full portfolio inventory verified 2026-05-10:

**Stack A (Firebase + React/Vite):** `~/GitHub/CastHub1`, `~/GitHub/Producing-Hollywood-Invoicing`, `~/GitHub/Tribeca-Film-Festival-2026`, `~/GitHub/backlothub`, `~/GitHub/holiday-lights`, `~/GitHub/toronadoentertainment`, `~/GitHub/CRM-ai`

**Stack B (TypeScript, other backends):** `~/GitHub/awardssubmission` (Next + Stripe), `~/GitHub/RunOfShow` (TS monorepo + Sentry), `~/GitHub/Teleprompter` (Vite + Express + TikTok), `~/GitHub/noelly-app` (Next + Supabase), `~/GitHub/ProducingHollywood` (Next + Sanity)

**Stack A-incomplete:** `~/GitHub/10-Lives-Invoicing` (firestore.rules without firebase.json)

**Stack C (HTML/static):** `~/GitHub/artas-redesign-preview`, `~/GitHub/theproductionshelf`

**Stack D (PHP/WordPress):** `~/GitHub/artas-wordpress-backup`

**Stack E (cron-driven):** `~/GitHub/artas-blog-automation`

**Defer (dormant >3 months):** `~/GitHub/NFLHOFKnocks`, `~/GitHub/ReleaseMaster-Pro`, `~/GitHub/studio`

**Archive candidates (empty/placeholder, decision needed):** `~/GitHub/gemini_project`, `~/GitHub/googlegenai`, `~/GitHub/invoice-hub`

For Capacitor-specific Android checks (CastHub1, Tribeca, holiday-lights), see also user memory `reference_mythie_android_build.md`.

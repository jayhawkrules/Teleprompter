---
name: qa-hardening
description: Use to install or audit a QA bar in any portfolio repo. Stack-conditional steps for Stack A (React/Vite/Firebase), B (TS-other), C (HTML/static), D (PHP/WordPress), E (JS automation). Covers lint, typecheck, unit, integration, E2E, accessibility, dependency audit, CI gate. Pre-launch posture across the portfolio. Keywords: QA, testing, lint, typecheck, vitest, playwright, accessibility, dependency audit, test coverage, regression, CI gate, hardening, quality bar.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# QA Hardening

Install a baseline quality gate in a repo that has none, or audit one that does. The portfolio currently has zero repos with a `tests/` directory (verified 2026-05-10). This skill closes that gap **without forcing one stack's testing tools onto another's repo**.

Always load `safe-edit-policy` first.

## When to use

- Any repo without a CI gate that's about to ship to users
- After adding a feature that touches money, auth, or external APIs
- Before a launch (paired with `launch-readiness-checklist` template)
- When you want to convert a recurring bug into a regression test (see also: `production-error-to-regression`)

## When NOT to use

- Pure HTML preview repos (Stack C) where the only "test" is "does it render" — skip everything except the link checker
- Stack F (empty/placeholder) — there is nothing to test yet
- Repos where you don't have approval to add files (re-read `safe-edit-policy` Step 3)

## Step 0 — Detect stack and existing tooling

```bash
# Run these first, do not skip
ls package.json tsconfig.json firebase.json next.config.* vite.config.* composer.json index.html 2>/dev/null
[ -f package.json ] && cat package.json | python3 -c "import json,sys; p=json.load(sys.stdin); print('scripts:', list(p.get('scripts',{}).keys())); print('devDeps:', list(p.get('devDependencies',{}).keys())[:20])"
ls .github/workflows/ 2>/dev/null
find . -maxdepth 3 -type d -name "tests" -o -name "test" -o -name "__tests__" -o -name "e2e" -o -name "playwright-tests" 2>/dev/null
```

Decide stack class A/B/C/D/E/F per `safe-edit-policy` Step 2. Then jump to the right section.

---

## Stack A — React/Vite/TS/Firebase

The full bar. Every check applies.

### A1. Lint

If `eslint` is not in `devDependencies`:
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react-hooks
```

If `eslint.config.js` does not exist, create one matching CastHub1's:
- `parser: '@typescript-eslint/parser'`
- Plugins: `@typescript-eslint`, `react-hooks`
- Rules: `react-hooks/exhaustive-deps: warn`, `@typescript-eslint/no-unused-vars: error`, `@typescript-eslint/no-explicit-any: warn`

Add npm script: `"lint": "eslint src --max-warnings=0"`.

Run it. If it produces >50 errors, do **not** auto-fix — surface the count and ask for a budget before mass-fixing.

### A2. Typecheck

```bash
npm run typecheck 2>/dev/null || npx tsc --noEmit
```

If there are errors, list them. Do not "fix" by adding `any` or `@ts-ignore` — those are forbidden tools for this gate. Real fixes only.

Add npm script if missing: `"typecheck": "tsc --noEmit"`.

### A3. Unit tests (Vitest)

If `vitest` is not in `devDependencies`:
```bash
npm install -D vitest @vitest/ui happy-dom @testing-library/react @testing-library/user-event
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'happy-dom', globals: true, setupFiles: ['./vitest.setup.ts'] },
});
```

Add npm script: `"test": "vitest run"`.

Test files live next to source: `services/foo.ts` → `services/foo.test.ts`.

**Priority targets** (write tests for these first — they're where bugs cost money):
- Any function in `services/` that mutates Firestore, sends email, or talks to Stripe
- Any utility under `lib/` or `utils/` that parses user input
- Any reducer or state hook that determines what the user sees after a payment

Skip: snapshot tests of components (brittle), tests of trivial getters.

### A4. Integration tests (Firestore Emulator)

```bash
npm install -D @firebase/rules-unit-testing
```

For every collection in `firestore.rules`, write at least one passing-and-one-failing rules test:

```ts
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

const env = await initializeTestEnvironment({
  projectId: 'demo-test',
  firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
});

const alice = env.authenticatedContext('alice', { role: 'producer' });
await assertSucceeds(setDoc(doc(alice.firestore(), 'casts/1'), { producerId: 'alice' }));
await assertFails(setDoc(doc(alice.firestore(), 'casts/1'), { producerId: 'bob' }));
```

Run via Firebase Emulator. CI runs the emulator, never live Firebase — see `ci-gate-builder` for the GitHub Actions YAML.

### A5. E2E tests (Playwright)

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

Add npm script: `"e2e": "playwright test"`.

Start with **one** smoke test per critical user journey (use `human-simulation-testing` to identify these). E.g., for CastHub1: "talent submits a profile and producer sees it in the queue."

Do not aim for 100% UI coverage — aim for "if this test breaks, the app is unusable for paying customers".

### A6. Accessibility

`npm install -D @axe-core/playwright`. Inside one Playwright test per route:

```ts
import AxeBuilder from '@axe-core/playwright';
const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
expect(accessibilityScanResults.violations).toEqual([]);
```

Block PRs on critical/serious violations only — moderate/minor are noise.

### A7. Dependency audit

```bash
npm audit --omit=dev --audit-level=high
```

CI fails on high or critical. Moderate is logged but doesn't block.

### A8. CI gate

See `ci-gate-builder`. Required jobs for Stack A:
1. `lint`
2. `typecheck`
3. `test` (vitest unit + integration)
4. `e2e` (Playwright, can be parallel)
5. `audit` (npm audit)
6. `build` (`npm run build` must pass)

---

## Stack B — TypeScript, non-Firebase (Next.js, Supabase, Express, Hono, etc.)

Same as Stack A **minus** the Firestore Emulator step (A4 → skip), **plus**:

- Replace A4 with **API contract tests**: hit your API routes with a fetch helper in tests, assert on response shape and status codes
- If using Supabase: `npm install -D supabase` and run `supabase start` in CI for integration tests against the local Supabase stack
- If using Prisma/Drizzle/etc.: include schema migrations in CI (`prisma migrate deploy --schema=...` against a test DB)
- Auth tests: cover the protected-route case (unauth user gets 401, auth user gets 200)

For Next.js specifically:
- Use `vitest` with `@vitejs/plugin-react` (NOT `next/jest`, which has worse error messages)
- E2E uses Playwright the same way as Stack A
- Add `next build` to the CI gate — Next.js catches a lot of issues only at build time

---

## Stack C — HTML/static

Most of the above is overkill. Required:

```bash
# Link checker (run via npx, no install needed)
npx --yes linkinator . --recurse --silent --skip="^(mailto:|tel:|#)"

# HTML validator
npx --yes html-validate "**/*.html"

# Lighthouse-CI for perf + accessibility (CI-only)
npm install -D @lhci/cli
```

CI gate:
1. linkinator (no broken links)
2. html-validate (no HTML errors)
3. Lighthouse-CI: performance ≥ 90, accessibility ≥ 95

Do not install Vitest/Playwright on Stack C repos. They will sit unused and rot.

---

## Stack D — PHP/WordPress

Apply only what is meaningful:

- **Backup verification**: assert the last backup exists and is parseable (for `artas-wordpress-backup`, check the most recent commit's content via `git log -1 --stat | head -20`)
- **PHPCS** for any custom PHP: `composer require --dev squizlabs/php_codesniffer wp-coding-standards/wpcs`
- **Markdown export validation**: the backup-as-markdown should parse via any markdown parser

Skip lint/typecheck/E2E. The repo is a backup target, not an app.

---

## Stack E — JS automation (cron-driven via GitHub Actions)

The "test" is "did the cron run and produce output":

- Add a `--dry-run` flag to every script that mutates external state
- Run `--dry-run` in CI on every PR
- Snapshot the output and compare to a fixture (don't make exact-match assertions; use a contains/structure assertion)
- For LLM-driven scripts (`artas-blog-automation`): add a smoke test that calls the LLM with a fixed seed/temperature=0 and asserts the response shape, NOT exact text

CI gate:
1. lint (eslint)
2. dry-run smoke test
3. fixture comparison

---

## Common mistakes

1. **Installing Vitest in a Stack C repo** — pure waste. C repos use linkinator + html-validate + Lighthouse.
2. **Mocking the database in integration tests** — defeats the purpose. Use the Firestore Emulator (Stack A) or a real test DB (Stack B). The reason: a mocked test passing while the real query fails has bitten this portfolio before.
3. **Adding tests AFTER the bug** — see `production-error-to-regression` for the right cadence: Sentry alert → write the failing test → fix → ship.
4. **Snapshot testing components** — they break on every UI tweak, get auto-updated mindlessly, and detect nothing real. Use Playwright for actual user behavior instead.
5. **CI runs on `main` only** — must run on PRs too, or the gate is theater.
6. **Writing tests against `firestore.rules` in test mode** — test mode allows everything. Always use the actual rules file via `@firebase/rules-unit-testing`.
7. **Mixing E2E and unit in one job** — Playwright is slow and flaky. Run it in parallel; don't block fast feedback on unit tests.

## Output format

After running the audit, produce:

```
QA HARDENING — [repo] — [date] — Stack [A/B/C/D/E]

EXISTING (do not duplicate)
 - [list of QA tooling already present]

INSTALLED THIS PASS
 - [list of new tooling added]

GATES NOW ACTIVE
 - [ ] lint        [pass/fail/N count]
 - [ ] typecheck   [pass/fail/N count]
 - [ ] unit        [N tests, X passing]
 - [ ] integration [N tests, X passing or "skipped: reason"]
 - [ ] e2e         [N tests, X passing or "skipped: reason"]
 - [ ] a11y        [violations or "skipped"]
 - [ ] audit       [N high+ vulns]

GAPS (P0 = block launch, P1 = month, P2 = quarter)
 - P0: [...]
 - P1: [...]
 - P2: [...]

🔧 MANUAL TASKS FOR ANDREW: [block per safe-edit-policy Step 8]
```

## Source of truth in this portfolio

- Stack A reference: install pattern works for `~/GitHub/CastHub1`, `~/GitHub/Producing-Hollywood-Invoicing`, `~/GitHub/Tribeca-Film-Festival-2026`, `~/GitHub/backlothub`, `~/GitHub/holiday-lights`, `~/GitHub/toronadoentertainment`
- Stack B reference: `~/GitHub/awardssubmission` (Next), `~/GitHub/RunOfShow` (TS monorepo), `~/GitHub/Teleprompter` (Vite + Express)
- Stack C reference: `~/GitHub/theproductionshelf`, `~/GitHub/artas-redesign-preview`
- Stack D reference: `~/GitHub/artas-wordpress-backup`
- Stack E reference: `~/GitHub/artas-blog-automation`

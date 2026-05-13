---
name: ci-gate-builder
description: Use to add or audit GitHub Actions CI gates in any portfolio repo. Detects existing workflows before suggesting changes. Generates copy-pasteable YAML per stack class (A/B/C/D/E). Includes cost guardrails (Firestore Emulator only, never live), secret-name conventions, and the per-PR vs per-merge split. Keywords: GitHub Actions, CI, CI/CD, workflow, lint, test, build, deploy, gate, secrets, Firebase Emulator, cost guardrail, PR check.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# CI Gate Builder

Generate the GitHub Actions workflow that gates merges to `main`. Stack-conditional. Detects what already exists before adding anything.

Always load `safe-edit-policy` first.

## When to use

- Any repo with no CI workflows (per inspection in 2026-05-10 audit: 16 of 23 portfolio repos)
- A repo with an old workflow that's missing a new check (e.g., added Vitest but CI doesn't run it)
- Before launch — the gate must exist before paying users hit the app

## When NOT to use

- Stack F (empty/placeholder) — no code to gate
- A repo where the current workflow is intentionally hand-tuned for a special case (read it first; ask before modifying)

## Step 0 — Always inspect first

```bash
ls .github/workflows/ 2>/dev/null
for f in .github/workflows/*.yml; do echo "=== $f ==="; head -30 "$f"; done
gh secret list 2>/dev/null || echo "gh not installed — list secrets via GitHub UI"
```

Map what already runs to what should run. **Do not duplicate jobs.** If `ci.yml` already runs lint+test, do not add a second workflow that re-runs them.

## Step 1 — Pick the right split

Two-workflow pattern (recommended):

| Workflow | Triggers on | Purpose |
|---|---|---|
| `ci.yml` | Every PR + push to main | Fast feedback: lint, typecheck, unit, integration, build |
| `deploy.yml` | Push to main only (or tag) | Slow / production: E2E, deploy, smoke checks |

For Stack A repos using Firebase Hosting / App Hosting, see also `firebase-actions-deploy` skill — the deploy half is its responsibility.

For repos with rules separately deployable: a third workflow `deploy-rules.yml` runs only when `firestore.rules` or `storage.rules` change (path filter). CastHub1's `deploy-rules.yml` is the reference.

## Stack A — `ci.yml` template

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-typecheck-test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --run
      - run: npm run build

  firestore-rules-test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }
      - run: npm ci
      - run: npm install -g firebase-tools
      - run: firebase emulators:exec --only firestore "npm run test:rules"
        env:
          FIREBASE_PROJECT: demo-test  # Emulator-only, never the real project

  audit:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm audit --omit=dev --audit-level=high
```

## Stack A — `e2e.yml` (separate workflow, parallel to ci)

```yaml
name: E2E

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  playwright:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
        env:
          # Test against a preview deploy or local build, NEVER prod
          BASE_URL: http://localhost:5173
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

## Stack B — `ci.yml` template (Next.js / Hono / Express)

Same as Stack A `ci.yml`, but:
- Replace `firestore-rules-test` job with a DB-integration job:

```yaml
  db-integration:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: ci, POSTGRES_DB: app_test }
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx prisma migrate deploy   # or drizzle-kit push, etc.
        env:
          DATABASE_URL: postgresql://postgres:ci@localhost:5432/app_test
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:ci@localhost:5432/app_test
```

For Supabase (`noelly-app`):
```yaml
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - run: supabase start
```

## Stack C — `ci.yml` template (HTML/static)

```yaml
name: CI

on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - run: npx --yes linkinator . --recurse --silent --skip "^(mailto:|tel:|#)"
      - run: npx --yes html-validate "**/*.html"

  lighthouse:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install -g @lhci/cli
      - run: lhci autorun --upload.target=temporary-public-storage
```

`lighthouserc.json`:
```json
{
  "ci": {
    "collect": { "staticDistDir": "./" },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }]
      }
    }
  }
}
```

## Stack D — minimal validation (`artas-wordpress-backup` reference)

```yaml
name: Backup verify

on:
  schedule:
    - cron: '0 9 * * 1'  # Mondays — verify Sunday's backup
  workflow_dispatch:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          test -d posts/ || (echo "posts/ missing"; exit 1)
          test -d pages/ || (echo "pages/ missing"; exit 1)
          # Verify last backup was within 8 days
          last_commit=$(git log -1 --format=%ct)
          age_days=$(( ( $(date +%s) - last_commit ) / 86400 ))
          [ $age_days -lt 8 ] || (echo "Backup is $age_days days old"; exit 1)
```

## Stack E — `ci.yml` for cron-driven scripts (`artas-blog-automation` reference)

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  dry-run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci || true   # repo may not have package.json
      - run: node scripts/main.js --dry-run --fixture=tests/fixtures/sample.json
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY_TEST }}  # cheap key, low quota
```

## Cost & quota guardrails (NON-NEGOTIABLE)

1. **Never let CI hit live Firebase, Firestore, or Auth.** Always use the Emulator. The CastHub1 emulator pattern in `firestore-rules-test` job is the reference.
2. **Never let CI hit live Stripe.** Use Stripe test mode keys (`STRIPE_SECRET_KEY_TEST`). Webhook tests use `stripe-mock` or recorded fixtures.
3. **Anthropic / OpenAI / Gemini test calls must use a separate, low-quota API key** — `ANTHROPIC_API_KEY_TEST` (not the prod key). Cap monthly spend in the provider dashboard.
4. **Cancel in-progress runs on the same PR** via the `concurrency` block above. Saves Action minutes.
5. **Set `timeout-minutes` on every job.** Default 6h is dangerous if a job hangs.
6. **Cache `node_modules` via `cache: 'npm'`** — already in templates above.

## Required secrets per stack

| Stack | Required GitHub secrets |
|---|---|
| A | `FIREBASE_SERVICE_ACCOUNT_<PROJECT>` (for deploy), `FIREBASE_PROJECT_ID`, `STRIPE_SECRET_KEY_TEST` (if Stripe) |
| B | `DATABASE_URL_TEST`, provider-specific (`SUPABASE_URL`, `STRIPE_SECRET_KEY_TEST`), `RESEND_API_KEY_TEST` if email |
| C | None typically; `LHCI_GITHUB_APP_TOKEN` optional |
| D | None |
| E | Provider keys, but always the test/low-quota variants |

Production secrets (`*_PROD` or unsuffixed) belong only in the deploy workflow, not CI.

## Branch protection settings (manual via GitHub UI)

For every repo with this CI gate, set under Settings → Branches → main:

- ✅ Require status checks to pass before merging
- ✅ Required checks: `lint-typecheck-test`, `firestore-rules-test` (if A), `audit`
- ✅ Require branches to be up to date
- ✅ Require linear history (recommended; avoids merge commit noise)
- ❌ Do NOT require approvals (single-developer portfolio — would block your own merges)

These settings can't be set via Actions — they're a 🔧 MANUAL TASK.

## Output format

```
CI GATE — [repo] — [date] — Stack [A/B/C/D/E]

EXISTING WORKFLOWS
 - .github/workflows/[file]: [purpose, what runs]

PROPOSED CHANGES
 - Add: [file] — [purpose]
 - Modify: [file] — [section] — [reason]
 - Skip: [file] — [reason]

GENERATED YAML
 [the actual workflow file content]

REQUIRED SECRETS
 [list]

🔧 MANUAL TASKS FOR ANDREW: [per safe-edit-policy Step 8 — branch protection setup, secrets to add to GitHub]
```

## Common mistakes

1. **Adding a deploy step to `ci.yml`** — separate workflows. CI is for gates, deploy is for shipping. Mixing them deploys broken code if the gate is missed.
2. **Using prod credentials in CI secrets** — every key in CI is the test/low-quota variant. Prod keys live in the deploy workflow only.
3. **Setting no `timeout-minutes`** — a hung job consumes Action minutes silently.
4. **Skipping the `concurrency` block** — pushing 5 commits to a PR runs the whole gate 5 times. The `cancel-in-progress` block kills the older runs.
5. **Adding required-status-check rules in GitHub UI before the workflow exists** — your next PR will be blocked because the check has never run. Workflow first, branch protection second.
6. **Forgetting `npm ci` (using `npm install`)** — slower, can mutate `package-lock.json`, non-deterministic.

## Source of truth in this portfolio

- Stack A reference: `~/GitHub/CastHub1/.github/workflows/` (5 workflows: auto-merge.yml, ci.yml, deploy-rules.yml, scheduled-jobs.yml, tagline-drift-check.sh)
- Stack B reference: `~/GitHub/awardssubmission/.github/workflows/` (ci.yml, security.yml)
- Stack C target reference: `~/GitHub/toronadoentertainment/.github/workflows/` (firebase-deploy.yml, preview.yml — example of A-but-mostly-static)
- Stack E reference: `~/GitHub/artas-blog-automation/.github/workflows/` (3 cron workflows)

---
name: firebase-actions-deploy
description: Use when setting up GitHub Actions to deploy to Firebase (Hosting, Functions, Firestore rules, Storage rules). Provides workflow templates with service-account auth, path filters for selective deploys, build caching, and the split between rules-only and full-deploy workflows. Keywords: GitHub Actions, Firebase deploy, firebase-tools, Firestore rules, hosting, functions, GCP service account, FIREBASE_TOKEN, CI/CD, workflows.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash]
---

# Firebase Deploy via GitHub Actions

> **APPLIES TO: Stack A repos only** (React/Vite/TS + Firebase Hosting/Functions). If this repo deploys elsewhere, **stop** and use the appropriate skill:
> - Stack B Next.js → Vercel auto-deploy or `vercel/actions/deploy`
> - Stack B Hono/Express on Railway → Railway's GitHub integration (no Actions YAML needed)
> - Stack B Cloudflare Workers → `wrangler deploy` action
> - Stack C → static deploy via Vercel/Netlify or Firebase Hosting (only the deploy step is Stack A; no rules / functions)
>
> For the **CI gate** (lint/typecheck/test/build) that runs *before* deploy, see `ci-gate-builder` — that skill is stack-conditional and covers all classes.
>
> Always load `safe-edit-policy` first.

Standard CI/CD pattern for the apps in this portfolio. Two workflows usually coexist: a fast rules-only deploy on rules-file change, and a full hosting+functions deploy on `main`.

## When to use
- New repo, no CI yet — set up both workflows up-front
- Manual `firebase deploy` from a laptop is the current process and you want it gone
- A PR changes `firestore.rules` and you want it deployed independently of the SPA build
- You want preview channels for PRs (`firebase hosting:channel:deploy pr-123`)

## When NOT to use
- Apps using Firebase App Hosting (the new managed offering) — that has built-in GitHub integration; use the Firebase console instead
- Cloud Run / Cloud Functions deployed via gcloud (different IAM, different action)

## Auth setup (do this once per repo)

Two options:

### Option A: Service Account JSON (recommended for prod)
1. In GCP console → IAM → Service Accounts → create `github-actions-deployer@[project].iam.gserviceaccount.com`
2. Grant roles: `Firebase Hosting Admin`, `Firestore Service Agent`, `Cloud Functions Developer`, `Service Account User`
3. Create a JSON key, download it
4. Paste the entire JSON into GitHub repo secrets as `GCP_SA_KEY`
5. Reference in workflows via `google-github-actions/auth@v2`

### Option B: FIREBASE_TOKEN (deprecated but simple)
- Run `firebase login:ci` locally, paste the resulting token into `FIREBASE_TOKEN` secret
- Works but Firebase has marked this auth method for deprecation; don't use for new repos

## Workflow 1: Rules-only deploy (fast)

`.github/workflows/deploy-rules.yml`

```yaml
name: Deploy Firestore + Storage Rules

on:
  push:
    branches: [main]
    paths:
      - 'firestore.rules'
      - 'firestore.indexes.json'
      - 'storage.rules'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - id: auth
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install -g firebase-tools

      - name: Deploy rules
        run: firebase deploy --only firestore:rules,firestore:indexes,storage --project ${{ secrets.FIREBASE_PROJECT_ID }} --non-interactive
```

**Why path-filtered:** rules deploys are seconds; full deploys are minutes. Don't couple them.

## Workflow 2: Full hosting + functions deploy

`.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          # ... add all VITE_* env vars the build needs

      - name: Build functions
        if: hashFiles('functions/package.json') != ''
        run: |
          cd functions
          npm ci
          npm run build

      - id: auth
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - run: npm install -g firebase-tools

      - name: Deploy hosting + functions
        run: firebase deploy --only hosting,functions --project ${{ secrets.FIREBASE_PROJECT_ID }} --non-interactive
```

## Workflow 3: Preview channels for PRs

`.github/workflows/preview.yml`

```yaml
name: Preview Channel

on:
  pull_request:
    branches: [main]

jobs:
  preview:
    runs-on: ubuntu-latest
    permissions:
      checks: write           # REQUIRED — FirebaseExtended/action-hosting-deploy creates a check run
      contents: read          # REQUIRED for actions/checkout on bot-opened PRs
      pull-requests: write    # for the preview-URL comment
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci && npm run build

      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.GCP_SA_KEY }}
          projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
          expires: 7d
```

The action posts the preview URL as a PR comment automatically.

## Required secrets (per repo)

| Secret | Purpose |
|--------|---------|
| `GCP_SA_KEY` | Service account JSON for Firebase + GCP auth |
| `FIREBASE_PROJECT_ID` | e.g., `casthub1-prod` |
| `VITE_*` (all of them) | Frontend build-time env vars |
| `SENTRY_AUTH_TOKEN` | If uploading source maps to Sentry in build step |

## Common mistakes

1. **Deploying everything every time** — slow, wasteful. Use path filters or split workflows.
2. **Forgetting `--non-interactive`** — workflows hang waiting for "y/n" prompts.
3. **`npm install` instead of `npm ci`** — non-deterministic builds, slower, no lockfile enforcement.
4. **No build cache** — `cache: 'npm'` cuts CI time by 30–60s.
5. **Service account with too-broad roles** — granting `Owner` instead of specific Firebase roles. Principle of least privilege.
6. **Build env vars missing** — Vite bundles `VITE_*` at build time; if they're not in the workflow's env, they're empty strings in production.
7. **Declaring `permissions:` without `contents: read`** — when a workflow declares any `permissions:` block, every un-declared scope defaults to **none** (not the prior implicit defaults). A workflow with `permissions: { pull-requests: write }` and no `contents` scope will fail `actions/checkout` with `Repository not found` *whenever the PR is opened by a bot account* (e.g., a cross-repo sync workflow, Dependabot in some configs, or any GitHub App). It works when *you* open the PR because your admin permissions flow through `GITHUB_TOKEN` implicitly. Always include `contents: read` (and `checks: write` if you write check runs) when declaring `permissions:` on a `pull_request`-triggered workflow. Battle-tested 2026-05-13 when the claude-skills cross-repo sync workflow opened bot-authored sync PRs into `holiday-lights` and `toronadoentertainment`; their `preview.yml` declared only `pull-requests: write` and the checkout step failed. `Tribeca-Film-Festival-2026/preview.yml` had `contents: read` declared and worked. The fix landed in `holiday-lights@9609f7b` + `toronadoentertainment@4fd2900`.

## Source of truth in this portfolio

- `~/GitHub/CastHub1/.github/workflows/deploy-rules.yml` — canonical rules-only deploy
- `~/GitHub/Producing-Hollywood-Invoicing/.github/workflows/firebase-deploy.yml` — full deploy with functions

---
name: new-app-starter
description: Use when bootstrapping a brand-new app from scratch. Encodes the preferred stack (Vite + React + TypeScript + Tailwind + Firebase + Stripe + Sentry + Langfuse) and the bootstrap order so every new app starts at parity with CastHub1's mature patterns. Sets up CLAUDE.md, docs/, .claude/skills/, firebase.json, firestore.rules, and GitHub Actions in one pass. Keywords: new app, scaffold, bootstrap, Vite, React, TypeScript, Tailwind, Firebase, Stripe, starter, skeleton, monorepo, preferred stack.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, WebFetch]
---

# New App Starter

> **Always load `safe-edit-policy` first.** This skill scaffolds a new repo end-to-end, which means it creates many files in one pass. Without the safety contract loaded, edits land in unexpected places.
>
> **Companion skill:** `new-repo-quality-bootstrap` adds the cross-stack quality envelope (CLAUDE.md, QA, CI, tests, templates) on top of whatever stack this skill scaffolds. Run them in order: `new-app-starter` → `new-repo-quality-bootstrap`.

The opinionated bootstrap for any new app in this portfolio. Codifies the preferred stack and the order in which things go in, so the next app starts where CastHub1 already is — not where it started.

**Smart-from-zero requirement:** every new app from this skill ships with tests/, CI workflow, human-simulation matrix, analytics event map, and monetization checklist from commit one. No "we'll add tests later". See `new-repo-quality-bootstrap` for the composable adoption pack.

## When to use
- New product idea, no repo yet — start here
- Existing repo that's lighter than CastHub1 and you want to bring it up to parity (BacklotHub, Tribeca, gemini_project)
- Someone else is bootstrapping a project for you and needs the spec

## When NOT to use
- Infrastructure-only repos (Terraform, raw GCP) — different stack
- A library / npm package — use a different scaffold (`tsup` or `tsdx`)

## The preferred stack (locked decisions)

> **Vendor consolidation:** every choice below is part of the **house stack** defined in `vendor-consolidation-policy`. Picking a non-house alternative requires the 6-step evaluation gate (pros/cons + 3-year cost projection + ADR) — that skill is the gate; this skill assumes the gate has been passed.


| Layer | Choice | Why |
|-------|--------|-----|
| Frontend framework | **React + TypeScript** | Existing portfolio fluency |
| Build tool | **Vite** | Fast HMR, ESM-native, zero-config TypeScript |
| Styling | **Tailwind CSS + Radix UI** primitives | Tailwind for layout/utilities, Radix for accessible interactive primitives (dialog, dropdown, etc.) |
| Routing | **React Router v6+** | Standard; pinned to v6 unless v7 features needed |
| State | Local state + Zustand for cross-component | No Redux unless app outgrows Zustand |
| Hosting | **Firebase Hosting** (or Firebase App Hosting if SSR needed) | Vite SPA, simple deploys |
| Database | **Firestore** | RBAC pattern documented in `firestore-rbac-helpers` skill |
| Auth | **Firebase Auth** (Google OAuth + email/password) | One identity provider across all apps |
| Backend | **Firebase Functions (TypeScript)** for light APIs; **Express/Hono on Railway** for heavy APIs (>5 routes, AI proxies, websockets, long-running jobs) | Functions for serverless, Railway for stateful. Per `.env.example` inspection 2026-05-10, `awardssubmission` and `holiday-lights` already use Railway. |
| Payments | **Stripe** (subscriptions or one-time) | Test mode → live mode; webhook to backend |
| Email | **SMTP2GO** (or SendGrid) | Cheap, deliverable, simple API |
| SMS | **Twilio** with A2P 10DLC | Required for US 10DLC compliance |
| AI | **Anthropic Claude** via metered proxy | Per-org token budgets, see CastHub1's `backend/aiProxy.js` |
| Observability | **Sentry + Langfuse + ConfigCat** | Errors / LLM traces / kill-switches (lean stack ~$26/mo) |
| Mobile (when needed) | **Capacitor** wrapping the web app | One codebase, native shells |
| Repo CI | **GitHub Actions** | Workflows in `firebase-actions-deploy` skill |

Don't deviate from this stack without a documented reason. Consistency across the portfolio is the whole point.

## Bootstrap order (don't reorder)

### 1. Create the Vite + React + TypeScript scaffold
```bash
npm create vite@latest [app-name] -- --template react-ts
cd [app-name]
npm install
git init && git add -A && git commit -m "feat: vite + react + ts scaffold"
```

### 2. Add Tailwind + Radix
```bash
npm install -D tailwindcss postcss autoprefixer @tailwindcss/vite
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu lucide-react
```
Configure `tailwind.config.js`, `postcss.config.js`, and add `@import "tailwindcss"` to `index.css`.

### 3. Initialize Firebase
```bash
npm install firebase firebase-admin
firebase login
firebase init hosting,firestore,functions,storage
```
- Public dir: `dist`
- Single-page app: yes
- Functions language: TypeScript

### 4. Apply security skills
- Run the `firebase-hosting-security` skill — populate `firebase.json` with CSP, cache, headers
- Run the `firestore-rbac-helpers` skill — populate `firestore.rules` with helpers + default-deny

### 5. Add the documentation skeleton
Create:
- `CLAUDE.md` — project overview, brand/voice, key decisions (use template below)
- `docs/` — empty, ready for strategy/sales/operations subdirs
- `.claude/skills/` — empty, app-specific skills go here
- `MANUAL_TASKS.md` — placeholder for the human queue
- `.env.example` — empty template, populated as vendors are added

### 6. Wire Firebase Auth + Firestore client
- `services/firebase.ts` — init Firebase app, export `auth`, `db`, `storage`
- `hooks/useAuth.ts` — observe auth state, expose user + loading
- `services/userProfileService.ts` — get/create user doc on first sign-in (with `role: 'member'` pinned)

### 7. Add the observability stack
- Run `vendor-onboarding-walkthrough` skill for: Sentry, Langfuse, ConfigCat
- Init in `main.tsx`: `Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN })`
- Wrap the app with an `<ErrorBoundary>` from `@sentry/react`

### 8. GitHub setup
- Create the repo: `gh repo create [user]/[name] --private --source=. --remote=origin --push`
- Run `firebase-actions-deploy` skill — drop in the CI workflows
- Add required secrets via `gh secret set`

### 9. First end-to-end deploy
- `npm run build && firebase deploy` from local
- Verify hosting URL works
- Push to main; verify GitHub Actions runs and re-deploys
- This is the milestone — everything below is feature work

### 10. Stripe (only if needed)
- Run `vendor-onboarding-walkthrough` skill for Stripe (test mode)
- Add `services/stripeService.ts`, `services/billingService.ts`
- Add backend webhook handler

## CLAUDE.md template (drop in step 5)

```markdown
# [PROJECT NAME] — Project Context for Claude Code

**Repo:** `[user]/[repo]` | **Domain:** `[https://...]`
**Owner:** Andrew Ward (jayhawkrules) | **Created:** [YYYY-MM-DD]

## What this is
[One paragraph: what the product does, who it's for, current stage.]

## Stack
React + TypeScript + Vite + Tailwind + Firebase (Hosting + Firestore + Auth + Functions) + Stripe + Sentry + Langfuse.
For full conventions see `~/.claude/skills/new-app-starter/SKILL.md`.

## Key files
- `firestore.rules` — RBAC, see `firestore-rbac-helpers` skill
- `firebase.json` — hosting + headers, see `firebase-hosting-security` skill
- `services/firebase.ts` — client init
- `backend/` or `functions/` — server code

## Locked decisions
- [List anything that should not be changed without explicit conversation — e.g., "Talent is always free", "Brand voice is X"]

## Roadmap context
[Pointer to roadmap doc or current quarter's focus]

## Stop and ask before
- [Project-specific stop list]
```

## Common mistakes

1. **Skipping CLAUDE.md** — first thing Claude (Code or Cowork) needs is project context. Without it, every session starts cold.
2. **Adding observability last** — by then you have weeks of un-instrumented errors. Add Sentry on day 1.
3. **Reordering stack choices "just for this app"** — defeats the portfolio efficiency. If you genuinely need a different choice, document why in CLAUDE.md.
4. **Manual `firebase deploy` becoming permanent** — set up GitHub Actions in step 8, not "later".
5. **Missing `.env.example`** — next-machine setup is broken.

## Required ending: 🔧 MANUAL TASKS block

Every run of this skill ends with the manual-task block per `safe-edit-policy` Step 8. At minimum:

```
🔧 MANUAL TASKS FOR ANDREW:

1. Platform: Firebase Console
   Task: Create the Firebase project [project-id], enable Auth (Google), Firestore, Hosting
   Why it matters: app cannot deploy or authenticate without this
   Config/value needed: project-id from naming convention
   How to verify: visit console.firebase.google.com and see the project
   Follow-up Claude Code prompt: "Now run firebase-actions-deploy to wire up CI/CD"

2. Platform: GitHub
   Task: Create the new repo [name] under jayhawkrules/, push initial commit, set branch protection
   ...

[plus Stripe, Sentry, Langfuse, ConfigCat setup tasks per vendor-onboarding-walkthrough]
```

## Source of truth

- `~/GitHub/CastHub1/` — the Stack A reference implementation (most complete)
- `~/GitHub/holiday-lights` — Stack A reference for newer apps (Sentry/Langfuse/ConfigCat already wired in `.env.example` per 2026-05-10 inspection)
- `~/GitHub/awardssubmission` — Stack B reference (Next.js + Stripe + Resend + Anthropic)
- This skill — the spec
- Sibling skills: `safe-edit-policy` (must be loaded), `new-repo-quality-bootstrap` (composes adoption pack), `qa-hardening`, `human-simulation-testing`, `ci-gate-builder`, `monetization-readiness-review`, `analytics-event-map`, `vendor-onboarding-walkthrough`

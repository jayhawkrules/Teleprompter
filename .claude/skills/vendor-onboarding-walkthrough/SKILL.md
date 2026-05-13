---
name: vendor-onboarding-walkthrough
description: Use when standing up a new third-party SaaS vendor (Sentry, Langfuse, ConfigCat, Canny, PostHog, Stripe, SendGrid, Twilio, etc.) and need a step-by-step walkthrough that captures keys safely, adds them to GitHub Secrets, updates .env.example, and verifies via test call. Especially for the "TRACK" items in a Cowork queue. Keywords: Sentry, Langfuse, ConfigCat, Canny, PostHog, Stripe, SendGrid, Twilio, vendor setup, API key, GitHub secrets, .env, secret rotation.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, WebFetch]
---

# Vendor Onboarding Walkthrough

> **Always load `safe-edit-policy` first.**
>
> **Step 0 (before this skill):** Has the consolidation gate from `vendor-consolidation-policy` been satisfied? That skill answers WHETHER to add the vendor at all (default = use the house stack; deviation requires written pros/cons + 3-year cost analysis + ADR). This skill answers HOW to wire it once that decision is made. Do not skip the gate — vendor sprawl is the silent killer of portfolio margin (23 apps × N forgotten subscriptions).

A repeatable 5-step process for adding a new SaaS vendor to any app. Designed for the "TRACK" items in a Cowork session — the parts where the human has to click through a dashboard while the agent waits and verifies.

## When to use
- Activating a new vendor (e.g., the observability stack: Sentry + Langfuse + ConfigCat)
- Rotating an existing vendor's keys
- Migrating between vendors (e.g., Mailgun → SendGrid)
- Setting up a Stripe test-mode environment for a new app

## When NOT to use
- Tools that don't issue API keys (e.g., Notion, Slack — those use OAuth/connectors, different flow)
- Local-only tools (linters, formatters) — no remote keys to manage

## The 5-step walkthrough format

Apply this template for any vendor. Step numbers are sacred — the human has to confirm each before the next.

### Step 1: Create the account
- Tell the user: "Go to [URL]. Sign up with your work email ([andrewpward@gmail.com])."
- If the vendor has a Free tier, lock to it: "Pick the Free / Hobby plan, NOT the trial."
- Wait for "done" before moving on.

### Step 2: Create the project / app
- Tell the user the exact name to use: matches the GitHub repo (e.g., `CastHub1`, `BacklotHub`).
- For tools that scope by environment, create both `production` and `development` projects.
- For tools that scope by platform (Sentry: `javascript-react`, `node-express`), use the matching SDK type.

### Step 3: Capture the keys
- Enumerate exactly what to copy. Always specify which key for which env var:
  - **Sentry**: `SENTRY_DSN` (frontend), `SENTRY_AUTH_TOKEN` (CI), `SENTRY_ORG`, `SENTRY_PROJECT`
  - **Langfuse**: `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL` (cloud.langfuse.com or self-hosted)
  - **ConfigCat**: `CONFIGCAT_SDK_KEY` (per environment — separate prod/dev)
  - **Stripe**: `STRIPE_PUBLISHABLE_KEY` (frontend, `pk_test_*` or `pk_live_*`), `STRIPE_SECRET_KEY` (backend, `sk_test_*` or `sk_live_*`), `STRIPE_WEBHOOK_SECRET` (per webhook endpoint, `whsec_*`)
  - **SendGrid / SMTP2GO**: API key + verified-sender email
  - **Twilio**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` (NOT the bare phone number — the messaging service abstracts A2P 10DLC compliance)
- **Never paste a key into chat.** Tell the user to paste it directly into GitHub Secrets, never echo it back.

### Step 4: Add to GitHub Secrets + .env.example
- URL pattern: `github.com/[user]/[repo]/settings/secrets/actions`
- Name secrets in `SCREAMING_SNAKE_CASE`. Match exactly what the code reads.
- Update `.env.example` with the same names but blank values + a comment explaining what the key is. This is the contract for future-you and any contributor.
- For mobile apps (Capacitor), some keys also need to live in `apphosting.yaml` runtime config.

### Step 5: Verify via test call
- Trigger one operation that uses the key. Examples:
  - Sentry: throw a test error from a debug button, confirm it appears in the dashboard within 60s
  - Langfuse: send a single trace with a test prompt, confirm in the Traces tab
  - Stripe: open Checkout in test mode, complete a card with `4242 4242 4242 4242`
  - SendGrid: send a test email to yourself
- If verification fails, the keys are wrong or scoped wrong — don't move on.

## Per-vendor recipes

### Sentry
- Plan: Developer (Free) — 5K events/mo, sufficient for early-stage
- Project type: choose `Browser JavaScript / React` for frontend, `Node.js / Express` for backend (create both as separate projects in the same org)
- Source maps: enable in Vite via `@sentry/vite-plugin` and the `SENTRY_AUTH_TOKEN`
- Source of truth: dashboard at sentry.io/[org-slug]/projects/

### Langfuse
- Cloud: cloud.langfuse.com (US or EU region — pick US unless you have GDPR reason)
- Plan: Hobby (Free) — 50K observations/mo
- Integration: wrap your Anthropic/OpenAI SDK calls with `@langfuse/openai` or manual `langfuse.trace()` calls

### ConfigCat
- Plan: Free — 10 flags, sufficient for kill-switches
- Conventions: name flags `[domain]_[feature]_kill_switch` (e.g., `casting_ai_kill_switch`)
- Per-env keys: separate SDK keys for prod and dev, same flag names

### Stripe (test mode setup for a new app)
- Don't activate the live mode account until you've shipped at least one Checkout session in test mode
- Webhook: ngrok or Stripe CLI for local testing; in prod, register the webhook to `https://[your-domain]/api/stripe/webhook` with at minimum `checkout.session.completed` and `customer.subscription.*` events

## Common mistakes

1. **Pasting a key into chat or git** — even private chats can leak. Use Secrets only.
2. **Mixing test and live keys in the same .env** — different files: `.env.local` for dev, GitHub Secrets for prod, never overlap.
3. **Skipping `.env.example` update** — next contributor (or future-you on a new machine) won't know what's needed.
4. **Forgetting webhook secrets** — Stripe `whsec_*` is per-endpoint. If you have separate prod/staging webhooks, each has its own secret.
5. **Treating Free tier as a trial** — Sentry/Langfuse/ConfigCat all have permanent free tiers; don't accidentally pick the paid trial.

## Output format when running this skill

```
Vendor: [Name]
Step 1 of 5 — Create account
  → [URL]
  → Use email: andrewpward@gmail.com
  → Plan: Free / Hobby
Reply "done" when account is created.
```

Then wait. Don't pre-emit Step 2.

## Source of truth in this portfolio

- `~/GitHub/CastHub1/MANUAL_TASKS.md` Category G — observability vendor decisions reference
- `~/GitHub/CastHub1/docs/operations/cowork-kickoff-today.md` lines 81–88 — the original Sentry/Langfuse/ConfigCat walkthrough framing

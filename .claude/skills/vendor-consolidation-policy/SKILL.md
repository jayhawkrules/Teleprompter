---
name: vendor-consolidation-policy
description: Use BEFORE adopting any new paid SaaS vendor or backend service in any portfolio repo. Defaults to the house stack (a single, shared set of vendors used across all 23 apps) to avoid subscription fragmentation. When a different vendor is genuinely better, requires a written pros/cons + 3-year cost projection + in-house alternative analysis BEFORE wiring anything. Companion to vendor-onboarding-walkthrough (which handles the HOW after the WHETHER is decided). Keywords: vendor, SaaS, subscription, consolidation, cost, monthly, pricing, in-house, self-hosted, Sentry, Stripe, Resend, Twilio, Supabase, Vercel, Railway, vendor sprawl, evaluation, ADR.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Vendor Consolidation Policy

The strategic gate before adding any paid third-party service to any portfolio repo. Andrew runs 23 apps under one company (Toronado Entertainment, LLC); subscription sprawl across that many products is the silent killer of margin. This skill enforces the rule: **default to the house stack, justify any deviation with cost + tradeoffs.**

Always load `safe-edit-policy` first.

## When to use

- Before adding any new SaaS dependency that costs money (now or later, including "free tier that converts to paid")
- Before adopting a new backend service (database, queue, auth provider, file storage)
- Before recommending a vendor in a skill output (e.g., monetization-readiness-review proposing PostHog vs Plausible)
- During quarterly portfolio-health-audit — flag any vendor present in only 1-2 apps as a consolidation candidate
- When a Cowork or Claude Code session is about to scaffold a new app — gate the stack choices

## When NOT to use

- Pure code refactors with no new external dependency
- Adding an open-source library that runs in your own process (npm package, Python lib, etc.) — that's not a "vendor"
- Configuring a vendor that's already on the house stack (use `vendor-onboarding-walkthrough` directly)

## The default house stack

This is the canonical list. Every new app should default to these unless explicitly justified otherwise.

### Approved house vendors per layer

| Layer | House choice | Tier in use | Cost basis | Why this one |
|---|---|---|---|---|
| **Frontend host (SPA/static)** | **Firebase Hosting** | Free → Blaze pay-as-you-go | $0 baseline; ~$0.026/GB egress past free tier | Already paid for via Firebase; no separate bill |
| **Backend host (heavy APIs)** | **Railway** | Hobby ($5/mo) / Pro | $5/mo per service | Stateful; alternative to Firebase Functions for >5 routes |
| **Backend (light APIs)** | **Firebase Functions** | Pay-as-you-go | Bundled with Firebase | Serverless; cheapest at low scale |
| **Database** | **Firestore** | Pay-as-you-go | $0 free tier; ~$0.18/GB after | RBAC via firestore-rbac-helpers; bundled with Firebase |
| **Auth** | **Firebase Auth** | Free | $0 (free at portfolio scale) | One identity provider across all apps |
| **Payments** | **Stripe** | Standard | 2.9% + $0.30 per transaction | Necessary; no realistic alternative for the scale needed |
| **Email (transactional)** | **SMTP2GO** OR **Resend** | Free tier each | $0 → ~$10/mo | Either works; pick ONE per portfolio, not both |
| **SMS** | **Twilio** | Pay-as-you-go | ~$0.0079 per SMS US | A2P 10DLC compliance; necessary for US business SMS |
| **AI / LLM** | **Anthropic Claude** | Per-token | Variable | Routed through CastHub1's `backend/aiProxy.js` for portfolio-wide budget |
| **LLM tracing** | **Langfuse** | Free tier | $0 baseline; ~$29/mo if paid | Required if app calls LLMs |
| **Error monitoring** | **Sentry** ⚠ see "Sentry consolidation question" below | Free per project | $0 free per project, but limited to 5k errors/mo and 1 user | THIS IS THE DECISION POINT — see below |
| **Feature flags / kill switches** | **ConfigCat** | Free → Pro | $0 → ~$99/mo | Lean alternative to LaunchDarkly |
| **Product analytics** | **PostHog** OR **Firebase Analytics** | Free tier | $0 → variable | Pick ONE per portfolio for cross-app rollups |
| **Page analytics** | **Plausible** | $9/mo per 100k pageviews, unlimited sites | ~$9/mo total for portfolio | One subscription covers all 23 apps; no cookie banner |
| **Mobile shell** | **Capacitor** | Open source | $0 | One codebase, native shells |
| **Mobile IAP** | **RevenueCat** | Free up to $2.5k MTR | $0 → ~$8/mo per $1k revenue past threshold | Only if app monetizes via App Store / Play |
| **Donations marketplace** | **EveryOrg** | Free | $0 | Charity payouts; only Noelly uses it |
| **Code repo + CI** | **GitHub** | Personal Pro $4/mo or Team | Already paid | Single account; Actions minutes shared |
| **Performance + SEO CI** | **Lighthouse CI (`@lhci/cli`)** | Open source | $0 | Runs in CI (or local). Asserts on Performance/SEO/CWV/A11y. Used by `seo-aeo-optimizer` skill. Cloudflare's `temporary-public-storage` upload target is free. |
| **Domain/DNS** | **Cloudflare** | Free → Pro $20/mo per zone | $0 mostly | One account, all domains; CAA records, security |
| **Phone (calls + SMS)** | **Quo** | ~$25/mo per number | $25/mo current | CastHub1 uses; consider sharing across portfolio |
| **CMS (when needed)** | **Sanity** | Free → Growth | $0 → $15/mo | ProducingHollywood uses; reuse before adding alternatives |
| **WordPress (legacy)** | Self-hosted on existing infra | varies | n/a | Backups via artas-wordpress-backup |

### Per-portfolio shared subscriptions (NOT per-app)

These should each be **one subscription that covers all 23 apps**, not 23 separate subscriptions:

- GitHub Pro/Team — single account
- Cloudflare account — single, multiple zones
- Plausible — single subscription, all sites
- ConfigCat — one organization, multiple apps
- Sentry — one organization, multiple "projects" within (free tier covers small portfolio; if paying, Team plan $26/mo covers unlimited projects)
- Langfuse — one org, multiple "projects"
- PostHog — one org, multiple "project" tokens

**Anti-pattern:** signing up for Sentry separately per app (5× $0 free tier limits hit fast as portfolio grows). Always create the second app as a "project" inside the existing Sentry organization.

## The Sentry consolidation question (worked example)

You raised this directly. Here's the framework applied to it:

### Option A: Single Sentry organization, free tier per project
- **Cost:** $0 (free tier: 5k errors/mo + 50 replays + 10k spans per project; unlimited projects in an org)
- **Pros:** Industry-standard tooling. Source map upload, breadcrumbs, replay, alerting, integrations with Slack/email already work. No build-it-and-maintain-it cost.
- **Cons:** Free tier per-project quota can fill on a busy app. Sentry can deprecate the free tier.
- **Recommendation:** **Default choice.** All 23 apps as separate projects in one Sentry org. Total cost: $0. If a P0 app starts saturating the 5k error limit, that's a *good problem* (real users hitting real bugs) and worth a paid tier for that one project, not a build.

### Option B: Sentry Team plan
- **Cost:** $26/mo flat for the entire org (Team plan), or $80/mo for Business
- **Pros:** Covers all projects. Lifts free-tier limits. Adds dashboards, alerts SLO, custom integrations.
- **Cons:** $312/year fixed cost. Probably not justified pre-launch.
- **When to upgrade:** when ≥3 apps are live AND one is consistently hitting free-tier limits. Not before.

### Option C: GlitchTip (open-source, Sentry-API-compatible)
- **Cost:** $0 software + ~$5/mo Railway hosting = **~$5/mo total for the portfolio**
- **Pros:** Drop-in replacement for Sentry SDK; no per-error cost; full ownership; no vendor lock-in. Most Sentry integrations work as-is.
- **Cons:** You're now an SRE for an error-monitoring service. If GlitchTip goes down, you don't know your apps are erroring. Source maps are a pain to wire. Replay isn't supported.
- **When to choose:** if you've outgrown Sentry free tier, want full data ownership (e.g., PII concerns), and have time to maintain an extra service.

### Option D: In-house ultra-simple
A `console.error` interceptor that POSTs to a Cloudflare Worker → R2 bucket + Slack webhook on errors above a threshold.
- **Cost:** ~$0 (Cloudflare free tier covers it for the portfolio)
- **Pros:** Total ownership. Trivial to maintain (~50 lines of code). Cheapest possible.
- **Cons:** Reinventing source-map handling, breadcrumb capture, alert deduplication, dashboard. You'll spend more in your time than the $26/mo Sentry would cost. Bus factor: 1 (you).
- **When to choose:** **Probably never** for a portfolio of this size. The labor cost dwarfs any subscription saving.

### Andrew's recommended path

**Start with Option A (one Sentry org, free tier per project, all 23 apps as projects).** Total cost: $0. Re-evaluate in 6 months: if any app is consistently hitting the 5k error limit AND has paying users, upgrade *only that org* to Team ($26/mo) — not migrate to GlitchTip. The 6 hours you'd spend migrating to GlitchTip is worth more than 4 years of Team-tier Sentry.

**Save the in-house build energy** for something with a real ROI delta — e.g., the AI-proxy that meters Anthropic spend across the portfolio (which CastHub1 already does, and could be extracted into a portfolio-wide service).

## The 6-step evaluation gate (use this for every "let's add vendor X" moment)

When a session proposes adopting a vendor that's NOT in the approved house stack, produce this analysis BEFORE wiring anything:

### Step 1 — Name the layer
"This is for [error monitoring / payments / DB / etc.]. The house default for this layer is [vendor name]."

### Step 2 — Why is house default insufficient?
Concrete. "House default is X. The proposed alternative is Y. The gap is Z." If you can't name a real, current gap, **stop — use the house default.**

### Step 3 — Cost projection over 3 years
For each of: house default, proposed alternative, in-house build (if applicable):

```
                  | Year 1  | Year 2  | Year 3  | 3-yr total
House default     | $X      | $X      | $X      | $X
Proposed vendor   | $X      | $X      | $X      | $X
In-house build    | $X+L    | $L      | $L      | $X+3L
                                             (L = labor)
```

Be honest about labor cost. At $50/hr opportunity cost, 10 hours/year of maintaining an in-house service = $500/yr. Compare to the subscription.

### Step 4 — Pros / cons table
At minimum 3 pros and 3 cons per option, written so a reviewer can argue back.

### Step 5 — Recommendation with reasoning
ONE choice, with the specific tradeoff being accepted. Format:
> "Recommend [X]. Trades [downside accepted] for [upside gained]. Re-evaluate trigger: [condition that would flip the decision]."

### Step 6 — Save as ADR
Write the analysis to `docs/decisions/YYYY-MM-DD-vendor-[layer].md` in the relevant repo. Future-you needs to remember WHY this choice was made.

## Quarterly subscription audit

Run on the first of each quarter as part of `portfolio-health-audit`:

```
SUBSCRIPTION AUDIT — [date]

Active subscriptions across portfolio:
| Vendor    | Cost/mo | Apps using | Could consolidate? | Action |
|-----------|---------|------------|--------------------|--------|
| Sentry    | $X      | N apps     | already org-shared | none   |
| Plausible | $9      | M apps     | already shared     | none   |
| ...       | ...     | ...        | ...                | ...    |

Total monthly burn: $X
Total annual burn: $X*12

Vendors used by only 1-2 apps (consolidation candidates):
 - [vendor]: only used by [app] — alternative is [house default]; cost of switch [...]

Vendors approaching free-tier limits:
 - [vendor]: [app] at [%] of [quota] — upgrade decision needed by [date]
```

Output goes to `~/GitHub/claude-skills/PORTFOLIO_ADOPTION_STATUS.md` under a "Subscription audit" section.

## Common mistakes

1. **"Free tier is free, so why not add it"** — every free tier is a future paid subscription waiting to happen. Add a vendor only if you'd be willing to pay for it eventually.
2. **Adopting per-app rather than per-portfolio** — signing up for Sentry separately per app means you can't share quotas, dashboards, or alerts. Always create the new app as a project in the existing org.
3. **Building in-house to "save money"** — labor cost rarely beats SaaS for non-core infra. Build in-house only when (a) it's core to your differentiation OR (b) the third-party would charge multiples of your labor cost.
4. **No re-evaluation trigger** — adopting a vendor without writing down what would make you switch off is how subscriptions become permanent. Always include "re-evaluate trigger" in the ADR.
5. **Skipping the labor cost line** — a free in-house alternative isn't free if it costs you 5 hours/quarter to maintain.
6. **One-off "let's just try X for this app"** — that's how you end up with 3 analytics providers and 2 error monitors. The gate exists precisely to stop this.

## Source of truth in this portfolio

- This skill is the strategic gate. The operational HOW lives in `vendor-onboarding-walkthrough`.
- `PORTFOLIO_ADOPTION_STATUS.md` should track current vendor usage per repo (Vendors section, when added).
- ADRs (Architecture Decision Records) live in each repo at `docs/decisions/YYYY-MM-DD-vendor-[layer].md`.
- For the AI proxy / Anthropic budget consolidation: see `~/GitHub/CastHub1/backend/aiProxy.js` as a reference implementation that could be extracted into a portfolio-wide service.
- Sibling skills: `vendor-onboarding-walkthrough` (operational), `monetization-readiness-review` (Section 11 amortizes vendor cost per revenue path), `new-app-starter` (defaults to this house stack), `portfolio-health-audit` (runs the quarterly subscription audit).

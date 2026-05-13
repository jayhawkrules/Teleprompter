# Skills Registry

Machine + human-readable index of every skill in this hub. Sister file: `skills-registry.json` (same data, machine format).

**Total skills:** 34 (13 pre-existing + 13 new in 2026-05-10 upgrade + 2 added 2026-05-10 observability + 1 strategic added 2026-05-10 + 1 legal added 2026-05-11 + 1 casting added 2026-05-11 + 1 design added 2026-05-12 + 1 casting-research added 2026-05-12 + 1 database-link-and-permissions-audit added 2026-05-12)
**Last regen:** 2026-05-12

## Schema

For each skill, the registry tracks:
- **name** — folder name (matches frontmatter `name:`)
- **path** — relative folder path
- **purpose** — one-line summary (from frontmatter `description:`)
- **stack support** — A/B/C/D/E or "all"
- **when to use** — primary trigger(s)
- **when not to use** — exclusion(s)
- **related skills** — composes with
- **revenue impact** — how it ties to monetization
- **safety impact** — how it reduces operational risk
- **applies to repo classes** — which of the 5 stack classes this skill works in

## Skills

### AI Safety & Workflow

#### safe-edit-policy
- **Path:** `safe-edit-policy/`
- **Purpose:** Foundation contract for every session — inspection, stack detection, no-fake-completion, manual-task format, definition of done
- **Stack support:** all
- **When to use:** every session, automatically. There is no "when not to use".
- **When not to use:** —
- **Related:** every other skill assumes this is loaded
- **Revenue impact:** prevents accidental edits to revenue-critical files (auth, payments, webhooks)
- **Safety impact:** highest — defines the entire safety perimeter
- **Applies to:** A, B, C, D, E

#### fresh-chat-handoff
- **Path:** `fresh-chat-handoff/`
- **Purpose:** Generate a self-contained kickoff prompt for a cold-start AI session
- **Stack support:** all (auto-fills stack-specific notes)
- **When to use:** starting a fresh Claude Code or Cowork session
- **When not to use:** continuing an existing session
- **Related:** `cowork-kickoff` (Cowork-specific equivalent)
- **Revenue impact:** indirect — prevents wasted-session cost
- **Safety impact:** high — bakes safe-edit-policy into the kickoff
- **Applies to:** A, B, C, D, E

#### cowork-kickoff
- **Path:** `cowork-kickoff/`
- **Purpose:** Generate a Cowork (claude.ai cloud) kickoff prompt with embedded safety contract (since Cowork doesn't auto-load `~/.claude/skills/`)
- **Stack support:** all
- **When to use:** starting a Cowork session
- **When not to use:** Claude Code session (use `fresh-chat-handoff`)
- **Related:** `fresh-chat-handoff`
- **Revenue impact:** indirect
- **Safety impact:** high — embeds safety contract in remote sessions
- **Applies to:** A, B, C, D, E

### Testing & QA

#### qa-hardening
- **Path:** `qa-hardening/`
- **Purpose:** Install or audit a stack-conditional QA bar
- **Stack support:** A, B, C, D, E
- **When to use:** any repo without tests; pre-launch
- **When not to use:** Stack F (empty); pure HTML preview repos
- **Related:** `ci-gate-builder`, `human-simulation-testing`, `production-error-to-regression`
- **Revenue impact:** medium — prevents revenue-path regressions
- **Safety impact:** high — closes the test gap (0/23 portfolio repos have tests as of 2026-05-10)
- **Applies to:** A, B, C, D, E

#### human-simulation-testing
- **Path:** `human-simulation-testing/`
- **Purpose:** Design + run 10-persona × journey matrix per app
- **Stack support:** A, B (full); C (Lighthouse + manual scripts); D, E (adapted)
- **When to use:** pre-launch; after revenue/auth feature change
- **When not to use:** backend-only; pre-MVP
- **Related:** `qa-hardening`, `production-error-to-regression`
- **Revenue impact:** high — frustrated/distracted/recovery personas catch revenue-loss patterns
- **Safety impact:** high
- **Applies to:** A, B, C (with caveats), D and E only adapted

#### production-error-to-regression
- **Path:** `production-error-to-regression/`
- **Purpose:** Convert a production error (Sentry alert, user report, post-mortem) into a permanent regression test
- **Stack support:** A, B (full); C, D, E (adapted)
- **When to use:** when a Sentry alert fires; when a user reports a bug
- **When not to use:** copy edits; one-time data migrations
- **Related:** `qa-hardening`, `human-simulation-testing`
- **Revenue impact:** medium-high — prevents recurring revenue bugs
- **Safety impact:** high — turns incidents into permanent guards
- **Applies to:** A, B, C, D, E

### CI/CD & Infrastructure

#### ci-gate-builder
- **Path:** `ci-gate-builder/`
- **Purpose:** Generate stack-conditional GitHub Actions CI YAML; cost guardrails (Emulator only, never live)
- **Stack support:** A, B, C, D, E
- **When to use:** repo without CI gate; before launch
- **When not to use:** Stack F
- **Related:** `qa-hardening`, `firebase-actions-deploy` (Stack A deploy half)
- **Revenue impact:** medium — broken merges to revenue-critical code blocked
- **Safety impact:** high — automation gate
- **Applies to:** A, B, C, D, E

#### firebase-hosting-security
- **Path:** `firebase-hosting-security/`
- **Purpose:** Configure / audit Firebase Hosting `firebase.json` (CSP, cache, security headers)
- **Stack support:** A only
- **When to use:** Firebase-hosted Vite/React SPA
- **When not to use:** any non-Firebase host
- **Related:** `firestore-rbac-helpers`, `firebase-actions-deploy`
- **Revenue impact:** low (security baseline)
- **Safety impact:** high — CSP + HSTS + frame protection
- **Applies to:** A only

#### firestore-rbac-helpers
- **Path:** `firestore-rbac-helpers/`
- **Purpose:** Reusable Firestore rule helpers (isAuthed, isAdmin, isOrgMember), immutable role pinning, default-deny
- **Stack support:** A only
- **When to use:** writing/auditing `firestore.rules`
- **When not to use:** non-Firestore stacks (use RLS for Supabase, middleware for Express, etc.)
- **Related:** `firebase-hosting-security`, `firebase-actions-deploy`
- **Revenue impact:** medium — authz of paid features
- **Safety impact:** high — prevents privilege escalation
- **Applies to:** A only

#### firebase-actions-deploy
- **Path:** `firebase-actions-deploy/`
- **Purpose:** GitHub Actions workflows for Firebase deploys (rules-only, full, PR previews)
- **Stack support:** A only
- **When to use:** Firebase Hosting/Functions deployment via GH Actions
- **When not to use:** Vercel/Railway/Cloudflare/etc. deployments
- **Related:** `ci-gate-builder` (the gate half), `firebase-hosting-security`
- **Revenue impact:** medium
- **Safety impact:** medium
- **Applies to:** A only

#### database-link-and-permissions-audit
- **Path:** `database-link-and-permissions-audit/`
- **Purpose:** End-to-end audit that every DB item (Firestore, Realtime DB, Storage, Supabase/Postgres, D1/KV/R2) is wired through the app and has the right permissions. Inventories the code surface vs. the declared surface (rules / RLS / schema), diffs them, flags orphans in either direction, then verifies fields written by code line up with rule constraints. Covers index coverage, RLS-enabled checks, privilege-field pinning, and cross-DB join-key drift.
- **Stack support:** A (Firebase), B (Supabase, Prisma, Cloudflare bindings)
- **When to use:** before launching any new app; after adding a new collection/table/KV/R2/D1 surface; after a "user paid but no record" bug; during quarterly `repo-health-audit`; before granting a new role/claim/service account
- **When not to use:** apps with no persistent storage (pure static Stack C); during incident-response rollbacks
- **Related:** `safe-edit-policy`, `firestore-rbac-helpers` (the rule helpers it checks for), `firebase-actions-deploy` (audit should precede a rules deploy), `monetization-readiness-review`, `repo-health-audit`, `payment-webhook-safety`
- **Revenue impact:** high — catches join-key drift (Firebase uid ↔ Stripe customer ↔ Supabase profile) and unprotected billing fields that silently leak revenue
- **Safety impact:** highest — privilege-field exposure, orphan rules, RLS-not-enabled, service-role keys in client bundle
- **Applies to:** A, B

### Security

#### vendor-consolidation-policy
- **Path:** `vendor-consolidation-policy/`
- **Purpose:** Strategic gate before adopting any new paid SaaS vendor — defaults to the house stack across 23 apps, requires 3-year cost projection + pros/cons + ADR before allowing a non-house choice
- **Stack support:** all
- **When to use:** BEFORE wiring any new vendor; before recommending one in another skill's output; quarterly subscription audit
- **When not to use:** open-source library additions (no SaaS); vendors already in the house stack
- **Related:** `vendor-onboarding-walkthrough` (operational HOW after this skill's WHETHER), `monetization-readiness-review` (Section 11 amortizes vendor cost), `new-app-starter` (defaults to this house stack), `portfolio-health-audit` (runs the quarterly audit)
- **Revenue impact:** **highest** indirectly — prevents subscription sprawl across 23 apps from eating margin
- **Safety impact:** medium
- **Applies to:** A, B, C, D, E

#### payment-webhook-safety
- **Path:** `payment-webhook-safety/`
- **Purpose:** 7-point webhook safety checklist (signature, idempotency, replay, retry, rotation, dead-letter, authz)
- **Stack support:** A, B (Stripe/Payhip/RevenueCat/EveryOrg/Twilio)
- **When to use:** any webhook handler; pre-launch revenue path
- **When not to use:** notification-only webhooks (no state change)
- **Related:** `monetization-readiness-review`, `stripe-new-app-setup`
- **Revenue impact:** **highest** — prevents missed payments + double charges
- **Safety impact:** highest in revenue path
- **Applies to:** A, B (any stack with webhook handlers)

#### vendor-onboarding-walkthrough
- **Path:** `vendor-onboarding-walkthrough/`
- **Purpose:** 5-step playbook for adding a new SaaS vendor (Sentry, Langfuse, ConfigCat, Stripe, etc.)
- **Stack support:** all
- **When to use:** wiring a new vendor's API key + dashboard
- **When not to use:** internal-only services
- **Related:** `analytics-event-map`, `payment-webhook-safety`
- **Revenue impact:** medium (when wiring Stripe / payment provider)
- **Safety impact:** medium (correct secret handling)
- **Applies to:** A, B, C, D, E

### Product & Monetization (NEW category)

#### monetization-readiness-review
- **Path:** `monetization-readiness-review/`
- **Purpose:** Audit any revenue path end-to-end — 10 dimensions, app-specific guidance, passive-income scoring
- **Stack support:** all (revenue-bearing only)
- **When to use:** pre-launch; after payment-touching change; quarterly per revenue repo
- **When not to use:** apps with no monetization plan
- **Related:** `payment-webhook-safety`, `analytics-event-map`, `stripe-new-app-setup`
- **Revenue impact:** **highest** — direct
- **Safety impact:** medium-high
- **Applies to:** A, B, C (theproductionshelf is C and revenue-bearing)

#### stripe-new-app-setup
- **Path:** `stripe-new-app-setup/`
- **Purpose:** Initial Stripe wiring for a new app (products, prices, webhook URL, test/live keys)
- **Stack support:** A, B
- **When to use:** new app first time wiring Stripe
- **When not to use:** existing app (use `monetization-readiness-review`)
- **Related:** `payment-webhook-safety`, `monetization-readiness-review`, `vendor-onboarding-walkthrough`
- **Revenue impact:** **highest** at setup
- **Safety impact:** high
- **Applies to:** A, B

#### seo-aeo-optimizer
- **Path:** `seo-aeo-optimizer/`
- **Purpose:** Autonomous SEO + AI-search-visibility audit, scoring (100-point rubric across 5 categories), validation, and PR creation. Includes 9 TypeScript scripts (audit, score, 4 validators, lighthouse, citation monitor, PR opener) and stack-aware fixes per Stack A/B/C.
- **Stack support:** A (full), B (full — Next.js App Router + Pages Router), C (full — HTML/static + Lighthouse), D (audit only, no auto-fix), E (N/A)
- **When to use:** "improve SEO", "AI search visibility", "audit SEO", "add schema", "fix metadata", "sitemap", "robots.txt", "Core Web Vitals", "get cited by ChatGPT/Perplexity/Gemini"; weekly cron via GH Actions; pre-launch readiness
- **When not to use:** internal-only apps; Stack F (empty); pre-MVP
- **Related:** `safe-edit-policy` (load first), `vendor-consolidation-policy` (Lighthouse CI is in house stack), `analytics-event-map`, `monetization-readiness-review`, `ci-gate-builder`, `production-error-to-regression`
- **Revenue impact:** high — organic traffic + AI citation drive top-of-funnel
- **Safety impact:** high — `references/safety-guardrails.md` lists never-fabricate categories (awards, testimonials, stats, certifications, partnerships, press, capabilities, pricing) plus per-app sensitivity map
- **Applies to:** A, B, C (full), D (adapted)

#### analytics-event-map
- **Path:** `analytics-event-map/`
- **Purpose:** Canonical event taxonomy across providers (PostHog/Firebase/GA4/Plausible/Sentry/Langfuse)
- **Stack support:** A, B
- **When to use:** pre-launch; before paid acquisition
- **When not to use:** backend-only
- **Related:** `monetization-readiness-review` (which depends on this)
- **Revenue impact:** **highest** — funnel observability
- **Safety impact:** medium
- **Applies to:** A, B (UI apps); some C apps with outbound conversion

### Portfolio Management (NEW category)

#### portfolio-health-audit
- **Path:** `portfolio-health-audit/`
- **Purpose:** Cross-repo rollup; ranked status table; "money while sleeping" checklist; weekly Monday cadence
- **Stack support:** all
- **When to use:** Mondays; before any cross-portfolio decision
- **When not to use:** mid-sprint inside one repo (use `repo-health-audit`)
- **Related:** `repo-health-audit`, `monetization-readiness-review`, `qa-hardening`
- **Revenue impact:** strategic
- **Safety impact:** strategic
- **Applies to:** all

#### repo-health-audit
- **Path:** `repo-health-audit/`
- **Purpose:** Per-repo 12-point audit (deps, dead code, observability, docs, etc.)
- **Stack support:** all (Step 0 stack-conditional gating)
- **When to use:** quarterly per repo; before major feature work
- **When not to use:** mid-feature; <100 commit repos
- **Related:** `portfolio-health-audit`, `qa-hardening`
- **Revenue impact:** medium
- **Safety impact:** medium
- **Applies to:** all (with adjustments per stack class)

#### new-repo-quality-bootstrap
- **Path:** `new-repo-quality-bootstrap/`
- **Purpose:** Compose adoption pack onto any new repo (CLAUDE.md, QA, CI, tests, templates) — "smart from zero"
- **Stack support:** all
- **When to use:** after `new-app-starter`; on any repo missing baseline files
- **When not to use:** mid-feature; Stack F (empty)
- **Related:** `new-app-starter`, every adoption-pack template
- **Revenue impact:** medium (gates revenue-readiness from day 1)
- **Safety impact:** **highest at start of new app**
- **Applies to:** all

#### new-app-starter
- **Path:** `new-app-starter/`
- **Purpose:** Bootstrap brand-new Vite + React + TS + Firebase app; the preferred Stack A scaffold
- **Stack support:** A primarily; Railway noted as alt backend
- **When to use:** new product idea
- **When not to use:** library/package; existing repo
- **Related:** `new-repo-quality-bootstrap` (composes after), `firebase-hosting-security`, `firestore-rbac-helpers`, `firebase-actions-deploy`
- **Revenue impact:** medium
- **Safety impact:** medium
- **Applies to:** A (primarily)

#### feature-scaffold
- **Path:** `feature-scaffold/`
- **Purpose:** 12-layer feature scaffold (Stack A) with reduced paths for B/C/D/E — Firestore collection → rules → types → service → hook → component → route → tests → E2E → persona matrix → analytics → PR
- **Stack support:** A (full 12 layers); B/C/D/E (reduced)
- **When to use:** any new feature
- **When not to use:** UI tweaks; bug fixes; perf work
- **Related:** `safe-edit-policy`, `firestore-rbac-helpers`, `qa-hardening`, `human-simulation-testing`, `analytics-event-map`
- **Revenue impact:** medium (consistency)
- **Safety impact:** medium (forced rules update)
- **Applies to:** A (full), B/C/D/E (reduced)

### Creative pipeline

#### premium-product-demo
- **Path:** `premium-product-demo/`
- **Purpose:** Build premium dark-glass phone mockups, hero sections, demos
- **Stack support:** Stack A creative components
- **When to use:** building demo videos / marketing pages
- **When not to use:** product code itself
- **Related:** `asset-aware-creative-pipeline`, `video-export-remotion`
- **Revenue impact:** indirect (marketing)
- **Safety impact:** low
- **Applies to:** A creative work

#### asset-aware-creative-pipeline
- **Path:** `asset-aware-creative-pipeline/`
- **Purpose:** Discover and use real brand assets from `asset-manifest.json`
- **Stack support:** any with asset-manifest
- **When to use:** before building creative components
- **When not to use:** writing code, not creative work
- **Related:** `premium-product-demo`, `video-export-remotion`
- **Revenue impact:** indirect
- **Safety impact:** low
- **Applies to:** any (asset-manifest dependent)

#### video-export-remotion
- **Path:** `video-export-remotion/`
- **Purpose:** Export React demo components as MP4 via Remotion
- **Stack support:** Remotion-using
- **When to use:** App Store previews, social promos, investor decks
- **When not to use:** product code
- **Related:** `premium-product-demo`, `asset-aware-creative-pipeline`
- **Revenue impact:** indirect (marketing)
- **Safety impact:** low
- **Applies to:** any with Remotion

### Design

#### ui-design-web-apps
- **Path:** `ui-design-web-apps/`
- **Purpose:** Research-grounded UI design playbook for production web apps — cognitive science foundations, visual hierarchy & density, flow design, navigation architecture, component standards (buttons/forms/tables/cards/modals/toasts), SaaS-specific patterns (paywalls, billing, permissions), the full state matrix (loading/empty/error/offline/success), accessibility, motion timing reference, mobile responsiveness, perceived-performance levers, trust patterns, Nielsen heuristics applied, pre-ship checklist, and common flow templates (settings, onboarding, master/detail, confirmation, auth, checkout, notification centre). Anchored to Linear/Stripe/Vercel/Notion/Figma reference patterns.
- **Stack support:** A (full); B (if UI surface exists); C (marketing screens within an app shell)
- **When to use:** designing screens, flows, components, navigation, forms, onboarding, empty states, error handling, notifications, SaaS upgrade paths, or any interactive UI element for a web application
- **When not to use:** pure backend/services with no UI; native mobile apps (different HIG conventions); marketing landing pages outside an app shell (use creative-pipeline skills)
- **Related:** `safe-edit-policy`, `feature-scaffold`, `human-simulation-testing`, `premium-product-demo`, `analytics-event-map`, `monetization-readiness-review`
- **Revenue impact:** medium — UI quality is a direct driver of activation, retention, and upgrade-flow conversion
- **Safety impact:** medium — bakes in accessibility (WCAG AA contrast, 44px touch targets, keyboard nav, ARIA discipline), reduced-motion, and form-error patterns from the start
- **Applies to:** A, B (UI surfaces), C (marketing screens)

### Strategy

#### market-research-competitive-intel
- **Path:** `market-research-competitive-intel/`
- **Purpose:** Quarterly market research + competitive analysis across portfolio
- **Stack support:** all (strategic, not technical)
- **When to use:** quarterly; before product launches
- **When not to use:** day-to-day code work
- **Related:** `monetization-readiness-review`, `portfolio-health-audit`
- **Revenue impact:** strategic
- **Safety impact:** N/A
- **Applies to:** all

#### app-training-manual
- **Path:** `app-training-manual/`
- **Purpose:** Product knowledge base and employee onboarding system for all portfolio apps — answers product questions, audits feature inventories, generates Gamma prompts, scaffolds new app reference files
- **Stack support:** all
- **When to use:** "how does [app] work", "train me on [app]", "scrub features for [app]", "generate a deck for [app]", "add [new app] to the manual"
- **When not to use:** writing product code; repo health audits (use repo-health-audit)
- **Related:** `market-research-competitive-intel`, `premium-product-demo`, `safe-edit-policy`
- **Revenue impact:** indirect — staff training efficiency + correct product representation
- **Safety impact:** high — brand-rules.md + claims-and-promises.md prevent false statements
- **Applies to:** all

### Observability & Self-Healing (NEW category — 2026-05-10)

#### error-tracking-system
- **Path:** `error-tracking-system/`
- **Purpose:** Self-hosted portfolio-wide error tracking + bug reporting + AI fix suggestion, replacing Sentry. Reference implementation in CastHub1 (`services/errorReporter.ts`, `backend/clientErrorRoutes.js`, `components/BugReportModal.tsx`). Firestore collections `clientErrors`, `bugReports`, `appHealth`, `errorEscalations`. Per-app `ErrorDashboard` at `/admin/errors`. Bot layer (`errorSpikeDetector` 5min, `regressionWatcher` hourly, `dailyHealthScore` daily). GitHub Issues promotion bridge. CRM-ai master `ErrorsPanel` reads ONLY `errorEscalations` + `appHealth`.
- **Stack support:** A, B
- **When to use:** adopting observability; removing Sentry; building/auditing `/admin/errors`; wiring CRM-ai `ErrorsPanel`
- **When not to use:** backend-only services with no browser surface; Stack F; apps with an approved alternative-vendor ADR
- **Related:** `production-error-to-regression`, `qa-hardening`, `vendor-consolidation-policy`, `firestore-rbac-helpers`, `skill-auto-heal`
- **Revenue impact:** **high** — prevents revenue-path errors from going unnoticed; also retires a paid vendor
- **Safety impact:** **highest** — observability is the safety floor
- **Applies to:** A, B
- **Self-healing:** carries `drift_sentinels`, `auto_heal_checks`, and an `expires` (2026-11-10) field — audited monthly by `skill-auto-heal`

#### skill-auto-heal
- **Path:** `skill-auto-heal/`
- **Purpose:** Monthly audit of every skill in this hub for staleness — expired dates, dead vendor refs (Sentry, Heroku, LogRocket), retired Claude/OpenAI model names, broken `related:` links, schema drift in `stack_pinned_to` versions. Outputs a ranked red/yellow/green table per skill. Produces a report only.
- **Stack support:** all
- **When to use:** first Monday each month; after major npm updates; after vendor migrations; on demand from `portfolio-health-audit`
- **When not to use:** mid-feature in a single repo; fresh skill authoring sessions
- **Related:** `portfolio-health-audit`, `vendor-consolidation-policy`, `error-tracking-system`, `safe-edit-policy`
- **Revenue impact:** indirect — keeps guidance accurate so future-Claude doesn't ship broken work
- **Safety impact:** high — catches stale guidance before it ships
- **Applies to:** all
- **Hard rule:** NEVER edits a skill without Andrew's explicit confirmation. Surfaces every finding as a 🔧 manual task per `safe-edit-policy`.

### Casting Pipeline

#### reality-casting-scout
- **Path:** `reality-casting-scout/`
- **Purpose:** Scrapes, scores, and uploads reality TV casting calls for Mythie (CastHub1). Auto-publishes high-trust listings to the `castingCalls` Firestore collection; routes low-trust and social-only sources to the admin moderation queue.
- **Stack support:** A only (CastHub1 / Mythie)
- **When to use:** every 3 days via cron; on demand via trigger phrases ("run the casting scout", "find new casting calls"); daily during May upfronts and November sweeps
- **When not to use:** non-Mythie apps; projects not using the `castingCalls` schema
- **Related:** `safe-edit-policy`, `firestore-rbac-helpers`, `analytics-event-map`, `skill-auto-heal`
- **Revenue impact:** medium — keeps the talent-side acquisition funnel fresh
- **Safety impact:** high — hard-quarantine red-flag patterns + admin queue + immutable audit log prevent scam listings reaching public users
- **Applies to:** A
- **Subject:** scores inbound casting-call **listings** (projects). Distinct from `casting-research-brief`, which researches **talent**.

#### casting-research-brief
- **Path:** `casting-research-brief/`
- **Product-facing name:** **AI Talent Research** (paid casting-team tier; default minimum tier `casting_pro`)
- **Purpose:** Generates an AI-summarised public-internet research brief on a Mythie talent profile (press mentions, public social presence, sanctions/OFAC, public court-record references, identity-match sanity). Explicitly NOT a background check or consumer report under FCRA — directs casting teams to a regulated CRA for employment decisions. Tiered source matrix (A identity/sanctions, B press, C public-court-references, D social); hard-blocks Tier E (sex-offender registries, DMV, credit, criminal records, paid people-search aggregators). Locked legal banner, partner-CRA CTA, locked Claude prompt with banned-phrase validator, talent-side notification + opt-out, immutable audit log, 30-day TTL, per-tier rate limits. Gated to the paid casting-team tier because each brief consumes Claude tokens and paid third-party API calls.
- **Stack support:** A only (CastHub1 / Mythie)
- **When to use:** paid-tier casting team needs the "deeper Google pass" on a talent before a callback; trigger phrases "run AI Talent Research on {name}", "research this talent", "generate a research brief"
- **When not to use:** any flow informing an employment/housing/credit/insurance eligibility decision (route to partner-CRA); free / trial workspaces (route to upgrade flow); talents who opted out; minors (hard-blocked); users without `casting_research:read` role; non-Mythie apps
- **Related:** `safe-edit-policy`, `legal-compliance-guardian`, `vendor-consolidation-policy`, `firestore-rbac-helpers`, `analytics-event-map`, `payment-webhook-safety`, `monetization-readiness-review`, `error-tracking-system`, `reality-casting-scout` (distinct skill, not overlapping), `skill-auto-heal`, `ui-design-web-apps`
- **Revenue impact:** **high** — paid casting-team tier feature; plan-tier gate enforced at the script + UI level; marginal-cost ceiling of $0.30/brief; shared NewsAPI vendor with `seo-aeo-optimizer`
- **Safety impact:** **highest** — mishandling becomes FCRA / state-CRA / defamation exposure. Locked banner, banned-phrase validator on AI output, identity-match threshold ≥ 0.80 for high-confidence rendering, subject notification + opt-out, and 30-day TTL are non-negotiable safety constraints.
- **Applies to:** A
- **Subject:** researches talent **profiles** (people). Distinct from `reality-casting-scout`, which scores listings.

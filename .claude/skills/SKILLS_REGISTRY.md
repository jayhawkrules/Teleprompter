# Skills Registry

Machine + human-readable index of every skill in this hub. Sister file: `skills-registry.json` (same data, machine format).

**Total skills:** 52
**Last regen:** 2026-05-20
**Synced to:** 16 portfolio repos via `.github/workflows/sync-skills-to-portfolio.yml` (target list in `.github/sync-targets.json`)

Authoritative count is the SKILL.md file count (`find . -maxdepth 2 -name SKILL.md | wc -l`). Sister file `skills-registry.json` mirrors this in JSON; both regenerate together.

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

#### landing-page-routing-audit
- **Path:** `landing-page-routing-audit/`
- **Purpose:** Quarterly (or post-incident) audit of which surface a visitor lands on at the public root URL and every hash route. Catches the four classic routing traps — auto-sign-in on root, AudienceChooser-vs-LandingPage default mismatch, signed-in gate leaking onto public URLs, hash classifier matching subset of intended routes. Distilled from the CastHub1 PR #677-#680 incident series.
- **Stack support:** all
- **When to use:** after any change to top-level routing or auth gates, before app-store / TikTok / Instagram reviewer touches the site, when a user reports landing on a signed-in gate from a public URL, quarterly per repo with public marketing surface
- **When not to use:** single feature build that doesn't touch top-level routing, internal-only tools, during an active incident
- **Related:** `safe-edit-policy`, `repo-health-audit`, `qa-hardening`, `human-simulation-testing`, `phased-shipping`, `shipping-efficiency-budget`
- **Revenue impact:** high — public routes are the front door for SEO + app-store review + first-impression conversion
- **Safety impact:** high — prevents signed-out visitors from auto-being-authed into shared accounts (privacy / data-isolation risk)
- **Applies to:** A, B, C, D, E

#### skill-dispatcher
- **Path:** `skill-dispatcher/`
- **Purpose:** Recipe book mapping ~25 common task shapes → ordered skill bundles. Lightweight router (not full auto-dispatch). Reduces "did I remember to also invoke Y skill" cognitive load when 48 skills are available. Triggers on task descriptions ("build a landing page", "launch new pricing", "audit X"), not specific skill names.
- **Stack support:** all
- **When to use:** Andrew describes a TASK, not a specific skill — load this early in the session to pick the recipe bundle
- **When not to use:** Andrew named a specific skill, trivial one-line change, pure Q&A
- **Related:** all skills (this composes them); especially `safe-edit-policy` (foundation under every recipe), `skill-auto-heal` (keeps recipes from drifting)
- **Revenue impact:** indirect — cognitive offload for Andrew across every multi-skill task
- **Safety impact:** medium — picking the wrong recipe means missing safety skills like payment-webhook-safety on a checkout change
- **Applies to:** A, B, C, D, E

#### claudemd-authoring
- **Path:** `claudemd-authoring/`
- **Purpose:** Hygiene rules + nested-CLAUDE.md pattern + `/memory` workflow for writing/tightening CLAUDE.md files across the portfolio. Caps at ~100 lines; encodes what belongs in CLAUDE.md vs `docs/` vs nested-CLAUDE.md vs `CLAUDE.local.md`. Audit procedure for stale/bloated files.
- **Stack support:** all
- **When to use:** new repo bootstrap, CLAUDE.md sweep when over 150 lines, quarterly audit, after adding new MCP/bash workflow/parallel-session policy
- **When not to use:** personal preferences (use `~/.claude/CLAUDE.md`), one-time tasks, content that belongs in `docs/`
- **Related:** `safe-edit-policy`, `new-repo-quality-bootstrap`, `repo-health-audit`, `parallel-claude-worktrees`, `fresh-chat-handoff`, `cowork-kickoff`
- **Revenue impact:** indirect — better CLAUDE.md = faster, more accurate Claude across every session
- **Safety impact:** medium — bad CLAUDE.md leads Claude to wrong assumptions about what's safe
- **Applies to:** A, B, C, D, E

#### claude-sdk-in-ci
- **Path:** `claude-sdk-in-ci/`
- **Purpose:** Use `claude -p --output-format json` as a Unix utility inside GitHub Actions, cron jobs, CI pipelines. Recipes for issue triage, error-tracking digest, log spike summarization, release notes, webhook event classification, weekly portfolio digest. Cost guardrails (model selection, max-turns, pre-filtering), failure-mode handling, standard secret pattern (ANTHROPIC_API_KEY). Pairs with shipping-efficiency-budget Pillar 1 for cron consolidation.
- **Stack support:** all (any repo with GitHub Actions)
- **When to use:** any LLM-judgment task in CI, replacing hand-rolled jq+regex extraction, building self-heal pipelines per error-tracking spec, generating release notes/digests
- **When not to use:** safety-critical deterministic outputs, high-frequency hot paths >100/min, air-gapped runners
- **Related:** `shipping-efficiency-budget`, `ci-gate-builder`, `error-tracking-system`, `claude-api`, `safe-edit-policy`
- **Revenue impact:** indirect — automates triage/digest work that would otherwise sit on Andrew's plate
- **Safety impact:** medium — `--dangerously-skip-permissions` and write-capable tools require care
- **Applies to:** A, B, C, D, E

#### mcp-team-setup
- **Path:** `mcp-team-setup/`
- **Purpose:** Check `.mcp.json` into repo root so every Claude Code / Cowork session opening the repo gets auto-prompted to install the team's standard MCP set. Per-stack defaults (A gets Firebase+Puppeteer; B gets Postgres+Playwright; C gets Puppeteer-only). Auto-approve patterns via `.claude/settings.json`. Security guardrails (no secrets in `.mcp.json`, scope filesystem MCP, read-only DB connections).
- **Stack support:** all
- **When to use:** new repo bootstrap, adding a new automated UI/DB workflow, audit pass for repos with no team-shared MCP, replacing per-developer ad-hoc MCP setup
- **When not to use:** personal MCP setup (use `~/.claude/mcp.json`), one-off exploration, MCP servers requiring per-user OAuth (Stripe, etc.)
- **Related:** `claudemd-authoring`, `new-repo-quality-bootstrap`, `agentic-feedback-loop`, `update-config`, `parallel-claude-worktrees`
- **Revenue impact:** indirect — UI iteration speed via Puppeteer + DB inspection via Firebase MCP compounds across the portfolio
- **Safety impact:** medium — bad MCP config can give Claude unintended write access; skill includes guardrails
- **Applies to:** A, B, C (light); D, E rarely

#### agentic-feedback-loop
- **Path:** `agentic-feedback-loop/`
- **Purpose:** The "give Claude a verifier so it iterates" doctrine from Boris Cherny. Verifier recipes per task: Puppeteer screenshot diff, Vitest watch, tsc --watch, Lighthouse loop, axe-core accessibility. Iteration budgets (default 5), stop conditions (no-progress detector, signal saturation, new problem introduced), forbidden patterns. Pairs with mcp-team-setup (provides the verifier tooling) and ui-design-web-apps (the design intent the loop chases).
- **Stack support:** A, B (full); C (Lighthouse + Puppeteer); D, E adapted
- **When to use:** UI matching a mock, fixing flaky tests, hitting a Lighthouse target, accessibility audit, visual regression, TS migration, hitting `/99it` competitive parity
- **When not to use:** trivial one-line changes, backend with full test coverage, throwaway exploration, unreliable verifier
- **Related:** `mcp-team-setup`, `ui-design-web-apps`, `premium-product-demo`, `human-simulation-testing`, `claude-sdk-in-ci`, `verify`, `99it`
- **Revenue impact:** high — UI polish loops directly improve conversion surfaces
- **Safety impact:** medium — runaway loops are a budget risk; skill includes stop-iterating rules
- **Applies to:** A, B, C

#### slash-commands-authoring
- **Path:** `slash-commands-authoring/`
- **Purpose:** Pattern for authoring custom slash commands (`.claude/commands/*.md`, `~/.claude/commands/*.md`). Covers file format (frontmatter + body), variable substitution ($ARGUMENTS, $1/$2), project vs user scope decisions, name collisions, the portfolio-standard command set (`/commit-push-pr`, `/triage-issues`, `/release-notes`, `/regression-from-sentry`, `/inspect`, `/cowork-handoff`, plus repo-specific `/deploy`, `/seed`, `/scout`, `/health`).
- **Stack support:** all
- **When to use:** a workflow has been done 3+ times by typing roughly the same prompt; onboarding teammate/Cowork to repo-specific workflow; building portfolio-standard commands
- **When not to use:** one-off prompts, secret-bearing prompts, anything needing major per-invocation customization (use a skill instead)
- **Related:** `claudemd-authoring`, `claude-sdk-in-ci`, `fresh-chat-handoff`, `cowork-kickoff`, `safe-edit-policy`
- **Revenue impact:** indirect — recurring workflow speed
- **Safety impact:** medium — commands with `allowed-tools` restrict their blast radius
- **Applies to:** A, B, C, D, E

#### codebase-qa-onboarding
- **Path:** `codebase-qa-onboarding/`
- **Purpose:** The 20-question Q&A protocol Anthropic uses for technical onboarding (cut their onboarding from 2-3 weeks to 2-3 days). Pattern: ask Claude history-spelunking questions BEFORE editing. Orientation → architecture → recent activity → footguns. Per-stack question adjustments. The no-edit-during-Q&A rule. Composes as the opening move for safe-edit-policy, fresh-chat-handoff, cowork-kickoff.
- **Stack support:** all
- **When to use:** fresh Claude session on a repo it hasn't seen; Cowork starting first session on a repo; human contributor onboarding; returning to a repo after 2+ weeks; before non-trivial edits
- **When not to use:** session already deep in a specific task, trivial one-line fixes, read-only research already in flight
- **Related:** `safe-edit-policy`, `fresh-chat-handoff`, `cowork-kickoff`, `claudemd-authoring`, `repo-health-audit`, `claude-sdk-in-ci`
- **Revenue impact:** indirect — reduces wrong-shaped edits in revenue-critical surfaces
- **Safety impact:** high — Q&A surfaces footguns before they become incidents
- **Applies to:** A, B, C, D, E

#### voice-locker-per-app
- **Path:** `voice-locker-per-app/`
- **Purpose:** Per-app brand voice lock via `assets/voice.md` manifests. Each of 23 apps has its own audience and voice (Mythie ≠ Aclamos ≠ Noelly). Manifest format pins sentence rhythm, favored/forbidden vocabulary, openings/closings, the fingerprint. Protocol echoes the voice fingerprint before drafting and self-audits against the "never" list. Adapted from Sairahul's Voice Locker.
- **Stack support:** all
- **When to use:** writing copy, marketing content, in-app strings, push notifications, emails, landing pages, App Store descriptions, social posts; onboarding contractor/Cowork to write copy
- **When not to use:** internal docs/ADRs (engineering voice), legal language, one-off Slack messages, intentional voice-break campaigns
- **Related:** `asset-aware-creative-pipeline`, `premium-product-demo`, `ui-design-web-apps`, `seo-aeo-optimizer`, `gamified-quiz-design`, `app-training-manual`, `legal-compliance-guardian`, `offer-sharpener`
- **Revenue impact:** high — voice drift erodes conversion across landing/onboarding/upgrade surfaces
- **Safety impact:** low — voice itself isn't a safety surface, but pairs with legal-compliance-guardian for jurisdictional voice
- **Applies to:** all consumer-facing apps; not CRM-ai or internal tools

#### pricing-stress-tester
- **Path:** `pricing-stress-tester/`
- **Purpose:** Stress-test pricing from three angles (skeptical buyer / value buyer / competitor) before launching or changing pricing on any portfolio app. Companions monetization-readiness-review: that one checks the technical path; this checks the pricing strategy. Tied to specific open decisions: e-sign tier pricing, Aclamos take-rate restoration, token unit naming. Adapted from Sairahul's Pricing Stress Tester.
- **Stack support:** all (any monetized app)
- **When to use:** launching new pricing, changing tiers/take-rates, resolving open pricing decisions, conversion stalled and funnel checks out
- **When not to use:** internal-tool pricing, free-only surfaces, one-time minor tweaks
- **Related:** `monetization-readiness-review`, `market-research-competitive-intel`, `analytics-event-map`, `vendor-consolidation-policy`, `stripe-new-app-setup`, `payment-webhook-safety`, `99it`, `offer-sharpener`
- **Revenue impact:** **highest** — pricing communication directly drives conversion
- **Safety impact:** low — strategic decision, not technical
- **Applies to:** A, B (any monetized app); D (Payhip)

#### offer-sharpener
- **Path:** `offer-sharpener/`
- **Purpose:** Find the gap between what Andrew thinks the app offers and what a first-time visitor hears. Produces sharpened 1-2 sentence offer + "the one line" (clarity test, not a tagline). Adapted from Sairahul's Offer Sharpener. Composes after voice-locker-per-app (voice first, sharpening second) and pairs with pricing-stress-tester.
- **Stack support:** all (any consumer-facing app)
- **When to use:** landing page hero rewrites, App Store descriptions, paid-tier upsell modals, signup-flow value props, social ad copy, conversion-stall investigation, new app launch
- **When not to use:** internal-tool descriptions, docs/help (different goal), legal language, copy that's already converting
- **Related:** `voice-locker-per-app`, `market-research-competitive-intel`, `pricing-stress-tester`, `premium-product-demo`, `seo-aeo-optimizer`, `gamified-quiz-design`, `99it`, `ui-design-web-apps`
- **Revenue impact:** **highest** — 5-second-clarity on landing pages is conversion's biggest lever
- **Safety impact:** low
- **Applies to:** all consumer-facing apps

#### parallel-claude-worktrees
- **Path:** `parallel-claude-worktrees/`
- **Purpose:** Git-worktree isolation pattern for repos where Cowork (cloud) + Claude Code (local) — or two Claude Code instances — touch the same working tree. Provides setup commands, branch-naming convention (`cowork/*`, `exp-*`, `rescue/*`), per-repo CLAUDE.md adoption snippet, and a 6-step recovery flow when the tree gets hijacked anyway. Distilled from the documented CastHub1 + Aclamos shared-tree hazard and Boris Cherny's "parallel sessions" guidance from Code with Claude 2026.
- **Stack support:** all
- **When to use:** any repo where Cowork is producing AND Claude Code will also touch it; any time two Claude Code terminals will work the same repo concurrently; before spawning a parallel exploration session
- **When not to use:** single-session repos; pure read-only Q&A; one-off tasks under 5 minutes
- **Related:** `cowork-kickoff` (kickoff prompt must reference the worktree path), `fresh-chat-handoff`, `safe-edit-policy`, `phased-shipping`
- **Revenue impact:** indirect — prevents lost work / wrong-branch commits in revenue-critical repos
- **Safety impact:** highest — directly mitigates the documented CastHub1/Aclamos Cowork hazard that has caused real commit loss
- **Applies to:** A, B, C, D, E

#### shipping-efficiency-budget
- **Path:** `shipping-efficiency-budget/`
- **Purpose:** Two-pillar playbook for not wasting CI minutes or reviewer attention. Pillar 1 — consolidate scheduled GitHub Actions (collapse N scheduled workflows into one workflow-with-branched-jobs gated by `github.event.schedule`, drop crons that should be backend self-polls, weekly-not-daily where usage allows). Pillar 2 — bundle related PRs via a 10-second pre-flight check + combine-or-split decision tree, with end-of-session retro to catch fragmentation drift.
- **Stack support:** all
- **When to use:** before opening any PR (Pillar 2 pre-flight check), quarterly portfolio audit of scheduled workflows (Pillar 1), about to push the 3rd small PR in a row to the same area, CI minutes trending up, user mentions saving Actions or loading PRs better
- **When not to use:** user explicitly asked for one-PR-per-change, hotfix that can't wait, change needs different review approval (legal vs feature)
- **Related:** `safe-edit-policy`, `phased-shipping`, `ci-gate-builder`, `portfolio-health-audit`, `repo-health-audit`
- **Revenue impact:** direct cost reduction — GitHub Actions minutes are billed past free tier; secondary indirect impact via faster ship velocity
- **Safety impact:** medium — over-fragmented PRs increase rebase/conflict surface; consolidated cron workflows have wider blast radius if broken (mitigation guidance in skill)
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
- **Related:** `monetization-readiness-review` (which depends on this), `usage-pattern-analyst` (reads the taxonomy weekly)
- **Revenue impact:** **highest** — funnel observability
- **Safety impact:** medium
- **Applies to:** A, B (UI apps); some C apps with outbound conversion

#### usage-pattern-analyst
- **Path:** `usage-pattern-analyst/`
- **Purpose:** Weekly cadence — read the analyticsEvents stream, surface top friction patterns, propose concrete UI changes as draft issues/PRs. Layer 2 of the self-improving-app architecture (behavior-side loop).
- **Stack support:** A, B
- **When to use:** weekly Mondays (pairs with `portfolio-health-audit`); after a feature ships with a funnel hypothesis; before roadmap planning
- **When not to use:** first 14 days post-launch (sample too small); analytics pipeline not yet live (run `analytics-event-map` first); backend-only repos
- **Related:** `analytics-event-map` (prerequisite), `production-error-to-regression` (failure-side counterpart), `market-research-competitive-intel`, `ui-design-web-apps`, `portfolio-health-audit`
- **Revenue impact:** **compounding** — UI improvements from real behavior beat assumptions; a 12-week cadence is the moat
- **Safety impact:** low
- **Applies to:** A, B; not C/D/E

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

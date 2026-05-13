# Ballotis
⚠️ LAST UPDATED: 2026-05-10 — verify against live app before using in training

## Identity
- **Repo:** https://github.com/jayhawkrules/awardssubmission (sub-product of Aclamos — same codebase, see `aclamos.md`)
- **Live URL:** https://aclamos.app/ballotis (sub-brand on shared domain; a dedicated `ballotis.com` may follow if independent positioning calls for it)
- **Stack:** B (Next.js 15 / React 19 / TypeScript / Tailwind / shadcn / Prisma + Postgres / Railway / NextAuth v5 / BullMQ + Redis / Sentry / Langfuse / ConfigCat / Anthropic SDK / Stripe / Resend + React Email / AWS S3 / Tiptap / Vitest) — shared with Aclamos
- **Brand owner:** Andrew Ward
- **10 Lives branded:** No
- **Status:** Live

## What it is (one paragraph)
Ballotis is the standalone verifiable-voting product carved out of the Aclamos platform: 12 voting methods (single/multi-choice, ranked-choice IRV, multi-winner STV, Borda, Schulze, Condorcet/Copeland, score, approval, star, yes/no, cumulative), tamper-evident SHA-256-chained ballots with per-vote receipt tokens, and anti-fraud controls (CAPTCHA / headless detection / Tor-VPN block / disposable-email block / geofencing / rate limits). Sold per-election (one-time license) or by subscription. Targets HOAs, AGMs, student-government elections, fan votes, professional-association elections, and people's-choice awards. An org picks the Ballotis surface at signup (`/sign-up?product=ballotis`) which sets `Organization.productSurface = "BALLOTIS"`; the dashboard nav, onboarding, and post-signup redirect all hide Aclamos-only features. Lives at `/ballotis` on the shared `aclamos.app` domain.

## Who uses it
| Role | What they do |
|------|-------------|
| TBC | TBC |

## Feature Inventory
| Feature | Status | Notes |
|---------|--------|-------|
| **PUBLIC / MARKETING** *(`(ballotis)` route group)* | | |
| Ballotis marketing site (`/ballotis`, `/ballotis/pricing`, etc.) | ✅ Live | Sub-brand on shared `aclamos.app` domain; same JSON-LD + AEO scaffold as Aclamos |
| **POLL CREATION** | | |
| Create poll (`/[orgSlug]/polls/new`) with presets — PUBLIC_AWARD, HOA, STUDENT_GOV, etc. | ✅ Live | |
| **PUBLIC BALLOT** | | |
| Public ballot page (`/p/[slug]`) | ✅ Live | |
| **VOTING METHODS (12 total)** *(`src/lib/voting-methods.ts`)* | | |
| Single-choice | ✅ Live | |
| Multiple-choice | ✅ Live | |
| Ranked-choice (Instant-Runoff) | ✅ Live | |
| Multi-winner STV | ✅ Live | |
| Borda count | ✅ Live | |
| Schulze method | ✅ Live | |
| Condorcet (Copeland) | ✅ Live | |
| Score voting | ✅ Live | |
| Approval voting | ✅ Live | |
| STAR voting | ✅ Live | |
| Yes/No | ✅ Live | |
| Cumulative voting | ✅ Live | |
| **VERIFIABLE VOTING** | | |
| SHA-256 chained ballots + per-vote receipt token | ✅ Live | Toggle in poll settings |
| Public re-tally page (`/verify/[pollId]`) | ✅ Live | |
| **ANTI-FRAUD** *(`src/lib/poll-settings.ts`)* | | |
| CAPTCHA | ✅ Live | |
| Headless-browser detection | ✅ Live | |
| Tor / VPN block | ✅ Live | |
| Disposable-email block | ✅ Live | |
| Geofencing | ✅ Live | |
| Rate limits | ✅ Live | |
| **LICENSE MODEL** | | |
| Per-election orgs need an unused `BallotisElectionLicense` to launch a poll out of DRAFT (PR #8c) | ✅ Live | Subscribers skip the gate |
| Daily expiry: AVAILABLE → EXPIRED at 180 days (cron) | ✅ Live | `billing-lifecycle` cron |
| **SHARED PLATFORM SERVICES** *(serve both Aclamos and Ballotis from the `awardssubmission` codebase — see `aclamos.md` for full detail)* | | |
| AI Credits ledger + monthly tier grants + $29 / 1,000 top-up packs | ✅ Live | |
| AI features (Plagiarism / Brief / Polish / Show Director / Press search / Press kit / Nonprofit doc extract) | ✅ Live | All Claude API |
| Trial abuse prevention | ✅ Live | |
| Save-the-customer + cancellation survey | ✅ Live | |
| Multi-currency (UK / EUR / CAD / AUD) | ✅ Live | |
| Nonprofit verification + Stripe coupon auto-apply | ✅ Live | |
| Daily lifecycle cron (Ballotis license expiry runs here) | ✅ Live | |
| Sentry / Langfuse / ConfigCat / Resend / S3 / Tiptap / Zapier | ✅ Live | |

## Pricing & Entitlements
| Plan | Price | Limits | Key Features |
|------|-------|--------|-------------|
| TBC | TBC | TBC | TBC |

## Key Workflows
TBC

## Navigation Map
TBC

## Known Issues / Limitations
TBC

## FAQ
TBC

## Changelog
| Date | Change |
|------|--------|
| 2026-05-10 | Reference file created from a code-level audit of `jayhawkrules/awardssubmission` (Ballotis is a sub-product of Aclamos; same codebase, distinguished by `Organization.productSurface = "BALLOTIS"` per repo `EMPLOYEE_TRAINING.md`). Identity, "What it is", and Feature Inventory populated. Pricing, Workflows, Roles, FAQ remain TBC. |

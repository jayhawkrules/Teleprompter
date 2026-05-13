# Aclamos
⚠️ LAST UPDATED: 2026-05-10 — verify against live app before using in training

## Identity
- **Repo:** https://github.com/jayhawkrules/awardssubmission (shared with Ballotis sub-product — see `ballotis.md`)
- **Live URL:** https://aclamos.app
- **Stack:** B (Next.js 15 / React 19 / TypeScript / Tailwind / shadcn / Prisma + Postgres / Railway / NextAuth v5 / BullMQ + Redis / Sentry / Langfuse / ConfigCat / Anthropic SDK / Stripe / Resend + React Email / AWS S3 / Tiptap / Vitest)
- **Brand owner:** Andrew Ward
- **10 Lives branded:** No
- **Status:** Live

## What it is (one paragraph)
Aclamos is the end-to-end awards-show platform: nominations → judging → voting → ceremony → certificates. Multi-tenant by org; supports film festivals, industry awards, foundation grant cycles, professional association elections, HOA/AGM votes, student-government elections, fan votes, and people's-choice awards. Roles include admin, judge, voter, nominee. Uses scheduled rounds, anti-fraud voting controls, ceremony-night live results, verifiable Open Badges, and AI-metered features (plagiarism detection, summary briefs, show director, press search). Sister product Ballotis (standalone voting) lives in the same codebase but is independently marketed at `/ballotis` — see `ballotis.md`.

## Who uses it
| Role | What they do |
|------|-------------|
| TBC | TBC |

## Feature Inventory
| Feature | Status | Notes |
|---------|--------|-------|
| **PUBLIC / MARKETING** *(`(marketing)` route group)* | | |
| Aclamos marketing site (`/`, `/pricing`, `/compare`, `/blog`, `/about`, `/press`, `/templates`, `/discover`, `/help`) | ✅ Live | Full SEO + AEO scaffold |
| Per-page schema.org JSON-LD (Organization / SoftwareApplication / WebSite / FAQPage / Product+Offer / TechArticle / Article / CollectionPage / BreadcrumbList) | ✅ Live | `JsonLd` server-only component |
| `llms.txt` per llmstxt.org convention | ✅ Live | `/llms.txt` |
| `robots.ts` with 13 explicit AI-crawler stanzas | ✅ Live | GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bytespider, CCBot, Applebot-Extended, Meta-ExternalAgent, cohere-ai, etc. |
| `sitemap.ts` static sitemap | ✅ Live | Every public marketing route + `/compare/*` slugs |
| RSS feeds (`discover.rss`, `changelog.rss`) | ✅ Live | |
| Embeddable widgets (`embed/nominations-open`, `embed/leaderboard`) | ✅ Live | |
| Apple/Android app links + `security.txt` + Open Badges public key | ✅ Live | `.well-known/` |
| **AUTH** | | |
| NextAuth v5 with Argon2 password hashing (sign-in / sign-up / magic links) | ✅ Live | |
| **SUBMISSIONS** | | |
| Show + Category + custom FormSchema + Pricing tiers (Early/Standard/Late by date) | ✅ Live | `/[orgSlug]/[showSlug]/categories`, `/form` |
| Public submission form (`/submit/[orgSlug]/[showSlug]`) | ✅ Live | |
| Declarative eligibility rules (JSON, evaluated at submit) | ✅ Live | `src/lib/eligibility.ts` |
| Per-plan submission caps + overage billing on Growth/Studio (Stripe invoice items at $0.50/$0.30) | ✅ Live | `submission-limits.ts` + `submission-overage.ts` |
| **JUDGING** | | |
| Multi-round jury (`/[orgSlug]/[showSlug]/jury`) | ✅ Live | |
| Reviewer experience (`/judge/[token]` — no Aclamos login required) | ✅ Live | |
| Weighted rubrics (criteria sum to 100%) | ✅ Live | `prisma:Rubric.criteria` |
| Calibration round (3-5 nominations scored by all judges to surface drift) | ✅ Live | |
| Round types: SCORE / RANK / YES_NO / COMMENT_ONLY | ✅ Live | `prisma:JuryRound.type` |
| Bulk editor (spreadsheet-style entry) | ✅ Live | `/[orgSlug]/[showSlug]/jury/bulk` |
| **CEREMONY** | | |
| Live cue desk (`/[orgSlug]/[showSlug]/cue-desk`) | ✅ Live | |
| OBS WebSocket bridge (push scene changes from cue desk to OBS) | ✅ Live | `src/lib/cue-desk/obs-websocket.ts` |
| Public tally screen (`/ceremony/[showSlug]/screen`) | ✅ Live | |
| **WINNER BADGES** | | |
| Open Badges generation + signed verifiable URL | ✅ Live | `src/lib/badges.ts` |
| LinkedIn add-to-profile URL | ✅ Live | |
| Public badge page (`/badge/[slug]`) | ✅ Live | |
| Open Badges JSON endpoint (`/api/badge/[slug]/openbadge.json`) | ✅ Live | What LinkedIn / Credly fetch |
| **SPONSORS** | | |
| Sponsor portal (`/sponsor/[token]`) | ✅ Live | No Aclamos login required |
| Revenue-share accrual (triggered on Stripe `payment.succeeded` webhook) | ✅ Live | `sponsor-payouts.ts:accrueForPayment` |
| Sponsor dashboard view of accrued share | ✅ Live | `/[orgSlug]/[showSlug]/sponsors` |
| **PRESS MONITORING** | | |
| Producer-defined queries → Anthropic web_search → PressArticle results | ✅ Live | `/[orgSlug]/[showSlug]/press` + `POST /api/press/search` (5 AI credits/run) |
| Press kit generation per winner | ✅ Live | `/api/winner/[id]/press-kit` (1 AI credit) |
| **PUBLIC REST API** | | |
| `/api/v1/*` bearer-scoped read API | ✅ Live | `polls:read`, `nominations:read` scopes; cursor-based pagination |
| **MOBILE** | | |
| Expo companion mobile app (`mobile/`) | 🚧 In dev | App store status TBC |
| **ADMIN / OPS** | | |
| `/admin/beta` (admissions queue) | ✅ Live | |
| `/admin/nonprofit-verifications` | ✅ Live | |
| `/admin/seed`, `/admin/activity`, `/admin/churn-report`, `/admin/status`, `/admin/competitor-intel`, `/admin/feedback` | ✅ Live | SUPERADMIN-only |
| **SHARED PLATFORM SERVICES** *(serve both Aclamos and Ballotis from `awardssubmission` codebase)* | | |
| AI features (Plagiarism / Brief / Polish / Show Director / Press search / Press kit / Nonprofit doc extract) | ✅ Live | All metered via `meterAiCall()`, Claude API |
| AI Credits ledger (per-tier monthly grants 100/500/1k/10k/50k) + $29 / 1,000 top-up packs | ✅ Live | `src/lib/ai-credits.ts` |
| Trial abuse prevention (functional caps + email dedup + Stripe card-fingerprint) | ✅ Live | `trial-fingerprint.ts` |
| Save-the-customer offer engine + cancellation survey | ✅ Live | `src/lib/retention/`; capped at 1 accepted offer per 12 months |
| Multi-currency price labels (UK / EUR / CAD / AUD inferred from `Accept-Language`) + 36 currency-variant Stripe Price env vars | ✅ Live | `inferLocalCurrency()`, `local-prices.ts` |
| Nonprofit verification (ProPublica + Anthropic AI doc extract) → `NONPROFIT_25PCT_FOREVER` Stripe coupon auto-apply | ✅ Live | `verifyByEin()`, `extractFromDeterminationLetter()` |
| Daily lifecycle cron (Single Season expiry, Ballotis license expiry, overage backfill) | ✅ Live | `/api/cron/billing-lifecycle` (bearer-gated) |
| BullMQ + Redis worker for background jobs | ✅ Live | `worker.ts` |
| Sentry (client + server + edge) | ✅ Live | |
| Langfuse | ✅ Live | |
| ConfigCat (feature flags) | ✅ Live | |
| Resend + React Email (transactional mail) | ✅ Live | |
| AWS S3 (presigned URLs for asset uploads) | ✅ Live | |
| Tiptap rich text editor | ✅ Live | |
| Zapier integration package | ✅ Live | `zapier/` |

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
| 2026-05-10 | Reference file created as `artas.md`; all sections marked TBC pending feature audit |
| 2026-05-10 | File renamed `artas.md` → `aclamos.md`. ARTAS was a planned Aclamos *client*, not a portfolio product — the audit table mistakenly listed it as an app. Identity restored: brand owner Andrew Ward (NOT 10 Lives), Live URL https://aclamos.app, Stack expanded to Next.js 15 / Prisma + Postgres / Railway etc. "What it is" rewritten from `awardssubmission` repo's own `EMPLOYEE_TRAINING.md` + `README.md`. |
| 2026-05-10 | Feature audit completed; Inventory populated from `jayhawkrules/awardssubmission` codebase (~50 rows across 9 surface groups + a Shared Platform Services group that also serves the Ballotis sub-product — see `ballotis.md`). |

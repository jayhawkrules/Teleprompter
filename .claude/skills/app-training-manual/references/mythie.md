# Mythie (CastHub)
⚠️ LAST UPDATED: 2026-05-13 — verify against live app before using in training

## Identity
- **Repo:** https://github.com/jayhawkrules/CastHub1
- **Live URL:** https://casthub--casthub-1d833.us-east4.hosted.app
- **Stack:** A (React + Vite + Firebase)
- **Brand owner:** Andrew Ward
- **10 Lives branded:** No
- **Status:** Live

## What it is (one paragraph)
TBC — Mythie (formerly known internally as CastHub) is a casting platform for unscripted television production. The repo is the reference implementation for Stack A patterns across the portfolio. Confirm the customer-facing product positioning with Andrew before using in staff training.

## Who uses it
| Role | What they do |
|------|-------------|
| TBC | TBC |

## Feature Inventory
| Feature | Status | Notes |
|---------|--------|-------|
| **PUBLIC / MARKETING** | | |
| Public marketing site (audience chooser, landing, about, FAQ, features, contact, alternatives, competitor compares) | ✅ Live | Always-on AudienceChooser at apex (no auto-redirect) |
| Show directory + 13 curated show landing pages + casting calendar | ✅ Live | TMDb imagery; filters: all / casting / in_production / aired / archived |
| Public talent profile pages + archetype public pages | ✅ Live | SEO surfaces |
| Blog hub (RSS-driven) + Talent Tips hub + articles | ✅ Live | RSS poll cron every 4h. `blogPosts` collection has public Firestore read (PR #557) so the hub renders without auth. |
| Pricing — Casting Teams page | ✅ Live | Trial / Producer $49 / Pro Director $149 / Studio (contact sales). $499 tier missing — see manual task. |
| Pricing — Talent page | ✅ Live | Public guarantee: talent always free |
| Trust page (`#trust`) | ✅ Live | |
| Status page (`#status`) | ✅ Live | Component status from serviceStatus collection (5-min cron) |
| Verified Producer Methodology page (`#verified-methodology`) | ✅ Live | 5 sequential gates: identity → production credit → anti-scam → sanctions → Code of Conduct |
| sitemap.xml + robots.txt | ✅ Live | SW precache fix; Cloudflare Managed Robots disabled 2026-05-10 |
| **TALENT JOURNEY** | | |
| Talent landing → Aha flow (90-second pre-auth demo) → signup → onboarding tour | ✅ Live | |
| Talent dashboard | ✅ Live | |
| Talent profile builder | ✅ Live | Per-field inline edit on the Overview tab (PR-A2 2026-05-13) — edit a single field without opening the full editor. SocialLinksEditor in the Media & Social tab (PR-B #554) — per-platform handles. AI Tools as its own tab with Overview snapshot strip (#553). |
| Personality quiz → 10-archetype assignment | ✅ Live | Differentiator: no competitor matches |
| Talent swipe deck | ✅ Live | |
| Quick Apply flow | ✅ Live | |
| Public application view | ✅ Live | |
| Reel share pages | ✅ Live | |
| Release signing | ✅ Live | |
| Referral program + dashboard | ✅ Live | |
| Verified-talent badge (Stripe Identity) | ✅ Live | $29 / $19 SKUs; Stripe Identity webhook live |
| **CASTING TEAM (PRODUCER) WORKFLOW** | | |
| Producer dashboard + project management | ✅ Live | |
| Casting calls (create + manage) | ✅ Live | |
| Talent pool | ✅ Live | |
| Applications pipeline (new → reviewing → shortlisted → On Hold → finals → declined) | ✅ Live | "On Hold" stage shipped via the 4-PR bulk-status series (#401–#404) + per-message audit at bulk send (#409). Stale Applicant Banner is On Hold-aware. |
| Bulk-status triage + AI bulk personalisation | ✅ Live | `bulkPersonalisationService.ts` + Claude prompts + BulkPreviewModal safety gate (#402–#404). BatchActionBar AI integration. Per-message audit row written for every outbound bulk message. |
| Reports view | ✅ Live | |
| Estimates view (DnD, templates, versions, PDF, Gmail, AI review, convert-to-show) | ✅ Live | |
| Feedback board | ✅ Live | |
| **PRODUCER-SPECIFIC SURFACES** | | |
| Producer Inbox — unified comms (Quo phone +1 816-600-8607, Gmail, Zoom transcripts) | ✅ Live | Phone live and active |
| Creator discovery | ✅ Live | |
| Pitches view | ✅ Live | |
| Session Mode | ✅ Live | |
| Workspace settings | ✅ Live | |
| **CASTING DIRECTOR (CD) TOOLS** | | |
| CD Pitch Builder + CD Pitch View + Network Pitch View | ✅ Live | |
| Stakeholder Review view | ✅ Live | |
| **AI FEATURES** *(all powered by Claude API; Gemini fully removed)* | | |
| AI Casting Brief — generates structured brief from logline | ✅ Live | Recommended tier: Pro Director+ (no competitor ships this — differentiator) |
| AI archetype grading on submissions | ✅ Live | Claude-powered; 10 reality archetypes from `constants.tsx:197` |
| Semantic Tape Search — embedding-based applicant search + Claude re-rank | ✅ Live | Studio-tier gated (PR #416). 5-PR series complete: embedding pipeline + backend route + producer search UI + hybrid filters + backfill cron + GDPR cascade (#413–#417). Frontend: `components/ai/SemanticTapeSearch.tsx`. |
| AI Bulk Personalisation (Claude-drafted bulk messages with safety preview) | ✅ Live | Producer side. `bulkPersonalisationService.ts` + `bulkPreviewSafety.ts` + `BulkPreviewModal`. Wired into `BatchActionBar` (#402–#404). |
| AI Casting Assistant (sidebar, token-budgeted, top-up packs) | 🚧 In dev | Token balance + top-up purchase live; conversational chat panel pending next PR |
| AI Tools tier gate on ProfileModal (free → upgrade card; paid → AiWowPanel) | ✅ Live | PR-UI-3 (#558). Free plan sees an upgrade card with a Pro CTA that routes to Settings (Billing); paid plans see the AI Tools panel unchanged. Reads `useAiAccess()` (`hooks/useAiAccess.ts`). |
| Tap-and-talk voice messages (admin Fix Proposals + assistant) | ✅ Live | |
| Help Bot Widget | ✅ Live | |
| AI consent gate | ✅ Live | |
| Admin Fix Proposals queue | ✅ Live | |
| **AUTH / RBAC / SECURITY** | | |
| Firebase Auth + AuthContext / ProtectedRoute (role-aware) | ✅ Live | |
| RBAC v2 (3 subtractive roles + per-project overrides) | ✅ Live | Mirrored in `firestore.rules` (PR #386) |
| Custom Claims for super-admin (replaces email allowlist) | ✅ Live | PR #370 |
| Terms Acceptance gate | ✅ Live | |
| Security Watermark (super-admin exempt) | ✅ Live | |
| Delete Account flow (`#delete-account`) | ✅ Live | GDPR right-to-erasure |
| Legal pages (Terms / Privacy / DPA / DMCA) | ✅ Live | 2026-05-13: governing law moved Florida → **Missouri**; arbitration in Jackson County, Missouri; Missouri MMPA + other-state non-waivable consumer rights preserved (`components/legal/legalCopy.ts`). DMCA copy refreshed. |
| **PAYMENTS** | | |
| Stripe subscription tiers — Producer $49, Pro Director $149, Studio (contact sales) | ✅ Live | Live mode confirmed 2026-05-10. $499 tier missing from page — see manual task. |
| AI token top-up packs — Pack 1M ($10) / Pack 5M ($40) | ✅ Live | Backend `aiProxy.js` + `STRIPE_PRICE_PACK_*` env |
| Boost Guarantee refund cron (F2 — partial Stripe refund when reply window elapses) | ✅ Live | Daily 14:00 UTC |
| Subscription settings UI | ✅ Live | |
| Stripe webhook (checkout / invoice / subscription / refund events) | ✅ Live | |
| **DEMO / ONBOARDING** | | |
| Public Demo workspace (auto-reset daily 02:00 UTC, server-side wipe Plan B) | ✅ Live | `publicDemoRoutes.js` |
| Aha Flow (pre-auth demo) | ✅ Live | New producers land in an auto-seeded demo project (`ensureProducerOnboardingDemo`) with a DemoDataChip badge so they can tell demo data from real (E2 series, #405–#406) |
| Onboarding tour gate | ✅ Live | |
| Claim Account flow | ✅ Live | |
| Demo banner | ✅ Live | |
| **OBSERVABILITY (in-house, replaces Sentry)** | | |
| Error tracking — client capture (`errorReporter.ts`) | ✅ Live | |
| Bug Report Modal + auto-correlate with clientErrors | ✅ Live | |
| Beta Tester Bug Button | ✅ Live | |
| Admin Error Dashboard | ✅ Live | |
| Error spike detector + regression watcher (cron) | ✅ Live | Every 5 min + hourly |
| GitHub Issues bridge for clientError promotion | ✅ Live | |
| App Health daily score | ✅ Live | Daily 06:00 UTC |
| **MOBILE** | | |
| iOS app (Capacitor build) | 🚧 In dev | Build wired locally; App Store submission not started |
| Android app (Capacitor build + push notifications) | 🚧 In dev | Play Store process started + approved; testing not yet begun |
| **NOTIFICATIONS** | | |
| In-app Notification Bell | ✅ Live | Real-time via Firestore `onSnapshot` on `users/{uid}/inboxNotifications` (PR-UI-1 #558). Bell lights up within a Firestore round-trip of an @-mention or other inbox write — replaces the prior 60s poll. Rule restricts read to the owner. |
| Daily notification digest email cron | ✅ Live | Daily 14:00 UTC |
| Push notifications (Capacitor / Android) | 🚧 In dev | Wired but ships with Android app launch |
| **ADMIN / OPS** | | |
| Admin Dashboard | ✅ Live | |
| Admin Settings + Settings Hub | ✅ Live | |
| Platform SMS panel (Twilio toll-free) | ✅ Panel live / ⚠️ Not configured | Super-admin surface for the platform-central SMS sender used for casting-call alerts, profile-completion reminders, and 2FA. `components/admin/PlatformSmsPanel.tsx` + `backend/adminSmsRoutes.js`. Backend status endpoint reports missing env vars (`MYTHIE_TWILIO_SID/TOKEN/FROM`) — set in Railway before the panel reports configured. Producer-to-talent outreach is a separate per-org BYOE Twilio integration. |
| Analytics event POST endpoint (`/api/analytics/event`) | ✅ Live | Server-side ingest for the event taxonomy (`backend/analyticsRoutes.js`). |
| Beta Applications admin | ✅ Live | |
| Audit Portal | ✅ Live | |
| **SHARED UX** | | |
| Command Palette | ✅ Live | |
| Live-collab presence (who else is viewing this record) | ✅ Live | `services/presenceTracker.ts`; visible on profile + project surfaces. |
| Unicorn Celebration animations + brand mascot | ✅ Live | |
| Empty State component | ✅ Live | |
| Beta Landing + beta access flow | ✅ Live | |
| **INTERNAL QA / DEV TOOLING** *(included so staff understand the brand-safety bar)* | | |
| Stress-test brand invariants (8 gates: tagline-drift, banned-words, sandbox-Stripe-ID, dual-CTA, talent-is-always-free, long-form-bio, unicorn-voice-watchlist, ROADMAP-prefix, compare-pages-truth) | ✅ Live | Vitest, runs in CI; expanded series PRs #389–#412 |

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
| 2026-05-10 | Reference file created; all sections marked TBC pending feature audit |
| 2026-05-10 | Feature audit completed; Inventory populated from CastHub1 codebase |
| 2026-05-10 | Inventory follow-up: added Semantic Tape Search (Studio-tier), AI Bulk Personalisation, onboarding demo seeding, completed bulk-status pipeline series; expanded brand-invariant gates (3→8) — covers commits 5d90706..6d9d5a3 |
| 2026-05-13 | Launch-prep batch (PRs #553–#558): real-time NotificationBell via `onSnapshot`; AI Tools tier gate on ProfileModal (free → upgrade card / paid → AiWowPanel); per-field inline edit on profile Overview; SocialLinksEditor in Media & Social tab; AI Tools own tab + Overview snapshot strip; Platform SMS super-admin panel (panel live, env vars not yet configured in Railway); analytics event POST endpoint; live-collab presence; legal Florida→Missouri governing-law shift; `blogPosts` public Firestore read (PR #557). Two items deferred pending decisions: "Mythie-join invite" copy wording from #553 (need exact label); Sentry retirement state vs in-house error-tracking-system (.env.example still has `SENTRY_DSN=`). |

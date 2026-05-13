# CueHound (repo: RunOfShow)
⚠️ LAST UPDATED: 2026-05-10 — verify against live app before using in training

## Identity
- **Repo:** https://github.com/jayhawkrules/RunOfShow (legacy name; product is CueHound, rename tracked in repo `MANUAL_TODOS.md` #13)
- **Live URL:** https://cuehound.com (domain registered, Cloudflare DNS live; product itself not yet publicly launched)
- **Stack:** B (TypeScript / pnpm / Turbo / Drizzle / Tauri / Go cue runtime / Rust show-engine-rs / Better-Auth)
- **Brand owner:** Andrew Ward · Producing Hollywood
- **10 Lives branded:** No (NOTE: the repo's README + CLAUDE.md still attribute CueHound to "10 Lives Studios" — that is stale per Andrew; cleanup tracked as a manual task)
- **Status:** Pre-alpha — foundation work in progress, nothing publicly shipping yet

## What it is (one paragraph)
CueHound is an AI-native run-of-show + teleprompter platform for live production: real-time collaborative rundowns, native iOS/Android voice-paced teleprompter, deterministic local cue engine (OSC / OBS WebSocket v5 / vMix TCP / MIDI MSC+MMC / Bitfocus Companion), and an AI Pacing Copilot that proposes contingency reflows as approval-gated diff cards. The Show Engine runs offline ≥8 hours; cloud is for collaboration/AI/backup, never the hot cue path. USA-targeted, USD pricing. Currently pre-alpha; nothing publicly shipping.

## Who uses it
| Role | What they do |
|------|-------------|
| TBC | TBC |

## Feature Inventory
> **Status convention for this app:** README explicitly states "pre-alpha; nothing publicly shipping yet." Mobile bundle version is `0.0.0`, marketing site domain just went live but app surfaces are not yet exposed to public users. Therefore **all features below are 🚧 In dev** — code exists in the monorepo but is not in production user hands.

| Feature | Status | Notes |
|---------|--------|-------|
| **WEB APP** *(`apps/web`)* | | |
| Real-time collaborative rundown editor | 🚧 In dev | PR #9 ("rundown editor"); Yjs queue per PR #27 |
| Admin Reliability Console | 🚧 In dev | PR #28 |
| **DESKTOP — Tauri Show Engine** *(`apps/desktop` + `packages/show-engine-rs`)* | | |
| Tauri desktop Show Engine | 🚧 In dev | Phase 5 part 2 |
| Rust Show Engine crate (offline ≥8h, deterministic local cue dispatch) | 🚧 In dev | `packages/show-engine-rs` |
| Show Engine reconcile-on-reconnect API (audit push + Yjs queue) | 🚧 In dev | PR #27 |
| **MOBILE — iOS + Android** *(`apps/mobile`)* | | |
| Expo iOS + Android scaffold (bundle id `com.cuehound.app`, version 0.0.0) | 🚧 In dev | Pre-launch; not yet on App Store / Play Store |
| Teleprompter screen | 🚧 In dev | Phase 3 |
| Voice-paced auto-scroll (on-device) | 🚧 In dev | Phase 3 — voice-pacing stub |
| **DISPLAY — Stage Display PWA** *(`apps/display`)* | | |
| Stage Display PWA | 🚧 In dev | Phase 2 polish |
| Drift strip | 🚧 In dev | Phase 2 polish |
| Talent message ACK | 🚧 In dev | Phase 2 polish |
| **CUE ENGINE ADAPTERS** *(`packages/cue-engine` + Go runtime)* | | |
| OSC adapter | 🚧 In dev | Phase 5 |
| MIDI MSC + MMC adapter | 🚧 In dev | Phase 5 |
| OBS WebSocket v5 adapter | 🚧 In dev | Phase 5 |
| vMix TCP adapter | 🚧 In dev | Phase 5 |
| Bitfocus Companion adapter (module) | 🚧 In dev | Phase 5 |
| Go cue runtime | 🚧 In dev | Phase 5 |
| **AI PACING COPILOT** *(`packages/ai-sdk`)* | | |
| `/rewrite` endpoint | 🚧 In dev | Phase 4 |
| Pacing Copilot replan | 🚧 In dev | Phase 4 |
| Diff-card component (approval-gated reflows) | 🚧 In dev | Phase 4 |
| **AUTH** *(`packages/auth`)* | | |
| Better-Auth integration: Google + Apple + magic link | 🚧 In dev | PR #16 |
| **API GATEWAY** *(`services/api`)* | | |
| Fastify + tRPC API gateway | 🚧 In dev | PR #18 |
| **OBSERVABILITY** *(`packages/observability`)* | | |
| Shared Sentry package + apps/web Sentry integration | 🚧 In dev | PR #28 |
| **MARKETING SITE** *(`apps/marketing` — Cloudflare Pages, cuehound.com)* | | |
| Marketing site (Cloudflare Pages + Stripe Checkout handler) | 🚧 In dev | Phase 6; cuehound.com domain registered + Cloudflare DNS live; awaiting public launch |
| `/solutions` index + 4 vertical landing pages | 🚧 In dev | PR #25 |
| `/freelancers` solo-wedge landing page | 🚧 In dev | PR #24 |
| `/vs/[competitor]` comparison pages × 8 | 🚧 In dev | PR #23 |
| **DATA / CONFIG** *(`packages/schema` + `packages/config`)* | | |
| Drizzle schema package (single source of truth) | 🚧 In dev | `packages/schema` |
| Pricing source-of-truth (`packages/schema/src/pricing.ts`) | 🚧 In dev | USD-only; tiers + passes + AI top-up — see Pricing & Entitlements section (TBC) |
| Shared config package | 🚧 In dev | `packages/config` |
| **SHARED UI** *(`packages/ui`)* | | |
| Shared UI components | 🚧 In dev | |

## Pricing & Entitlements
| Plan | Price | Limits | Key Features |
|------|-------|--------|-------------|
| TBC | TBC | TBC | TBC |

## Key Workflows
TBC

## Navigation Map
TBC

## Known Issues / Limitations
- Active development; expect frequent feature changes

## FAQ
TBC

## Changelog
| Date | Change |
|------|--------|
| 2026-05-10 | Reference file created; all sections marked TBC pending feature audit |
| 2026-05-10 | Renamed from `run-of-show.md` to `aclamos.md`; Live URL set to https://aclamos.app; Status promoted Active dev → Live |
| 2026-05-10 | Reference file restored from incorrect "Aclamos" rename — actual product is CueHound (per repo `package.json` + `CLAUDE.md` + `README.md` + pricing schema). File renamed `aclamos.md` → `cuehound.md`. Identity restored: brand owner Andrew Ward · Producing Hollywood (NOT 10 Lives Studios — repo README is stale on this point); Live URL updated to https://cuehound.com (domain registered + Cloudflare DNS live; product still pre-alpha, not publicly launched); Stack expanded to capture monorepo composition. "What it is" rewritten from CueHound source-of-truth. |
| 2026-05-10 | Feature audit completed; Inventory populated from CueHound monorepo (~26 rows across 11 surface groups). All features marked 🚧 In dev per README "pre-alpha; nothing publicly shipping". |

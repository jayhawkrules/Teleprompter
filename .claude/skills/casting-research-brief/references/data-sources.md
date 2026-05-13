# Data sources matrix

The tiered API + scrape source list this skill draws from. Every adoption of a new source must first pass `vendor-consolidation-policy` and `legal-compliance-guardian`.

Last reviewed: 2026-05-12. Re-audit quarterly via `skill-auto-heal`.

> **Portability note.** The **tier structure** (A/B/C/D allowed, E hard-blocked) and the **Tier-E blocklist** are universal — every adopter applies them identically. The **specific vendor selections within each tier** (e.g. NewsAPI vs Mediastack, social-fetch policy specifics) are decisions each adopting app makes via `vendor-consolidation-policy`. Mythie / CastHub1 vendor choices below are the reference defaults; an adopting app may pick differently but must respect the tier structure and the FCRA-posture rules.

## Tier A - identity & sanctions (near-free, always-on)

### OpenSanctions
- **URL:** https://www.opensanctions.org/
- **Coverage:** OFAC SDN, EU consolidated, UK HMT, UN, plus PEPs and global watchlists.
- **API:** REST, free tier ~500 queries/day; paid tier for commercial.
- **Auth:** API key (free signup), set `OPENSANCTIONS_API_KEY` env.
- **Why use:** A sanctioned person should never be auto-routed to a casting team. Hard-flag signal.
- **Rate limit:** 10 req/s. Skill applies 100ms throttle.
- **ToS posture:** Permits research use; attribution required if surfaced verbatim.

### Google Programmable Search Engine (PSE)
- **URL:** https://programmablesearchengine.google.com/
- **Coverage:** Bounded site list - LinkedIn public, Instagram public web, TikTok public web, X.com public, IMDB, major news outlets (NYT, BBC, Variety, Hollywood Reporter, Deadline, etc).
- **API:** REST, 100 free queries/day per CSE; $5 per additional 1,000.
- **Auth:** API key + custom search engine ID. Env: `GOOGLE_PSE_API_KEY`, `GOOGLE_PSE_CX`.
- **Why use:** Most cost-effective way to scope "what would a casting team Google?" to a known-good site list.
- **Rate limit:** 100 queries/day default; can be raised on billing.
- **ToS posture:** Standard PSE terms; must not cache raw Google results > 24h.

## Tier B - press & news

### GDELT 2.0
- **URL:** https://www.gdeltproject.org/
- **Coverage:** Global news, multilingual, event-coded; 15-min refresh.
- **API:** REST, free, no key required.
- **Why use:** Free, broad, deduplicates well across outlets.
- **Rate limit:** Soft - be polite, < 1 req/s.
- **ToS posture:** CC-BY; attribution to GDELT required if surfaced.

### NewsAPI (preferred paid)
- **URL:** https://newsapi.org/
- **Coverage:** 80k+ sources, last-30-day window on cheap tier, archive on enterprise.
- **API:** REST, paid (~$449/mo Business).
- **Auth:** `NEWSAPI_KEY`.
- **Vendor decision:** Picked over Mediastack and Aylien per `vendor-consolidation-policy` 2026-Q2 review - already on shortlist for `seo-aeo-optimizer`'s press-mention monitor; consolidate.
- **Rate limit:** 250 req/day on Developer, 250k/mo on Business.

## Tier C - public litigation references

> Framing rule: every Tier C signal renders in the brief as "public mention in court records, may or may not be the same individual." Never as "criminal record", "lawsuit", "conviction", "charge", or "arrest" - even when the underlying record describes those.

### CourtListener (RECAP)
- **URL:** https://www.courtlistener.com/api/
- **Coverage:** Federal civil + appellate, opinions, dockets via RECAP.
- **API:** REST, free with API key for higher quota.
- **Auth:** `COURTLISTENER_API_KEY`.
- **Why use:** Authoritative, free, well-documented. Best-in-class for federal civil.
- **Rate limit:** 5,000 req/day with key.
- **ToS posture:** Free Law Project, very permissive for research use.

### Judyrecords
- **URL:** https://www.judyrecords.com/
- **Coverage:** ~600M federal + state civil + criminal records (we use civil only).
- **API:** Paid; uses are unclear without ToS review - flagged for `legal-compliance-guardian` before adoption.
- **Status:** **Not adopted in v1.** Defer to v1.1 after compliance review.

## Tier D - social presence

### Instagram public profile fetch
- **Method:** Public web fetch via Mythie's existing scraper allowance.
- **Signals extracted:** Account exists, follower count band (rounded), bio text, post cadence (last 30 days), verified badge yes/no.
- **Never extracted:** DMs, private posts, story content, follower list.
- **ToS posture:** Meta ToS prohibits scraping; Mythie's posture is to use the public profile signal but never store post content or contact data, and to respect rate limits aggressively (1 fetch/talent/24h). Re-audit on every Meta policy change.

### TikTok public display
- **Method:** Public web fetch; TikTok Display API where available.
- **Signals extracted:** Account exists, follower count band, bio text, verified badge.
- **Same rules as Instagram.**

### LinkedIn public profile
- **Method:** Surfaced via Google PSE indexed result only (no scraping behind login).
- **Signals extracted:** Title, employer (current), location, public summary snippet.

### X (formerly Twitter)
- **Method:** Public web fetch.
- **Status:** Deprioritised - high noise, low signal for casting research. Optional in v1.1.

## Tier E - explicitly excluded

The following are **hard-blocked at the gather step** with a code-level guard, not a config flag:

| Source class | Why blocked |
|---|---|
| Sex offender registries (NSOPW, state) | Using for screening violates state-AG positions; brand-damaging; lawful use requires authorised CRA |
| DMV / driving records | Regulated under DPPA; lawful access requires permissible purpose, which casting research is not |
| Credit reports / headers | FCRA-regulated; requires permissible purpose + adverse-action workflow |
| Federal / state criminal records | FCRA + state-CRA regulated |
| Sealed / expunged records | Per state law; even if technically reachable |
| Paid people-search aggregators (Spokeo, BeenVerified, TruthFinder, Intelius, Whitepages-paid) | Re-package non-public data of dubious provenance; class-action history; brand-damaging association |
| Dark-web breach data | Provenance unverifiable; using in a research product is reputationally fatal |

If a casting team asks for any of these, the UI routes them to the partner-CRA flow with a "Why we don't do this" inline explainer.

## Partner-CRA referral

Mythie maintains a referral relationship with at least one regulated consumer reporting agency for casting teams who need a real check. Candidates evaluated per `vendor-consolidation-policy`:

- **Checkr** - market leader, generous API, FCRA-compliant workflow.
- **Certn** - Canadian + UK strength, useful for international productions.
- **Sterling** - enterprise-grade, slower onboarding.

Current decision (2026-05-12): pending Checkr partner onboarding. Until then, the CTA link is to a Mythie-hosted explainer page that describes the recommended path.

## Cost envelope (target)

- Tier A: ~$50/mo (OpenSanctions paid + PSE overage)
- Tier B: NewsAPI Business ~$449/mo (shared with `seo-aeo-optimizer`)
- Tier C: $0 (CourtListener)
- Tier D: $0 (public fetch, infra-side only)
- **Target marginal cost per brief: < $0.15** including Claude summary tokens.

If marginal cost exceeds $0.30/brief, escalate to `vendor-consolidation-policy` before scaling.

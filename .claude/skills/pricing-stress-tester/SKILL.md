---
name: pricing-stress-tester
description: Use before launching or changing pricing on any portfolio app — Mythie tiers, Aclamos entry fees, theproductionshelf Payhip prices, Noelly Stripe Connect take rate, e-sign tier pricing per [[project_esign_tier_pricing_open]], future Aclamos take-rate restoration after [[project_aclamos_v1_take_rate_zero]]. Stress-tests the pricing model from three buyer perspectives (skeptical buyer, value buyer, competitor) and surfaces what your pricing is ACTUALLY communicating vs what you intend. Pairs with [[monetization-readiness-review]] — monetization-readiness checks the technical path; this checks the pricing strategy. Adapted from Sairahul's Pricing Stress Tester concept. Keywords - pricing, price testing, pricing model, stress test, entry fee, subscription tier, take rate, Stripe Connect, Payhip, Studio tier, free tier, upgrade flow, monetization, willingness to pay, value perception, competitor pricing.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, WebFetch, Grep]
---

# Pricing Stress Tester

Pricing is the leakiest part of the revenue stack. The technical path can be perfect (per [[monetization-readiness-review]]) but if the pricing communicates the wrong value, the conversion never happens. This skill stress-tests pricing from three angles before launch — or after a stall that pricing might explain.

Adapted from Sairahul Jonnalagadda's "Pricing Stress Tester" concept (2026 article: *20 Claude Skills Most Builders Don't Know Exist*) and tied to specific portfolio decisions.

## When to use

- Launching new pricing on any portfolio app
- Changing prices, tiers, or take rates
- Resolving an open pricing decision (e-sign tier pricing per [[project_esign_tier_pricing_open]], Aclamos take-rate restoration per [[project_aclamos_v1_take_rate_zero]], token unit naming pricing per [[project_token_naming_open_question]])
- Conversion has stalled and the funnel checks out — could be a pricing communication problem
- Before any "what should we charge?" decision

## When NOT to use

- Internal-tool pricing (CRM-ai — no external customers)
- Free-only surfaces (most marketing sites — pricing is the app, not the site)
- One-time price tweaks within an already-validated structure (a 5% adjustment doesn't need the full test)

## The three angles

### Angle 1 — The Skeptical Buyer

The customer who has been burned before. They think "too good to be true" or "too expensive for what it is."

Ask:
- What are they thinking when they see this price?
- Which question does this pricing NOT answer? (e.g., "what happens if I cancel?", "do I keep what I made?", "is this the actual price after taxes?")
- What would make them trust it more?
- What would make them walk away?

Common skeptical-buyer concerns in Andrew's portfolio:
- Mythie subscription — "If I cancel, do I lose access to my saved casting calls?"
- Aclamos entry fee — "If my film isn't accepted, do I get a refund?"
- theproductionshelf Payhip — "Does the price include the watermark removal?"
- Noelly Stripe Connect — "What's the actual take rate after fees?"

### Angle 2 — The Value Buyer

The customer who equates price with quality. They worry cheap means bad.

Ask:
- Does the pricing signal the value level it should?
- If the cheapest tier is "free," does that erode the perceived value of paid tiers?
- Is the price low enough to suggest "this isn't serious"?
- Is the pricing structure (per-event, per-month, per-feature) the right shape for what we deliver?

Common value-buyer concerns in Andrew's portfolio:
- Mythie Free tier — does it set "Free is enough" too convincingly?
- Aclamos entry fee at $X — does it signal "serious festival" or "fly-by-night submission site"?
- Studio-tier $99/mo — does $99 read as "real money" or "still cheap, must be limited"?
- e-sign CA-cert at $269/yr per [[project_esign_ca_cert_deferred]] — does the price match the legal-grade outcome?

### Angle 3 — The Competitor

A direct competitor looking at your pricing right now.

Ask:
- What do they see?
- Where is your pricing vulnerable? (Higher? Lower? Confusing structure?)
- What move could they make that would make your price look wrong?
- Is your pricing positioning you above, below, or alongside them — and is that intentional?

Competitor reference points (refresh per [[market-research-competitive-intel]] before each test):
- Mythie vs Casting Networks / Actors Access / Backstage tiering
- Aclamos vs FilmFreeway entry fee structure
- theproductionshelf vs ProductionHUB / Mandy.com pricing
- Noelly vs DonorBox / GoFundMe Charity / EveryOrg fee structures
- e-sign tier vs DocuSign / HelloSign / Dropbox Sign mid-tier

## After the three angles

1. **What your pricing is ACTUALLY communicating** (1 paragraph) — not the intent, the first-time-visitor read.
2. **The most dangerous misread** (1 sentence) — the wrong conclusion most likely to lose the deal.
3. **The one change** (1 sentence) — specific, single adjustment that fixes the biggest problem.
4. **The launch verdict** — ship as-is, ship-with-the-one-change, or rework.

## Portfolio-specific pricing footguns

These come from real decisions in the memory log:

- **Aclamos take rate = 0% at v1 launch** per [[project_aclamos_v1_take_rate_zero]] — locked. Don't propose >0% until post-launch traction. Revenue is via subscription/Studio, not fee skim.
- **e-sign CA-cert at $269/yr** triggered by first Studio account per [[project_esign_ca_cert_deferred]] — anchored to Studio tier; don't re-tier.
- **Token unit naming open** per [[project_token_naming_open_question]] — pricing depends on what tokens are called; "tokens" placeholder okay, rename touches ~8 surfaces.
- **API + MCP = Studio-only** per [[feedback_api_mcp_studio_only]] — these features anchor Studio's value; pricing must reflect.
- **5-tier e-sign pricing OPEN** per [[project_esign_tier_pricing_open]] — 9 features × 5 tiers; resolve before launch marketing.

## What to actually output

```markdown
## <App> Pricing Stress Test — <YYYY-MM-DD>

### Pricing under test
[describe the model]

### Angle 1 — Skeptical Buyer
- [3-5 bullets of what they're thinking]
- Unanswered question: [the gap]
- Trust gap: [what would close it]

### Angle 2 — Value Buyer
- [3-5 bullets]
- Quality signal: [strong / weak / wrong]
- Structure fit: [right shape / wrong shape — and why]

### Angle 3 — Competitor
- Reference competitor(s): [named]
- Vulnerability: [where they could undercut]
- Positioning: [above / below / parallel — intentional?]

### What pricing is ACTUALLY communicating
[1 paragraph]

### Most dangerous misread
[1 sentence]

### The one change
[1 sentence, specific]

### Verdict
[ship-as-is / ship-with-one-change / rework]

### Open questions for Andrew
[bullet list — any decisions outside the test's scope]
```

Save to `docs/strategy/pricing-stress-test-<app>-<date>.md` if Andrew wants a record.

## Anti-patterns

1. **Validating the pricing** — this skill stress-TESTS. If you find yourself defending the price, you're not running the skill, you're confirming bias.
2. **Generic concerns** — "buyers might think it's too expensive" is not a stress test. Specific: "buyers think the Studio tier doesn't justify $99 over Pro tier because the API access section reads as developer-only."
3. **Forgetting the structure question** — sometimes the price is fine but the STRUCTURE is wrong (per-feature vs per-month vs per-event). Stress-test structure too.
4. **Ignoring locked decisions** — if the memory says "Aclamos take rate is 0% locked," don't propose it should be 5%. Work within the locked decisions; flag if the lock should be revisited.
5. **One-angle laziness** — running only Angle 1 because it's the easiest gives you a partial picture. All three angles, every test.

## What this composes with

- [[monetization-readiness-review]] — runs FIRST (technical path); this runs SECOND (pricing strategy)
- [[market-research-competitive-intel]] — provides the competitor reference points
- [[analytics-event-map]] — tells you whether the pricing change actually moved conversion
- [[vendor-consolidation-policy]] — vendor cost feeds the floor of what pricing must cover
- [[stripe-new-app-setup]] / [[payment-webhook-safety]] — once pricing is approved, these wire it
- [[99it]] — pricing audit is part of the 99/100 pass for monetization features

## Source

- Sairahul Jonnalagadda, *20 Claude Skills Most Builders Don't Know Exist* (2026) — Pricing Stress Tester (skill #14)
- Portfolio adaptation: tied to specific open pricing decisions and locked constraints from memory

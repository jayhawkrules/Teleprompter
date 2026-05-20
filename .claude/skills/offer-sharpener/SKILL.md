---
name: offer-sharpener
description: Use before launching or relaunching any portfolio app's landing page, hero section, App Store / Google Play description, paid-tier upsell modal, signup-flow value prop, or social ad. Finds the gap between what Andrew thinks the app is offering and what a first-time visitor actually hears. That gap is where deals die. The skill produces a sharpened one-line "what this is" and the single sentence that, if a stranger read only it, they'd know if it's for them. Adapted from Sairahul's Offer Sharpener concept and portfolio-fitted to the specific apps and their open-positioning decisions. Keywords - landing page copy, hero copy, value prop, app store description, offer, positioning, what is this, one-liner, what we do, who it's for, gap, intended-vs-perceived, conversion, signup.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, WebFetch]
---

# Offer Sharpener

The most common cause of low conversion isn't the price (per [[pricing-stress-tester]]) or the design (per [[ui-design-web-apps]]). It's that a stranger arrives on the landing page and can't answer "what is this and is it for me?" in 5 seconds. They leave. They never tell you why.

This skill finds the gap between what Andrew *thinks* the app is offering and what a first-time visitor actually hears. Then it closes the gap.

Adapted from Sairahul Jonnalagadda's "Offer Sharpener" concept (2026 article: *20 Claude Skills Most Builders Don't Know Exist*).

## When to use

- Writing or rewriting a landing page hero
- Writing or rewriting an App Store / Google Play description
- Drafting paid-tier upsell modal copy
- Drafting onboarding signup-flow value prop
- Composing a social ad or boosted-post body
- Conversion has stalled and copy might be the cause
- New app launch (pair with [[premium-product-demo]] for visuals + this for words)

## When NOT to use

- Internal-tool descriptions (CRM-ai, ops dashboards)
- Documentation / help articles (different goal — education, not conversion)
- Legal language ([[legal-compliance-guardian]] governs)
- Re-using validated copy that's converting fine (don't fix what isn't broken)

## The 5-step sharpening

For any offer, produce:

### 1. What you think you're selling (1 sentence)

The value AS THE SELLER SEES IT. This is what Andrew would say if asked "what is this?" Often the BEST version — full context, all features, all benefits packed in.

### 2. What the buyer probably hears (1 sentence)

A first-time visitor's 5-second takeaway. Almost always strips out 60% of what the seller meant. The features may be invisible; the differentiation may be lost; the audience may not recognize itself.

This is the honest, uncomfortable read. Don't soften it.

### 3. The gap (1 sentence)

The distance between those two. This is where the deal dies. Name it specifically: "they hear 'another casting site,' you mean 'first reality-TV-focused casting platform with built-in producer outreach.'"

### 4. The sharpened offer (2 sentences max)

Rewritten so the value is impossible to misunderstand. Specific outcome. Specific person. Specific timeframe if applicable. More specific = better; longer ≠ better.

Test: a 5-second skim of these two sentences should produce roughly the same understanding as a 5-minute briefing on the app.

### 5. The one line (1 sentence)

The single sentence that, if a prospect read ONLY this, they'd know exactly whether this is for them. Not a tagline. A clarity test.

Test: read it to a stranger. If they say "I know exactly what that does," it passes. If they say "interesting" or "cool" or "tell me more," it failed.

## Per-app sharpening priorities

| App | Surface most needing sharpening | Notes |
|---|---|---|
| **Mythie (CastHub1)** | Landing page hero, App Store description | "Reality TV casting" is broad; sharpen to the specific audience-side and producer-side propositions |
| **Aclamos** | Landing page, Stripe entry-fee checkout description | Entry fee asks for money before clarity → highest-leverage to sharpen |
| **theproductionshelf** | Payhip product descriptions | Payhip shows the description directly above the buy button; gap = lost sale |
| **Noelly (holiday-lights)** | Stripe Connect signup flow value prop | Family donors need 5-second clarity on what their money does |
| **BacklotHub** | Landing page (10 Lives Studios framing) | Tribeca-tier vs Toronado positioning per [[feedback_10_lives_only_tribeca]] |
| **CueHound** | App Store description, landing page | "Cue the action" hook risks being too cute — clarity > cleverness |
| **toronadoentertainment.com** | About page, portfolio listing copy | Each app description on the umbrella site needs sharpening |
| **Ballotis** | Landing page, "what is this?" hero | Awards-voting positioning needs to be unmistakable from line 1 |

## The portfolio-wide pattern

Andrew's portfolio is reality-TV-adjacent productions, awards, holidays, casting, crew. The pattern that hurts every app:

> The seller says: "We're a [category] platform that [unique mechanism] for [specific audience]."
> 
> The buyer hears: "It's another [category] site."

The sharpening is almost always about making the UNIQUE MECHANISM the lead, not the category. Examples (sketch — real sharpening goes deeper):

- ❌ "Mythie is a reality TV casting platform."
- ✅ "Mythie matches you to the casting calls producers are scrolling RIGHT NOW. They DM you in the app. No more agencies, no more outdated breakdowns."

- ❌ "Aclamos helps filmmakers submit to festivals."
- ✅ "Aclamos is where festival-tier producers send their best work first. Submission opens to public 30 days later — by then, the slots are taken."

- ❌ "theproductionshelf is templates for film producers."
- ✅ "theproductionshelf is the call sheet, budget, and crew comp you would've spent 8 hours building, ready in 8 minutes."

(These are illustrations of the *shape* of the sharpening, not the actual approved copy. Pair with [[voice-locker-per-app]] for real-voice execution.)

## Output template

```markdown
## <App / Surface> Offer Sharpening — <YYYY-MM-DD>

### What you think you're selling
[1 sentence from Andrew / current copy]

### What the buyer probably hears
[1 sentence — honest, unflinching read]

### The gap
[1 sentence naming the specific distance]

### The sharpened offer
[2 sentences max]

### The one line
[1 sentence — the clarity test]

### Why this works
[1-2 sentences on what specifically changed and why it closes the gap]

### Open questions for Andrew
[bullets — anything where the gap can't be closed without a decision (positioning, audience, etc.)]
```

Save to `docs/strategy/offer-sharpening-<app>-<surface>-<date>.md` if Andrew wants the record.

## Composition with other skills

- **Run [[voice-locker-per-app]] FIRST** — the sharpened offer has to be in the right voice. Sharpening + wrong voice = clearer but off-brand.
- **Run [[market-research-competitive-intel]] FIRST** if the gap is positioning-vs-competitor — you need to know what they're saying to differentiate.
- **Run [[pricing-stress-tester]] in parallel** when the offer change touches pricing (often does).
- **Feed result to [[premium-product-demo]]** — the visual demo + the sharpened offer should be designed together.
- **Feed result to [[seo-aeo-optimizer]]** — the one line often IS the SEO meta description.
- **Feed result to [[gamified-quiz-design]]** — quiz starting screens need a sharpened offer at the top.

## Anti-patterns

1. **Validating instead of stress-testing** — if you find yourself writing "actually that's a great line," you're not sharpening. Sharpening hurts a little.
2. **Making it longer to make it clearer** — the sharpened offer is almost always SHORTER, not longer. Specificity ≠ wordiness.
3. **The marketing-cliche pivot** — replacing "platform" with "supercharge your X" is not sharpening. It's worse. Use [[voice-locker-per-app]] to avoid this.
4. **Hiding the differentiation** — if the unique mechanism isn't in the first 8 words, you haven't sharpened.
5. **Confusing tagline with clarity** — the "one line" is NOT a tagline. Taglines can be evocative ("Just do it"). One lines are diagnostic ("Match to casting calls producers are scrolling right now").
6. **Sharpening without voice-locking** — produces clear AI-sounding copy. Reject. Run [[voice-locker-per-app]] over the output.

## Per-app first-pass priority

1. **Aclamos** — Stripe checkout description above the entry-fee CTA. Highest dollar-per-clarity-improvement.
2. **Mythie** — App Store description (capped at limited chars, every word fights).
3. **theproductionshelf** — Payhip listing pages, one per product.
4. **Noelly** — Stripe Connect cause-page descriptions.
5. **toronadoentertainment.com** — portfolio listing entries (one sharpened offer per app on the umbrella).
6. Then the marketing pages of each remaining Stack A/B app.

## Source

- Sairahul Jonnalagadda, *20 Claude Skills Most Builders Don't Know Exist* (2026) — Offer Sharpener (skill #15)
- Portfolio adaptation: tied to specific landing-page / App Store / checkout surfaces and composed with voice-locker-per-app and pricing-stress-tester

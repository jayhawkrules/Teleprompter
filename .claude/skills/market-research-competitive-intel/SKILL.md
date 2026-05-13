# SKILL: market-research-competitive-intel

## Purpose
Performs a comprehensive, deep-dive market research and competitive analysis across all portfolio app products. Generates a structured, citation-backed report covering market size, competitor landscape, pricing, trends, and actionable strategic recommendations for each product. Output is production-ready as a downloadable report and can be used to brief team members, investors, or to inform product roadmap decisions.

---

## Trigger Phrases
Use this skill when the user says any of the following (or close variations):
- "do market research on our apps"
- "competitive analysis for [app name]"
- "who are our competitors"
- "what's the market look like for [app]"
- "deep dive on the market"
- "update our competitive intelligence"
- "what trends should we know about"
- "are we staying ahead of the competition"

---

## Scope

This skill covers all active portfolio products:

| App | GitHub Repo | Market |
|---|---|---|
| CastHub / Mythie | `CastHub1` | Reality TV casting platform |
| Teleprompter | `teleprompter` | TikTok-integrated creator teleprompter |
| Run of Show | `run-of-show` | Live event / production management |
| ARTAS | `awardssubmission` | Reality TV awards voting & submissions |
| The Production Shelf | `theproductionshelf` | Digital product marketplace for production assets |

---

## Research Framework

For each product, the skill must gather and analyse:

### 1. Market Size & Growth
- Total Addressable Market (TAM) with source and year
- Compound Annual Growth Rate (CAGR)
- Key market drivers and headwinds
- North America / UK market breakdown where relevant

### 2. Competitive Landscape
Generate a **comparison table** with the following columns:
- Platform name
- Product type (direct / indirect / adjacent)
- Pricing (free tier, starter, pro)
- Core strengths
- Core weaknesses
- AI features (Y/N + details)
- Estimated user base (if known)

### 3. Feature Gap Analysis
For each app, identify:
- Features competitors have that we lack (threats)
- Features we have that competitors lack (advantages)
- Features no one has built yet (white-space opportunities)

### 4. Trend Identification
- Top 3–5 industry trends relevant to this product
- Emerging technologies affecting the space (AI, AR, mobile, social platforms)
- Regulatory or platform changes that affect the market (e.g. TikTok policy, union rules, streaming wars)

### 5. Pricing Intelligence
- Document competitor pricing tiers in detail
- Identify where our pricing creates competitive advantage or leaves money on the table
- Recommend optimal pricing model (freemium, subscription, per-event, one-time purchase)

### 6. Strategic Recommendations
Deliver minimum **5 actionable recommendations** per product, prioritised by:
- **Impact** (High / Medium / Low)
- **Effort** (High / Medium / Low)
- **Urgency** (Immediate / This Quarter / Roadmap)

---

## Cross-Portfolio Analysis (Required)

After individual product analysis, produce a cross-portfolio section covering:

1. **ARTAS as Top-of-Funnel Engine** — How the awards brand drives discovery for all other products
2. **AI Integration Priority Matrix** — Which AI features to build first across all apps, ranked by ROI
3. **Ecosystem Monetisation Map** — How customers in one product can be converted to customers in another
4. **Shared Positioning Statement** — "Built by producers. Used on real productions." — how to apply this across all marketing
5. **Unified Pricing Architecture** — Recommendation for a portfolio all-apps bundle or cross-product subscription

---

## Output Format

Deliver a **GitHub-Flavored Markdown research report** with:

- H1 title: `Toronado Entertainment: Market Research & Competitive Analysis — [Month Year]`
- Executive Summary (5–7 sentences)
- One H2 section per product
- Competitor tables using GFM markdown
- Strategic recommendations as numbered lists with Impact / Effort / Urgency labels
- Cross-portfolio section at the end
- All factual claims cited with `[cite:N]` inline citations
- Market size summary table at the end

**Do NOT:**
- Fabricate statistics — all data must be sourced
- Include a bibliography section — all citations are inline
- Use first-person pronouns
- Summarise the report at the end (conclusions replace summaries)

---

## Refresh Cadence

This skill should be re-run:
- **Quarterly** — full deep-dive (this full skill)
- **Monthly** — abbreviated version (trends + pricing changes only)
- **On-demand** — triggered before any major product launch or investor pitch

To run a monthly abbreviated refresh, add `--mode=monthly` to the trigger prompt.

---

## Data Sources to Prioritise

When gathering market research, prioritise sources in this order:
1. Statista, IBISWorld, Mordor Intelligence, Dataintelo (market sizing)
2. G2, Capterra, SaaSworthy (competitor pricing & features)
3. Forbes, TechCrunch, Variety, Deadline, Tubefilter (industry trends)
4. Reddit, Product Hunt, App Store reviews (user sentiment on competitors)
5. Competitor websites directly (pricing pages, feature lists)

---

## App-Specific Research Targets

### CastHub / Mythie
**Direct Competitors to Always Check:**
- MyCastingNet (`mycastingnet.com`) — closest reality TV niche match
- Casting Networks (`castingnetworks.com`) — pricing page
- Backstage (`backstage.com`) — talent volume & pricing
- Casting Frontier (`castingfrontier.com`) — feature comparison
- CastMeNow (`castmenow.co`) — AI submission assistant

**Key Questions to Answer:**
- Has MyCastingNet launched any new features?
- Are any new AI-powered casting platforms entering the reality TV space?
- What are the current subscription prices at Casting Networks and Backstage?
- Is there any platform offering video audition AI review for reality TV?

---

### Teleprompter
**Direct Competitors to Always Check:**
- BIGVU (`bigvu.tv`) — market leader; check for new AI features
- PromptSmart — voice-activated scroll
- Teleprompter Pro — iOS power users
- Evelize — mobile-first
- VEED.io — browser-based
- Descript — podcast/video editing

**Key Questions to Answer:**
- Has BIGVU launched new AI features (especially Eye Contact AI updates)?
- What are the current download/user counts for each competitor?
- Are there new TikTok-specific creator tools entering the teleprompter space?
- What's the most upvoted feature request in the BIGVU/Teleprompter subreddits?

---

### Run of Show
**Direct Competitors to Always Check:**
- Rundown Studio (`rundownstudio.app`) — broadcast rundowns
- Stagetimer (`stagetimer.io`) — event timing
- Lasso Rundown (formerly Shoflo) — enterprise
- Rundown Creator — TV/radio
- EventTimer (`eventtimer.co`) — budget alternative

**Key Questions to Answer:**
- Has Showhost's shutdown created a visible wave of displaced users seeking alternatives?
- Has Stagetimer or Rundown Studio added entertainment-production specific features?
- Are any new run of show tools targeting entertainment / awards show productions?
- What's the current pricing at Stagetimer and Rundown Studio?

---

### ARTAS
**Direct Competitors to Always Check:**
- National Reality TV Awards (`nationalrealitytvawards.co.uk`) — UK/global competitor
- Virtual Reali-Tea Awards — fan-driven competitor
- Award Force (`awardforce.com/pricing`) — awards platform pricing
- Evalato (`evalato.com/pricing`) — awards platform pricing

**Key Questions to Answer:**
- Has NRTA expanded into the US market?
- Are any new reality TV awards shows launching?
- What are the current Award Force and Evalato pricing tiers?
- What's the current voting platform used on ARTAS (check `realitytelevisionawards.com/vote`)?

---

### The Production Shelf
**Direct Competitors to Always Check:**
- Etsy film production templates (`etsy.com/market/film_production_template`) — pricing & bestsellers
- Gumroad filmmaking templates (`gumroad.com`) — digital download competitors
- Creative Market — design asset pricing
- Storyboards.gumroad.com — specialist film templates

**Key Questions to Answer:**
- What are the current bestselling film production templates on Etsy and at what price?
- Has any competitor launched a "Reality TV Production Pack" bundle?
- Are AI prompt libraries for film/video production selling well?
- What's the commission structure on Gumroad vs Etsy vs own storefront in the current year?

---

## Integration With Other Skills

After completing this skill, recommend the user run:
- `seo-aeo-optimizer` — to update SEO strategy based on new competitive keywords discovered
- `repo-health-audit` — to check that each app's feature roadmap aligns with the competitive gaps identified
- `feature-scaffold` — to scaffold any high-priority new features identified in the gap analysis

---

## Sample Output Summary Table

Include this table at the end of every report:

| Product | Market Size | CAGR | Top Threat | Top Opportunity | Priority Action |
|---|---|---|---|---|---|
| CastHub / Mythie | $1.8B | 9.8% | MyCastingNet modernising | Own reality TV niche | AI self-tape review |
| Teleprompter | $9.54B | 12.71% | BIGVU AI Eye Contact | TikTok-native identity | AI script generation |
| Run of Show | $8.87B | 14.48% | Lasso enterprise push | Post-Showhost gap | Entertainment-specific branding |
| ARTAS | Unique | N/A | NRTA global expansion | Entry fees + native voting | Replace Alchemer with awards platform |
| Production Shelf | $331B | Growing | Etsy volume sellers | Reality TV niche bundles | Reality TV Producer Pack launch |

---

## Notes for Claude Code

- This skill is designed to be run in the context of the `claude-skills` repo but references all portfolio repos
- When run in terminal with full repo access, Claude Code should read `README.md` files from each app repo to check latest feature state before benchmarking against competitors
- All output files should be saved to `docs/market-research/YYYY-MM-market-research.md` inside the calling repo
- Do not push research reports to GitHub automatically — surface them for human review first
- Tag any discovered competitor feature that matches an open GitHub issue with `// COMPETITOR-VALIDATED` in your notes

---

*Skill maintained by: Toronado Entertainment, LLC / Andrew Ward*
*Last updated: May 2026*
*Skill version: 1.0*

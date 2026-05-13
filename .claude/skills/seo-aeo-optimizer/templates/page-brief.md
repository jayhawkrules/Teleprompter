# Page Brief — [URL Path]

> Use this brief BEFORE writing or auto-generating content for a key page. It surfaces the search intent and competitive landscape so the resulting page passes the 4 questions in `references/content-quality-rules.md`.

## Identity

- **URL:** `[/path]`
- **Brand:** [Brand]
- **Page type:** [homepage | feature | pricing | blog post | comparison | landing | etc.]
- **Last reviewed:** [YYYY-MM-DD]

## Search intent

- **Primary query:** "[the exact query a user would type]"
- **Intent type:** [informational | navigational | commercial investigation | transactional]
- **What is the user trying to do?** (one sentence — the job-to-be-done)
- **What would make them satisfied?** (the answer or action that resolves the query)

## Competitive landscape

For the primary query, list the top 3 organic results:

1. **[Site name + URL]** — what they have: [...]
2. **[Site name + URL]** — what they have: [...]
3. **[Site name + URL]** — what they have: [...]

What this page can offer that they don't:

- [...]

(If the answer is "nothing" — reconsider whether this page should exist.)

## AEO/GEO inputs

- **Direct answer (40-80 words):** "[Brand/Product] is [what it is] for [audience]. It [benefit 1] and [benefit 2]. [Differentiator]. [CTA]."

- **Entity definition:** [brand], [product], founded [year], based in [location], for [audience], in the [category] category

- **3-5 real user FAQs** (pulled from search console, support, sales calls — not invented):
  1. Q: [...]
     A: [...]
  2. Q: [...]
     A: [...]
  3. Q: [...]
     A: [...]

- **Structured data to add:** [Organization | WebSite | Article | Product | FAQPage | BreadcrumbList | Event | Person]

## Content outline

- [ ] Hero / opening (above the fold) — answers primary query directly
- [ ] H2: [...]
- [ ] H2: [...]
- [ ] H2: [...]
- [ ] FAQ section (visible, not behind accordions)
- [ ] CTA (clear next step)

## Trust signals (only if real, attributable)

- Testimonials: [list real customers with permission OR "none yet — explicit 'we're new' framing"]
- Stats: [list real, sourced numbers OR "none — omit the section rather than invent"]
- Logos / "Featured in": [list with verifying URL OR "none yet"]

## Sensitivities (per `references/safety-guardrails.md`)

Check each that applies:

- [ ] Page touches pricing / billing → must follow Stripe Price IDs in production
- [ ] Page touches legal / compliance → human review before any auto-edit
- [ ] Page touches awards / nominations → verify claims with original source
- [ ] Page touches employment / casting / payment outcomes → human review
- [ ] Page touches medical / financial / legal advice (YMYL) → cite authoritative sources
- [ ] Page involves children → COPPA implications

## Notes for the next agent run

[Any context the next session needs — known gaps, deferred fixes, recent changes upstream.]

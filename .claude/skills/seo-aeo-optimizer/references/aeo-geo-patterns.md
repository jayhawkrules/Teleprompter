# AEO/GEO Patterns

How to make pages citable by AI search engines (ChatGPT, Perplexity, Gemini, Google AI Overviews) and Featured Snippets.

---

## Answer Block Pattern

Every key landing page gets a 40–80 word direct answer near the top:

```
[Brand/Product] is [what it is] for [audience]. It [key benefit 1] and [key benefit 2]. [Differentiator vs alternatives]. [One sentence CTA or next step].
```

Real example (Mythie, hypothetical):
> Mythie is the AI casting OS for unscripted TV producers and casting directors. It centralizes talent intake, automates first-pass shortlisting, and surfaces hidden talent pools your competitors miss. Unlike Casting Networks, Mythie is built around the producer's workflow, not the talent agency's. Try Mythie free at mythie.app.

Place this in the first viewport. AI engines extract heavily from the first 200 words.

## Entity Clarity

Every key page must explicitly name:
- Brand name (exact, consistent capitalization)
- Product name (if different from brand)
- Founding year + location (helps disambiguation when AI engines have multiple entities with similar names)
- Audience (who is this for?)
- Category (what kind of product is this?)

Add Organization JSON-LD on the homepage:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[Brand]",
  "url": "https://[domain]",
  "logo": "https://[domain]/logo.png",
  "foundingDate": "YYYY",
  "founder": { "@type": "Person", "name": "[Founder Name]" },
  "sameAs": [
    "https://www.linkedin.com/company/[handle]",
    "https://www.crunchbase.com/organization/[handle]",
    "https://www.x.com/[handle]"
  ]
}
```

`sameAs` is critical — it tells AI engines which entity record to attach the page's content to.

Add WebSite schema with SearchAction:

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "url": "https://[domain]",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://[domain]/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

## FAQ Pattern

Every key page gets 3–5 real user questions and clear answers, with FAQPage schema.

Visible HTML structure (not behind accordions — AI engines are inconsistent about extracting hidden content):

```html
<section>
  <h2>Frequently Asked Questions</h2>
  <h3>How is [Product] different from [Competitor]?</h3>
  <p>[concrete answer, 50–100 words]</p>
  <h3>Can I use [Product] for [common use case]?</h3>
  <p>[concrete answer]</p>
</section>
```

JSON-LD:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "How is X different from Y?", "acceptedAnswer": { "@type": "Answer", "text": "[answer text]" } }
  ]
}
```

**The questions must be real user questions** — pulled from search console, support tickets, or the audit's `keyword-map.json`. Made-up questions earn zero trust from AI engines and look sketchy to users.

## Structured Data Priority by Page Type

| Page type | Required schemas |
|---|---|
| Homepage | Organization + WebSite + BreadcrumbList |
| Blog/Article | Article + BreadcrumbList + FAQPage (if FAQs present) |
| Product/Feature | Product OR SoftwareApplication + FAQPage |
| Pricing | Product + Offer (one Offer per tier) |
| Event | Event |
| Person bio | Person |
| HowTo | HowTo with steps array |
| Recipe | Recipe |
| LocalBusiness | LocalBusiness with address + opening hours |

Use Google's Rich Results Test to validate before merging.

## AI Citation Signals (Princeton GEO research summary)

Princeton's "GEO" paper (2023) identified tactics that boost AI search visibility up to 40%. Apply on every key page:

1. **Add credible external citations** — every factual claim should have a source link or footnote
2. **Add quantitative statistics** — real numbers from real sources (not invented)
3. **Add expert quotes** — only if real and attributable; fabricated quotes are a deal-breaker
4. **Structure with question-shaped headings** — `<h2>What is X?` `<h2>How does X work?` `<h2>Is X better than Y?`
5. **Use tables and lists for comparison** — easier to extract than prose
6. **Write a "Key Facts" block** at the top of long pages — bullet list of the 5–7 most important facts

Important: tactic #2 (statistics) is where teams fabricate. Per `safety-guardrails.md`, every statistic needs a source link. If you don't have a real number, omit the line.

## AI Citation Monitoring

After each deploy, log AI engine appearance to `docs/seo/ai-citation-log.jsonl`. The skill's `scripts/ai-citation-monitor.ts` provides the format; entries are typically manual since most engines don't have a public API for this.

For each priority query in `keyword-map.json`, manually query each engine and record:

```json
{"date":"2026-05-10","engine":"perplexity","query":"best AI casting platform for reality TV","mentioned":false,"cited":false,"competitors":["Casting Networks","Backstage"],"notes":"Perplexity returns Casting Networks first; Mythie not in any answer or source list"}
```

Engines to monitor:
- **ChatGPT** (chat.openai.com) — does the brand appear in answers?
- **Perplexity** (perplexity.ai) — is the site cited as a source link?
- **Gemini** (gemini.google.com) — is the brand mentioned?
- **Google AI Overviews** (google.com search) — is content surfaced in the AI Overview block above search results?

Monitoring cadence: weekly. Set in the GitHub Actions cron from `examples/github-actions-cron.yml`.

Trend analysis: when `mentioned` flips from false → true after a content change, flag the change as a winning pattern in `docs/seo/audit-history.jsonl`. Repeat the pattern on adjacent pages.

## llms.txt — be honest

`llms.txt` is a proposed standard (analogous to robots.txt) that lists priority pages and summaries for AI crawlers. Generate one at the site root if asked.

**But:** no major AI provider reliably reads `llms.txt` as of 2026-05-10. Score value: 1 point max. Do not oversell its impact. If you have 3 hours, spend them on the answer block + FAQ + entity clarity work above.

Template at `templates/llms.txt`.

## Anti-patterns (will hurt you)

1. **Keyword stuffing** — repeating "best AI casting platform" in 12 places. Modern AI engines penalize this.
2. **Hidden text or hidden FAQs in accordions** — many crawlers don't expand them.
3. **AI-generated boilerplate "100 best …" listicles** — AI engines now detect and demote these.
4. **Fake testimonials** — beyond the moral problem, AI engines cross-reference and flag inconsistencies.
5. **Schema that doesn't match visible page content** — explicit Google webspam policy violation; can earn manual action.
6. **Identical content across many pages** — programmatic SEO done badly; flagged as thin content.

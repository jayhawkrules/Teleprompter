# Content Quality Rules

Based on Google's people-first content guidelines (2022-onward) and the EEAT framework. These are the rules content must satisfy to score in the Content Quality category of the rubric.

---

## The 4 questions every page must pass

For every public page, get a yes for each:

1. **What is the primary query this page should rank for?**
   - Look it up in `docs/seo/keyword-map.json`
   - If the page isn't mapped, add it before auditing
   - The query must be a real query a real human would type, not a keyword stuffed string

2. **Does the above-the-fold content answer that query directly?**
   - First viewport (above the fold on mobile + desktop) must contain the answer or the path to it
   - "Path to it" means a clear CTA / next-step button when the answer requires interaction

3. **Is there unique value here versus the top 3 search results?**
   - Open the top 3 organic results for the query
   - Identify what this page adds that they don't have (data, perspective, depth, format)
   - If the answer is "nothing" → this page doesn't deserve to rank; either improve or deprioritize

4. **Is there any filler, keyword stuffing, or misleading framing?**
   - Filler: paragraphs that don't add information (intro fluff, outro recap)
   - Keyword stuffing: same phrase repeated unnaturally
   - Misleading framing: title promises something the content doesn't deliver

If any answer is "no," the page fails Content Quality. Fix before opening a PR claiming SEO improvement.

---

## Page purpose clarity

The page's primary purpose must be obvious within 5 seconds. Test:
- Show the page to a friend who doesn't know the product
- Ask "what is this page for?"
- If they hesitate, the page fails

Common failures:
- Hero section that's marketing copy without explaining what the product does
- Blog post intro that takes 4 paragraphs to get to the topic
- Pricing page that hides the price below the fold

---

## Above-the-fold prioritization

Most helpful information must appear prominently above the fold:

- **Marketing pages:** value prop + primary CTA in first viewport
- **Article pages:** the answer or thesis in the first 100 words
- **Product pages:** what it does + price + primary CTA
- **Pricing pages:** the prices themselves, in a table, in the first viewport
- **FAQ pages:** the most-asked question first

Not above the fold:
- Email capture popups
- Cookie banners (use a small bottom bar, not a fold-blocking modal)
- "Subscribe to our newsletter" interstitials
- Unrelated promotional banners

---

## Effort + originality

Google's quality raters look for these signals:

- **Original analysis** — your interpretation, not a regurgitation of competitor takes
- **Practical examples** — concrete cases, not abstractions
- **Direct utility** — the reader can do something with this; it's not just informational
- **Depth proportional to topic complexity** — a "what is X" page can be short; a "how to do X" page must be complete
- **First-hand experience** — "I built this and here's what happened" beats "research suggests"

Pages without these signals are flagged as low-effort, regardless of length.

---

## YMYL (Your Money, Your Life) topics

Stricter standards apply to:
- Financial advice (investments, taxes, insurance)
- Medical advice (treatments, drugs, diagnoses)
- Legal advice (contracts, rights, regulations)
- Employment (salary, hiring, firing)
- News and current events
- Anything affecting health, safety, finances, or wellbeing

For YMYL pages:
- Cite trusted/official/authoritative sources for every claim
- Include author bio with relevant credentials
- Include "Last reviewed" date
- Avoid speculative or definitive claims without source

For Andrew's portfolio, YMYL applies to:
- **Aclamos / awardssubmission** — entry fees, refund policy, judging criteria → financial + employment-adjacent
- **Producing-Hollywood-Invoicing** — invoice content + Stripe disclosures → financial
- **CastHub1** — talent payments, success fees, contracts → financial + employment
- **theproductionshelf** — refund policy, digital download terms → financial

Audit these with extra scrutiny. Per `safety-guardrails.md`, never auto-write copy on these pages.

---

## What is NOT filler (and is allowed)

Some content elements look like filler but add value:

- **Table of contents** on long pages — improves scannability
- **TL;DR / Summary block** — improves AI extraction (per `aeo-geo-patterns.md`)
- **FAQ section** — even if questions seem obvious, they help AI engines and add schema value
- **"Related articles" sidebar** — improves internal linking + reduces bounce
- **Author bio** — adds EEAT signal

The distinguishing test: does removing it hurt the reader's ability to use the page? If yes, it's not filler.

---

## Keyword density target

There is no target. Modern SEO doesn't care about keyword density.

What matters:
- Primary query appears naturally in title, first paragraph, at least one H2
- Synonyms and related terms appear throughout
- The text reads like it was written for a human, not a robot

Keyword stuffing detection (in `score-page.ts`):
- Same exact phrase > 5 times on a page → flag
- Phrase density > 3% of words → flag
- Title and first 100 words > 4 keyword instances → flag

---

## Reading level

Match the audience:
- Consumer pages (theproductionshelf, Mythie marketing) → Grade 8–10
- Professional/B2B pages (RunOfShow, CRM-ai) → Grade 10–12
- Technical docs → Grade 12–14

Tools: Hemingway editor (manual check), `text-readability` npm package (automated in score-page.ts).

---

## Images and media

- Every image has alt text describing the image (not "image" or filename)
- Decorative images: `alt=""` (empty, not missing)
- Charts/data: alt describes the data, or a `<figcaption>` with the same
- Screenshots: alt describes what's shown
- Videos: include a transcript link

Image SEO checks (in `audit-site.ts`):
- All `<img>` tags have alt attribute (warn if missing, error if a content image)
- All images have explicit width/height (CLS prevention)
- Hero images use modern formats (WebP/AVIF) where supported

# Safety Guardrails

The non-negotiable rules. Every PR opened by this skill must satisfy these. Violations are blocked before merge.

This file is the source-of-truth for what auto-edits are permitted vs. what requires human review.

---

## NEVER invent or fabricate

Under no circumstances may any auto-generated content claim:

- **Awards, nominations, shortlists, wins** — Emmy, Webby, ProductHunt #1, etc.
- **Client names** — "Used by Netflix" without explicit, current evidence in the codebase
- **Testimonials or reviews** — quotes attributed to real people
- **Statistics, rankings, survey data** — "94% of users…" requires a real source
- **Certifications** — SOC2, GDPR-ready, HIPAA-compliant — must be true and currently valid
- **Compliance claims** — PCI DSS, ADA, WCAG without audit evidence
- **Partner or integration relationships** — "Integrates with X" — must work in current code
- **Press coverage** — "Featured in TechCrunch" without a real link
- **Product capabilities** — features that aren't actually implemented in the current codebase
- **Pricing or offer terms** — never auto-write pricing copy
- **Medical, financial, or legal advice**
- **Employment, casting, voting, or judging outcomes** — anything affecting user employment, casting status, votes, or judging results

These are absolute. Even if the prompt asks "make this page sound more impressive" or "add some social proof" — the answer is **no**, surface as a 🔧 MANUAL TASK requiring real evidence.

## When evidence is missing

Three valid responses, in order of preference:

1. **Omit the section entirely.** A page with no testimonials is better than one with fake testimonials.

2. **Create a TODO comment** in the code, not a fabricated claim:
   ```html
   <!-- TODO: add testimonials section once 3+ real customer quotes are collected -->
   ```

3. **Add a clearly-marked placeholder** if the section structure is structurally needed:
   ```html
   <section class="testimonials">
     <p><em>Customer testimonials coming soon. <a href="mailto:hi@brand.com">Want to be quoted?</a></em></p>
   </section>
   ```

In all three cases, surface the gap in the PR body under "Human Review Required" with the action needed.

## All of the following MUST be human-approved before merge

The skill flags these and refuses to auto-write copy. The PR body lists each as requiring review:

- Homepage headline / positioning copy
- Pricing page content (any change to a price, plan name, or terms)
- Legal pages (Terms of Service, Privacy Policy, Cookie Policy)
- Compliance pages (DMCA, accessibility statement, GDPR notice)
- Awards page or award submission content (especially `awardssubmission` — entire app's purpose is judging)
- Testimonials, social proof, or "as featured in" sections
- Casting/talent/payment/compliance claims (especially `CastHub1`)
- Any claim involving:
  - Children (COPPA implications)
  - Employment (wrongful claims about hiring, firing, salaries)
  - Medical, mental health, or wellness
  - Financial outcomes ("you'll earn X", "save X%")
  - Regulated industries (legal, medical, financial services, gambling, alcohol)

## PR risk labelling

Every PR opened by this skill gets a risk label. The `create-optimization-pr.ts` script computes it from the change set:

| Risk | Includes |
|---|---|
| **`risk: low`** | Metadata (title, description, canonical), sitemap.xml, robots.txt, schema markup additions, Open Graph image addition, internal link additions, alt text additions |
| **`risk: medium`** | Content rewrites in non-revenue/non-legal pages, FAQ additions, entity description tweaks on About page, blog post metadata, breadcrumb additions |
| **`risk: high`** | Anything touching homepage hero copy, pricing pages, legal pages, awards content, testimonials, product capabilities, claims about credentials/certifications, compliance language |

`risk: high` PRs require explicit human review checkbox in the PR body before they can merge. The skill's PR body template includes this gate.

## Cross-app sensitivity map

Specific apps in the portfolio have specific sensitivities:

| App | Highest-risk content | Why |
|---|---|---|
| **CastHub1 (Mythie)** | Talent payment claims, success fee terms, casting outcome promises | Affects user employment + earnings |
| **awardssubmission (Aclamos)** | Award judging criteria, refund policy, "official" language | Awards content is the entire product; misrepresentation is fraud-adjacent |
| **Producing-Hollywood-Invoicing** | Tax language, invoice terms, payment dispute copy | Financial regulated content |
| **theproductionshelf** | Digital download terms, refund policy, product capabilities | Consumer purchase content |
| **holiday-lights / noelly-app** | Charity payout claims, EveryOrg integration claims, donation tax language | Charity/donation regulatory |
| **toronadoentertainment** | Comparison/competitor pricing claims | Already had a "scrub all unverified competitor pricing" commit (1d5c3b7) — this is a known sensitivity |
| **Tribeca-Film-Festival-2026** | Investor / partnership claims, event capacity claims | Live event commitments |
| **RunOfShow / cuehound** | Reliability claims ("never goes down"), uptime SLAs | Live event reliability is the core promise |

## Cross-skill enforcement

Other skills in the hub enforce parts of this:

- `safe-edit-policy` Step 4: "Do not read secrets" — the SEO skill never reads `.env` files even when looking for `NEXT_PUBLIC_SITE_URL`
- `monetization-readiness-review` Section 6 (Trust signals): assertions of testimonials/social proof must be real
- `vendor-consolidation-policy`: don't fabricate "Integrates with X" claims; verify in package.json or .env.example

## What the skill CAN do without human review

To be clear, here's the safe-by-default list:

✅ Add or fix `<title>` and `<meta description>` (substituting from `keyword-map.json` brand entities)
✅ Add canonical URLs
✅ Add or fix robots.txt
✅ Add or update sitemap.xml
✅ Add Organization, WebSite, BreadcrumbList JSON-LD on homepage
✅ Add Article schema on blog posts
✅ Add `og:image` reference (using existing image; don't generate)
✅ Add Twitter card metadata
✅ Fix broken internal links
✅ Add alt text to images (descriptive, factual)
✅ Add FAQ schema markup AROUND existing visible Q&A content (not invent the Q&A)

## What the skill MUST defer to human

❌ Write FAQ Q&A content from scratch
❌ Write hero copy
❌ Write pricing copy
❌ Add testimonials
❌ Add "Featured in" / "Trusted by" sections
❌ Add award badges
❌ Write meta descriptions for revenue/legal pages (suggest only)
❌ Generate OG image content (file additions OK, but generated images need eyeballs)

## When in doubt

Surface as a 🔧 MANUAL TASK with the specific question for Andrew. The cost of asking is low. The cost of fabricated content on a portfolio site is reputation damage that takes years to repair.

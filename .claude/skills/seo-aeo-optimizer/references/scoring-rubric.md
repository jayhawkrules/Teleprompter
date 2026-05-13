# SEO/AEO/GEO Scoring Rubric — 100 points

Deterministic. Same inputs → same score. The skill's `scripts/score-page.ts` implements this verbatim.

**Targets:** ≥ 95 to open PR. ≥ 99 to be considered "best in class."

---

## Technical SEO — 25 points

| Pts | Check | Pass criteria |
|---|---|---|
| 4 | Unique title tag per indexable page | `<title>` exists, 50–60 chars, no duplicates across pages, includes primary keyword |
| 3 | Unique meta description per indexable page | `<meta name="description">` exists, 150–160 chars, no duplicates |
| 3 | Canonical URL correct and absolute | `<link rel="canonical">` exists, absolute URL (https://), matches current page URL, no self-referencing loop |
| 3 | robots.txt exists, valid, no accidental noindex on public routes | `/robots.txt` returns 200, parses, public routes are allowed, sitemap URL listed |
| 3 | sitemap.xml exists, valid XML, lists only canonical indexable URLs with lastmod | `/sitemap.xml` returns 200, content-type `application/xml`, all URLs absolute + return 200, has `<lastmod>` |
| 3 | Structured data (JSON-LD) exists and validates on all key pages | At least one `<script type="application/ld+json">` per key page, valid JSON, schema.org types appropriate to page |
| 3 | Internal links expose priority pages from homepage/nav | Homepage links to all priority pages from `keyword-map.json`, no orphans |
| 3 | Open Graph + Twitter card metadata on all public routes | `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` all present |

## Performance (Core Web Vitals) — 15 points

| Pts | Metric | Threshold |
|---|---|---|
| 5 | LCP (Largest Contentful Paint) | ≤ 2.5s = 5 pts \| ≤ 4.0s = 3 pts \| > 4.0s = 0 pts |
| 5 | INP (Interaction to Next Paint) | ≤ 200ms = 5 pts \| ≤ 500ms = 3 pts \| > 500ms = 0 pts |
| 5 | CLS (Cumulative Layout Shift) | ≤ 0.1 = 5 pts \| ≤ 0.25 = 3 pts \| > 0.25 = 0 pts |

Source: Lighthouse CI run via `scripts/lighthouse-ci.ts`.

## AEO/GEO (AI Search Visibility) — 25 points

| Pts | Check | Pass criteria |
|---|---|---|
| 4 | Direct answer summary near top of key pages | First 100 visible words contain a 40–80 word summary that answers the page's primary query |
| 4 | Clear entity definitions | Brand name, product name, audience, differentiator named explicitly within the first viewport |
| 4 | FAQ or Q&A blocks with FAQ schema markup | At least 3 Q&A pairs visible AND FAQPage JSON-LD schema present |
| 4 | Credible external citations where factual claims require evidence | Every quantitative or claim-of-fact has a source link or footnote (no orphan stats) |
| 3 | Original insights / unique value beyond competitor content | Manual flag during audit; passes if page contains content not present on top-3 competitor pages |
| 3 | Extraction-friendly formatting | Pages use lists, tables, numbered steps, or definition blocks (not pure prose) |
| 3 | Brand/product facts consistent across all pages | Same brand description, founding year, audience, category on every page they appear |

## Content Quality — 15 points

Per Google's people-first guidelines (`references/content-quality-rules.md`).

| Pts | Check | Pass criteria |
|---|---|---|
| 4 | Search intent matched | Page answers the primary query from `keyword-map.json` for this URL |
| 3 | Clear page purpose | A first-time visitor understands the page's purpose within 5 seconds (manual or LCP-region keyword check) |
| 3 | Most helpful information appears prominently above the fold | Primary value prop, primary CTA, or primary answer is in the first viewport |
| 3 | Unique value versus top 3 competitors | Manual flag; passes if not a near-rewrite of competitor content |
| 2 | No filler, fluff, misleading claims, or keyword stuffing | Reading-level reasonable; no keyword density spikes; no unsupported superlatives |

## Automation & Safety — 20 points

| Pts | Check | Pass criteria |
|---|---|---|
| 5 | Audit produces machine-readable JSON output | `audit-site.ts` writes `docs/seo/audit-history.jsonl` |
| 5 | All validators pass before PR is opened | `validate:metadata`, `validate:schema`, `validate:sitemap`, `validate:robots` all exit 0 |
| 4 | PR includes before/after score, changes summary, risk flags | `templates/pr-body.md` populated, risk label set |
| 3 | Human review required for all sensitive content | `safety-guardrails.md` categories flagged in PR body |
| 3 | Audit history stored for trend analysis and learning | `docs/seo/audit-history.jsonl` appended each run |

---

## Score thresholds

- **0–69:** Major SEO gaps. Block any launch. Multi-PR remediation needed.
- **70–84:** Functional but underperforming. PR allowed only after surfacing P0 fixes.
- **85–94:** Healthy. PR allowed; flag remaining P1/P2 items.
- **95–98:** Strong. PR opened; trend monitor for regressions.
- **99–100:** Best in class. Continue Lighthouse + audit-history monitoring; no fixes required.

## Per-category weighting rationale

- Technical SEO (25) — fastest wins, highest leverage, deterministic
- AEO/GEO (25) — equal weight because AI search citation is now a co-equal traffic source for many topics
- Automation/Safety (20) — process matters as much as output for a portfolio of 23 apps
- Performance (15) — important but Lighthouse already gives a separate score; don't double-count
- Content Quality (15) — partially subjective, hardest to measure deterministically

## Determinism guarantee

The same audit input on the same code tree must produce the same scores across runs. Anything subjective (e.g., "unique value vs competitors") gets a binary flag during audit, set once per content version and cached in `docs/seo/page-scores.json`. Re-flag only when content changes.

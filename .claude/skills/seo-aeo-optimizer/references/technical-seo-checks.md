# Technical SEO Checks

The deterministic per-page audit checklist. Each check has: rule, pass criteria, validator script, fix pattern.

---

## Title

| Field | Value |
|---|---|
| Rule | `<title>` exists, unique, 50–60 chars, includes primary keyword |
| Validator | `scripts/validate-metadata.ts` |
| Fix pattern (Stack A/B) | Update page metadata; for Next.js App Router, edit `metadata` export in `page.tsx` |
| Fix pattern (Stack C) | Edit `<title>` in HTML head |
| Common failures | Duplicate across pages, "Untitled", template placeholder, > 60 chars truncated in SERP |

## Meta description

| Field | Value |
|---|---|
| Rule | `<meta name="description">` exists, unique, 150–160 chars, includes CTA, not duplicate of title |
| Validator | `scripts/validate-metadata.ts` |
| Fix pattern | Update via metadata export (Next.js) or `<head>` (Stack C) |
| Common failures | Missing entirely, copy-pasted across pages, > 160 chars truncated |

## Canonical URL

| Field | Value |
|---|---|
| Rule | `<link rel="canonical" href="…">` exists, absolute URL (https://), matches current page URL, no self-referencing loop |
| Validator | `scripts/validate-metadata.ts` |
| Fix pattern (Next.js App Router) | `metadata.alternates.canonical = absoluteUrl(pathname)` |
| Fix pattern (Stack C) | Static `<link rel="canonical">` in HTML head |
| Common failures | Relative URL, points to staging domain, points to a different page (canonical loop) |

## Robots.txt

| Field | Value |
|---|---|
| Rule | `/robots.txt` returns 200; public routes allowed; private/admin/api routes blocked; sitemap URL referenced |
| Validator | `scripts/validate-robots.ts` |
| Fix pattern (Next.js App Router) | `app/robots.ts` returning `MetadataRoute.Robots` |
| Fix pattern (Stack A) | `public/robots.txt` static file |
| Fix pattern (Stack C) | Static `robots.txt` at site root |
| Common failures | `Disallow: /` in production (left over from staging), missing sitemap reference, blocking `/api` patterns that include public-facing API |

Required minimum content (substitute domain):
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/private
Disallow: /_next
Sitemap: https://yourdomain.com/sitemap.xml
```

## Sitemap.xml

| Field | Value |
|---|---|
| Rule | `/sitemap.xml` returns 200; content-type `application/xml`; all URLs absolute; no 404s, redirects, or private URLs; submitted to Google Search Console |
| Validator | `scripts/validate-sitemap.ts` |
| Fix pattern (Next.js App Router) | `app/sitemap.ts` returning `MetadataRoute.Sitemap` array |
| Fix pattern (Stack A) | Vite plugin or build-time generator |
| Fix pattern (Stack C) | Hand-maintained or build-time script |
| Common failures | Wrong content-type, 30x redirects in URLs, includes admin paths, missing `<lastmod>`, missing protocol on URLs |

## Open Graph

Required tags on every public page:

```html
<meta property="og:title"        content="...">
<meta property="og:description"  content="...">
<meta property="og:image"        content="https://.../og-image.png">
<meta property="og:url"          content="https://.../page-path">
<meta property="og:type"         content="website|article|product">
```

Image requirements:
- 1200×630px recommended
- Absolute URL (CDN-served preferable)
- File size < 5MB
- File type: PNG, JPG, or WebP

## Twitter card

```html
<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:title"       content="...">
<meta name="twitter:description" content="...">
<meta name="twitter:image"       content="https://.../og-image.png">
```

## Structured data (JSON-LD)

| Field | Value |
|---|---|
| Format | JSON-LD inside `<script type="application/ld+json">` |
| Validator | `scripts/validate-schema.ts` |
| Required by page type | See `aeo-geo-patterns.md` "Structured Data Priority by Page Type" |
| Common failures | Invalid JSON, schema content doesn't match visible content (phantom claims), wrong @type, missing required fields |

## Internal links

| Field | Value |
|---|---|
| Rule | Homepage links to all priority pages; priority pages link to each other; no orphan pages |
| Validator | `scripts/audit-site.ts` includes link graph |
| Common failures | Pricing page only reachable via footer, blog index missing from main nav, blog posts orphaned (no in-text links to/from sister posts) |

## Broken links

| Field | Value |
|---|---|
| Rule | All internal `href`s return 200; no 404 internal links |
| Validator | `scripts/audit-site.ts` |
| Tool | `linkinator` (npm) — same tool used in `qa-hardening` Stack C |
| Common failures | Stale links to renamed routes; query strings that no longer parse |

## Status codes

| Field | Value |
|---|---|
| Rule | No soft 404s (page returns 200 with "not found" content); redirect chains > 1 hop flagged |
| Validator | `scripts/audit-site.ts` |

## Indexability

| Field | Value |
|---|---|
| Rule | No `noindex` on pages that should be indexed; all canonical pages in sitemap; no `noindex` in HTTP headers |
| Validator | `scripts/validate-metadata.ts` |
| Common failures | Staging-mode `noindex` left in production, `noindex` from a CMS plugin's default |

## Search engine verification

Required before a site can be claimed in Google Search Console (GSC), Bing Webmaster Tools, or Yandex Webmaster. Without verification you cannot submit sitemaps, see indexing errors, request reindexing, or read AI-overview / SERP performance data.

| Field | Value |
|---|---|
| Rule | At least Google + Bing verification present on the homepage `<head>` OR the corresponding HTML file uploaded to `/public/` |
| Validator | `scripts/validate-metadata.ts` (checks for `google-site-verification` and `msvalidate.01` meta tags or known verification files) |
| Common failures | Verification meta on staging only, verification code regenerated and old one left in place, missing entirely (site never claimed) |

Required meta tags (place in homepage `<head>`; one per service):

```html
<!-- Google Search Console -->
<meta name="google-site-verification" content="REPLACE_WITH_GSC_TOKEN" />

<!-- Bing Webmaster Tools (also serves ChatGPT Search and Copilot) -->
<meta name="msvalidate.01" content="REPLACE_WITH_BING_TOKEN" />

<!-- Yandex (optional, only if you have non-trivial Russian-speaking traffic) -->
<meta name="yandex-verification" content="REPLACE_WITH_YANDEX_TOKEN" />

<!-- Pinterest domain claim (only if Pinterest is a real channel for the brand) -->
<meta name="p:domain_verify" content="REPLACE_WITH_PINTEREST_TOKEN" />
```

Alternative: HTML file upload at site root — `/google[token].html`, `/BingSiteAuth.xml`. Either approach is valid; the skill prefers meta tags because they survive `/public/` cleanups.

**Why Bing matters even if you don't care about Bing:** ChatGPT Search and Microsoft Copilot both source their web index from Bing. Bing verification is the cheapest path to AEO-grade visibility on those two surfaces.

**Stack-conditional fix patterns:**

- Stack A (Vite/React + Firebase Hosting): add to `index.html` `<head>`; will be served on every route via the SPA shell.
- Stack B (Next.js App Router): use the `verification` field in the root `metadata` export:
  ```ts
  export const metadata = {
    verification: {
      google: 'REPLACE_WITH_GSC_TOKEN',
      other: { 'msvalidate.01': 'REPLACE_WITH_BING_TOKEN' },
    },
  };
  ```
- Stack C (HTML/static): add to the homepage `<head>` directly.
- Stack D (WordPress): use the SEO plugin's verification panel (Yoast → Webmaster Tools, RankMath → Analytics).

**Tokens are NOT secrets.** They are public — anyone visiting the page can see them. Do not put them in `.env` or GitHub Secrets. Commit the literal token value.

**Verification token sourcing — flag for human:** the skill must NEVER invent a token. If the user has not provided GSC/Bing tokens, the skill places a `REPLACE_WITH_*_TOKEN` placeholder and surfaces a manual task per `safe-edit-policy` Step 9 ("Get tokens at search.google.com/search-console + bing.com/webmasters and replace placeholders").

---

## Stack-conditional notes

**Stack A (Vite/Firebase):** SPA rendering — Googlebot now executes JS, but for AEO/social-card scrapers (Facebook, X, Slack) that don't, use prerendering or SSR for key pages. Capacitor builds: same metadata applies, even though the user navigates a WebView.

**Stack B (Next.js):** Use the Metadata API (App Router) or `next/head` (Pages Router). Server-rendered, so all the above is straightforward.

**Stack C (HTML/static):** Static `<head>`. Easiest to validate; hardest to maintain consistency across many pages — keep partials/templates aligned.

**Stack D (PHP/WordPress):** Yoast or RankMath plugins handle most of this. Skill audits the rendered output; doesn't auto-edit PHP.

**Stack E (cron/automation):** N/A.

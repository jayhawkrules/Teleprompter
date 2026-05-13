---
name: seo-aeo-optimizer
description: Use when the user asks to "improve SEO", "improve AI search visibility", "get cited by ChatGPT or Perplexity or Gemini or Google AI", "add schema markup", "fix metadata", "create sitemap", "fix robots.txt", "audit SEO", "run SEO cron", "build autonomous SEO", "optimize for AEO", "optimize for GEO", "add structured data", "check Core Web Vitals", or "generate SEO PR". Autonomously audits, scores, fixes, validates, and opens PRs to improve traditional SEO and AI search citation across the portfolio. Stack-conditional (A/B/C/D/E). Keywords: SEO, AEO, GEO, AI search, ChatGPT citation, Perplexity, Gemini, Google AI Overviews, schema, JSON-LD, sitemap, robots, metadata, OpenGraph, Core Web Vitals, Lighthouse, structured data.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, WebFetch]
---

# SEO / AEO / GEO Optimizer

Autonomous SEO + AI-search-visibility engine. Runs audit → score → fix → validate → PR → learn loop across any portfolio repo. Defaults to safe edits; never invents data; always opens a PR rather than committing to main.

> **Always load `safe-edit-policy` first.** This skill creates many files and opens PRs — without the safety contract loaded, edits land in unexpected places and fake-completion claims slip in.

## When to use

- "Improve SEO" / "audit SEO" / "fix metadata" on any repo with a public URL
- "Get cited by ChatGPT / Perplexity / Gemini / Google AI Overviews" — AEO/GEO work
- Adding structured data (JSON-LD), sitemap, robots, OG tags
- Pre-launch SEO readiness check (paired with `LAUNCH_READINESS_CHECKLIST` template)
- Weekly cron: weekly subprocess run by the GitHub Actions workflow this skill provides

## When NOT to use

- Internal-only apps (admin tools, backups, automation) — no public surface to optimize
- Stack F (empty/placeholder) — nothing to audit
- Apps still pre-MVP — the user journey isn't built yet; SEO investment is premature

## Stack support (per `safe-edit-policy` Step 2)

| Stack | Coverage |
|---|---|
| **A** (React/Vite/Firebase) | Full — Vite SPA + Firebase Hosting headers, react-helmet-async or similar, sitemap via plugin, robots in public/ |
| **B** (Next.js / Hono / Express) | Full — Next.js App Router metadata API + sitemap.ts + robots.ts; Pages Router via _app/Head; Express via response middleware |
| **C** (HTML/static) | Full — direct `<head>` edits, static sitemap/robots, Lighthouse-CI gating |
| **D** (PHP/WordPress) | Adapted — WordPress already provides most SEO via plugins (Yoast, RankMath); skill audits but doesn't auto-fix PHP code |
| **E** (cron-driven JS) | N/A — no public surface |

Detect stack first. Do NOT apply A/B fixes to C/D/E (will break the build).

## Default workflow (run in order, do not skip)

1. **Detect stack** (A/B/C/D/E) per `safe-edit-policy` Step 2
2. **Detect package manager** — `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `package-lock.json` or default → npm
3. **Discover routes** — read `app/`, `pages/`, `public/sitemap.xml`, or scrape from a built URL
4. **Run technical SEO audit** per `references/technical-seo-checks.md` — includes search-engine verification (GSC + Bing) check
5. **Run AEO/GEO audit** per `references/aeo-geo-patterns.md`
6. **Audit GitHub repo metadata** per `references/github-repo-optimization.md` (public repos only — description, topics, README structure, CNAME)
7. **Score each page** with the 100-point rubric in `references/scoring-rubric.md` → write to `docs/seo/page-scores.json`
8. **Generate safe fixes** (per `references/safety-guardrails.md`)
9. **Run all validators**: `npm run seo:validate` (or pnpm/yarn equivalent — script auto-detects)
10. **Run Lighthouse CI**: `npm run seo:lighthouse`
11. **Open PR** with before/after score report using `templates/pr-body.md` — repo description/topics changes go in the "Manual Tasks" section, never auto-applied
12. **Append to `docs/seo/audit-history.jsonl`** for trend analysis

End every run with the SESSION SUMMARY block per `safe-edit-policy` Step 11.

## Package-manager-aware npm scripts

Add these to the target app's `package.json`. The script entries below assume `npx tsx`; if the app uses pnpm, replace with `pnpm exec tsx`; if yarn, `yarn tsx`. The skill's setup step adds the right variant based on detected pm.

```json
{
  "scripts": {
    "seo:audit": "npx tsx ~/.claude/skills/seo-aeo-optimizer/scripts/audit-site.ts",
    "seo:score": "npx tsx ~/.claude/skills/seo-aeo-optimizer/scripts/score-page.ts",
    "seo:validate": "npm run seo:validate:metadata && npm run seo:validate:schema && npm run seo:validate:sitemap && npm run seo:validate:robots",
    "seo:validate:metadata": "npx tsx ~/.claude/skills/seo-aeo-optimizer/scripts/validate-metadata.ts",
    "seo:validate:schema": "npx tsx ~/.claude/skills/seo-aeo-optimizer/scripts/validate-schema.ts",
    "seo:validate:sitemap": "npx tsx ~/.claude/skills/seo-aeo-optimizer/scripts/validate-sitemap.ts",
    "seo:validate:robots": "npx tsx ~/.claude/skills/seo-aeo-optimizer/scripts/validate-robots.ts",
    "seo:lighthouse": "lhci autorun",
    "seo:pr": "npx tsx ~/.claude/skills/seo-aeo-optimizer/scripts/create-optimization-pr.ts",
    "seo:monitor": "npx tsx ~/.claude/skills/seo-aeo-optimizer/scripts/ai-citation-monitor.ts"
  }
}
```

## Non-negotiable rules

- **Validate everything before PR.** Metadata, canonicals, robots, sitemap, schema, Lighthouse — all must pass before `seo:pr` runs. Validators exit code 1 on failure.
- **Never invent data.** No fake statistics, testimonials, awards, rankings, certifications, partnerships, press mentions, capabilities, pricing, or claims. See `references/safety-guardrails.md` for the full prohibited list.
- **Flag for human review** all product claims, legal copy, awards, pricing, compliance content. The PR body has a "Human Review Required" section.
- **Never commit directly to main.** Always feature branch + PR. (This contradicts a draft of the original prompt — `safe-edit-policy` rule wins.)
- **Per `vendor-consolidation-policy`:** Lighthouse CI is in the house stack (open source, free, runs in CI). Don't propose alternatives without the 6-step gate.
- **Deterministic output preferred over Claude prose.** The same audit on the same code must produce the same scores.

## Stack detection logic

Auto-detect before running any audit:

```bash
[ -d "app" ] && grep -rq "page.tsx" app/ 2>/dev/null && echo "Next.js App Router (Stack B)"
[ -d "pages" ] && [ -f "pages/_app.tsx" -o -f "pages/_app.js" ] && echo "Next.js Pages Router (Stack B)"
[ -f "firebase.json" ] && [ -d "src" ] && grep -rq "react" package.json 2>/dev/null && echo "Vite/React + Firebase (Stack A)"
[ -f "firebase.json" ] && [ -d "functions" ] && echo "Firebase Hosting + Functions (Stack A or B)"
[ -f "index.html" ] && [ ! -f "package.json" ] && echo "Static HTML (Stack C)"
[ -f "composer.json" ] || ls wp-config.php 2>/dev/null && echo "PHP/WordPress (Stack D)"
```

Then load the corresponding implementation reference:
- Stack A → `references/firebase-implementation.md` (Vite + Firebase Hosting headers section)
- Stack B → `references/nextjs-implementation.md`
- Stack C → `references/technical-seo-checks.md` (HTML-only section)
- Stack D → manual; flag for WordPress plugin review (out of scope for auto-fix)

## Output files (created in target app repo)

- `docs/seo/page-scores.json` — current scores per page
- `docs/seo/audit-history.jsonl` — one JSON line per run (for trend analysis)
- `docs/seo/ai-citation-log.jsonl` — AI engine citation tracking (manual entries supported)
- `docs/seo/keyword-map.json` — brand entities + priority queries (manually curated, used by audit)
- `docs/seo/seo-roadmap.md` — generated next-action recommendations
- `docs/seo/lighthouse-results.json` — last Lighthouse CI run

## Reference files (load as needed)

- `references/scoring-rubric.md` — full 100-point rubric (5 categories)
- `references/technical-seo-checks.md` — title/meta/canonical/sitemap/robots/OG/Twitter rules + GSC/Bing verification meta tags
- `references/aeo-geo-patterns.md` — AI-citation patterns (answer block, FAQ, entity, schema priority by page type)
- `references/github-repo-optimization.md` — repo description, topics, README structure, CNAME (public repos only; description/topics surface as manual tasks)
- `references/nextjs-implementation.md` — App Router + Pages Router + dynamic sitemap + JsonLd component
- `references/firebase-implementation.md` — Hosting headers + scheduled function for cron + BullMQ integration
- `references/content-quality-rules.md` — Google's people-first guidelines
- `references/safety-guardrails.md` — prohibited claims + human-review categories + PR risk labelling

## Sibling skills (referenced)

- `safe-edit-policy` — foundation (load first)
- `ci-gate-builder` — generates the GitHub Actions YAML; this skill provides an SEO-specific cron variant
- `vendor-consolidation-policy` — Lighthouse CI is in the house stack; don't propose alternatives without the gate
- `analytics-event-map` — `seo_event` taxonomy (page_view, sitemap_indexed, etc.)
- `monetization-readiness-review` — for revenue-bearing pages, SEO score ≥ 95 is part of the launch gate
- `production-error-to-regression` — failed validations become regression tests

## Common mistakes

1. **Auto-fixing copy on revenue/legal/awards pages** — never. Those go in the "Human Review Required" PR section.
2. **Skipping the validators "because the change is small"** — the contract is: every PR opened by this skill has been validated. No exceptions.
3. **Invented "Awards" or "Featured in" sections** — explicitly prohibited per `safety-guardrails.md`. If evidence is missing, leave the section out.
4. **Treating sitemap as static** — if routes change, regenerate. Stale sitemaps deindex pages.
5. **Using Sentry to monitor SEO regressions** — wrong tool. Use Lighthouse CI assertions and the audit-history.jsonl for trend tracking.
6. **Adding llms.txt and expecting magic** — no major AI provider reliably reads it yet. Worth ~1 point. Don't oversell it.

## Source of truth in this portfolio

- This skill is the canonical SEO/AEO/GEO contract for all 23 portfolio repos.
- Implementation references live in `references/` (one per stack).
- Templates apps copy: `templates/lighthouserc.json`, `templates/pr-body.md`, `templates/llms.txt`, `templates/page-brief.md`.
- Scripts live in `scripts/` and are referenced via `~/.claude/skills/seo-aeo-optimizer/scripts/...` from the target app's package.json.
- For Stack A reference, the canonical implementation will be CastHub1 (Mythie's mythie.app SEO) — apply this skill there first per `PORTFOLIO_ROLLOUT_PLAN.md`.
- For Stack B reference: awardssubmission (Aclamos has heaviest SEO need — entry fees + filmmaker discovery).
- For Stack C reference: theproductionshelf (digital products + outbound conversion to Payhip — currently funnel-blind per `PORTFOLIO_ADOPTION_STATUS.md`).

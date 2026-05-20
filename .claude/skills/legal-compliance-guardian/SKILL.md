---
name: legal-compliance-guardian
description: Twice-monthly audit of all portfolio-site legal language (Privacy Policy, Terms of Service, Cookie Policy, Refund Policy, Acceptable Use, DMCA). Detects stale dates, missing required clauses, undisclosed vendors, regulatory drift (UK GDPR, EU GDPR, DPA 2018, DUAA 2025, CCPA/CPRA, US state privacy laws, FTC Click-to-Cancel). Governs annual legal email campaign, pre-send deep dive, materiality decisions, consent popup trigger rules, and jurisdiction-coverage-gap detection (new user from uncovered country sparks a cron). Never edits a live legal document without explicit confirmation. Keywords: privacy policy, terms of service, GDPR, UK GDPR, EU GDPR, CCPA, CPRA, DUAA, ICO, cookie consent, PECR, legal audit, consent popup, re-accept terms, annual email, clickwrap, materiality, acceptance log, legal drift, refund policy, DMCA, jurisdiction coverage, Toronado Entertainment.
version: 1.0.0
last_reviewed: 2026-05-11
expires: 2026-11-11
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Grep, Glob, Bash, Write]
trigger_cadence:
  - 1st_and_15th_each_month
  - before_any_new_feature_launch
  - before_any_pricing_model_change
  - when_new_vendor_added
  - 45_days_before_annual_email_send
  - on_jurisdiction_coverage_gap_event
  - on_demand_via_portfolio_health_audit
---

# Legal Compliance Guardian

> **Hard rule — read first:** This skill NEVER edits a live legal document. It produces a drift audit report and queues 🔧 manual tasks per `safe-edit-policy`. Legal documents affect user rights and can be enforced in court — every proposed change requires Andrew's explicit sign-off and, where flagged, qualified solicitor review.

Self-healing legal compliance system for the Andrew Ward portfolio. Legal controller of record is **Toronado Entertainment, LLC** (USA) for all apps except the Producing Hollywood site, which is owned by **Producing Hollywood**. Primary user base is United States; primary secondary market is the United Kingdom; users are accepted worldwide, so UK GDPR / EU GDPR is the dominant compliance regime.

Always load `safe-edit-policy` first. Composes with `portfolio-health-audit`, `monetization-readiness-review`, `analytics-event-map`, `vendor-consolidation-policy`, `payment-webhook-safety`, and `skill-auto-heal`.

## When to use

- 1st and 15th of each month — scheduled twice-monthly drift audit (Lane A)
- Before any new feature launch that adds data collection or vendor
- Before any pricing-model change (billing, subscription, refund)
- When a new vendor is added (Privacy Policy disclosure check)
- 45 days before annual legal email send (pre-send deep dive)
- When a user signs up from a jurisdiction not listed in `legal-inventory.json#jurisdictions` (coverage-gap audit)
- On demand from `portfolio-health-audit`

## When NOT to use

- Mid-feature code work inside a single repo
- As a substitute for qualified legal advice — this skill flags risk; counsel signs off material changes
- For internal-only tools with no users

## The three lanes

### Lane A — Legal Document Drift Audit
Load `references/legal-document-checklists.md` and `references/jurisdiction-watchlist.md`. For each portfolio app, fetch the live `/privacy`, `/terms`, `/cookies`, `/refund-policy` (if present) and validate against the checklists and jurisdiction rules. Cross-check the live page against `legal-inventory.json` for vendor accuracy.

### Lane B — Materiality Decision
Load `references/materiality-matrix.md`. For any pending change, classify it Tier 1 / Tier 2 / Tier 3 and produce the corresponding notice plan (email vs banner vs forced clickwrap). Tier 3 requires the popup template and the immutable acceptance log.

### Lane C — Annual Email / Notice Campaign
Load `templates/annual-legal-update-email.md` and the 45-day pre-send checklist. One annual email per app per year, gated on a clean Lane A audit.

## Portfolio site list

| App | Repo name | Legal owner of record | Public legal pages |
|---|---|---|---|
| Mythie / CastHub | `CastHub1` | Toronado Entertainment, LLC | /privacy, /terms, /cookies |
| BacklotHub | `BacklotHub` | Toronado Entertainment, LLC _(beneficial: Andrew Ward)_ | /privacy, /terms, /cookies |
| CueHound | `RunOfShow` | Toronado Entertainment, LLC | /privacy, /terms |
| Aclamos (incl. Ballotis feature) | `awardssubmission` | Toronado Entertainment, LLC | /privacy, /terms, /cookies, /contest-rules-template |
| Ballotis _(future standalone spin-out)_ | _to be split from `awardssubmission`_ | Toronado Entertainment, LLC | _separate inventory at spin-out_ |
| The Production Shelf | `theproductionshelf` | Toronado Entertainment, LLC _(beneficial: Andrew Ward)_ | /privacy, /terms, /refund-policy, /cookies |
| ARTAS | `artas-wordpress-backup` _(canonical legal source; sister repos `artas-redesign-preview`, `artas-blog-automation`)_ | Toronado Entertainment, LLC | /privacy, /terms, /contest-rules |
| CRM-Ai | `CRM-ai` | Toronado Entertainment, LLC | /privacy, /terms, /cookies _(MUST be disclosed as subprocessor in source apps that feed it)_ |
| Noelly | `holiday-lights` | Toronado Entertainment, LLC | /privacy, /terms (v0 scaffold pending — see `references/portfolio-app-risk-map.md`) |
| Teleprompter App | `Teleprompter` | Toronado Entertainment, LLC _(beneficial: Andrew Ward)_ | /privacy, /terms, /cookies |
| Producing Hollywood | `ProducingHollywood` | Producing Hollywood | /privacy, /terms |

URLs in each per-app `legal-inventory.json` (path field).

## Output format

Every audit run produces a `templates/legal-audit-report.md` instance with:
- RED / YELLOW / GREEN table per site per document
- Top 5 findings (ranked by risk × user impact)
- Pending materiality decisions
- Manual task queue (🔧 blocks per `safe-edit-policy`)

## Hard rules

1. Never edit a live legal document without explicit Andrew sign-off.
2. Never bundle Terms acceptance and cookie consent into one popup.
3. Tier 3 material changes ALWAYS require forced clickwrap; email-only is insufficient (Sifuentes v. Dropbox, N.D. Cal.).
4. Always log acceptance to two places: `users/{uid}` AND immutable `legalAcceptanceEvents`.
5. Default new cookies OFF until user opts in; never fire non-essential cookies before consent.
6. A jurisdiction-coverage gap is a RED finding and pauses any planned annual email for that app until resolved.
7. Anything that touches arbitration, class-action waiver, governing law, age eligibility, or AI-decisioning is automatically Tier 3 and flagged for solicitor review before publish.
8. Apps slated for future B2B / multi-tenant use must be drafted with tenant data separation and DPA language from day one — do not retrofit. If real customer data from other portfolio apps flows in (e.g. CRM-Ai today), the receiving app is a live subprocessor and must be disclosed in every source app's Privacy Policy now, not at "phase 2".

## Composition

- `safe-edit-policy` — foundation contract, manual-task format
- `portfolio-health-audit` — pulls Lane A status into Monday rollup
- `analytics-event-map` — owns the `terms_accepted` event taxonomy
- `monetization-readiness-review` — pairs with Tier 3 billing-change check
- `vendor-consolidation-policy` — vendor list cross-check for Privacy Policy
- `skill-auto-heal` — audits this skill's own freshness monthly

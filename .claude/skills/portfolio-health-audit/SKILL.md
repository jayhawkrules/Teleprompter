---
name: portfolio-health-audit
description: Use to roll up the entire portfolio's state into a single ranked status table. Cross-repo audit — distinct from per-repo `repo-health-audit`. Outputs a "make money while sleeping" checklist per repo and a portfolio-wide priority queue. Run weekly (Mondays per the operating rhythm) or before any launch decision. Keywords: portfolio audit, health, status table, priority, money while sleeping, weekly review, rollup, portfolio dashboard.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Portfolio Health Audit

The cross-repo audit. Per-repo audits (`repo-health-audit`) are for going deep on one app. This skill gives the portfolio-wide view: where is risk, where is value, where is the next hour of work best spent.

Always load `safe-edit-policy` first.

## When to use

- Mondays — start of the operating rhythm
- Before any cross-portfolio decision (which app to invest in next)
- Quarterly to update `PORTFOLIO_ADOPTION_STATUS.md`
- After cloning new repos or archiving old ones

## When NOT to use

- Mid-sprint inside one repo — too high-altitude, will distract
- Per-repo deep dive — use `repo-health-audit` instead

## Step 1 — Inventory all repos under `~/GitHub/`

```bash
ls -d ~/GitHub/*/ | sed 's|^.*/||;s|/$||' | sort
```

For each, classify per `safe-edit-policy` Step 2 (Stack A/B/C/D/E/F).

## Step 2 — Per-repo data collection

Run the bulk inspection script (the same one used in Phase 1 of the hub upgrade). For each repo capture:

| Field | How |
|---|---|
| Stack class | Detection |
| Last push date | `git log -1 --format=%cs` |
| Has CLAUDE.md | `[ -f CLAUDE.md ]` |
| Has CI | `[ -d .github/workflows ]` |
| Has tests/ | `find . -maxdepth 3 -type d -name tests -o -name __tests__ -o -name e2e` |
| Vendors in `.env.example` | `grep -oE '^[A-Z_]+_(KEY|SECRET|TOKEN)' .env.example` |
| Open Sentry alerts | (manual — Sentry dashboard) |
| Stripe revenue last 30d | (manual — Stripe dashboard) |
| `MANUAL_TASKS.md` size | `wc -l MANUAL_TASKS.md` |

## Step 3 — Score each repo on 6 axes

| Axis | Scale | Weight |
|---|---|---|
| **Revenue potential** | 1 (hobby) → 5 (live revenue) | High |
| **Launch readiness** | 1 (pre-MVP) → 5 (live with paying users) | High |
| **User risk** | 1 (no users) → 5 (many users, real consequences) | High |
| **Missing CI** | 0 (has CI) / 1 (no CI) | Medium |
| **Missing tests** | 0 (has tests) / 1 (no tests) | Medium |
| **Missing monetization plumbing** | 0 (revenue path complete) / 1 (gaps) | Conditional on revenue potential |

**Composite priority:**
- **P0** (this week): revenue potential ≥4 AND (user risk ≥4 OR missing-monetization ≥1)
- **P1** (this month): launch readiness ≥3 AND missing CI/tests
- **P2** (this quarter): everything else with revenue potential ≥2
- **DEFER**: revenue potential ≤1 AND last push >90 days
- **ARCHIVE**: empty or unmaintained for >180 days, with no clear plan

## Step 4 — "Money while sleeping" per-repo checklist

For each revenue-bearing repo (potential ≥3), assess:

```
MONEY-WHILE-SLEEPING CHECKLIST — [repo]

PURCHASE PATH
 - [ ] Checkout works end-to-end in test mode (last verified: [date])
 - [ ] Webhook handler is idempotent and signature-verified
 - [ ] Entitlement is granted within 10 sec of payment
 - [ ] Confirmation email is sent (Resend / SMTP2GO / Stripe receipt)

DELIVERY
 - [ ] Digital product / service is delivered without manual action
 - [ ] Recovery: if delivery fails, user can re-download / re-access without contacting support

OBSERVABILITY
 - [ ] Sentry catches errors in checkout / webhook
 - [ ] Uptime monitor pings the checkout URL every 5 min
 - [ ] Stripe webhook delivery rate alerts if it drops

ALERTING
 - [ ] Failures wake Andrew via [email / SMS / push] — define which
 - [ ] Non-failures do not wake Andrew (tune thresholds)

LEGAL / TAX
 - [ ] Refund policy is linked from checkout
 - [ ] Stripe Tax enabled if selling US-wide
 - [ ] Receipts auto-generated

PASSIVE SCORE: [Passive / Semi / Active]
```

Apps that fail any "PURCHASE PATH" or "OBSERVABILITY" item are **not** ready to be left alone. Keep them in the active manual-monitor list until fixed.

## Step 5 — Output the portfolio status table

Write to `~/GitHub/claude-skills/PORTFOLIO_ADOPTION_STATUS.md`. Format:

```markdown
# Portfolio Adoption Status — [date]

## Ranked priorities

| Priority | Repo | Stack | Revenue pot. | Launch ready | User risk | CI | Tests | Mon. plumbing | Next action |
|---|---|---|---|---|---|---|---|---|---|
| P0 | CastHub1 | A | 5 | 4 | 5 | ✅ | ❌ | ⚠ | Add Vitest + Playwright (qa-hardening) |
| P0 | awardssubmission | B | 4 | 3 | 4 | ✅ | ❌ | ⚠ | Add tests + monetization-readiness-review |
| P1 | holiday-lights | A | 4 | 3 | 2 | ✅ | ❌ | ⚠ | Pre-launch readiness pass |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

## DEFER list
- studio (dormant since 2025-04)
- NFLHOFKnocks (dormant since 2026-01)
- ReleaseMaster-Pro (dormant since 2026-01)

## ARCHIVE candidates (decision needed)
- gemini_project (empty)
- googlegenai (empty, 2025-02 last push)
- invoice-hub (empty, placeholder)
```

## Step 6 — Money-while-sleeping summary

A second table, narrower:

```markdown
## Money while sleeping

| Repo | Revenue model | Live? | Passive score | Blocker(s) |
|---|---|---|---|---|
| theproductionshelf | Payhip digital products | yes (off-platform) | Passive | No analytics on funnel |
| CastHub1 | Stripe subscription + success fees | pre-launch | Active | Success fees require admin verification |
| awardssubmission | Stripe entry fees | pre-launch | Semi | Submissions need manual judging |
| Producing-Hollywood-Invoicing | Stripe payment links | live (small) | Passive | Webhook idempotency unverified |
| holiday-lights / noelly-app | Stripe Connect + EveryOrg + RevenueCat | pre-launch | TBD | Two stacks for one product (decision needed) |
```

## Cadence (Andrew's weekly operating rhythm)

| Day | Routine | This skill's role |
|---|---|---|
| Monday | Portfolio audit | **Run this skill — produces the priority queue** |
| Tuesday | Revenue/monetization on priority repos | Use the queue from Monday |
| Wednesday | QA/regression on priority repos | Use `qa-hardening` |
| Thursday | Launch / SEO / analytics / observability | Use `analytics-event-map`, `monetization-readiness-review` |
| Friday | Deploy, verify, review nightly Routine alerts | Each repo's deploy workflow |
| Sunday | Auto-maintenance review | Re-run this skill, see what shifted |

## Output format

The skill produces two artifacts:
1. `PORTFOLIO_ADOPTION_STATUS.md` (overwrite) — the full table
2. A short markdown summary in the conversation:

```
PORTFOLIO HEALTH — [date]

P0 THIS WEEK ([N] repos)
 - [...]

P1 THIS MONTH ([N] repos)
 - [...]

NEW SINCE LAST AUDIT
 - [...]

MONEY-WHILE-SLEEPING REGRESSIONS
 - [...]

🔧 MANUAL TASKS FOR ANDREW: [per safe-edit-policy Step 8 — typically: archive decisions, dashboard checks, secret rotations due]
```

## Common mistakes

1. **Treating CI presence as quality** — `awardssubmission` has CI but the CI doesn't actually run tests yet. Inspect what runs, not just what exists.
2. **Trusting the memory file** — `PORTFOLIO_ADOPTION_STATUS.md` is point-in-time. Re-audit before quoting it. Memory drift is real (8 vs 13 skills, observed 2026-05-10).
3. **Conflating two products with similar names** — `Producing-Hollywood-Invoicing` (live React app) vs `ProducingHollywood` (new Next+Sanity site) vs `invoice-hub` (placeholder). Always full-path the repo.
4. **Not asking before archiving** — `gemini_project` looks abandoned but might be a hidden plan. Always confirm before suggesting archive.
5. **No clear next-action per row** — a status table with no "next action" column produces no movement. Every P0/P1 row gets one specific action.

## Source of truth in this portfolio

- 23 repos in `~/GitHub/` as of 2026-05-10 (after this skill's bulk clone). Re-inventory each run.
- Stack classifications as established by `safe-edit-policy` Step 2.
- Sibling skills: `repo-health-audit` (per-repo deep dive), `monetization-readiness-review` (per-app revenue audit), `qa-hardening` (test bar), `ci-gate-builder` (gate setup).
- Adopt-pack reference: `~/GitHub/claude-skills/portfolio-adoption-pack/` for templates each repo should adopt.

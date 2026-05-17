---
name: usage-pattern-analyst
description: Weekly cadence skill that reads the analyticsEvents Firestore stream (or equivalent product-events store), surfaces friction patterns, and proposes concrete UI/UX changes as draft GitHub issues or PRs. Layer 2 of the self-improving-app architecture — works the loop "Users act → Skill notices → UI improves" so the product gets sharper from real behavior, not assumptions. Stack-conditional. Keywords analytics, funnel, friction, drop-off, UX, weekly review, product insights, behavior analysis, feedback loop, self-improving.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, WebFetch]
---

# Usage Pattern Analyst

The product gets smarter every week from how it's actually used — not from what we think users do. This skill is the weekly cadence that reads the analyticsEvents stream, names the top friction patterns, and proposes concrete changes.

Always load `safe-edit-policy` and `analytics-event-map` first — the latter is the canonical taxonomy this skill reads against.

Sister skill: `production-error-to-regression` (failure-side loop). This skill is the behavior-side loop. Both feed the larger self-improving architecture; neither replaces the other.

## When to use

- **Weekly cadence** (Monday morning is the canonical slot — pairs with `portfolio-health-audit`)
- After a feature ships with measurable funnel hypothesis ("we expect step 3 drop-off to fall from 40% to 25%")
- Before a roadmap planning session
- When the team can't agree which friction point to fix next — let the data decide
- When considering removing a feature (use this to check if anyone actually uses it before deleting)

## When NOT to use

- Before the analytics pipeline is live. Sanity-check: query `analyticsEvents` for the last 7 days and confirm event volume > 0 for the events you care about. Empty stream = the skill has nothing to do. If the pipeline isn't wired, run `analytics-event-map` first and put this skill on hold.
- Apps with consent posture that forbids product analytics (state explicitly; offer a privacy-friendly alternative like aggregate heuristic counts)
- Backend-only repos (Stack D, E)
- The first 14 days after launch — sample too small, noise dominates signal. Wait until the funnel has at least 100 sessions/week to read.

## What the skill does (the loop)

### Step 1 — Confirm the pipeline is live

```bash
# Stack A (Firebase): count events in the last 7 days
node -e "
const admin = require('firebase-admin');
admin.initializeApp();
const since = new Date(Date.now() - 7*24*60*60*1000);
admin.firestore().collection('analyticsEvents')
  .where('createdAt', '>=', since)
  .count().get()
  .then(s => { console.log('events_last_7d:', s.data().count); process.exit(0); });
"
```

Abort the skill if count is zero or below the noise threshold (default: 100 events/week). Tell the user, don't fabricate insights.

### Step 2 — Pull the canonical funnels

For each named funnel, count distinct `userId` at each step over the window. Use the taxonomy from `analytics-event-map`:

| Funnel | Steps |
|---|---|
| Acquisition → activation | `page_view` → `signup_started` → `signup_completed` → `onboarding_step_completed` (all steps) → `first_value_reached` |
| Browse → checkout | `feature_used:browse` → `cta_clicked:upgrade` → `checkout_started` → `checkout_completed` |
| First session → retention | `signup_completed` → `session_started` (within 7d) → `weekly_active` |

Output: a step-by-step retention table. Look for the steepest drop — that's the first place to focus.

### Step 3 — Surface the top 5 friction patterns

For each top-N pattern, name:

1. **What** — the observed behavior (e.g., "76% of producers click `cta_clicked:advanced_filters` within 3s of `feature_used:talent_search`")
2. **Why it matters** — the hypothesis it implies (e.g., "the default filter set isn't matching real intent — producers immediately reach for advanced")
3. **What changes** — a concrete UI proposal (e.g., "promote `industry` + `location` + `verifiedOnly` into the default filter row; collapse the others under a single 'More filters' button")
4. **How to measure success** — the event that validates the fix (e.g., "watch for `advanced_filters` clicks within 3s to drop below 30%")

Rank by `users_affected × magnitude_of_friction`. Don't ship a 4th-place finding if the top one isn't addressed.

### Step 4 — Produce the deliverable

Write a Markdown brief at `docs/strategy/usage-insights/YYYY-WW.md`:

```markdown
# Usage Insights — Week NN, YYYY

**Window:** 2026-05-10 → 2026-05-17 (7 days)
**Sessions:** 1,243 · **Distinct users:** 312 · **Events:** 18,442
**Pipeline health:** ✅ live · 0 schema-drift warnings

## Funnel snapshot

| Step | Users | % of prev step | Δ vs prev week |
|------|-------|----------------|----------------|
| ...

## Top 5 friction patterns

### 1. <terse name> (severity: 🔴 high)
**What:** ...
**Why it matters:** ...
**Proposed change:** ...
**Success metric:** ...
**Code surface:** `components/producer/TalentSearch.tsx:120-145`

### 2. ...

## One question I keep coming back to
<the most non-obvious observation — the kind only a senior PM-engineer would catch>

## Follow-up issues opened
- #N1 — promote default filter row
- #N2 — shorten onboarding step 3 copy
```

### Step 5 — File concrete follow-ups

For each 🔴 or 🟡 finding with a clear code surface, open a GitHub issue tagged `usage-insight` with:

- Title: the change in imperative form ("Promote industry + location + verifiedOnly to default filter row")
- Body: a copy of the "Proposed change" + "Success metric" + "Code surface" + a link back to the weekly brief

Don't open issues for 🟢 findings — those are watch-list items the brief already captures. Don't open more than 3 issues per week — beyond that the team can't act on them and the loop loses force.

### Step 6 — Compare against last week

If a previous brief exists at `docs/strategy/usage-insights/`, link to it and call out what changed:

- **Wins:** patterns that improved (drop-off moved from 40% → 28%; close the underlying issue)
- **Regressions:** patterns that got worse (new event added that's already showing friction)
- **Stuck:** patterns that haven't moved (escalate severity or de-scope as out-of-reach)

## Voice rules

1. **No throat-clearing.** Open with the funnel table. Skip "here's an interesting analysis."
2. **Concrete > abstract.** Cite `event_name` and `file:line` for every finding. "Users seem confused" is not a finding.
3. **Don't catalog every nit.** 5 patterns max. A 20-item list gets skimmed; a 5-item list gets acted on.
4. **Don't recommend without a measurable success metric.** "Improve onboarding" isn't actionable. "Drop `onboarding_skipped` rate on step 3 from 22% to <10%" is.
5. **Name the one non-obvious thing.** Every brief ends with "One question I keep coming back to" — the cross-cutting observation only a senior would catch.
6. **Skip the recap.** The reader has the brief; don't summarize it back at them.

## Stack-conditional sharpening

### Stack A (Firebase + React — CastHub1, Mythie, awardssubmission)
- Read source: `analyticsEvents` Firestore collection (schema: `{ name, userId, orgId, props, source, createdAt }`)
- `services/analytics.ts` is the canonical chokepoint — if a metric you want isn't there, propose adding it to the `EventName` union first
- Privacy: events are tied to `userId` + `orgId`; if redacting for sharing externally, hash `userId` → first 6 chars of SHA256 and aggregate by week
- Backend mirror: `backend/analytics.js` writes server-side events; both halves of the funnel land in the same collection

### Stack B (Postgres + Next.js — CueHound, awardssubmission)
- Read source: `analytics_events` Postgres table (or PostHog if wired)
- Funnel queries: prefer SQL window functions over Firestore client-side aggregation — orders of magnitude cheaper

### Stack C/D/E (static / WordPress / scripts)
- Skill mostly doesn't apply — no client funnel. Use server log analysis instead (Cloudflare Analytics).

## Cron + automation

The skill is built to be invoked on a schedule. The canonical wiring:

```yaml
# .github/workflows/usage-insights-weekly.yml
name: Usage Insights — weekly
on:
  schedule:
    - cron: '0 9 * * 1'  # Monday 09:00 UTC
  workflow_dispatch:

jobs:
  brief:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Pull last 7 days of events
        env:
          FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}
        run: node scripts/usage-insights/pull-events.mjs --window 7d --out tmp/events.json
      - name: Generate brief with Claude
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: node scripts/usage-insights/generate-brief.mjs --in tmp/events.json --out docs/strategy/usage-insights/$(date -u +'%Y-%W').md
      - name: Open PR with the brief
        uses: peter-evans/create-pull-request@v6
        with:
          branch: usage-insights/auto-${{ github.run_id }}
          title: "Usage Insights — week $(date -u +'%Y-%W')"
          body: "Auto-generated weekly brief. Review the top friction patterns + decide which follow-ups to ship this week."
          labels: usage-insight, weekly
```

The skill itself runs in-Claude; the cron + scripts are the wiring that gives the skill a fresh dataset every Monday without anyone remembering to invoke it.

## Compound effect (why this is Layer 2, not just a feature)

A single weekly brief is a side project. A *cadence* is a moat. After 12 weeks:

- Patterns that recur week-over-week become roadmap-grade signals
- Wins compound — fixing the steepest drop pulls the next-steepest into focus
- The brief itself becomes training data for `product-strategy` decisions (which features to deepen, which to deprecate)

The competitor builds the same screen you did. They don't have the 12-week funnel history that says step 3 needs a different copy length. That's the asymmetry.

## Related skills

- [[safe-edit-policy]] — foundation; load before any review
- [[analytics-event-map]] — REQUIRED prerequisite; defines the event taxonomy this skill reads
- [[production-error-to-regression]] — failure-side loop; this is the behavior-side counterpart
- [[market-research-competitive-intel]] — outside-in view (competitors); this skill is inside-out (users)
- [[ui-design-web-apps]] — when a finding's proposed change touches design tokens or component patterns
- [[portfolio-health-audit]] — sibling Monday cadence; reads cross-repo health, this skill reads per-repo behavior

## Anti-patterns

### "Pretty dashboard, no decisions"
A weekly brief that doesn't propose changes is theater. Every brief MUST produce at least 1 follow-up issue or explicitly state "no actionable findings — pipeline is healthy."

### "Friction = bad event count"
Not all events that drop users are friction. `onboarding_skipped` after a user already imported their data is a feature, not a bug. Always check whether the user achieved `first_value_reached` before classifying a drop-off as friction.

### "Recommend by gut, not data"
Don't fall into "I bet users want X" mid-brief. Every recommendation must cite the event/funnel that supports it.

### "Catalog every event"
The brief is 5 findings, not 50. If you can't rank, you haven't done the work.

## Worked example

See the canonical first-brief once it lands in `docs/strategy/usage-insights/2026-W21.md` (the first run will be a half-week + a calibration pass; week 22 is the first full reading).

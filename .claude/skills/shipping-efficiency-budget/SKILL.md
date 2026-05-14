---
name: shipping-efficiency-budget
description: Use to keep CI minutes + reviewer attention from being burned by over-fragmented work. Two pillars — consolidate scheduled GitHub Actions (collapse multiple cron workflows into one workflow-with-branched-jobs, drop crons that should be backend self-polls) and bundle related PRs (decision tree for combine-vs-split, with the "what could have been one PR" pre-flight check). Battle-tested in CastHub1 — scheduled-jobs.yml already runs 10 cron schedules from one workflow file. Keywords - GitHub Actions budget, cron consolidation, scheduled workflows, PR sizing, PR bundling, fragmentation, micro-PR, review attention, CI minutes, workflow_dispatch, github.event.schedule, batched cleanup.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Shipping efficiency budget

Two pillars for not wasting two non-renewable resources: GitHub Actions minutes and reviewer attention. Both get burned the same way — by fragmenting work that could have been bundled.

Always load `safe-edit-policy` first. Composes with `phased-shipping` (which is about *intentional* multi-PR work) and `ci-gate-builder` (which is about *gating* workflows, not scheduled ones).

## When to use

- Before opening a PR (Pillar 2 pre-flight check — takes ~10 seconds)
- Quarterly portfolio audit of scheduled workflows (Pillar 1)
- When you notice you're about to push the 3rd small PR in a row to the same area
- When CI minutes start trending up
- When the user says some variant of "load up the PRs better" or "save on actions"

## When NOT to use

- The user has explicitly asked for one-PR-per-change ("ship it now, separate PR for the cleanup")
- A change must deploy independently of others (e.g., a hotfix that can't wait for a follow-up)
- Different review approval needed (e.g., legal-compliance change vs feature change — keep separate so legal reviewer doesn't have to wade through unrelated diff)

---

## Pillar 1 — Scheduled actions consolidation

### The audit (run quarterly per repo, or after any incident touching CI minutes)

```bash
# Find all scheduled workflow files
grep -l "schedule:\|cron:" .github/workflows/*.yml 2>/dev/null

# Extract every cron expression with its workflow file + comment
for f in .github/workflows/*.yml; do
  if grep -q "cron:" "$f"; then
    echo "=== $f ==="
    grep -B1 "cron:" "$f"
    echo
  fi
done
```

Now compute the **monthly minutes burn**:
- Average run time per workflow (check Actions tab → workflow → recent runs)
- × frequency per month
- Flag any workflow > 100 min/month for consolidation review

### Consolidation patterns (in order of impact)

#### 1. Multiple cron schedules → one workflow-with-branched-jobs

The single biggest win. Every separate scheduled workflow file pays the same fixed overhead: `actions/checkout`, Node setup, `npm ci`, etc. — typically 30-60 seconds before any actual work runs. Collapsing N workflows into 1 saves `(N-1) × overhead` per day.

**Pattern (CastHub1 `scheduled-jobs.yml`):**

```yaml
name: Scheduled jobs

on:
  schedule:
    - cron: '0 3 * * *'      # GDPR processors
    - cron: '0 */4 * * *'    # RSS auto-blog poll
    - cron: '10 3 * * *'     # SMS opt-in expiry
    - cron: '0 4 * * *'      # External casting calls cleanup
    # ... up to ~12 schedules per workflow is comfortable

jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci

      # One step per scheduled task, gated on which cron fired.
      - name: GDPR processors
        if: github.event.schedule == '0 3 * * *'
        run: curl -fsS -H "X-Cron-Secret: $SECRET" "$BASE/api/cron/gdpr-processors"
        env:
          SECRET: ${{ secrets.CRON_SECRET }}
          BASE:   ${{ secrets.API_BASE_URL }}

      - name: RSS poll
        if: github.event.schedule == '0 */4 * * *'
        run: curl -fsS -H "X-Cron-Secret: $SECRET" "$BASE/api/cron/rss-poll"
        env:
          SECRET: ${{ secrets.CRON_SECRET }}
          BASE:   ${{ secrets.API_BASE_URL }}
```

**Caveat:** if a step needs a different runtime (Python vs Node) or a heavier setup (Playwright browsers, Docker), it's worth keeping separate. The break-even is roughly: shared setup time × N runs > workflow split overhead. Below ~100 min/month, leave it alone.

#### 2. High-frequency pings → backend self-poll

If your scheduled action is just `curl -fsS https://api.your-app.com/cron/X`, the backend is doing all the real work — Actions is just a glorified cron daemon. Three problems:
- ~15-30s of GitHub overhead per run for what should be a sub-second backend tick
- Failures in GitHub Actions ≠ failures in your service (false alarms)
- 5-minute granularity costs ~9000 min/month per workflow

**Better:** put the schedule in your backend (Node `setInterval`, or your hosting provider's cron — Railway, Render, Cloud Scheduler, etc.). Use Actions only when you genuinely need the GitHub-side environment (npm install, browser, secrets only stored there).

CastHub1's "every 5 minutes service status health check" is a candidate to move to the backend itself — the backend is already running, it can ping its own dependencies on a `setInterval` and write to the same status doc.

#### 3. Daily → weekly where usage allows

Audit each daily cron: does the underlying data actually change daily? If it changes weekly, run weekly. If it changes monthly, run monthly. CastHub1's "show-page discovery + status decay" already runs weekly Mondays at 05:00 UTC — that's the right cadence pattern.

#### 4. Co-locate same-API cron secrets

If 5 scheduled jobs all hit the same backend with the same secret, define the env vars at the workflow level once instead of per-step:

```yaml
env:
  CRON_SECRET: ${{ secrets.CRON_SECRET }}
  API_BASE:    ${{ secrets.API_BASE_URL }}

jobs:
  dispatch:
    runs-on: ubuntu-latest
    env: ${{ env }}      # inherited
    steps:
      - run: curl -fsS -H "X-Cron-Secret: $CRON_SECRET" "$API_BASE/cron/foo"
```

### Consolidation-don'ts

- **Don't merge production verification with cleanup tasks.** Keep `e2e-prod.yml` + `smoke-test.yml` separate from `scheduled-jobs.yml` — they're noisy when broken (page someone) vs cleanup tasks (silently retry tomorrow). Different alerting model.
- **Don't merge schedules with different secret scopes.** If one job needs production database creds and another only needs a public webhook, the consolidated workflow now has the prod creds available to the public-webhook step too. Surface area expands.
- **Don't use `if: false` to disable a cron temporarily.** Comment out the `cron:` line instead — `if: false` still consumes the workflow startup overhead.

---

## Pillar 2 — PR bundling decision tree

### The pre-flight check (10 seconds, before every `gh pr create`)

Before opening a PR, ask **once**:

> "Have I shipped or am I about to ship anything else in the same area today?"

If yes, run the **combine-or-split** decision tree:

| If… | Then… |
|---|---|
| Same file(s) touched, same review reviewer | **Combine** — one PR, both changes |
| Same feature flow (e.g., publish modal touched 2x in one session) | **Combine** |
| Same file but radically different concerns (e.g., a11y fix + business-logic refactor) | **Split** — easier to review, easier to revert |
| Different deploy targets (rules vs code, frontend vs backend) | **Split** when the deploys are gated separately; **combine** when they ship together |
| Hotfix + non-urgent cleanup | **Split** — hotfix lands fast, cleanup waits |
| Legal / compliance / security change + feature change | **Split** — different reviewer, different approval bar |
| Diagnostic / observability + the bug it diagnoses | **Combine** if you're confident in the fix; **split diag-first** if you need data to confirm root cause |

### The "what could have been one PR" retro

End of session, count PRs you opened against the same area. If > 2 in the same flow, the next session should reflect:
- Was the second PR caused by feedback that arrived late? → Acceptable.
- Was the second PR caused by you discovering work you should have foreseen? → The first PR was scoped too tight; bundle next time.
- Was the second PR caused by you wanting a "clean commit log"? → Reviewer attention costs more than commit-log aesthetics.

### Worked example (CastHub1, 2026-05-14)

In one session, 9 PRs landed touching the TikTok publish flow:

| PR | What | Could have bundled with… |
|---|---|---|
| #663 | Storage rule super-admin bypass + drop external Teleprompter | — (originating fix) |
| #664 | Add email allowlist source to storage rule | #663 (same file, same diagnosis arc, ~5 min between commits) |
| #665 | Diag endpoint + improved publish error logging | — (genuinely needed first to diagnose URL-ownership) |
| #667 | In-app diag button (calls #665's endpoint) | #665 (couldn't ship one without the other being usable; classic stack) |
| #668 | 9:16 portrait crop via canvas | — (independent issue) |
| #669 | Safe-framing overlay | #668 (same file, follow-up to same producer feedback, no separate review) |

**Realistic count if the skill had fired:** 5 PRs instead of 9 (#663+#664 → one PR, #665+#667 → one PR, #668+#669 → one PR). Same code, half the review surface, half the auto-merge bot runs.

The miss wasn't lack of intent — it was lack of the pre-flight check. That's exactly the gap this skill closes.

---

## Output: efficiency-audit report (Pillar 1)

When invoked for a portfolio audit, produce one report per repo:

```markdown
# {repo} scheduled-actions efficiency audit ({date})

## Current state
- {N} scheduled workflow files: {list}
- {M} cron schedules total
- ~{X} estimated minutes/month consumed by scheduled runs

## Findings
- 🟢 {what's already well-consolidated, e.g. "scheduled-jobs.yml runs 10 schedules from one workflow"}
- 🟡 {opportunities, e.g. "smoke-test.yml + e2e-prod.yml could share a Node setup if combined"}
- 🔴 {wasteful patterns, e.g. "every-5-min healthcheck via Actions; should be a backend setInterval"}

## Proposed consolidation
- [PR 1] Combine smoke-test + e2e-prod into a single `production-checks.yml` with two scheduled steps. Saves ~{X} min/month.
- [PR 2] Move healthcheck to backend `setInterval`. Saves ~{X} min/month.

## Don't change
- {workflows that look consolidatable but have a real reason to stay separate, with the reason}
```

Ship the proposed consolidation as ONE PR per identified change (not all-in-one — different deploy risk per change).

---

## Composition

- `safe-edit-policy` — foundation contract
- `phased-shipping` — for genuinely multi-step work (this skill is the *opposite*: avoiding accidental multi-step fragmentation)
- `ci-gate-builder` — for gate workflows (this skill is for scheduled / cron workflows — different category)
- `portfolio-health-audit` — pulls per-repo efficiency findings into the Monday rollup
- `repo-health-audit` — single-repo deep dive includes the Pillar 1 audit

---
name: 99itm
description: "Auto-marathon mode for /99it. When Andrew types /99itm [optional category], auto-pick the 5 lowest-scored features in the current repo (optionally filtered to a category/area), set up a worktree, ship one focused PR per feature in sequence, double-check CI green after each, then sync the score panel + show a before/after delta table. Battle-tested on CastHub1 2026-05-21 (8 PRs in one session lifting ui-information-architecture 66→90 + demo-process 65→92 + mobile-capacitor +10 + talent-registration +6). Keywords: 99itm, marathon, auto-marathon, top 5, batch /99it, ship 5, marathon mode go, marathon UI, marathon demo, marathon billing."
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Agent, TaskCreate, TaskUpdate, TaskList]
---

# /99itm — Auto-marathon mode for /99it

When Andrew types `/99itm` (optionally with a category like `/99itm UI` or `/99itm billing`), you marathon through the top 5 lowest-scored features in this repo without him having to pick. Ship a focused PR per feature. CI-verify each. POST the score updates at the end. Show before/after.

Distinct from `/99it` (single-feature audit + marathon). Use `/99itm` when Andrew wants you to autonomously work down the lowest-scored backlog.

Always load `safe-edit-policy`, `shipping-efficiency-budget`, and `parallel-claude-worktrees` before starting. Inherit the 4-phase loop from the `99it` skill for per-feature methodology.

## When to use

- Andrew types `/99itm` or `/99itm <category>`
- He says any of: "marathon mode go", "marathon the next 5", "auto-marathon", "ship the top 5"
- After a previous `/99itm` session ended, and he wants the next batch

## When NOT to use

- The user wants a single deep audit on ONE feature → use `/99it`
- The repo has no feature-tracking baseline (no `featureAuditScoresRoutes.js` SEED_SCORES or equivalent data file) → either seed one first or run `/99it` per feature manually
- The lowest-scored features all have only multi-day / vendor-blocked gaps → tell Andrew, suggest `/99it` on a specific feature, OR suggest marking those gaps deferred and re-running

## Argument parsing

`/99itm` → bottom 5 features across the whole repo.

`/99itm <category>` → bottom 5 features matching the category. Match against the `area` field on each score entry (CastHub1 uses `product`, `admin`, `infra`, `observability`, `billing`). Loose match — `/99itm UI` matches `product` area features whose displayName contains "UI" OR `ui-information-architecture`-style featureIds. Specifically:
- `UI` / `UX` / `IA` → product-area + featureId contains `ui-` / `ia-` / `interface`
- `demo` → admin-area + featureId contains `demo`
- `billing` / `payments` → billing-area + featureId contains `stripe` / `billing` / `payment`
- `mobile` → infra-area + featureId contains `mobile` / `capacitor`
- `perf` / `performance` → infra-area + featureId contains `performance` / `loading`
- `talent` → product-area + featureId contains `talent`
- `admin` → admin-area
- Anything else → loose contains-match on featureId or displayName

If the filter yields fewer than 5 matches, take whatever it yields + tell Andrew the count.

## The marathon loop

### Phase 1 — pick the top 5

1. Read the repo's score baseline. In CastHub1 that's `backend/featureAuditScoresRoutes.js` SEED_SCORES. Other repos may use `data/featureAuditBaseline.js` or similar — look for a constant named SEED_SCORES, FEATURES, or similar.
2. Filter to features with `currentScore < 95` AND at least one non-deferred gap with `pointsCost >= 2` (matches the `daily-99it` selector logic — the loop's selector script in `scripts/daily-99it/select-feature.mjs` is the reference implementation).
3. Apply the category filter from the argument (above).
4. Sort by `currentScore` ascending; tie-break by highest top-gap pointsCost.
5. Take the bottom 5.
6. If fewer than 5: pause + tell Andrew the count + ask whether to proceed.

### Phase 2 — set up the worktree

Per `parallel-claude-worktrees`. Don't work in the primary clone; create a sibling worktree:

```bash
git worktree add ~/GitHub/<repo>-worktrees/marathon-<category-or-date> -b marathon-<category-or-date> main
cd ~/GitHub/<repo>-worktrees/marathon-<category-or-date>
ln -s ../../<repo>/node_modules node_modules
```

Symlink `node_modules` from the primary worktree to skip a full reinstall.

### Phase 3 — ship one PR per feature

For each of the 5 features, in score order (lowest first):

1. **Create a TaskCreate entry** for the feature (so progress is visible in the task list).
2. **Branch off latest main**: `git fetch origin main --quiet && git checkout -b m-<feature-slug>-<phase> origin/main`.
3. **Read the feature's audit data** — gaps, nextActions, notes, prsShipped.
4. **Pick the single highest-leverage actionable PR** per the `99it` skill phase 3 rules:
   - Prefer non-deferred gaps with pointsCost 4-12 (sweet spot for one PR)
   - Skip gaps in the forbidden-files set per safe-edit-policy
   - Bundle related sub-fixes that touch the same file (per shipping-efficiency-budget)
5. **Execute the change** per safe-edit-policy: inspect → plan → edit.
6. **Verify**: `npx tsc --noEmit` clean. If the change is UI/UX, surface `VERIFICATION NOT PERFORMED: cannot start dev server in this environment`.
7. **Commit + push + open PR** with a clear title + body + test plan. The existing auto-merge.yml workflow will merge once CI is green.
8. **Update the TaskUpdate** to completed.
9. **Move to the next feature** — branch off CURRENT main (which now includes the previous PR if auto-merge fired) so the changes stack cleanly.

**Cost / scope guardrails per PR:**
- LOC cap: 250 net additions (slightly more than `daily-99it`'s 200 because Andrew is explicitly asking for marathon scope)
- File cap: 10 files touched
- Each PR must include a test plan, even if `VERIFICATION NOT PERFORMED` is the honest answer

### Phase 4 — CI sweep

After all 5 PRs are pushed:

1. List the 5 PRs via `gh pr list --state all --limit 10`.
2. For each, check `gh pr view <n> --json state,statusCheckRollup` — confirm MERGED + all checks green.
3. If any PR is OPEN with a FAILING check: pull the failing log, diagnose, ship a hotfix PR before declaring marathon complete.
4. If a vitest assertion fails because the PR added a pattern the regression test bans (e.g. the 2026-05-21 `e.shiftKey` overgreedy regex), tighten the test's regex — don't roll back the feature work unless the user explicitly asks.

### Phase 5 — score sync

The `/99it` skill mandates POSTing the new score after each audit-driven PR. For a marathon, batch this:

1. Update the marathonScores TS data file (or create a new dated one) with the new currentScore for each of the 5 features. Mark closed gaps `deferred: true` so the panel + selector both reflect what shipped.
2. Update SEED_SCORES (backend/featureAuditScoresRoutes.js in CastHub1) currentScore for the 5 features.
3. Open ONE consolidated "marathon end" PR for the data sync. Auto-merge ships it.
4. On the admin panel, the green "Sync 2026-05-21 state (N)" button (or the equivalent for the current marathon date) will detect drift + POST the new scores to Firestore on Andrew's next click. Tell Andrew to click it after the PR deploys.

### Phase 6 — before/after delta

End the marathon with a single table Andrew can scan:

```
| Feature                     | Before | After | Delta | PRs       |
|-----------------------------|-------:|------:|------:|-----------|
| ui-information-architecture |    66  |   90  |   +24 | #M-IA-1..4|
| demo-process                |    65  |   92  |   +27 | #M-D-1..3 |
| ...                         |        |       |       |           |
| TOTAL                       |        |       | +XX   | N PRs     |
```

Plus:
- **What still blocks 99/100 on each** — surface the next 1-2 gaps per feature so Andrew knows what's next.
- **Queued for the next marathon** — if Andrew has named specific categories he wants covered in the future, list them so the next `/99itm` invocation can target them.

### Phase 7 — offer the next 5

Don't auto-loop into another marathon (that's overreach). After the delta table:

1. Identify what would be the natural next 5 (per the same selector logic, excluding the 5 just shipped).
2. Show them as a one-line list.
3. Ask if Andrew wants you to continue with `/99itm` again or stop.

## Stop conditions

End the marathon (don't ship the rest) when:

- Three consecutive PRs hit `error_max_turns` or fail validation — something is wrong with the agent prompt or the selector. Surface the pattern, don't power through.
- The Anthropic spend hits a self-imposed $10 cap for the marathon. Tell Andrew + ask whether to continue.
- A PR fails CI in a way that requires user judgment (e.g. the test failure surfaces a real product bug not introduced by the marathon).
- The worktree gets hijacked by a parallel Cowork session per `parallel-claude-worktrees`. Recover per that skill's recipe + restart cleanly.
- Andrew sends a stop message.

## Manual tasks at marathon end

Surface in the standard 🔧 block:

1. **Click the panel sync button** (canonical path: `/admin/feature-audit-scores` → green "Sync 2026-05-21 state (N)" button) once the marathon-end PR has deployed.
2. **Trigger redeploy** if the host doesn't auto-deploy (Firebase App Hosting does; Railway needs the deploy webhook).
3. **Any external blockers** the marathon surfaced — e.g. "Twilio 10DLC approval still owed", "Stripe Tax Dashboard activation pending".

## Worked example — CastHub1 UI/IA + Demo, 2026-05-21

Andrew said "marathon mode go for [UI/IA + demo-process] until you are done." 8 PRs landed in one session:

- M-IA-1 #1122 Talent BottomTabBar (ui-ia +8, mobile +10)
- M-IA-2 #1123 TalentProfileEditor 4-screen wizard (ui-ia +6, talent-reg +6)
- M-IA-3 #1124 Cmd+? help + keyboard registry (ui-ia +4)
- M-IA-4 #1125 SettingsHub unification (ui-ia +8)
- M-D-1 #1126 100-talent demo seed (demo +10)
- M-D-2 #1127 DemoSampleTestsCard (demo +7)
- M-D-3 #1128 DemoShowcaseNavigator + ⌘⇧S (demo +10)
- #1129 Score sync (panel hygiene)
- #1131 vitest regex hotfix (post-merge CI catch)

Final deltas: `ui-information-architecture` 66 → 90 (+24); `demo-process` 65 → 92 (+27); `mobile-capacitor` 73 → 83; `talent-registration` 72 → 78.

That marathon is the template — when Andrew types `/99itm UI`, you should reproduce that shape: themed bundle, one PR per concern, score sync at end, manual-task surfacing for the panel button click.

## Trigger phrases

- `/99itm`
- `/99itm <category>`
- "marathon mode go"
- "marathon the next 5"
- "auto-marathon"
- "ship the top 5"
- "marathon UI" / "marathon demo" / "marathon billing" (category as bare phrase)

Treat every variant as the same skill invocation.

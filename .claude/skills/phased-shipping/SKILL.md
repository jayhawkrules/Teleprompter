---
name: phased-shipping
description: Use when the user asks for substantial multi-step work (audit implementation, large refactor, system-wide upgrade, multi-day feature) and you want to ship it without breaking the working app. Provides a playbook for phased landing - inspect first, propose a small PR per phase off main, get explicit user approval at architectural decision points, present diffs before writing config/rules files, verify each PR independently with typecheck + build, and use draft PRs so auto-merge gates the integration. Battle-tested in CastHub1 across the error-tracking-os v1.0.0 rollout (PRs #375-#380, 6 phases, zero broken-app states). Keywords - large refactor, multi-PR, incremental, safe shipping, audit implementation, draft PR, stacking branches, inspection-first, decision points, AskUserQuestion, present-diff, firestore rules diff, safety rails.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, AskUserQuestion]
---

# Phased shipping

The pattern for landing big-scope work without breaking the running app. Ship small PRs in sequence off `main`, with explicit approval at branch points, verification per PR, and zero "broken for a week while we finish" states.

## When to use

- User hands you a multi-phase audit / spec ("Phase 1 - Inspect... Phase 2... Phase N")
- User asks for a system-wide change that touches > 5 files
- The right answer involves new collections / rules / env vars / cron jobs (operational risk, not just code)
- The brief assumes files / shells / providers that don't exist in the codebase
- You're tempted to write 1000+ lines in a single PR

## When NOT to use

- Single bug fix in a known location
- Trivial copy change
- The user has explicitly asked for one PR / one commit / "all at once"

## The playbook

### Phase 0: Inspect-only

Before editing **anything**:

1. Read the brief carefully. Note every file / collection / env var it mentions.
2. Read the actual code those references would touch. Note what exists vs what the brief assumes.
3. Compile a brief inspection report (~20 lines): file inventory, schema as-is vs brief, infra patterns to reuse (cron, auth, admin pattern), env vars to add.
4. **Present the report and pause.** This is non-negotiable. The user often realises the brief was based on a stale mental model the moment they see what's actually in the repo.

```text
# Phase 1 - Inspection report
**No edits made.** Findings below; flagging open questions before Phase 2.
...
## Things to confirm before Phase 2 (3 questions)
[AskUserQuestion call here]
```

### Phase 0.5: Decision points via AskUserQuestion

When the brief admits multiple reasonable architectures, ASK before committing. Never silently choose.

Good architectural decisions to surface:
- "Multi-PR stack vs single PR?"
- "Mount as new tab vs new route?"
- "Backfill existing docs vs implicit default?"
- "Tighten existing permissive rule vs leave as-is?"

Use the recommendation pattern: put your suggested option first with `(Recommended)` in the label. If the user picks "Trust your guidance," proceed with the recommendation and call out the choice in the PR description.

### Phase 1+: One small PR per phase

For each phase:

1. **Branch off `main`.** Not off the previous phase's branch, unless there's a hard dependency. Keeps the dependency graph flat.
   ```bash
   git checkout main && git pull origin main && git checkout -b claude/{topic}-p{N}-{label}
   ```

2. **Edit additively first.** When editing battle-tested files (anything the user calls out as "do not rewrite"), prefer:
   - New helper functions in the same file
   - New exports
   - New if-branches, never replacing existing ones
   - Pure additions to data shapes (back-compat)

3. **Verify per PR**, not just at the end:
   ```bash
   node --check backend/{newFile}.js               # backend syntax
   npx tsc --noEmit                                 # frontend types
   npx vite build --mode development                # bundles cleanly
   # Plus inline smoke tests for new sanitizers / pure functions:
   node -e "const r = require('./backend/...'); ..."
   ```
   If any check fails, FIX before committing. Never push a known-broken PR even if "the next one fixes it."

4. **Commit with a message that explains WHY this phase is its own PR**, not just what changed. Future-you reading the merge log wants to see the reasoning, not the diff.

5. **Open as a draft PR.** Auto-merge can flip to ready-for-merge after CI passes; the user retains the option to hold.

6. **Subscribe to PR activity**, then end the turn. Don't poll. Webhook events arrive as `<github-webhook-activity>` and wake the session.

### Phase N: Integration verification

After all PRs land on `main`:

1. Check out `main`, pull, run the full suite (`tsc + build + node --check + smoke`).
2. Inventory: routes added, env vars referenced, files touched, secrets needed.
3. Produce a deployment report: env vars to set, manual steps, things deferred to backlog.
4. **Don't claim a feature works just because it builds.** UI changes need browser smoke; backend routes need a curl. Type-check verifies code correctness, not feature correctness.

## Diff-before-apply: rules, configs, infrastructure

Three file types are in the "blast radius beyond your local environment" category. For these, **always show the diff and pause for approval before writing**:

- `firestore.rules` / `storage.rules` — wrong rule means data loss or breach
- `.github/workflows/*.yml` — wrong cron means jobs run wrong or not at all
- Anything declared as "do not overwrite" in CLAUDE.md or the user's instructions

Pattern:

```text
## Proposed diff

```diff
--- firestore.rules
+++ firestore.rules
@@ -198,6 +198,32 @@
 ...
+    match /errorEscalations/{escalationId} { ... }
+    match /appHealth/{appId}/daily/{date}    { ... }
 ...
```

[AskUserQuestion: "Apply the diff?" with "Apply as shown (Recommended)" / "Hold for revisions"]
```

## Push back, but smartly

The brief sometimes asks for things that are infeasible as written (refers to files that don't exist; assumes a different architecture; would break the app for days). When that happens:

1. **State the issue concretely**, not abstractly. Name the specific file / function / signature mismatch.
2. **Offer 2-3 alternatives** with the real-world trade-offs:
   - Scaffolding-only (safest)
   - Scaffolding + 1-2 proof-of-pattern leaves (recommended)
   - Full rewrite per brief (highest risk; flag what breaks mid-PR)
3. **If the user picks the riskiest option anyway, do the most aggressive feasible version** and document in the PR description where you diverged from the brief and why. Don't silently scope-cut.

Example pattern (from CastHub1 PR #373):
> "The audit's full router rewrite assumes shells, providers, and screen files that don't exist. The existing `useAuth()` takes callbacks defined inside `App.tsx`, so it can't simply be lifted into a top-level provider. Doing the full rewrite as one PR would break the app for days. This PR delivers the scaffolding **without breaking anything**: App.tsx still owns the existing hash-based screen routing, but React Router is now mounted and ready for incremental migration."

## Anti-patterns

- ❌ One giant PR titled "Phase 2-9" — even if it builds, the review surface is unreviewable.
- ❌ Stacking PRs off each other when they could be flat off `main` — turns a merge order issue into a rebase nightmare.
- ❌ Skipping Phase 0 inspection because "the brief is clear" — the brief is never clear about what's already in the repo.
- ❌ Writing `firestore.rules` / `.github/workflows/*` without showing the diff first.
- ❌ Marking a TodoWrite item complete before the verification command actually returns 0.
- ❌ Re-reading a file you just edited "to verify the change" — Edit/Write would have errored if the change failed, and the harness tracks file state for you. Wasted context.
- ❌ Polling with `sleep` waiting for CI. Subscribe to PR activity and end the turn.

## Example timing (CastHub1 error-tracking-os, real numbers)

| Phase | Branch | Commit | PR | Files |
|---|---|---|---|---|
| 0 | (none — inspection report only) | — | — | 0 |
| 2 | `error-tracking-p2-schema` | additive sanitizers + 3 fields | #375 | 1 |
| 3 | `error-tracking-p3-bugreports` | new route + correlation + modal upgrade | #376 | 5 |
| 4 | `error-tracking-p4-github` | new route + lazy octokit + escalations | #377 | 4 |
| 5 | `error-tracking-p5-dashboard` | new dashboard tab | #378 | 4 |
| 6 | `error-tracking-p6-bots` | 3 cron routes + workflow entries | #379 | 3 |
| 7 | `error-tracking-p7-rules` | rules diff (presented before write) | #380 | 1 |
| 8 | (verification on `main`) | — | — | 0 |
| 9 | (deployment summary) | — | — | 0 |

Total: 6 PRs, all draft → auto-merged on CI green, app remained functional throughout.

## Versioning

- v1.0.0 (2026-05-10) - Extracted from CastHub1 error-tracking-os rollout.

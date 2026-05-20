---
name: agentic-feedback-loop
description: Use when Claude is being asked to build, fix, or polish something the user cares about getting RIGHT (UI matching a mock, fixing a flaky test, getting a Lighthouse score up, hitting visual parity with a competitor). Sets up a verifier loop so Claude self-corrects instead of one-shotting. The pattern - give Claude a tool that produces a checkable signal (Vitest watch, Puppeteer screenshot diff, Lighthouse score, type-checker output, axe-core report), have Claude iterate until the signal goes green, instead of "I think this looks right." Boris Cherny - "give it a way to see its result, and it'll iterate and get better." Includes specific recipes per verifier type, iteration budgets, and "when to stop iterating" rules so it doesn't spin forever. Keywords - feedback loop, iterate, self-correct, verifier, screenshot diff, Puppeteer iteration, Playwright iteration, Lighthouse loop, Vitest watch, axe-core, visual regression, agentic, polish, match the mock, get the score up.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Agentic Feedback Loop

The single biggest unlock when Claude is editing code is giving it a way to CHECK ITS OWN WORK. Boris Cherny's example from the Code with Claude 2026 talk: *"If you give it a mock and you say build this web UI, it'll get it pretty good. But if it had to iterate two or three times, often it gets it almost perfect. The trick is give it some sort of tool that it can use for feedback to check its work."*

This skill codifies that pattern. Pick the right verifier for the task, wire it up, let Claude iterate.

## When to use

- Building UI from a mock — wire up Puppeteer screenshots
- Fixing flaky / failing tests — wire up Vitest watch mode
- Getting accessibility right — wire up axe-core
- Hitting a Lighthouse target — wire up `lighthouse-ci`
- Matching a competitor's visual quality — wire up screenshot diffs
- Migrating types in a TS codebase — wire up `tsc --watch`
- Polishing a feature toward `/99it` competitive parity

## When NOT to use

- One-line changes (typo fixes, single-line config edits) — overhead not worth it
- Backend-only work with full test coverage already — the existing test suite IS the feedback loop, just `npm test` between edits
- Throwaway exploration / spike code — no investment in correctness
- When the verifier itself isn't reliable (flaky tests, unstable screenshot diffs) — fix the verifier first

## The pattern

1. **Define ground truth** — what does "correct" look like? Mock image, target Lighthouse score, set of failing tests, axe report shape.
2. **Wire the verifier** — a tool Claude can invoke that returns a structured signal (pass/fail, diff %, score number).
3. **Set an iteration budget** — usually 3-5 iterations. More than that and you're either stuck in a local minimum or the goal needs to be reframed.
4. **Tell Claude the loop explicitly**: "Run `<verifier>` after each edit. If it doesn't pass, iterate. Stop after 5 iterations or when it passes."
5. **Stop conditions are mandatory** — "iterate until perfect" is a recipe for runaway sessions.

## Verifier recipes

### Puppeteer screenshot diff (UI matching mock)

**Tools needed:** Puppeteer MCP (per [[mcp-team-setup]]), a reference mock image at a known path.

Prompt pattern:
```
I'm building <component> to match mock at <path/to/mock.png>.

Loop:
1. Edit <path/to/component>
2. Use Puppeteer MCP to navigate to localhost:5173/<route>
3. Screenshot the component at viewport <width>x<height>
4. Save as iteration-N.png
5. Compare with mock visually — call out differences in spacing, color, typography
6. If diff is non-trivial, go back to step 1. Max 5 iterations.

After each iteration tell me what you changed and what's still off.
```

This is the highest-leverage variant for [[premium-product-demo]] and [[ui-design-web-apps]] work.

### Vitest watch (fixing tests)

**Tools needed:** `npm test -- --watch` (or `vitest --watch`).

Pattern: start the watcher in a background bash, edit code, observe pass/fail. Claude reads the watcher output and iterates.

```
Loop:
1. Read failing-test.test.ts to understand the assertion
2. Hypothesize the fix
3. Edit source
4. Wait for vitest to re-run (or `npm test -- --run failing-test`)
5. If green, done. If red, return to step 2. Max 5 iterations.
```

For background watcher pattern, use the Bash `run_in_background` option.

### Type-checker watch (TS migrations)

**Tools needed:** `tsc --watch --noEmit`.

```
Loop:
1. Run tsc --watch in background
2. Pick the first error from the output
3. Edit the file
4. Wait for tsc to re-check
5. If error gone, advance to next error. If new errors appeared, address those first.

Stop when: no errors remain, OR an error type repeats 3+ times (signal that the strategy is wrong).
```

### Lighthouse score loop (perf/SEO)

**Tools needed:** `npx lighthouse <url> --output=json --quiet`.

```
Target: Lighthouse Performance score >= 90.

Loop:
1. Run lighthouse against staging URL, capture score
2. Read top opportunities from JSON output
3. Pick the highest-impact one
4. Implement it
5. Re-run lighthouse, compare score
6. If improved, keep iterating. If flat, switch opportunity. Max 8 iterations.

Stop conditions: target hit, OR score stops improving for 2 iterations.
```

Pairs naturally with [[seo-aeo-optimizer]].

### Accessibility loop (axe-core)

**Tools needed:** `@axe-core/cli` or Playwright + `@axe-core/playwright`.

```
Target: zero "critical" or "serious" axe violations on <route>.

Loop:
1. Run `npx @axe-core/cli http://localhost:5173/<route>` (or via Playwright)
2. Read JSON output, group violations by impact
3. Fix highest-impact violation first
4. Re-run axe. If new violations introduced by the fix, prioritize those.

Stop when: critical + serious counts = 0, OR you've made 5 iterations with no net reduction.
```

Pairs with [[human-simulation-testing]] (the accessibility persona).

### Visual regression diff (against a known-good baseline)

**Tools needed:** Playwright's `toHaveScreenshot()` or `pixelmatch` CLI.

```
Baseline: existing screenshot at path/to/baseline.png

Loop:
1. Make UI edit
2. Take new screenshot via Puppeteer/Playwright MCP
3. Diff against baseline using pixelmatch — get pixel-diff count
4. If diff > <threshold>, identify which region is different
5. Iterate. Max 5.

Stop when: diff < threshold, OR the diff is intentional (e.g., the baseline IS what needs to change, not the code).
```

## Stop-iterating rules

Without these, sessions burn tokens forever:

1. **Hard iteration cap** — 5 is the default. Going to 10 means the goal is wrong, not that one more iteration will help.
2. **No-progress detector** — if 2 consecutive iterations don't improve the signal, stop and reframe.
3. **Signal saturation** — if you've gone from 60 to 89 chasing 90, the last point may not be worth 3 iterations. Ask the user.
4. **New problem introduced** — if iteration N fixes the original signal but breaks something else, stop and triage.
5. **Cost ceiling** — for `claude -p` runs in CI per [[claude-sdk-in-ci]], cap by token spend.

## What NOT to do

- **Don't have Claude judge its own visual output by squinting at it** — that's how you get "looks great!" when it doesn't. Use pixel diffs or explicit visual descriptions ("the heading is 4px lower than the mock").
- **Don't iterate without a fresh read** — between iterations, re-read the file. Claude can hallucinate state if the loop relies on its memory of edits.
- **Don't paper over a flaky verifier** — if the test passes 50% of the time, fix the test first; don't iterate against a coin flip.
- **Don't loop on a verifier that's testing the wrong thing** — Lighthouse Performance score can go up while UX gets worse. Verifier must align with the goal.
- **Don't run the loop entirely in `--dangerously-skip-permissions`** — even in auto-accept-edits mode (Shift+Tab), watch for the loop running expensive commands repeatedly.

## Pairing with Claude Code modes

- **Auto-accept edits (Shift+Tab)** — the right mode for tight iteration loops. You're not approving each individual edit; you're approving the LOOP, then judging the final result.
- **Plan mode** — wrong mode for iteration. Plan mode is for the *strategy*; once the loop is defined, exit plan and execute.
- **`claude -p` headless** — fine for loops with deterministic verifiers (tests, types, lighthouse). Not great for visual-diff loops where you want to eyeball intermediate states.

## Per-task verifier matrix

| Task | Best verifier | Iteration cap |
|---|---|---|
| Match a UI mock | Puppeteer screenshot + visual description | 5 |
| Fix a failing test | `vitest --watch` | 5 |
| TS migration | `tsc --watch` | unlimited (per-error progress) |
| Lighthouse target | `lighthouse --output=json` | 8 |
| Accessibility | `axe-core` | 5 |
| Visual regression | Playwright `toHaveScreenshot` | 3 |
| Component API stability | `tsc` + downstream tests | 3 |
| Bundle size | `vite build --report` or bundle-analyzer | 5 |

## Per-repo adoption priority

1. **CastHub1** — premium-product-demo + ui-design-web-apps work, BugReportModal, LandingPage all benefit from Puppeteer-screenshot loops
2. **awardssubmission** (Aclamos) — entry-fee checkout UI polish, payment confirmation visual loop
3. **Mythie marketing pages** — Lighthouse loop for SEO
4. **CRM-ai** — Playwright + Next.js, type-checker loop for the big TS migrations
5. **toronadoentertainment.com** — Lighthouse + axe-core

## Related skills

- [[mcp-team-setup]] — provides the Puppeteer/Playwright MCP this skill depends on
- [[ui-design-web-apps]] + [[premium-product-demo]] — the design intent the loop chases
- [[human-simulation-testing]] — the verifier matrix overlaps (accessibility, mobile, recovery)
- [[claude-sdk-in-ci]] — for running these loops headless in CI
- [[verify]] — manual end-state verification (this skill is the AUTOMATED loop; verify is the FINAL human check)
- [[99it]] — competitive-parity audit drives the goal; this skill provides the loop to close the gap

## Source of truth

- Boris Cherny, Code with Claude 2026 — "iterate by giving Claude a verifier" segment (~11:30)
- Reference Anthropic pattern: apps repo Puppeteer MCP + designer-mocks workflow
- Andrew's portfolio reference workflow: CastHub1 ErrorDashboard polish (PR series)

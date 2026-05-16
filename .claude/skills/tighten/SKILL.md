---
name: tighten
description: Use when the user wants a senior/principal-engineer review of code that's already written — the "big boss leaning over your shoulder" pass that asks "could we have done that better?" Not lint, not style — substantive design / correctness / cost / surface-area review with explicit tradeoffs and a verdict (ship-as-is / tighten-then-ship / rework). Trigger phrases - "tighten this", "tighten up the code", "could we have done that better", "double-check my work", "big boss review", "principal review", "over the shoulder", "deep dive on what I just wrote", "is there a better way", "what would a staff engineer say". Distinct from `simplify` (mechanical) and `/review` (PR-checklist) and `/ultrareview` (cloud multi-agent, billed).
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Grep, Glob, Bash]
---

# tighten — the over-the-shoulder review

> **The role you're playing.** A senior or principal engineer who cares about your work, has seen ten thousand bugs, and is going to ask uncomfortable questions before you ship. Not mean. Not pedantic. Not interested in lint or formatting. Interested in: *will this hold up?* *is this in the right shape?* *what's the next bug this introduces?*

Always load `safe-edit-policy` first. Composes with `simplify` (sister skill — `simplify` fixes mechanically; `tighten` asks judgment questions first), `phased-shipping` (when verdict is "rework"), `shipping-efficiency-budget` (when suggestion is "bundle"), and `production-error-to-regression` (when verdict needs a regression test).

## When to invoke

- After writing or editing non-trivial code in-session (proactive — don't wait to be asked if the change has design weight)
- When the user types any of the trigger phrases above
- Before merging a draft PR you authored
- After a `simplify` pass — `simplify` cleans; `tighten` interrogates
- When a change touches money, identity, security, or anything cross-cutting (auto-invoke)

## When NOT to invoke

- Trivial diffs (typo fix, one-line config, a dependency bump)
- The user is in flow building and asks for forward progress, not review
- A PR already went through `/ultrareview` in the last hour — don't duplicate
- Style/lint-only feedback — that's the linter's job, not yours
- The user explicitly said "ship as-is, don't second-guess"

---

## The voice rules (read every time)

1. **No throat-clearing.** Skip "great work on this!" Open with the verdict.
2. **No jerk mode.** The role is *senior who wants you to succeed*, not *senior who wants to look smart*. Never make the implementer feel dumb for the obvious thing.
3. **Every recommendation comes with the tradeoff.** "Doing it this way costs X; the alternative costs Y." If you can't name the cost, the recommendation isn't ready.
4. **Name the one non-obvious thing.** A review without a "huh, I didn't think of that" is a wasted review. End every pass with a `## One question I keep coming back to` section.
5. **Don't catalog every nit.** Pick the top 3–5 issues by impact. A 20-item list gets skimmed; a 4-item list gets acted on.
6. **Concrete > abstract.** Cite file:line. Show pseudocode. Don't say "consider extracting"; show the extraction.
7. **Style/lint is not the point.** If the linter would have caught it, don't say it.
8. **Skip the recap.** The implementer wrote the code; they know what it does. Don't summarize their own change back at them before reviewing it.

---

## What you actually do (the loop)

### Step 1 — Read the change in full

Read every changed file end-to-end, not just the diff. The diff hides:
- What was deleted nearby that should also have been deleted
- What was NOT changed that should have been changed
- The shape of the call sites that consume this change
- The shape of the tests that were and weren't updated

If the change is a PR, also read 1-2 callers / consumers / parents. If there's a test file, read it. If there's no test file, note that.

### Step 2 — Run the question list

Pick **4–7** of the questions below — whichever are most likely to find real issues for *this specific change*. Don't run all of them; you'll dilute the signal.

#### Design / shape
- Is this in the right layer? (business logic in a UI component, validation past the boundary, a service that's secretly a controller)
- Are you introducing an abstraction that's only used once? Premature?
- Are you NOT introducing an abstraction when 3+ call sites do nearly the same thing?
- Is the data shape what callers actually need, or shaped by what was easy to fetch / store?
- Is there hidden state? Implicit dependencies passed via module scope, closure, or globals?
- Is the public surface (export list, route shape, type) minimal?

#### Correctness
- What happens at the boundaries: empty array, null, very large input, very small input, unicode, negative, zero, exactly the limit, one over the limit?
- What happens if this runs twice? (Idempotency — money flows + writes are the classic ones)
- What happens mid-flow if the network drops? Mid-transaction if the DB write fails after the side effect?
- What happens if the upstream API changes shape? Defensive parse, or loud throw?
- Is there a race? (Two callers, one resource, no lock or version)
- Concurrency: what if 100 of these fire at once?

#### Cost & limits
- Per-call cost in money / latency / tokens / DB reads?
- Worst-case cost at 10× / 100× / 1000× scale?
- Are there missing rate limits, quotas, timeouts, max-payload-size, max-result-count?
- Does it hold an expensive resource (DB connection, file handle, S3 stream) longer than it needs to?

#### Surface area / blast radius
- What new surface is exposed: new endpoint, new field, new env var, new permission, new collection?
- What's the smallest set of users who can hit this? Could it be smaller? Behind a feature flag?
- If this turns out to be wrong, how hard is it to undo? Is the DB write reversible? Is the migration reversible?
- Backwards-compatible with users mid-flow / old clients?
- Forward-compatible — will the next obvious edit not conflict with this shape?

#### Failure observability
- How will you know when this breaks in prod?
- Is the error logged structurally (with enough fields to find the bad row)?
- Is there an alert on the failure path that matters?
- Will the failure mode look like silence, like a 500, or like wrong-but-plausible data?

#### Naming & readability
- Will a fresh reader understand this in 10 seconds?
- Are the names lying? (`getUser` that also writes; `optional` that's required; `safe` that throws)
- Are there magic numbers without a `// reason for this number` comment?
- Is there commentary about *why* the non-obvious choice, not *what* the code does?

#### Tests
- What's the regression test for the bug this would have introduced?
- Is there a test? Does it cover the boundary, or just the happy path?
- If this fixes a bug, is the test the kind of test that would have caught the bug? (See [[production-error-to-regression]])

#### Codebase consistency
- Does this match how the codebase already does this thing?
- If it diverges, is the divergence justified — and documented in code, not just in the PR description?
- Is there a skill, helper, or convention this should have used? (e.g., for portfolio code: `firestore-rbac-helpers`, `payment-webhook-safety`, `error-tracking-system`)

### Step 3 — Severity-rank the findings

Buckets:

- **🔴 Must fix** — will break prod, lose data, leak access, or burn money. Block the merge.
- **🟡 Should tighten** — works today, invites future pain, or fails a non-obvious case. Worth a follow-up commit before merge.
- **🟢 Worth considering** — judgment call. Reasonable to ship as-is; flag for the reviewer to choose.

Skip anything below 🟢. Style/lint findings don't make it into the review.

### Step 4 — Render the verdict

Top-line one of:

- **Ship as-is** — no 🔴, no 🟡. Maybe one or two 🟢 worth noting.
- **Tighten then ship** — 🟡 present; 🔴 absent or trivially fixable. Estimate the fix work in minutes.
- **Rework** — 🔴 present, or 🟡 cluster suggests the design is in the wrong shape. Recommend the rework scope — what to throw out vs. keep.

### Step 5 — Output

Use this exact structure. Brevity matters; the reader is the person who just wrote the code and is impatient.

```markdown
## Tighten review — <one-line summary>

**Verdict:** <Ship as-is / Tighten then ship / Rework> · <estimated fix time>

### 🔴 Must fix
- **<terse issue>** (`file.ts:42`)
  Why it matters: <one sentence>
  Tradeoff: keeping as-is costs <X>; fixing costs <Y>
  Suggested fix: <pseudocode or 2-line plan>

### 🟡 Should tighten
- ...

### 🟢 Worth considering
- ...

### What this skipped (deliberately)
- Style/lint — that's the linter's job
- <anything else you chose not to dig into and why>

### One question I keep coming back to
<the most non-obvious observation — the thing only a senior would catch.
This is the part of the review that's worth the most. Spend cycles here.>
```

---

## Anti-patterns

### "Senior who wants to look smart"
Bad: "Have you considered the Visitor pattern here?"
Good: "Three of these `if (platform === ...)` branches feel like they want to be one map; not load-bearing, but the next platform you add will be the third place you forget to update."

### Drive-by criticism without a tradeoff
Bad: "This should be async."
Good: "Sync here blocks the request thread for ~120ms per call. Going async costs you a follow-up to handle the in-flight error; the latency win is worth it once you cross ~5 RPS."

### Style nits
Bad: "Consider naming this `userId` instead of `uid`."
Good: (don't say it — the linter handles naming; spend the review budget on something the linter can't)

### Burying the lede
Bad: list 14 small things, mention the security hole as item #11.
Good: one 🔴 line at the top: "this endpoint is missing auth — every other line below is moot until that's fixed."

### "Could have used X library"
Bad: "Have you tried lodash for this?"
Good: skip. Library swaps are almost never worth a senior reviewer's attention unless they're load-bearing on correctness.

---

## Stack-conditional sharpening

### Stack A (Vite + React + Firebase + Stripe — Mythie, Aclamos, etc.)
- Firestore: missing `requireAuth`/`isOrgMember` rule check? Read paths that span orgs? Composite-index missing?
- Stripe: webhook handler missing signature verify or idempotency? (See [[payment-webhook-safety]])
- Super-admin: does the bypass actually bypass? (See `feedback_api_mcp_studio_only` — burned us 2026-05-16)
- Custom Claims vs email allowlist: code on one side, rules on the other? (See `feedback_custom_claims_over_email_allowlist`)
- React: state in the wrong layer? Effect that should be a memo? Memo that should be a const?
- Capacitor: native-only path that wasn't gated for web?

### Stack B (Next.js + Postgres + Prisma — CueHound, awardssubmission)
- Prisma: N+1 query? Missing `select`/`include` causing over-fetch? Transaction boundary in the wrong place?
- NextAuth / Better-Auth: session in client component? Server-only secrets crossing the boundary?
- Server actions: not wrapped in error boundary? Cache-tag missing on the revalidation path?

### Stack C/D/E (static HTML / WordPress / JS automation)
- Inline scripts breaking CSP?
- Hardcoded URLs that should be env-driven?
- Cron without a heartbeat / failure alert?

---

## Worked example

**Change under review:** "Super-admin token bypass on Social Media Search" (CastHub1 PR #743).

Top-line verdict written in the format above:

```markdown
## Tighten review — Super-admin bypass on /api/discovery/social-search

**Verdict:** Tighten then ship · ~10 min

### 🟡 Should tighten
- **No test for the bypass path** (`backend/apifyRoutes.js:281,314`)
  Why it matters: this is the third surface where the same super-admin
  pattern has been re-implemented from memory (PR #642, #680, this PR).
  Each was found because Andrew personally hit the 402. The test that
  would have caught all three doesn't exist.
  Tradeoff: shipping without it costs a 4th occurrence; adding it costs
  ~10 min (a vitest case mocking `req.user.superAdmin=true` and asserting
  `debitTokens` is not called).
  Suggested fix: `backend/apifyRoutes.bypass.test.js` — one case per
  bypass surface, asserting (a) no `tokenBalance` read, (b) no
  `debitTokens` call, (c) response `bypassed: true`.

- **Inline `require('./adminAuth')` inside the handler** (`apifyRoutes.js:224`)
  Why it matters: now used twice in this handler (tier gate + my new
  preflight skip). Inline-require runs on every request. Cheap, but the
  convention elsewhere is top-of-file.
  Tradeoff: moving it costs nothing; leaving it costs a tiny perf hit
  per call + inconsistency with sibling routes.
  Suggested fix: hoist to line 39 next to `debitTokens`.

### What this skipped (deliberately)
- The TikTok-failed outcome in the same screenshot — separate issue,
  separate PR.
- Frontend "Unlimited" copy — judgment call (Andrew's brand voice; not
  a senior-eng question).

### One question I keep coming back to
The bypass pattern is now copy-pasted across 4+ routes. That's the
third symptom of a missing helper. Worth one PR that introduces
`requireTokensOrBypass(req, orgId, maxCost)` → returns
`{ ok: true, isAdmin: bool, priorBalance: number }` and centralizes the
preflight + log line + response shape. Once that lands, every future
"new AI-cost route" gets the bypass + the test + the log line for free.
That's the test-the-pattern-not-the-instance move.
```

Notice what the example *doesn't* do: it doesn't summarize what the change does. It doesn't praise. It doesn't list every cosmetic thing. It does name the one non-obvious thing (the missing helper) at the end.

---

## Operating notes

- **Time budget.** A `tighten` pass should take ~3–8 minutes of model time. If it's running long, you're cataloging instead of judging.
- **The verdict is mandatory.** Don't render a review without one of the three top-line verdicts.
- **You're allowed to say "ship it."** "Ship as-is" with zero findings is a legitimate output, not a cop-out. Don't manufacture issues to look thorough.
- **End-of-pass:** if the user has just shipped 3 PRs in this session and `tighten` is finding the same class of issue in each, surface that meta-observation. "All three of these PRs missed a regression test — worth pausing on testing-discipline before the next one" is the kind of cross-cutting thing only a senior would catch.

---

## Related skills
- [[safe-edit-policy]] — foundation; load before any review
- [[simplify]] — sister skill; mechanical clean-up after `tighten` agrees on what to change
- [[phased-shipping]] — invoke when verdict is "rework" and the rework is multi-PR
- [[shipping-efficiency-budget]] — invoke when a finding is "this should have been bundled with sibling PR"
- [[production-error-to-regression]] — invoke when finding is "missing regression test"
- [[firestore-rbac-helpers]] — referenced in Stack A sharpening
- [[payment-webhook-safety]] — referenced in Stack A sharpening

---
name: 99it
description: "Audit a feature against best-in-class competitors, score it honestly out of 100, then marathon-ship phased PRs until it's genuinely 99/100. Use when Andrew says \"/99it\", \"99 this\", \"audit to 99\", \"perfect this feature\", or \"can you rate this 99/100\". Triggers an honest competitive teardown (not flattery), bundles fixes into themed PRs per shipping-efficiency-budget, and re-rates after every phase. Keywords: audit, perfection, 99 of 100, rate the feature, beat the competitors, marathon mode, world-class, deposition-survivable, ship-to-99."
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob, Agent, TaskCreate, TaskUpdate]
---

# /99it — Audit-and-marathon to 99/100

When Andrew invokes `/99it` (or asks "can you rate this 99/100" / "99 this" / "perfect this feature"), drop into a four-phase loop: **honest audit → calibrated rating → themed marathon PRs → re-rate**. Keep looping until the feature genuinely scores 99/100 or the only remaining gaps are correctly-scoped multi-day projects that can't be shipped in one session.

Always load `safe-edit-policy` and `shipping-efficiency-budget` before starting.

## When to use

- Andrew says any of the trigger phrases (above)
- A feature has just shipped end-to-end and Andrew wants to push it from "works" to "best-in-class"
- After a `phased-shipping` rollout when Andrew asks "is this 99/100?"
- Before a public launch or external marketing push for a flagship feature

## When NOT to use

- Quick bug fixes — use `production-error-to-regression` instead
- Early-stage features that haven't shipped a coherent v1 yet — premature; finish the build first
- Cross-cutting refactors with no clear "feature" boundary — use `repo-health-audit`

## The four phases

### Phase 1 — Honest competitive audit

Don't flatter. The 99/100 bar is **deposition-survivable, courtroom-clean, beats the named competitors feature-for-feature**, not "looks good in a demo."

For each feature, identify the 2–3 industry-standard competitors (e.g. for e-sign: DocuSign, HelloSign, Documenso). Then walk every file end-to-end with an `Agent` call (subagent_type: `general-purpose`) that asks for issues in these categories:

- **A. Correctness / bugs.** Race conditions, idempotency holes, off-by-one, status-transition mistakes, token-validation weaknesses, storage path injection, missing CSRF / content-type checks.
- **B. Error handling + edge cases.** Network failures mid-flow, vendor webhook never-arrives, retry semantics, terminal-status guards (voided/expired/declined), file-size caps, recipient-not-found surfacing.
- **C. UI / UX vs. the named competitors.** Step indicators, mobile UX, keyboard nav, dark-mode, screen-reader labels, empty states, skeleton loaders, error toasts vs inline errors, focus management, motion-reduce.
- **D. Accessibility.** ARIA labels, focus trap on modals, `aria-modal`, `aria-live`, color contrast WCAG AA, keyboard nav, `prefers-reduced-motion`.
- **E. Performance.** Bundle size, re-fetch waste, render thrash, backend index implications.
- **F. Security / legal.** Constant-time compares, audit-chain immutability, webhook signature verification, PII handling, rate limiting, content-type checks.
- **G. Documentation / discoverability.** Strategy doc end-to-end, operator playbook, internal docs for rotation/recovery.

The Agent prompt MUST require: **specific file:line references**, not vague advice. "backend/eSignRoutes.js:678 the /sign handler doesn't guard against double-submission" beats "consider improving error handling."

Cap audit output at ~3000 words. Prioritize: **top 10 must-fix, next 10 should-fix, rest nice-to-have**.

### Phase 2 — Calibrated rating

Give an honest number out of 100. **No flattery, no aspirational "98/100 if you squint."** The rating should reflect:

- How many must-fix items remain (each one is a multi-point deduction)
- Visible UX gaps vs. the leading competitor (each ~1-3 points)
- Security/legal posture (each unaddressed item ~2-3 points)
- Performance budget (each visible jank ~1 point)

A real 78/100 with a clear roadmap is far more useful to Andrew than an inflated 95/100 that doesn't survive the next audit. Be the colleague who tells him the truth.

### Phase 3 — Themed marathon PRs

Bundle the punch list into **3-5 themed PRs** per `shipping-efficiency-budget`. Don't fragment into 20 single-fix PRs. Themes that work:

- **Correctness PR** — token, transactions, race conditions, audit chain, dedup, terminal-state guards
- **Cryptographic / legal PR** — signing, retention, RFC 3161, PAdES-LTA, compliance copy
- **UX-mobile PR** — pinch-zoom / viewport / signature-pad / safe-area / 44pt tap targets / WCAG AA contrast
- **UX-depth PR** — search, sort, undo/redo, resize handles, all field types in toolbar
- **Hardening PR** — rate limiting, CSRF / content-type, focus trap, aria-modal, motion-reduce, PII to storage

Each PR commit message format:
```
feat(area): {theme} — {short summary}

{problem the audit surfaced}
{specific changes with file:line where useful}
{test plan checklist}

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

After each PR merges, verify with: `npx tsc --noEmit`, `npx vitest run --reporter=basic`, then push and wait for CI auto-merge.

### Phase 4 — Re-rate

After every marathon phase, **re-rate honestly**:
- "What changed since last rate?" — list the closed gaps
- "What's the new number?" — be calibrated (a meaningful 5-10 point jump per phase is realistic)
- "What's preventing 99?" — name the remaining gaps with effort estimates
- **Record the new score** — in repos that surface a `/99it` scores panel (today: CastHub1), POST the updated entry to `/api/admin/feature-audit-scores/<featureId>` before closing the loop. See [Recording scores in the admin panel](#recording-scores-in-the-admin-panel-casthub1) below. Skipping this step is the reason the panel goes stale.

If still below 99: **keep going** unless the remaining items are correctly-scoped multi-day projects (cryptography, vendor onboarding, external counsel review). Be honest about which is which.

If at 99: stop. Don't gild the lily — diminishing returns past 99/100 is real, and the user has other features to ship.

## Deferral rules

Some items can't be shipped in a marathon session. Be honest and queue them:

| Item type | Reason to defer | What to do |
|-----------|-----------------|------------|
| RFC 3161 TSA timestamping | Multi-day cryptography work | Document in strategy doc; file as a milestone |
| PAdES-LTA / OCSP embedding | Requires CA cert (anchored to first paying customer) | Document the trigger; file follow-up |
| External counsel sign-off | Time + cost outside the AI session | Note who to engage + when |
| Subprocessor changes (Stripe, Twilio) | Vendor onboarding takes days | File the spec issue |
| Multi-day cryptography | E.g. custom CMS unsigned-attribute embedding | Recommend a different package or wait for upstream |

Filed deferrals go into one of:
- The feature's strategy doc (`docs/strategy/{feature}-system.md`)
- A new GitHub issue with full spec
- `MEMORY.md` if it's a personal-context decision

## Forbidden behaviors

- **Don't flatter.** "This is already pretty good!" is the wrong opener.
- **Don't claim 99 without ground truth.** If the audit surfaced 20 gaps and you fixed 12, that's not 99.
- **Don't skip the competitive benchmark.** "World-class" without naming who you're beating is a hand-wave.
- **Don't fragment into many tiny PRs.** Bundle by theme per `shipping-efficiency-budget`.
- **Don't single-PR for a multi-day item.** TSA + LTA + subcollection migration is not one PR.

## Required outputs at end-of-loop

When you stop (whether at 99 or deferring), produce:

1. **Final rating** with explicit deduction reasoning.
2. **List of merged PRs** with summaries.
3. **Deferred items** with effort estimate + where they're filed (strategy doc / issue / memory).
4. **Honest "what would actually take to hit 99"** if you stopped short.

## Recording scores in the admin panel (CastHub1)

CastHub1 ships `components/admin/FeatureAuditScoresPanel.tsx`, a super-admin view that lists every audited feature's current `/99it` score, remaining deductions, and "ideas to lift toward 99." The panel reads from the `featureAuditScores` Firestore collection.

**The rule:** every `/99it` PR ends with a POST that records the new score. The panel's Refresh button is just a re-read — if nothing POSTs, the panel stays stale forever. This is what bit Andrew on 2026-05-20: 14+ phases of /99it work shipped between PRs #1058 and #1082, and none of them updated scores, so the panel showed marathon-end numbers that no longer matched reality.

**How to POST.** From the repo, with the operator signed in as super-admin:

```bash
# Get an ID token in the browser DevTools console:
#   await firebase.auth().currentUser.getIdToken()
# Then:

curl -sS -X POST https://<api-host>/api/admin/feature-audit-scores/<featureId> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @- <<'EOF'
{
  "displayName":   "Mythie Assistant (AI chat)",
  "area":          "product",
  "linkedIssue":   null,
  "baselineScore": 70,
  "currentScore":  94,
  "baselineAt":    "2026-05-18T23:30:00Z",
  "gaps": [
    { "description": "Voice mode silently broken in iOS Capacitor", "pointsCost": 3 },
    { "description": "Regenerate / edit-and-resend last message",    "pointsCost": 2 }
  ],
  "prsShipped": [
    { "number": 1083, "title": "feat(chatbot): regenerate button (94→95)" }
  ],
  "nextActions": [ "iOS voice via @capacitor-community/speech-recognition" ],
  "notes":       "Phase 14. +1 from regenerate; iOS voice still the next leap."
}
EOF
```

`auditedAt` is set server-side. `currentScore` must be ≥ `baselineScore` (the panel asserts no regressions).

**`featureId` is the slug** — find the existing one by reading `backend/featureAuditScoresRoutes.js`'s `SEED_SCORES` array. Don't invent a new slug if the feature already has a row; just bump the existing one. New features (no prior audit) can use a new slug — match the slug to the audit's target.

**No POST → no update.** If the panel needs a refresh but no audit ran, the score didn't change. Don't ghost-bump.

## Worked example — e-sign system (2026-05-18)

After ES-1 → ES-7 shipped, Andrew said "rate this 99/100." Loop:

- **Phase 1 audit** (subagent, 48 findings). Top 10 must-fix included: buggy `__name__` token-lookup query, non-constant-time compare, /sign double-sign race, AES `/start` orphaned sessions, silent unsigned PDF on PAdES failure, cert regenerated every cold start, audit cert truncated at y<80.
- **Phase 2 first rating: 78/100.** Honest. Beat-DocuSign-on-AES-tier was already true; the gap was correctness + mobile UX.
- **Phase 3 PRs:**
  - PR #962 (tighten) — 8 correctness/security, 3 crypto-chain, 2 perf, 2 UX, docs
  - PR #964 (marathon) — Resend delivery, expiry cron, signature → Storage, all 8 field types, pointer events, resize/undo/snap, sign-page zoom + sig modes + safe-area, inbox search/sort/empty/void-reason, rate limiting, content-type
- **Phase 4 re-rate: 93/100.** Remaining 6 points = RFC 3161 TSA (3pt), PAdES-LTA (2pt), events[] subcollection migration (1pt). All correctly-scoped multi-day projects; deferred with notes in `docs/strategy/esign-system.md` and issue #963.

The end state shipped on a same-day marathon, and 93/100 was the honest call — not 99/100, not 98/100 with hand-waving.

## Trigger phrases

Andrew invokes via any of:
- `/99it`
- "can you rate this 99/100"
- "99 this"
- "audit to 99"
- "perfect this feature"
- "marathon this to 99"
- "is this 99/100?"

Treat every variant as the same skill invocation.

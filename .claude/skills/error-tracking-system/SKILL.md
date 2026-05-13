---
name: error-tracking-system
description: Self-hosted portfolio-wide error tracking, bug reporting, and AI fix-suggestion system that replaces Sentry across all portfolio apps. Reference implementation lives in CastHub1 (services/errorReporter.ts, backend/clientErrorRoutes.js, components/BugReportModal.tsx). Covers browser capture, offline suppression, stale-chunk reload, breadcrumbs, fetch wrapping, session IDs, Firestore persistence, dedup, regression detection, severity ratcheting, a 3-bot escalation layer, GitHub Issues bridge, per-app ErrorDashboard at /admin/errors, and the CRM-ai master ErrorsPanel rollup. Keywords: error tracking, observability, Sentry replacement, ErrorDashboard, errorEscalations, appHealth, bugReports, regression watcher, error spike detector, daily health score.
version: 2.0.0
last_reviewed: 2026-05-10
expires: 2026-11-10
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
stack_pinned_to:
  react: ^18
  typescript: ^5
  firebase: ^10
  firebase-admin: ^12
  anthropic-sdk: ^0.52
drift_sentinels:
  - vendor_ref:Sentry must not appear as an active runtime dependency in adopting repos
  - model_ref:claude-3 must not appear; use claude-opus-4-7 / claude-sonnet-4-6 / claude-haiku-4-5
  - firestore_collection:clientErrors must exist in deployed firestore.rules of every adopting repo
  - file:services/errorReporter.ts must exist in any adopting repo
  - file:backend/clientErrorRoutes.js must exist or be adapted to the repo's backend layer
auto_heal_checks:
  - check_expires_date
  - check_stack_pinned_versions_against_installed
  - check_reference_files_present_in_castHub1
  - check_no_paid_vendor_introduced
  - check_firestore_rules_grant_clientErrors_write_to_authed_users
  - check_admin_only_read_on_clientErrors_and_appHealth
---

# Error Tracking System

Self-hosted error tracking, bug reporting, and AI fix-suggestion across the portfolio. Replaces Sentry. No new paid vendor. Firestore-backed. Anthropic SDK only for the optional fix-suggestion step.

Always load `safe-edit-policy` first. Composes with `production-error-to-regression`, `qa-hardening`, `vendor-consolidation-policy`, `firestore-rbac-helpers`, `skill-auto-heal`.

## When to use

- Adopting an app onto the portfolio observability stack
- Removing Sentry / LogRocket / etc. from any repo
- Building or auditing the per-app ErrorDashboard at `/admin/errors`
- Wiring the CRM-ai master ErrorsPanel
- Any time error capture, dedup, escalation, or AI fix suggestion is touched

## When NOT to use

- Backend-only services with no browser surface (use server log shipping instead)
- Stack F (empty repos)
- Apps where the user has explicitly opted into a different observability vendor (rare; requires `vendor-consolidation-policy` ADR)

## Reference implementation — CastHub1

Three files. Read these first and copy/adapt verbatim. Do not reinvent.

| File | Role |
|---|---|
| `services/errorReporter.ts` | Browser-side capture. Wraps `window.onerror`, `unhandledrejection`, and `fetch`. Suppresses while offline, queues, retries on reconnect. Detects stale-chunk errors and triggers a single hard reload. Records breadcrumbs (clicks, route changes, fetches) with a sliding 50-entry buffer. Generates a per-tab session ID. Posts to `/api/client-errors`. |
| `backend/clientErrorRoutes.js` | Express route. Validates payload, fingerprints (`message + first stack frame + route`), dedups by fingerprint into `clientErrors`, ratchets severity (info → warn → error → critical) based on count and route criticality, detects regressions (resolved fingerprint reappearing post-deploy), writes to Firestore via `firebase-admin`. On critical or regression, calls Anthropic for a fix suggestion (model: `claude-sonnet-4-6`, with prompt caching on the repo context block). |
| `components/BugReportModal.tsx` | User-facing report form. Voice dictation via Web Speech API. Captures current route, last 20 breadcrumbs, screenshot (html2canvas), session ID. Writes to `bugReports`. |

When adopting in a new repo, copy these three files into the same paths and only adjust import paths + Firestore project config.

## Firestore collections

All four collections are admin-read by default. Writes are authed-user only and shape-validated by `firestore.rules`. See `firestore-rbac-helpers`.

### `clientErrors`

One doc per unique fingerprint per app. High-volume — never read from a customer surface.

```
clientErrors/{appId}_{fingerprint}
  appId: string
  fingerprint: string                  # sha1(message + topFrame + route)
  message: string
  stack: string
  route: string
  userAgent: string
  firstSeen: Timestamp
  lastSeen: Timestamp
  count: number
  severity: 'info' | 'warn' | 'error' | 'critical'
  resolved: boolean
  resolvedAt: Timestamp | null
  resolvedByDeploy: string | null      # commit sha
  regressionCount: number              # times it came back after resolve
  sampleSessionIds: string[]           # cap 10
  sampleUserIds: string[]              # cap 10
  aiFixSuggestion: string | null       # populated lazily on critical
  aiFixModel: string | null            # 'claude-sonnet-4-6' etc
```

Indexes: `(appId, severity, lastSeen DESC)`, `(appId, resolved, lastSeen DESC)`, `(appId, regressionCount DESC)`.
Retention: 90 days for resolved, indefinite for unresolved (with a `count > 1` guard to drop noise).

### `bugReports`

One doc per user submission via `BugReportModal`.

```
bugReports/{auto}
  appId: string
  userId: string
  route: string
  description: string                  # transcribed if voice
  inputMode: 'text' | 'voice'
  breadcrumbs: Breadcrumb[]            # last 20
  screenshotUrl: string | null         # Firebase Storage
  sessionId: string
  createdAt: Timestamp
  status: 'new' | 'triaged' | 'fixed' | 'wontfix'
  linkedClientErrorIds: string[]       # populated by triage
  linkedGithubIssue: string | null
```

### `appHealth`

Daily roll-up — one doc per app per day. Cheap to read; the CRM-ai panel relies on this.

```
appHealth/{appId}_{YYYYMMDD}
  appId: string
  date: string                         # YYYY-MM-DD
  totalErrors: number
  uniqueFingerprints: number
  newFingerprints: number
  regressions: number
  criticalCount: number
  bugReports: number
  healthScore: 0..100                  # weighted formula in dailyHealthScore bot
  trend: 'improving' | 'stable' | 'degrading'
```

Retention: 365 days.

### `errorEscalations`

The escalation queue. Small (10s of docs/day per portfolio). The ONLY error-source the CRM-ai master ErrorsPanel reads alongside `appHealth`.

```
errorEscalations/{auto}
  appId: string
  fingerprint: string
  reason: 'spike' | 'regression' | 'critical_route' | 'manual'
  detectedBy: 'errorSpikeDetector' | 'regressionWatcher' | 'manual'
  severity: 'warn' | 'error' | 'critical'
  count: number
  baselineCount: number
  routes: string[]
  firstSeen: Timestamp
  detectedAt: Timestamp
  acknowledged: boolean
  acknowledgedBy: string | null
  acknowledgedAt: Timestamp | null
  promoted: boolean                    # promoted to GH issue
  githubIssueUrl: string | null
  resolvedAt: Timestamp | null
```

Indexes: `(promoted, acknowledged, detectedAt DESC)`, `(appId, acknowledged, detectedAt DESC)`.
Retention: indefinite (small volume, audit trail).

## Per-app ErrorDashboard — `/admin/errors`

Required surface in every adopting app. Admin-only via existing `firestore-rbac-helpers` `isAdmin()` check.

Sections:

1. **Live errors** — `clientErrors` filtered by `appId`, sorted by `lastSeen DESC`, default severity ≥ `warn`. Filters: severity, route, userId substring, sessionId, resolved/unresolved, regression-only.
2. **Bug reports** — `bugReports` for this app, sorted by `createdAt DESC`. Click to expand breadcrumbs + screenshot.
3. **Today's health** — single `appHealth` doc for today. Shows score, trend, deltas vs. yesterday.
4. **Escalations** — `errorEscalations` for this app, unacknowledged first.

Per-row actions:
- **Acknowledge** — sets `acknowledged: true` (escalations) or marks reviewed (errors).
- **Resolve** — sets `resolved: true`, `resolvedAt: now`, `resolvedByDeploy: <current commit sha>`.
- **Escalate** — manually inserts an `errorEscalations` doc with `reason: 'manual'`.
- **Promote to GitHub Issue** — see GitHub Issues bridge below.
- **Show AI fix suggestion** — lazy-fetches `aiFixSuggestion`; triggers a one-shot Anthropic call with prompt-caching if not yet present.

Regression badge: red badge on rows where `regressionCount > 0`. Compose with `production-error-to-regression` — every regression should produce a permanent test.

## Bot layer

Three Cloud Functions / scheduled jobs. Reference: CastHub1 `backend/clientErrorRoutes.js` exports the bot bodies; runner is the host repo's scheduler (Firebase Functions, Cloud Run cron, or GitHub Actions cron).

### `errorSpikeDetector` — every 5 minutes

For each app:
1. Aggregate `clientErrors.count` over the last 5 minutes vs. the 1-hour rolling baseline.
2. If `recent ≥ 3× baseline` AND `recent ≥ 10` → write an `errorEscalations` doc (`reason: 'spike'`).
3. Dedup: do not insert if an unacknowledged spike for the same `(appId, fingerprint)` already exists in the last 30 minutes.

### `regressionWatcher` — hourly

For each app:
1. Find `clientErrors` where `resolved == true` AND `lastSeen > resolvedAt`.
2. For each, increment `regressionCount`, flip `resolved → false`, ratchet severity up one notch, write an `errorEscalations` doc (`reason: 'regression'`).

### `dailyHealthScore` — daily at 06:00 UTC

For each app:
1. Sum yesterday's `clientErrors` activity, count regressions, count criticals, count bug reports.
2. Compute weighted score: `100 - (0.5*criticals + 0.3*regressions + 0.1*bugReports + 0.05*newFingerprints)`, floor 0.
3. Compare to 7-day moving average → `improving` / `stable` / `degrading`.
4. Write the `appHealth` doc.

## GitHub Issues promotion bridge

When a user clicks **Promote to GitHub Issue** on an `errorEscalations` row (or when an escalation has `severity == 'critical'` AND `acknowledged == false` for > 1 hour, the bridge auto-promotes):

1. Open one GitHub Issue per `(appId, fingerprint)`. Title: `[error] {message[:80]} — {route}`. Body: stack, count, baselineCount, sample sessionIds, link back to `/admin/errors?fingerprint=...`, and the `aiFixSuggestion` if present.
2. Set `errorEscalations.promoted = true` and store `githubIssueUrl`.
3. Label `error-tracking`, `auto-promoted`, plus `severity-{warn|error|critical}`.
4. Idempotency: re-promoting the same fingerprint links to the existing open issue rather than creating a duplicate.

Use the host repo's existing GitHub Octokit / GitHub MCP path. Do NOT introduce a new GitHub App.

## CRM-ai master ErrorsPanel

The CRM-ai admin surface that watches all portfolio apps at once.

**Hard rule — read scope:** the ErrorsPanel reads ONLY `errorEscalations` (collectionGroup) and `appHealth` (collectionGroup). It MUST NOT query raw `clientErrors`. That collection is per-app, high-volume, and reading it from a master surface destroys cost guarantees and breaks per-app tenancy.

Required composite indexes:
- `errorEscalations`: `(promoted, acknowledged, detectedAt DESC)` (collectionGroup)
- `appHealth`: `(date, healthScore ASC)` (collectionGroup)

UI:
1. **Portfolio health strip** — today's `appHealth` for each app, color-coded by score.
2. **Active escalations** — unacknowledged `errorEscalations` across all apps, severity-sorted.
3. **Promotion queue** — escalations with `acknowledged == true` AND `promoted == false`.
4. **GitHub Issues opened** — `promoted == true` AND `resolvedAt == null`, with link out.

Click-through to a per-app `/admin/errors` link, never to a raw `clientErrors` query.

## Sentry migration checklist

Per repo, in this order:

1. **Inventory** — `grep -rn '@sentry\|Sentry\.' src backend functions` to enumerate every call site.
2. **Add the new system** — copy `services/errorReporter.ts`, `backend/clientErrorRoutes.js`, `components/BugReportModal.tsx` from CastHub1.
3. **Wire `errorReporter.init({ appId, sessionId })`** at app bootstrap.
4. **Replace call sites** — `Sentry.captureException(e)` → `errorReporter.report(e)`. `Sentry.addBreadcrumb(b)` → `errorReporter.breadcrumb(b)`.
5. **Update CSP** — drop `*.sentry.io` from `connect-src`; add the app's own backend (already there). See `firebase-hosting-security`.
6. **Drop the dependency** — `pnpm remove @sentry/browser @sentry/react @sentry/node @sentry/tracing` (or yarn/npm equivalent).
7. **Delete config** — `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `.sentryclirc`, `SENTRY_*` env vars.
8. **30-day overlap window** — keep both running in production for 30 days. Daily diff: did the new system see every fingerprint Sentry saw? Resolve gaps.
9. **Close the Sentry project** — only after the overlap diff is clean for 7 consecutive days.
10. **Update `vendor-onboarding-walkthrough` notes** — mark Sentry as retired for this repo.
11. **Update `production-error-to-regression`** — its trigger is now "ErrorDashboard alert fires or error is auto-escalated".

## Self-update protocol

This skill carries its own staleness contract. On load:

1. **Check `expires`** — if today ≥ `expires`, surface a 🔧 manual task: "error-tracking-system skill expired YYYY-MM-DD; run `skill-auto-heal` and re-review".
2. **Check `stack_pinned_to`** — diff against the adopting repo's `package.json`. Mismatches go to manual tasks (never auto-bump).
3. **Run `drift_sentinels`** — every sentinel that fails produces a manual task. Examples: `@sentry/*` still in `package.json` after migration day, `claude-3-` model names anywhere in code, `services/errorReporter.ts` missing.
4. **Never auto-edit** — this skill produces a report, per `safe-edit-policy`. Real edits require explicit confirmation.

`skill-auto-heal` is the cross-skill auditor that runs all of these checks against every skill in the hub once a month.

## Output format

```
ERROR-TRACKING-SYSTEM ADOPTION — [date] — [appId]

CURRENT STATE
  Sentry present: [yes/no]
  errorReporter.ts present: [yes/no]
  clientErrorRoutes.js present: [yes/no]
  BugReportModal.tsx present: [yes/no]
  Firestore rules grant clientErrors write: [yes/no]
  /admin/errors route exists: [yes/no]

CHANGES MADE
  Files added: [list]
  Files modified: [list]
  Dependencies removed: [list]
  Dependencies added: [list — should be empty or firebase-admin only]

DRIFT SENTINELS
  [sentinel] — [pass/fail] — [evidence]

🔧 MANUAL TASKS FOR ANDREW: [per safe-edit-policy Step 8]
```

## Common mistakes

1. **Querying `clientErrors` from CRM-ai** — forbidden. Use `errorEscalations` + `appHealth` only.
2. **Skipping the 30-day Sentry overlap** — you will miss capture gaps. Honor it.
3. **Auto-bumping `stack_pinned_to`** — this skill never edits versions; surface to Andrew.
4. **Reinventing the capture layer** — copy CastHub1 verbatim, don't rewrite. Subtle bugs (offline suppression, stale-chunk reload) live in that file.
5. **Introducing a new paid vendor** — forbidden by `vendor-consolidation-policy`. The whole point of this skill is to remove one.

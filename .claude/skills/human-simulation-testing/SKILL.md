---
name: human-simulation-testing
description: Use to design or run human-behavior simulation tests for any portfolio app — 10-persona matrix (first-time, returning, distracted, frustrated, power, admin, mobile, slow-network, malicious, recovery) with stack-conditional automation. Surfaces real failure modes before users do. Stack-conditional: A/B get Playwright; C gets Lighthouse + manual scripts; D/E get adapted approaches. Keywords: human simulation, persona testing, user testing, Playwright, accessibility, mobile, slow network, malicious, recovery, frustrated user, edge case, smoke test.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Human Simulation Testing

Test apps the way real people use them — including the people who are tired, distracted, on bad WiFi, or actively trying to break things. Most QA tests the happy path; this catches what the happy path misses.

Always load `safe-edit-policy` first.

## When to use

- Pre-launch readiness pass on any user-facing app
- After a feature change to a money-touching or auth-touching path
- Quarterly per repo, paired with `portfolio-health-audit`
- When you suspect an edge case is not covered by unit/integration tests

## When NOT to use

- Backend-only repos with no UI (Stack E `artas-blog-automation`, Stack D `artas-wordpress-backup`)
- Pre-MVP repos where the happy path itself isn't built
- Empty/placeholder repos (Stack F)

## The 10 personas

Every app gets all 10. For each persona, define: goal, preconditions, action sequence, expected result, likely failure points, test type, telemetry to capture.

### 1. **First-time user**
- **Goal:** Sign up and complete the primary action within 3 minutes
- **Preconditions:** Cleared cookies, never seen the app, no account
- **Likely failures:** Confusing CTA, required-field surprises, OAuth redirect loops, "what is this app even" confusion
- **Test type:** Playwright (Stack A/B) + manual script (Stack C)
- **Telemetry to capture:** time-to-first-action, drop-off step, any `console.error`

### 2. **Returning user (logged in, knows the app)**
- **Goal:** Complete a routine task in <30 seconds
- **Preconditions:** Existing account, in the typical entry state
- **Likely failures:** Stale session expiry, "we logged you out" mid-task, slow load on the dashboard
- **Test type:** Playwright (auth fixture) + production analytics review

### 3. **Distracted user**
- **Goal:** Same as routine, but switches tabs, takes a phone call, comes back 10 minutes later
- **Preconditions:** Form half-filled, then idle 10 min, then resume
- **Likely failures:** Form data lost, session expired silently, double-submit when "Submit" is finally clicked
- **Test type:** Playwright with `page.waitForTimeout(600_000)` + form persistence assertion

### 4. **Frustrated user**
- **Goal:** Get past an error and complete the task anyway
- **Preconditions:** Error state intentionally triggered (bad input, payment fail, network blip)
- **Likely failures:** Error message is unhelpful, retry button doesn't work, page reload loses state, support link missing
- **Test type:** Playwright with intercepted network + error-state assertion

### 5. **Power user**
- **Goal:** Bulk action, keyboard shortcut, or admin operation
- **Preconditions:** Existing account with elevated permissions or a lot of data
- **Likely failures:** Pagination breaks at scale, bulk select doesn't deselect properly, keyboard shortcut conflicts
- **Test type:** Playwright with seeded fixture data (>100 items)

### 6. **Admin user**
- **Goal:** Take a privileged action (impersonate, refund, suspend, override)
- **Preconditions:** Admin account, target user/record
- **Likely failures:** Permissions check missing on a sub-route, audit log not written, undo not available
- **Test type:** Playwright with admin fixture + Firestore audit log assertion

### 7. **Mobile user**
- **Goal:** Same as routine, but on iPhone/Android viewport
- **Preconditions:** Playwright `device: 'iPhone 14'` (or Capacitor build for CastHub1/Tribeca/holiday-lights)
- **Likely failures:** Tap targets too small, modal traps focus, virtual keyboard covers input, scroll-jacking
- **Test type:** Playwright mobile emulation + Capacitor smoke test on real device for Stack A repos with Capacitor

### 8. **Slow-network user**
- **Goal:** Same as routine, but on Slow 3G
- **Preconditions:** Playwright `route` throttling or Chrome DevTools network throttling
- **Likely failures:** Loading state missing, double-click causes double-submit, timeout error with no retry
- **Test type:** Playwright with `page.route('**', route => setTimeout(() => route.continue(), 500))`

### 9. **Malicious user**
- **Goal:** Try to access something they shouldn't
- **Preconditions:** Attempts: SQL injection in form fields, XSS payloads in user content, direct URL access to admin routes, modified JWT, reused expired token
- **Likely failures:** No server-side validation, IDOR on document IDs, role escalation by editing local state
- **Test type:** Playwright + Firestore Rules unit tests + security review (link to `qa-hardening` Stack A4)

### 10. **Recovery user**
- **Goal:** Recover from a broken state — forgot password, deleted by accident, account locked, payment failed, browser crashed mid-checkout
- **Preconditions:** Triggered failure state for each scenario
- **Likely failures:** Recovery email doesn't arrive (or goes to spam), undo within 5 sec is the only option, cancelled subscription can't be reactivated
- **Test type:** Playwright + manual email check + telemetry on recovery success rate

## Stack-conditional setup

### Stack A & B (UI apps)

Install Playwright if not present:
```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium webkit
```

Create `e2e/personas/` folder. One file per persona × per critical journey:
```
e2e/personas/01-first-time-user.spec.ts
e2e/personas/02-returning-user.spec.ts
...
```

For Stack A repos with Capacitor (`CastHub1`, `Tribeca-Film-Festival-2026`, `holiday-lights`), persona 7 (mobile) also includes:
```bash
npx cap run android  # or ios
```
…and a manual test script with screenshots.

### Stack C (HTML/static)

No Playwright. Instead:

- **Lighthouse-CI** runs personas 1, 7, 8 (first-time perf, mobile, slow network) automatically on PRs
- **Manual persona scripts** as `.md` files under `manual-tests/` — one per persona, with click-by-click steps the user follows during pre-launch
- **Linkinator + html-validate** covers persona 9 (broken links = malicious URL probe surface)

### Stack D & E (no UI)

Skip persona 1-7. Adapt personas 8, 9, 10:
- Persona 8 (slow): does the cron retry on rate limit? (For `artas-blog-automation` — verified in retries on 429/5xx/529)
- Persona 9 (malicious): is the input from any external source validated?
- Persona 10 (recovery): if the cron fails, does it retry next run, page someone, or silently die?

## App-specific starter flows

For each app, write the persona × journey starter set. Below are the high-priority journeys to cover first.

### CastHub1 (Mythie)
- **Casting submission**: talent uploads headshot + reel, submits to a casting call, sees confirmation
- **Casting director triage**: CD reviews queue, marks 5 as "shortlist", talent gets notification
- **Producer subscription checkout**: visitor → free trial → upgrade to Producer tier via Stripe
- **Quo phone contact inbox**: SMS arrives at +1 816-600-8607 → admin sees it in Contact Inbox

### Teleprompter
- **TikTok session**: user records a script, exports to TikTok, post completes
- **Recovery**: TikTok upload fails — does the recorded video stay in localStorage for retry?

### RunOfShow
- **Live event run**: stagehand opens cue list on phone, advances cues during a real show, no Wi-Fi blip causes data loss
- **Admin reliability console**: does Sentry surface a synthetic error within 60 seconds?

### awardssubmission (Aclamos)
- **Entry submission**: filmmaker pays Stripe entry fee, fills form, uploads asset, gets confirmation email (Resend)
- **Admin past-winners import**: admin uploads CSV, sees preview, confirms, records appear

### Producing-Hollywood-Invoicing
- **Invoice send**: admin creates invoice, recipient gets SMTP2GO email, recipient pays via Stripe link, status updates
- **Recurring monthly**: scheduled job runs, invoices go out, no duplicates

### theproductionshelf
- **Digital product purchase**: visitor browses, clicks Payhip checkout, completes purchase, downloads file (Payhip-hosted)
- Persona 9 only (malicious): can the download URL be shared? (Payhip is supposed to time-limit; verify.)

### Tribeca-Film-Festival-2026
- **Event check-in**: investor arrives, scans QR, sees check-in confirmation, badge updated
- **Discrepancy resolution**: sheet sync flags a mismatch, admin resolves, both sources stay in sync

### holiday-lights / noelly-app
- **Discovery → tour creation**: user opens map, picks 3 stops, builds a tour, navigates with Mapbox
- **Donation**: user donates to highlighted display via Stripe Connect → EveryOrg, charity gets attribution

## Cadence

| Cadence | What runs |
|---|---|
| **On every PR** | Personas 1, 4, 8, 9 — fast, catches regressions on critical paths |
| **Nightly** | All 10 personas, all critical journeys, full Playwright suite |
| **Weekly** | Mobile persona on real device for Capacitor apps |
| **Pre-launch only** | Manual scripts for Stack C, manual mobile QA for Stack A apps |

## Output format

```
HUMAN SIMULATION — [repo] — [date]

PERSONA × JOURNEY MATRIX
                      | Sub | Triage | Checkout | ...
First-time            | ✅   | ✅     | ❌ FAIL  | ...
Returning             | ✅   | ✅     | ✅       | ...
Distracted            | ⚠️   | ✅     | ❌ FAIL  | ...
[...all 10 rows...]

FAILURES
1. First-time × Checkout: Stripe redirect loses cart state on back button (e2e/01-first-time × checkout.spec.ts:42)
2. Distracted × Submission: Form clears after 10min idle (no localStorage backup)
[...]

GAPS (no test exists yet)
- Persona 9 × admin route: never tested

🔧 MANUAL TASKS FOR ANDREW: [per safe-edit-policy Step 8]
```

## Common mistakes

1. **Skipping the malicious persona "because we trust users"** — the portfolio includes invoice apps and Stripe. There is no "trust" budget here.
2. **Testing in test mode rules** — see `qa-hardening` A4. Use the production rules file.
3. **Aiming for 100% persona × journey coverage** — diminishing returns past the critical journeys. Cap at the top 3-5 journeys per app.
4. **Manual scripts that age silently** — for Stack C apps, version the manual scripts in `manual-tests/` and review quarterly. Stale scripts are worse than no scripts.
5. **No telemetry for production personas** — drop-off rate, time-to-first-action, recovery success rate should land in PostHog/Firebase Analytics so you can see whether tests reflect reality.

## Source of truth in this portfolio

- Reference Playwright setup: `~/GitHub/CastHub1` (when added) — to be the canonical Stack A example after this rollout
- Persona × journey matrix template: `~/GitHub/claude-skills/portfolio-adoption-pack/testing/human-simulation-matrix.md.template`
- For Capacitor mobile testing: see `~/GitHub/CastHub1/android/` for the keystore + build flow (referenced in user memory `reference_mythie_android_build.md`)

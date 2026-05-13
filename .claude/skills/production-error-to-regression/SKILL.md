---
name: production-error-to-regression
description: Use when a production error (Sentry alert, user report, or post-mortem finding) needs to be converted into a permanent regression test. Pre-loaded with known portfolio failure modes — Firebase Auth Google redirect, Firestore 403, double-submit races, TikTok upload, Stripe webhook misses, Capacitor Android quirks. Stack-conditional. Keywords: regression, post-mortem, Sentry alert, bug-to-test, fix-and-prevent, incident response.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Production Error → Regression Test

A bug fix without a regression test means the same bug ships again in 6 weeks. This skill converts every fix into a permanent guardrail.

Always load `safe-edit-policy` first.

## When to use

- ErrorDashboard alert fires or error is auto-escalated by the bot layer (or any observability alert fires in production)
- A user reports a bug
- A post-mortem identifies a root cause
- Reviewing your own commit history sees a "fix X" you don't trust to stay fixed

## When NOT to use

- A fix that genuinely cannot recur (e.g., copy edit, one-time data migration)
- Pre-launch repos where the bug is in code that's still being rewritten weekly
- Stack F (no codebase yet)

## The four-step loop

### 1. Capture the failure exactly

Before fixing anything, write a failing test that reproduces the bug. The test must fail for the same reason the user saw the bug. If you fix first and write the test from memory, the test rarely catches the actual cause.

Capture from the source of truth:
- **Sentry alert** → grab the stack trace, user actions, env, breadcrumbs
- **User report** → ask for the exact URL, browser, time, action sequence
- **Post-mortem** → already has the reproduction steps, copy them verbatim

### 2. Write the failing test

For Stack A/B (UI):

```ts
// e2e/regression/2026-05-10-stripe-double-submit.spec.ts
import { test, expect } from '@playwright/test';

test.describe('regression: Stripe checkout double-submit creates two charges', () => {
  test('rapid double-click on Pay should produce one charge', async ({ page }) => {
    await page.goto('/checkout');
    await page.fill('[data-testid=cardNumber]', '4242424242424242');
    // ... fill fields
    const payButton = page.locator('[data-testid=pay]');
    await Promise.all([payButton.click(), payButton.click()]);  // double-click
    // After fix: exactly one charge in test mode
    const charges = await getStripeTestCharges();
    expect(charges).toHaveLength(1);
  });
});
```

The test name MUST include date + bug summary. Future-you will be thankful.

### 3. Fix the code

Now make the test pass. The fix should:
- Be the smallest change that makes the regression test pass
- Not introduce new abstractions just because you're already there
- Pass all other existing tests

### 4. Lock the test in CI

The regression test must run on every PR — see `ci-gate-builder`. Never mark a regression test as `.skip()` to "fix later". A skipped regression test is worse than no test (false confidence).

## Pre-loaded portfolio failure modes

These are real failure patterns observed (or strongly likely) in this portfolio. Each gets a regression-test scaffold.

### F1. Firebase Auth Google redirect failures (Stack A)

**Symptom:** `Error 400: origin_mismatch` at sign-in. Domain not in Google Cloud Console JS Origins.

**Regression test:** Not a Playwright test — a CI assertion that compares the deployed origin list to the expected list:
```bash
# .github/workflows/check-oauth-origins.sh
EXPECTED="https://mythie.app https://casting.mythie.app https://talent.mythie.app"
ACTUAL=$(gcloud iap oauth-clients describe ... --format=json | jq -r '.javaScriptOrigins[]')
diff <(echo "$EXPECTED" | tr ' ' '\n' | sort) <(echo "$ACTUAL" | sort) || (echo "DRIFT"; exit 1)
```

User memory `feedback_custom_domain_oauth_origins.md` documents this. Encode it.

### F2. Firestore permission 403 in prod, fine in dev (Stack A)

**Symptom:** Dev runs in test-mode rules; prod uses real rules. Read works in dev, fails in prod.

**Regression test:** Always run rules tests against the *committed* `firestore.rules` file (see `qa-hardening` Stack A4). Never run tests in test mode.

### F3. Double-submit races on Firestore writes (Stack A)

**Symptom:** User clicks "Submit" twice; two documents created with same payload, different IDs.

**Regression test:** Playwright with `Promise.all([button.click(), button.click()])`, then assert query returns exactly 1 doc. **Fix pattern:** disable the button immediately on click + use a deterministic ID (`setDoc` with a known doc ref) instead of `addDoc`.

### F4. TikTok upload failures (Teleprompter only)

**Symptom:** TikTok API returns 200 but the video never appears in user's draft.

**Regression test:** Mock the TikTok API in tests. Real reproduction requires the user's account; that's a manual smoke test. The unit test asserts: on `status: 'pending'` from TikTok, we poll for `status: 'success'` for up to 5 minutes before declaring failure.

### F5. Stripe webhook missed (any Stripe-using repo)

**Symptom:** User pays, Stripe charges, but app never grants entitlement. Webhook didn't arrive (or arrived during deploy and was dropped).

**Regression test:** See `payment-webhook-safety` skill. Specifically: idempotency key check + replay test. Webhook handler must be safe to call twice with the same `event.id`.

### F6. Empty state crashes (Stack A/B)

**Symptom:** New user hits a page that assumes `data.length > 0`, sees a blank page or React error.

**Regression test:** For every list component, write a test that mounts it with `data=[]` and asserts no crash + visible "no items yet" message.

### F7. Session expiry mid-workflow (Stack A/B)

**Symptom:** User starts a long form, walks away, returns, submits → silent 401, work lost.

**Regression test:** Persona 3 (distracted) test from `human-simulation-testing`. Mock token expiry mid-test, assert form data is preserved in localStorage and recovered on re-auth.

### F8. Capacitor Android-specific failures (CastHub1, Tribeca, holiday-lights)

**Symptom:** Works in browser, fails in Capacitor build (e.g., file picker crashes, intent handling broken).

**Regression test:** Capacitor doesn't have great unit-test coverage. Use a manual smoke test script (markdown checklist under `manual-tests/android/`) that runs against a real device per release. The script is the test.

User memory `reference_mythie_android_build.md` documents the keystore + signing flow. Reference it.

## Output format

```
REGRESSION CONVERSION — [date] — [bug ID or short title]

ROOT CAUSE
  [one paragraph]

SENTRY / SOURCE LINK
  [URL]

REPRODUCTION STEPS
  1. [...]
  2. [...]

FAILING TEST WRITTEN
  Path: [test file path]
  Test name: [exact name]
  Why it fails (before fix): [one sentence]

FIX
  Files: [list]
  Diff summary: [one paragraph]

VERIFICATION
  - [ ] Failing test now passes
  - [ ] All other tests still pass
  - [ ] Test added to required CI checks

🔧 MANUAL TASKS FOR ANDREW: [per safe-edit-policy Step 8]
```

## Common mistakes

1. **Fix first, test "later"** — later never happens. Test first, always.
2. **Test reproduces the symptom but not the cause** — a flaky test is worse than no test. Re-examine: when you remove your fix, does the test still fail for the same reason?
3. **Skipping regression tests on flake** — flakes have causes; surface them. `test.skip` of a regression test is forbidden.
4. **One-line "// regression for #123" comment as documentation** — fine to include, but the test name should also encode the bug.
5. **Closing the Sentry alert before the regression test ships** — the alert is your reminder. Close it only after CI gate includes the new test.

## Source of truth in this portfolio

- Sentry projects: live for `~/GitHub/holiday-lights`, `~/GitHub/RunOfShow` (per `.env.example` inspection 2026-05-10). Other repos: status unknown — check `vendor-onboarding-walkthrough`.
- Stack A regression test directory pattern: `e2e/regression/YYYY-MM-DD-short-title.spec.ts`
- Reference: integration with `qa-hardening`, `human-simulation-testing`, `ci-gate-builder`, `payment-webhook-safety`

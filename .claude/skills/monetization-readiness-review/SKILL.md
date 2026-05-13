---
name: monetization-readiness-review
description: Use to audit any portfolio app for revenue-readiness before launch or after a payment-touching change. Tied to concrete technical systems, not marketing. Covers payment flow correctness, entitlement/delivery, conversion events, error recovery, subscription lifecycle, refunds, recurring revenue, passive income suitability. App-specific guidance for theproductionshelf (Payhip), awardssubmission (Stripe entry fees), CastHub1 (subscription + success fees), invoice apps (collection), Noelly (Stripe Connect + EveryOrg). Keywords: monetization, revenue, Stripe, Payhip, RevenueCat, EveryOrg, entry fee, subscription, entitlement, refund, conversion, passive income, launch readiness.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Monetization Readiness Review

Audit a revenue path end-to-end. Monetization is technical: a checkout that 500s loses money, an entitlement that doesn't grant loses customers, a missed webhook loses both.

This skill is the inverse of marketing advice. Do not produce vague "improve your messaging" output. Tie every finding to a specific code path or test.

Always load `safe-edit-policy` first.

## When to use

- Pre-launch on any revenue-touching app
- After any change to checkout, webhook handler, subscription state, or entitlement check
- Quarterly per revenue-bearing repo
- When considering a new monetization model (subscription → usage-based, etc.)

## When NOT to use

- Apps with no monetization plan (`artas-redesign-preview`, `artas-wordpress-backup`, `googlegenai`, `gemini_project`)
- Pre-MVP — there is no checkout to audit yet

## The 10 audit dimensions

For each, ask the question, capture evidence (file paths, test results), and rate Pass / Gap / Fail.

### 1. Value proposition is testable in code

The thing you're charging for must be a discrete entitlement that a service can grant or deny. If "the value" is "ongoing access to features X and Y", then there must be:
- An entitlement record (Firestore doc, DB row, RevenueCat customer state)
- A check function (`canAccessFeatureX(user)`) used at the route guard AND inside business logic
- A test for the unauthorized case (returns false / throws / 403)

**Audit:** `grep -r "canAccess\|hasEntitlement\|tier\b" services/ hooks/`. If you find UI-only checks but no service-level check, that's a Fail (any malicious user with browser devtools bypasses it).

### 2. Payment flow correctness

For Stripe:
- Use `payment_intent.succeeded` (not `checkout.session.completed`) as your source of truth — it covers all flows including subscriptions, off-session, etc.
- Webhook handler verifies signature with `stripe.webhooks.constructEvent`
- Webhook is idempotent (see `payment-webhook-safety` skill)
- Customer ID is stored on the user record at first payment
- Test mode keys are a separate set of secrets from prod (`STRIPE_SECRET_KEY_TEST` vs `STRIPE_SECRET_KEY`)

For Payhip (theproductionshelf):
- Webhooks are sparse; rely on Payhip's hosted download links
- Verify the link expires and is single-use (Payhip default)
- For the "passive income" claim to hold, no manual step should be required to deliver — confirm the Payhip product is configured to auto-deliver

For RevenueCat (noelly-app):
- Configure entitlements in RevenueCat dashboard, not in app code
- Use RevenueCat's webhook to sync entitlement state to your DB
- Native IAP receipts auto-validate via RevenueCat — don't validate yourself

For Stripe Connect (noelly-app — display owners get paid):
- Onboarding link generation, account status check, payouts dashboard link — all required
- Application fees configured per-charge, not per-account (more flexible)

### 3. Entitlement / delivery correctness

After payment succeeds, the user must receive what they paid for within seconds:

- **Subscription:** entitlement granted, UI shows "you're a Pro Director" within 5 seconds of checkout
- **One-time digital product:** download link emailed AND visible in dashboard
- **Entry fee:** confirmation email AND record in `submissions` collection within 5 seconds
- **Donation:** EveryOrg confirms charity received funds (use their webhook); user gets receipt

**Test:** Playwright E2E that completes checkout in test mode and asserts entitlement appears within 10 sec.

### 4. Pricing model in code matches the website

- Stripe Price IDs in `.env.example` should match what's advertised on the marketing pages
- If a tier exists in code (`tier === 'enterprise'`) but isn't on the pricing page (or vice-versa), that's a Gap

**CastHub1 example:** `.env.example` shows `VITE_STRIPE_PRICE_PRODUCER`, `VITE_STRIPE_PRICE_PRO_DIRECTOR`, `VITE_STRIPE_PRICE_ENTERPRISE`. Marketing pages must list 3 tiers, no more, no fewer.

### 5. Conversion events tracked end-to-end

Every revenue-critical event has a tracked analytics event (see `analytics-event-map`):
- `checkout_start` (with cart value, tier name)
- `checkout_complete` (with revenue, currency)
- `payment_failed` (with failure reason — `insufficient_funds`, `card_declined`, `network`, etc.)
- `entitlement_granted` (after backend confirms)
- `subscription_renewed`
- `subscription_canceled` (with cancel_at_period_end vs immediate)
- `refund_issued`

If any of these are missing, you can't see where the funnel leaks.

### 6. Trust signals visible

Pre-purchase, the user needs to see (in this order of impact):
- Real testimonials with names + roles (or explicit "we're new — here's why we're different")
- Refund policy in plain English
- Security/privacy: "We never see your card; payments are processed by Stripe"
- Contact: visible support email or chat
- For digital products: file size, format, what's included

These are content audits, not code audits. But: assert their presence in the page DOM via Playwright so a copy regression doesn't silently delete the testimonials.

### 7. Refunds + support paths

- **Refund:** Stripe-side refund triggers a webhook; webhook handler revokes entitlement + emails the user. No silent refunds.
- **Failed payment recovery:** Stripe's "Smart Retries" enabled in dashboard; subscription doesn't get cancelled on first failure
- **Support contact:** at minimum a `mailto:` link with a real address you check daily; ideally a Quo/Intercom/Crisp chat widget for high-touch flows

### 8. Recurring revenue plumbing

For subscriptions (CastHub1, anything with monthly tiers):
- Renewal events (`invoice.payment_succeeded`) update `currentPeriodEnd` in user doc
- Cancellation (`customer.subscription.deleted`) revokes entitlement on the period end, not immediately (user paid for the rest of the month)
- Failed renewal (`invoice.payment_failed`) emails the user a payment-update link, doesn't revoke immediately
- Webhook delivery failures: Stripe retries for 3 days; if your handler has been broken for 4 days, the events are gone forever — monitor with Sentry

### 9. Passive income suitability

The "make money while sleeping" filter. For each revenue path:
- Does it require any manual step from Andrew to fulfill an order? If yes, it's not passive — it's a job. (Acceptable for high-margin products; not for low-margin.)
- Does it have an alerting path so failures wake him only when needed? (Not silent failures, not over-alerting.)
- Is there a recurring uptime monitor (UptimeRobot, BetterUptime, etc.) on the checkout page?

For each app, score: **Passive (no daily action needed) / Semi (weekly action) / Active (daily action)**.

### 10. Tax + legal posture

Not a code audit — but the audit must surface gaps:
- Sales tax: Stripe Tax enabled? If selling US-wide, this is a 🔧 MANUAL TASK with high stakes
- VAT: required for EU buyers; Stripe Tax handles
- Receipts: Stripe's auto-receipts enabled? Customers expect them.
- Refund policy + Terms + Privacy linked from checkout

### 11. Vendor cost amortization

Per `vendor-consolidation-policy`. For each paid vendor this app uses, ask: does this app's revenue justify its share of the vendor's monthly cost?

Compute per-vendor share of cost:

```
Vendor monthly cost ÷ apps using this vendor = per-app share

If per-app share > app's monthly profit, the vendor is unprofitable for this app.
```

Examples:
- Plausible $9/mo ÷ 23 apps = $0.39/app/mo — easily justified by any revenue-bearing app
- ConfigCat Pro $99/mo ÷ 3 apps using it = $33/app/mo — justified only if the app earns >$33/mo
- Sentry Team $26/mo ÷ all apps in org = $1.13/app/mo — easily justified at portfolio scope; **never** purchased per-app

If the audit reveals a vendor is unprofitable for an app, the action is:
1. Try to consolidate (move that app to the house default if it isn't already)
2. Drop the vendor for that app if the value is marginal
3. Accept the cost as a portfolio-level expense if the vendor is genuinely required

Surface each unprofitable vendor as a **🔧 MANUAL TASK** for Andrew's decision.

## App-specific reviews

### theproductionshelf (Stack C, Payhip)

- **Model:** one-time digital products, sold via Payhip
- **Code surface:** minimal — page links to Payhip checkout, Payhip handles payment + delivery
- **Audit focus:** verify Payhip link is current, products configured for auto-delivery, file size / format listed on page
- **Passive score:** **Passive** if Payhip auto-delivery confirmed; otherwise Semi
- **Gap watch:** no analytics on Payhip → can't see funnel; consider adding Plausible/PostHog with outbound link tracking

### awardssubmission / aclamos-awards (Stack B, Stripe + Resend)

- **Model:** one-time entry fees per submission category
- **Code surface:** Stripe Checkout, webhook, Resend confirmation email
- **Audit focus:** entry fee pricing matches marketing page; webhook idempotent; Resend email actually sends; admin can refund without breaking record
- **Passive score:** **Semi** (admin must judge submissions; payment is passive)

### CastHub1 / Mythie (Stack A, Stripe subscription + success fees)

- **Model:** Producer/Pro Director/Enterprise subscriptions + per-cast success fee
- **Code surface:** large — Stripe Checkout, customer portal, webhook handler, success fee calculator, multiple entitlement tiers
- **Audit focus:** all 10 dimensions apply; subscription lifecycle is the highest risk area
- **Passive score:** **Active** (success fees require admin verification of cast)

### invoice apps (Producing-Hollywood-Invoicing, 10-Lives-Invoicing, invoice-hub)

- **Model:** invoice generation + Stripe-link payment by client
- **Code surface:** Stripe Payment Link generation, SMTP2GO delivery, webhook on paid
- **Audit focus:** invoice can't be paid twice; payment link expires; receipt to client; status tracking
- **Passive score:** **Passive** for collection; **Active** for invoice creation

### Noelly (holiday-lights / noelly-app — both pending)

- **Model:** Stripe Connect (display owner payouts) + EveryOrg (donations) + RevenueCat (premium tier)
- **Code surface:** highest complexity in the portfolio
- **Audit focus:** Stripe Connect onboarding flow, EveryOrg charity verification, RevenueCat entitlement sync, application fee configuration
- **Passive score:** **Passive** for donations; **Semi** for Connect (display owners need vetting)

## Output format

```
MONETIZATION READINESS — [app] — [date]

REVENUE MODEL: [subscription / one-time / mixed / TBD]
PASSIVE SCORE: [Passive / Semi / Active] — [one-sentence rationale]

10-DIMENSION AUDIT
 1. Value prop testable        — [Pass/Gap/Fail] — [evidence]
 2. Payment flow correctness   — [Pass/Gap/Fail] — [evidence]
 3. Entitlement/delivery       — [Pass/Gap/Fail] — [evidence]
 4. Pricing in code matches    — [Pass/Gap/Fail] — [evidence]
 5. Conversion events tracked  — [Pass/Gap/Fail] — [evidence]
 6. Trust signals visible      — [Pass/Gap/Fail] — [evidence]
 7. Refunds + support          — [Pass/Gap/Fail] — [evidence]
 8. Recurring revenue plumbing — [Pass/Gap/Fail] — [evidence]
 9. Passive income suitability — [Pass/Gap/Fail] — [evidence]
10. Tax + legal posture        — [Pass/Gap/Fail] — [evidence]

P0 (block launch / fix this week)
 - [...]

P1 (fix this month)
 - [...]

P2 (fix this quarter)
 - [...]

🔧 MANUAL TASKS FOR ANDREW: [per safe-edit-policy Step 8]
```

## Common mistakes

1. **Trusting the dashboard, not the code** — the Stripe dashboard says you got paid; the entitlement check in your service says no. Always test end-to-end.
2. **One webhook handler, no idempotency** — Stripe will replay. See `payment-webhook-safety`.
3. **Auditing the marketing page in isolation** — pricing might match website but not match Stripe Price IDs. Audit them together.
4. **Treating passive income as a binary** — there's a spectrum: Passive vs Semi vs Active. Be honest about which apps are which.
5. **Skipping the cancellation flow** — most attention goes to acquisition; cancellation is where churn lives. Audit the unhappy path.
6. **Vague output** — "improve your monetization" is useless. Every finding must reference a file, a test, or a specific config.

## Source of truth in this portfolio

- Stripe-using repos (verified 2026-05-10): `~/GitHub/CastHub1`, `~/GitHub/awardssubmission`, `~/GitHub/Producing-Hollywood-Invoicing`, `~/GitHub/holiday-lights`, `~/GitHub/noelly-app`
- Payhip-using: `~/GitHub/theproductionshelf` (off-platform, no webhook)
- RevenueCat: `~/GitHub/noelly-app`
- Stripe Connect: `~/GitHub/noelly-app`
- EveryOrg: `~/GitHub/noelly-app`
- Existing skill `stripe-new-app-setup` covers initial setup; this skill complements with audit + ongoing review
- Sister skill `payment-webhook-safety` for the webhook surface specifically

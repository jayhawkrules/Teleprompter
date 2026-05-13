---
name: payment-webhook-safety
description: Use to audit or write a Stripe / Payhip / RevenueCat / EveryOrg webhook handler. Covers signature verification, idempotency, replay safety, retry handling, secret rotation, dead-letter queues, and the "did the webhook actually arrive" alerting. Complements stripe-new-app-setup (which handles setup) and monetization-readiness-review (which audits the broader revenue path). Keywords: webhook, Stripe webhook, idempotency, signature verification, replay, dead letter, retry, payment safety, webhook handler.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Payment Webhook Safety

Webhooks are the most fragile part of any payment integration. They run async, can replay, can arrive out of order, can fail silently, and an unverified webhook is a free entitlement-grant for any attacker who can guess your URL.

Always load `safe-edit-policy` first.

## When to use

- Adding any webhook handler (Stripe, Payhip, RevenueCat, EveryOrg, Twilio, etc.)
- Auditing an existing handler before launch
- After a "user paid but didn't get access" incident
- Rotating webhook signing secrets

## When NOT to use

- The webhook receiver doesn't grant entitlement or change state (then it's a notification, not a webhook)
- Repos with no payment integration (most of the portfolio)

## The 7-point safety checklist

### 1. Signature verification (the #1 most-skipped check)

**Stripe:**
```ts
const sig = req.headers['stripe-signature'];
let event;
try {
  event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
} catch (err) {
  Sentry.captureException(err);
  return res.status(400).send(`Webhook signature verification failed`);
}
```

**Critical:** `req.rawBody` (not parsed JSON). Express `body-parser` strips the raw body unless configured with `verify`. Next.js requires `runtime: 'nodejs'` and `await req.text()`.

**Test:** unit test with a hand-crafted event body and a known-bad signature; assert handler returns 400.

**Payhip:** verify webhook with their `signature` header and your shop secret.

**RevenueCat:** verify the `Authorization: Bearer <secret>` header matches the value you set in their dashboard.

**EveryOrg:** verify webhook signature per their docs (HMAC SHA256 of body with shared secret).

### 2. Idempotency (event will arrive twice)

Stripe's docs say:

> Stripe attempts to deliver your webhooks for up to three days. ... You may also receive duplicate events.

Build idempotency into the handler:

```ts
async function handleStripeEvent(event: Stripe.Event) {
  // Atomic check-and-set: returns true if we're the first to process this event
  const alreadyProcessed = await firestore.runTransaction(async (tx) => {
    const ref = firestore.doc(`webhookEvents/${event.id}`);
    const snap = await tx.get(ref);
    if (snap.exists()) return true;
    tx.set(ref, { source: 'stripe', type: event.type, receivedAt: Timestamp.now() });
    return false;
  });
  if (alreadyProcessed) return res.status(200).send('duplicate');

  // Process the event
}
```

**Test:** call the handler with the same `event.id` twice. Assert: side effect (entitlement grant, email send) happens exactly once.

### 3. Replay safety (event from yesterday could arrive today)

If your handler updates state based on event time, use the event's `created` timestamp, not `Date.now()`:

```ts
// BAD
user.subscriptionEnd = addMonths(new Date(), 1);

// GOOD
user.subscriptionEnd = addMonths(new Date(event.created * 1000), 1);
```

Or pull the canonical state from Stripe:

```ts
const sub = await stripe.subscriptions.retrieve(subscriptionId);
user.currentPeriodEnd = new Date(sub.current_period_end * 1000);
```

Pulling from Stripe is more network calls but eliminates the "old event has stale data" class of bugs.

### 4. Retry handling

Your handler must:
- Return **2xx within 30 seconds** or Stripe retries
- Return **5xx** to ask Stripe to retry (use this for transient failures like DB unreachable)
- Return **4xx** for permanent failures (bad signature, malformed payload) — Stripe will NOT retry

If processing genuinely takes longer than 30 sec (e.g., bulk email send), enqueue and return 200 immediately:

```ts
await enqueueJob('processStripeEvent', { eventId: event.id });
return res.status(200).send('queued');
```

The job worker then has the same idempotency guard.

### 5. Secret rotation

`STRIPE_WEBHOOK_SECRET` will need rotation (suspected leak, key exfiltration, periodic). Without prep, rotation = downtime.

**Pattern:** support TWO secrets at once during rotation:

```ts
const secrets = [
  process.env.STRIPE_WEBHOOK_SECRET,
  process.env.STRIPE_WEBHOOK_SECRET_NEXT,  // optional, set during rotation
].filter(Boolean);

for (const secret of secrets) {
  try { return stripe.webhooks.constructEvent(rawBody, sig, secret); } catch {}
}
throw new Error('signature verification failed for all secrets');
```

Rotation procedure:
1. Generate new secret in Stripe dashboard, set as `STRIPE_WEBHOOK_SECRET_NEXT`
2. Deploy
3. Update Stripe webhook endpoint to use new secret
4. Promote `_NEXT` to primary, drop the old
5. Deploy again

This is a **🔧 MANUAL TASK** template, not automation.

### 6. Dead-letter / observability

When the handler 5xx's repeatedly, Stripe gives up after 3 days. After that, the event is gone forever and you don't know what you missed.

Required:
- Sentry alert on every webhook 5xx
- Dashboard counting webhook events received vs processed-successfully (mismatch = problem)
- Stripe dashboard shows webhook delivery attempts; a 🔧 MANUAL TASK to monitor weekly

For high-stakes events (`charge.refunded`, `customer.subscription.deleted`), consider also pulling Stripe directly on a daily cron to reconcile, in case a webhook was lost.

### 7. Authorization beyond signature

A valid signature means "this came from Stripe", not "this is for the right user". Validate:

- The `customer` ID in the event belongs to a user in your DB (otherwise: ignore, log warning — could be a different Stripe account hitting your URL)
- The `livemode` flag matches your environment (test events shouldn't grant live entitlement; production should reject test events)

```ts
if (event.livemode !== (process.env.NODE_ENV === 'production')) {
  Sentry.captureMessage(`livemode mismatch: event.livemode=${event.livemode}`);
  return res.status(200).send('wrong env, ignored');
}
```

## Stack-specific notes

### Stack A — Firebase + Express backend (CastHub1, Producing-Hollywood-Invoicing)

- Express needs `app.use('/webhook/stripe', express.raw({ type: 'application/json' }))` BEFORE the JSON parser
- Idempotency record lives in Firestore at `webhookEvents/{event.id}`
- Use the Firestore Emulator in CI to test the handler

### Stack B — Next.js (awardssubmission, noelly-app)

- API route at `app/api/webhooks/stripe/route.ts`
- Use `await req.text()` for raw body, NOT `await req.json()`
- Idempotency record in your DB (Postgres, Supabase) with a unique index on `event_id`

### Stack B — Hono / Express (RunOfShow worker)

- Same as Express above, just framework-specific raw body handling

## Output format

```
WEBHOOK SAFETY AUDIT — [repo] — [endpoint] — [date]

PROVIDER: [Stripe / Payhip / RevenueCat / EveryOrg / Twilio / other]

7-POINT CHECKLIST
 1. Signature verification    — [Pass/Gap/Fail] — [code ref]
 2. Idempotency               — [Pass/Gap/Fail] — [code ref]
 3. Replay safety             — [Pass/Gap/Fail] — [code ref]
 4. Retry handling            — [Pass/Gap/Fail] — [code ref]
 5. Secret rotation supported — [Pass/Gap/Fail] — [code ref]
 6. Dead-letter / observability — [Pass/Gap/Fail] — [code ref]
 7. Authorization beyond sig  — [Pass/Gap/Fail] — [code ref]

TESTS REQUIRED
 - [ ] Bad signature returns 400
 - [ ] Duplicate event.id processes once
 - [ ] Old replayed event uses event.created, not Date.now()
 - [ ] Slow handler returns 200 + enqueues
 - [ ] Wrong livemode is rejected

🔧 MANUAL TASKS FOR ANDREW: [per safe-edit-policy Step 8 — secret rotation, dashboard monitoring, Sentry alert setup]
```

## Common mistakes

1. **Forgetting raw body** — `body-parser` strips it; signature verification then always fails. Configure correctly.
2. **Idempotency on user instead of event** — "user already has subscription, skip" is wrong; subscription events are per-event, not per-user.
3. **Catching the exception silently** — webhook handler that swallows errors looks fine and silently drops events. Always rethrow or log to Sentry.
4. **Webhook URL in code (not env)** — when you rotate it, you redeploy. Use env var.
5. **Testing the happy path only** — write tests for: bad sig, duplicate, replay, slow handler, wrong livemode. The unhappy path is where the bugs live.
6. **No alert when webhook delivery rate drops** — silent failure is the most expensive failure. Stripe sends ~1 event per minute under normal load; sustained zero is suspicious.

## Source of truth in this portfolio

- Webhook surfaces (verified 2026-05-10):
  - `~/GitHub/CastHub1` — Stripe (subscription + success fees), Quo (phone messages)
  - `~/GitHub/awardssubmission` — Stripe (entry fees)
  - `~/GitHub/Producing-Hollywood-Invoicing` — Stripe (invoice payment)
  - `~/GitHub/holiday-lights`, `~/GitHub/noelly-app` — Stripe Connect (payouts), EveryOrg (donations), RevenueCat (in-app purchase)
- Sibling skills: `stripe-new-app-setup` (initial wiring), `monetization-readiness-review` (audit revenue path end-to-end)
- All webhook handlers should be tested in CI via the Firestore Emulator (Stack A) or test DB (Stack B). See `qa-hardening`.

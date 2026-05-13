---
name: analytics-event-map
description: Use to design or audit the analytics event taxonomy for any portfolio app — visitor → signup → onboarding → feature use → checkout → entitlement → retention → churn. Maps to Firebase Analytics, PostHog, Sentry breadcrumbs, Langfuse traces, Google Analytics. Required for monetization-readiness-review. Stack-conditional. Keywords: analytics, events, funnel, conversion tracking, PostHog, Firebase Analytics, Sentry, Langfuse, attribution, retention, churn, taxonomy.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Analytics Event Map

Design the canonical event taxonomy for an app so the funnel is observable end-to-end. Without this, you can't see where users drop off, which means you can't fix it.

Always load `safe-edit-policy` first.

## When to use

- Pre-launch on any user-facing app (Stack A or B)
- Before running a paid acquisition campaign
- After noticing a conversion gap you can't explain
- Quarterly review for any revenue-bearing app

## When NOT to use

- Backend-only repos (Stack D, E)
- Empty/placeholder repos (Stack F)
- Apps where privacy posture forbids analytics (rare, but state explicitly)

## The canonical event taxonomy

Use these names verbatim across apps. A consistent taxonomy across the portfolio means a dashboard built once is reusable; one app's `signed_up` and another's `user_created` is friction.

### Acquisition

| Event | When | Required props | Optional props |
|---|---|---|---|
| `page_view` | Any route load | `path`, `referrer`, `user_id` (if logged in) | `utm_*`, `device_type` |
| `cta_clicked` | Any primary call-to-action | `cta_id` (e.g., `hero_signup`, `pricing_producer`), `path` | `variant` (for A/B) |
| `external_link_clicked` | Outbound link (e.g., to Payhip) | `url`, `path`, `link_text` | — |

### Activation

| Event | When | Required props | Optional props |
|---|---|---|---|
| `signup_started` | Signup form opened | `path`, `method` (`google`, `email`, `passkey`) | — |
| `signup_completed` | Account created | `user_id`, `method` | `referrer_user_id` (for invites) |
| `onboarding_step_completed` | Each step in onboarding | `user_id`, `step_id`, `step_index`, `total_steps` | — |
| `onboarding_skipped` | User skipped a step | `user_id`, `step_id` | `reason` |
| `first_value_reached` | User completed the *primary* action for the first time (e.g., first cast submission) | `user_id`, `value_type` | — |

### Feature use

| Event | When | Required props | Optional props |
|---|---|---|---|
| `feature_used` | Any tracked feature | `user_id`, `feature_id` | `tier`, `count` |
| `error_encountered` | UI surface of an error | `user_id`, `error_code`, `path` | `recoverable` (bool) |

### Revenue

| Event | When | Required props | Optional props |
|---|---|---|---|
| `checkout_started` | User clicks "Pay" / "Subscribe" | `user_id`, `tier`, `price_id`, `currency`, `value` | `coupon` |
| `checkout_completed` | Payment succeeds (from your webhook handler, not the front-end Stripe redirect) | `user_id`, `tier`, `value`, `currency`, `stripe_session_id` | `is_first_payment` |
| `payment_failed` | Stripe webhook fired with failure | `user_id`, `failure_code`, `failure_message`, `attempt_count` | — |
| `entitlement_granted` | After backend confirms entitlement | `user_id`, `entitlement_id`, `tier` | — |
| `subscription_renewed` | Stripe `invoice.payment_succeeded` after first | `user_id`, `tier`, `period_count` | — |
| `subscription_canceled` | Stripe `customer.subscription.deleted` or cancel-at-period-end | `user_id`, `tier`, `cancel_reason` (if surveyed), `at_period_end` (bool) | — |
| `refund_issued` | Stripe `charge.refunded` | `user_id`, `amount`, `reason` | — |

### Retention / Churn

| Event | When | Required props | Optional props |
|---|---|---|---|
| `session_started` | App open / page open after >30min idle | `user_id` | `device_type` |
| `weekly_active` | Computed daily — user did anything this rolling week | `user_id` | — |
| `dormant_30d` | Computed — user inactive 30 days | `user_id`, `last_active_at` | — |
| `support_contacted` | User used contact form, chat, etc. | `user_id`, `path`, `topic` (if set) | — |

### Admin

| Event | When | Required props | Optional props |
|---|---|---|---|
| `admin_action` | Any privileged action by an admin user | `actor_user_id`, `action`, `target_user_id`, `target_resource` | — |

## Mapping to providers

You will likely use 2-3 of these per app. Choose based on stack and budget.

| Provider | Best for | Cost | Setup pattern |
|---|---|---|---|
| **Firebase Analytics** | Stack A apps already on Firebase. Free up to a generous quota. | Free | `logEvent(analytics, 'event_name', props)` — already shipped with Firebase JS SDK |
| **PostHog** | Stack B apps (esp. `noelly-app` per `.env.example` 2026-05-10), product analytics + session recording + feature flags | Free up to 1M events/mo | `posthog.capture('event_name', props)` |
| **Sentry breadcrumbs** | Auto-captured for every error; add custom breadcrumbs for context | Free tier covers small apps | `Sentry.addBreadcrumb({...})` |
| **Langfuse** | LLM call traces — every Anthropic/OpenAI/Gemini call should be wrapped | Free tier; required for `holiday-lights` per `.env.example` | `langfuse.trace({...}).generation({...})` |
| **Google Analytics 4** | Marketing pages, attribution from ads | Free | `gtag('event', 'event_name', props)` |
| **Plausible / Fathom** | Privacy-first page analytics, no cookie banner | $9-19/mo | `plausible('event_name')` |

**Anti-pattern:** sending the same event to 3 providers. Pick one canonical destination per event class:
- Acquisition + page views: GA4 OR Plausible (one)
- Product behavior: Firebase Analytics OR PostHog (one)
- LLM calls: Langfuse (always)
- Errors: Sentry (always)

## Implementation pattern

Centralize the event firing through a single `track()` helper. Never call provider SDKs from components directly:

```ts
// services/analytics.ts
type EventName =
  | 'page_view' | 'cta_clicked' | 'signup_started' | 'signup_completed'
  | 'checkout_started' | 'checkout_completed' | 'payment_failed'
  | 'entitlement_granted' | /* ... */;

export function track(event: EventName, props: Record<string, unknown> = {}) {
  // PostHog (or Firebase Analytics) as canonical product analytics
  posthog?.capture(event, { ...props, app: 'mythie', env: import.meta.env.MODE });
  // Sentry breadcrumb — for context on errors
  Sentry.addBreadcrumb({ category: 'analytics', message: event, data: props });
}
```

Now `track('checkout_started', { tier: 'producer', value: 4900 })` is searchable across the codebase, and changing providers is a one-file edit.

## Stack A — additional setup

Firebase Analytics is auto-loaded with Firebase JS SDK. Initialize once:
```ts
import { getAnalytics } from 'firebase/analytics';
export const analytics = getAnalytics(app);
```

Wire `track()` to `logEvent(analytics, ...)`.

## Stack B — additional setup

For Next.js + PostHog (`noelly-app` reference):
```ts
// app/layout.tsx or _app.tsx
import posthog from 'posthog-js';
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, { api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST });
```

Add a `<PostHogProvider>` wrapper if using React Server Components.

## Audit checklist

Run this against any user-facing app:

```
ANALYTICS EVENT MAP — [app] — [date]

PROVIDER CONFIG
 - Acquisition: [GA4 / Plausible / Firebase Analytics / NONE]
 - Product: [PostHog / Firebase Analytics / NONE]
 - Errors: [Sentry / NONE]
 - LLM: [Langfuse / NONE — only required if app calls LLMs]

EVENT COVERAGE — taxonomy above
 - Acquisition  [ x of 3 implemented ]
 - Activation   [ x of 5 implemented ]
 - Feature      [ x of 2 implemented ]
 - Revenue      [ x of 7 implemented ]
 - Retention    [ x of 4 implemented ]
 - Admin        [ x of 1 implemented ]

GAPS
 - [ ] checkout_completed not fired from webhook → conversion data is wrong
 - [ ] payment_failed not tracked → can't compute payment failure rate
 - [...]

CENTRALIZED `track()` HELPER
 - Path: services/analytics.ts (Pass) / scattered across components (Fail)

🔧 MANUAL TASKS FOR ANDREW: [per safe-edit-policy Step 8 — provider setup, env vars, dashboard creation]
```

## Common mistakes

1. **Tracking from the front-end on payment success** — front-end sees the redirect, not the actual charge confirmation. Use the webhook handler.
2. **Sending PII (email, name) as event props** — most providers consider this a data-handling violation. Use `user_id` only; identify the user separately in PostHog/GA via the `identify()` call.
3. **Different event names per app** — `signup_completed` here, `account_created` there, `user_signed_up` elsewhere — dashboards become per-app. Use the canonical names.
4. **Tracking inside `useEffect` dependencies** — fires on every re-render. Track on the actual user action, not on render.
5. **No `env` prop on events** — dev/staging events pollute prod analytics. Always tag the env.
6. **No A/B variant tagging** — when you run an experiment, every event in the variant must carry the variant id, or the experiment is unreadable.

## Source of truth in this portfolio

- Apps with PostHog already configured (per `.env.example` inspection 2026-05-10): `noelly-app`
- Apps with Sentry already configured: `holiday-lights`, `RunOfShow` (and likely `noelly-app`)
- Apps with Langfuse already configured: `holiday-lights`
- Apps where this skill should be applied first (pre-launch revenue critical): `theproductionshelf` (analytics gap is real — outbound link to Payhip is the conversion event), `awardssubmission`, `CastHub1`, `holiday-lights`/`noelly-app`
- Sibling skills: `monetization-readiness-review` (audits whether revenue events fire correctly), `vendor-onboarding-walkthrough` (how to wire a new analytics provider)

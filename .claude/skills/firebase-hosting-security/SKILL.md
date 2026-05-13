---
name: firebase-hosting-security
description: Use when configuring or auditing a Firebase Hosting deployment for a Vite/React SPA. Covers SPA rewrite rules, asset cache headers, Content-Security-Policy, X-Frame-Options, HSTS, Referrer-Policy, and Permissions-Policy. Especially relevant when adding a new app, hardening an existing one, or fixing CSP-induced auth/Stripe failures. Keywords: firebase.json, hosting, CSP, Content-Security-Policy, cache-control, X-Frame-Options, HSTS, SPA rewrite, security headers, Vite, React.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash]
---

# Firebase Hosting Security & Performance

> **APPLIES TO: Stack A repos only** (React/Vite/TS + Firebase). If this repo has no `firebase.json` and no plan to use Firebase Hosting, **stop** and use the appropriate skill for the actual stack:
> - Stack B (Next.js / Hono / Express) → headers go in `next.config.*` or middleware
> - Stack C (HTML/static, Vercel/Netlify) → headers go in `vercel.json` / `_headers`
> - Stack D/E → not applicable
>
> Always load `safe-edit-policy` first.

The reusable `firebase.json` shape for any Vite/React SPA in this portfolio. Locks down headers, sets correct caching, and avoids the common CSP traps that break Firebase Auth, Stripe Checkout, and Claude API calls.

## When to use
- Initializing Firebase Hosting in a new app
- Auditing an existing `firebase.json` before launch
- Diagnosing a "blocked by CSP" or "Mixed content" error
- Stripe Checkout/Elements failing to load in production but working locally
- Firebase Auth popup blocked by `frame-src` / X-Frame-Options
- Adding a new third-party SDK (Sentry, Langfuse, Twilio) and updating `connect-src`/`script-src`

## When NOT to use
- Cloud Run / Cloud Functions HTTP endpoints — those need their own CORS + headers (see `firebase-actions-deploy`)
- Static marketing site with no auth/payments — minimum config is fine, full CSP is overkill

## Canonical pattern

### 1. SPA rewrites
Every route should fall through to `index.html` so client-side routing works on direct loads.

```json
"rewrites": [
  { "source": "**", "destination": "/index.html" }
]
```

### 2. Cache headers
Hashed Vite assets are immutable; `index.html` must never be cached or you'll ship stale builds.

```json
"headers": [
  {
    "source": "/assets/**",
    "headers": [
      { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
    ]
  },
  {
    "source": "/**",
    "headers": [
      { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }
    ]
  }
]
```

### 3. Security headers (apply to `/**`)

| Header | Value | Why |
|--------|-------|-----|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS, eligible for HSTS preload list |
| `X-Content-Type-Options` | `nosniff` | Block MIME-type sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking (also pin via CSP `frame-ancestors`) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Don't leak full URL on cross-origin |
| `Permissions-Policy` | `camera=(self), microphone=(self), geolocation=(), interest-cohort=()` | Deny FLoC, lock camera/mic to first-party |

### 4. Content-Security-Policy

Build the CSP to cover **exactly** what your app loads — over-allowing defeats the purpose, under-allowing breaks features. Common directives for the stack used in this portfolio:

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://apis.google.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https: blob:;
connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebasestorage.googleapis.com https://api.stripe.com https://api.anthropic.com https://*.sentry.io https://cloud.langfuse.com;
frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.firebaseapp.com;
worker-src 'self' blob:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'self';
```

Tune the allowlists to your actual vendors. **Drop `'unsafe-inline'`** if you can refactor to nonces — Vite emits hashed inline styles for some plugins, so test before removing.

## Common mistakes

1. **Forgetting `connect-src` for Firebase Auth** — symptom: silent auth failure, network tab shows blocked `securetoken.googleapis.com`. Fix: add `https://identitytoolkit.googleapis.com` and `https://securetoken.googleapis.com`.
2. **Caching `index.html`** — symptom: users on stale builds for hours after deploy. Fix: `Cache-Control: no-cache` on `/**`, immutable only on `/assets/**`.
3. **Missing `frame-src` for Stripe** — symptom: Stripe Elements loads but Checkout iframe is blank. Fix: `https://js.stripe.com https://hooks.stripe.com`.
4. **Permissions-Policy syntax drift** — `camera=(self)` not `camera 'self'`. Browsers silently ignore malformed values.

## Source of truth in this portfolio

- `~/GitHub/CastHub1/firebase.json` — fullest implementation (CSP, headers, multi-target hosting)
- `~/GitHub/Producing-Hollywood-Invoicing/firebase.json` — simpler version, good for stripped-down apps
- `~/GitHub/Tribeca-Film-Festival-2026/firebase.json` — minimal baseline, good before adding security

When in doubt, copy CastHub1's and prune what doesn't apply.

## Quick audit checklist
- [ ] SPA rewrite is `**` → `/index.html`
- [ ] `/assets/**` is `max-age=31536000, immutable`
- [ ] `/**` is `no-cache`
- [ ] All 5 security headers present
- [ ] CSP `connect-src` covers every API your app calls in prod (check Network tab)
- [ ] Stripe domains in `frame-src` if you use Checkout
- [ ] Test in incognito after deploy — caches lie

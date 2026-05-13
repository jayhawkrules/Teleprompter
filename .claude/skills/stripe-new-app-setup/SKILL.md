---
name: stripe-new-app-setup
description: "Step-by-step checklist for setting up Stripe for any new Toronado Entertainment app. Covers live mode activation, branding, products, prices, webhooks, and Railway env vars. Use whenever a new app (Mythie, Aclamos, Ballotis, BacklotHub, CueHound, ARTA, or future projects) needs Stripe configured end-to-end."
---

# Stripe New App Setup — Toronado Entertainment Standard

Use this skill whenever a new Toronado app needs Stripe wired up from scratch or migrated from test to live mode.

---

## The Checklist (in order)

### Step 1 — Create or identify the Stripe account

- Log in to stripe.com
- If this is a new product family: create a new Stripe account (top-left account switcher → + New account). Name it clearly, e.g. `Mythie` or `Aclamos`.
- If it's a sub-product of an existing app, you may share the parent account.

---

### Step 2 — Submit live mode activation

- Stripe Dashboard → Activate payments → fill out the business details form
- Legal entity: **Toronado Entertainment, LLC**
- Address: **3200 Robinson Pike Rd, Grandview, MO 64030**
- Business type: LLC / Software / SaaS
- Tax ID: (use your EIN on file)
- Bank account: connect the Toronado bank account for payouts
- Wait for Stripe approval (usually same day for straightforward accounts)

---

### Step 3 — Enable customer email verification ⚠️ Easy to miss

This setting is per-account and does NOT carry over from other Stripe accounts.

- Stripe Dashboard → Settings → Customer emails
- Enable: **Successful payments** and **Refunds**
- Do this in **both test mode AND live mode** — the toggle switches are separate

> **Why:** Andrew confirmed in May 2026 this step is easy to skip when setting up multiple accounts quickly. Missing it means customers don't get payment receipts automatically.

---

### Step 4 — Add branding assets ⚠️ Easy to miss

Without this, checkout pages and receipts show generic Stripe defaults — looks unprofessional and hurts customer trust.

**Stripe Dashboard → Settings → Branding:**
- Brand name: app display name (e.g. `Mythie`)
- Logo: square PNG/JPG, min 128×128 px (upload the app wordmark on white or transparent bg)
- Icon: square app icon (used in smaller contexts like browser tabs on hosted checkout)
- Brand color: primary hex (e.g. Mythie = `#[your primary]`)
- Accent color: CTA button color on checkout page

**Stripe Dashboard → Settings → Business details:**
- Statement descriptor: e.g. `MYTHIE*` — max 22 chars, alphanumeric + * only. This appears on customer bank statements.
- Support email: the app's hello@ alias (e.g. `hello@mythie.app`)
- Support URL: the app's homepage or `/contact` page

**Stripe Dashboard → Settings → Customer Portal:**
- Enable the portal (required for self-serve subscription management)
- Set the same logo + colors as above — portal has its own branding settings
- Configure: allow customers to cancel, update payment method, download invoices

Repeat this step for **both test mode and live mode** — branding is per-mode.

---

### Step 5 — Add live API keys to Railway

After live mode is approved:

- Stripe Dashboard → Developers → API keys → Reveal live secret key
- Railway → App service → Variables → Add:
  ```
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_PUBLISHABLE_KEY=pk_live_...
  ```
- Hit Deploy

---

### Step 6 — Create all products and prices in live mode via MCP

Switch the Stripe MCP connector to the correct account + live mode secret key, then use Claude to create all products and prices via MCP tools (`create_product`, `create_price`).

- Always create prices with `livemode: true` (confirms you're in live mode)
- After creating, Claude will produce a Railway env var block — save it to `docs/stripe-price-ids-live.md` in the repo for future reference
- Archive old test-mode prices by setting `active: false` (do not delete — needed for historical records)

---

### Step 7 — Set up webhooks in live mode

**Main app webhook:**
- Stripe → Developers → Webhooks → Add endpoint
- Endpoint URL: `https://api.[yourdomain]/api/stripe/webhook`
- Events to listen for (standard set):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted` ← **confirm with Andrew whether to include per app**
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
- After saving: reveal the webhook signing secret → add to Railway as `STRIPE_WEBHOOK_SECRET`

**Identity verification webhook (only if app uses Stripe Identity):**
- Endpoint URL: `https://api.[yourdomain]/api/talent/identity-verification/webhook`
- Events: `identity.verification_session.verified`, `identity.verification_session.requires_input`
- Add secret to Railway as `STRIPE_IDENTITY_WEBHOOK_SECRET`

> **Note (May 2026):** Aclamos does NOT use Stripe Identity — skip the second webhook for awards apps. Mythie DOES use it for talent verification badges.

---

### Step 8 — Add all live price IDs to Railway env vars and deploy

Copy the env var block Claude generated in Step 6 into Railway → Variables, then deploy.

Naming convention used across Toronado apps:
```
# Subscription plans
VITE_STRIPE_PRICE_[TIER]_MONTHLY=price_...
VITE_STRIPE_PRICE_[TIER]_ANNUAL=price_...

# One-time purchases
STRIPE_PRICE_[PRODUCT_NAME]=price_...
```

---

### Step 9 — Verify the full setup

Run through this smoke-test checklist before announcing live:

- [ ] Go to the app's checkout flow in a real browser — does the Stripe checkout page show the correct brand name, logo, and colors?
- [ ] Complete a $0.50 test purchase with card `4242 4242 4242 4242` — does the customer receive a receipt email?
- [ ] Cancel the test subscription from the Stripe Customer Portal — does the webhook fire and the app downgrade the account?
- [ ] Check Railway logs for any `STRIPE_WEBHOOK_SECRET` mismatch errors

---

## Apps using this process (Toronado Entertainment LLC)

| App | Stripe Account | API Domain | Identity Webhook? |
|---|---|---|---|
| Mythie | casthub / Mythie | api.mythie.app | Yes |
| Aclamos | Awards Submission App | aclamos.app | No |
| Ballotis | (standalone or within Aclamos) | TBD | No |
| BacklotHub | (not yet activated) | TBD | TBD |
| CueHound | (not yet activated) | TBD | TBD |
| ARTA | (not yet activated) | TBD | TBD |

---

## Common gotchas

- **MCP only connects to one Stripe account at a time.** Switch the connector key in Cowork when moving between apps.
- **Test mode and live mode are completely separate.** All products, prices, webhooks, and branding settings must be configured in both environments independently.
- **Branding settings are per-mode.** A logo uploaded in test mode does NOT appear in live mode — you must upload it twice.
- **Customer email settings are per-account AND per-mode.** Always configure on a fresh account.
- **Statement descriptor max 22 chars.** Stripe truncates without warning, which looks bad on bank statements.

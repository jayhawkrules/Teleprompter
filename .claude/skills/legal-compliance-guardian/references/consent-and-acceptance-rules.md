# Consent and Acceptance Rules — Full Ruleset

---

## New users — signup

- Must accept current Terms + Privacy Policy via explicit checkbox + button (clickwrap)
- Pre-ticked boxes are NOT valid consent under UK GDPR / EU GDPR / CCPA-CPRA
- Log to `legalAcceptanceEvents`: `uid`, `appId`, `documentType: "all"`, `version`, `documentHash`, `acceptanceMethod: "signup_clickwrap"`, `summaryShown`, `acceptedAt`, `userAgent`, `ipHash` (optional)
- Cookie consent is handled separately at first page load — do NOT bundle with Terms acceptance

### Jurisdiction-coverage-gap check at signup

On account creation, look up the user's country (from IP geo or self-declared address):
1. If `countryCode` is in `legal-inventory.json#jurisdictions` → proceed normally.
2. If `countryCode` is NOT in jurisdictions → **still allow signup** (do not block legitimate users) AND:
   - Fire `repository_dispatch` event `jurisdiction_coverage_gap` with payload `{ appId, countryCode, signupAt }`
   - Apply the strictest baseline (UK GDPR + EU GDPR rights) to the user by default
   - Mark the user record `pendingJurisdictionReview: true`
   - Cron audit will run the coverage-gap workflow and queue a 🔧 manual task to extend policy language

---

## Existing users — non-material update (Tier 1)

- Send email. Optionally show in-app banner.
- Do NOT block access. Do NOT require acceptance click.
- Update `lastUpdated`. Log internally that a non-material update was published.

## Existing users — moderate update (Tier 2)

- Send email + show dismissible in-app banner for 30 days.
- Bump minor version. Log materiality=tier_2.
- No forced acceptance.

## Existing users — material update (Tier 3)

- On next login after effective date: show a **blocking popup**.
- Popup is NOT dismissible. User must tick checkbox AND click "I Agree."
- Block all app functionality until accepted.
- Log to two places:
  - `users/{uid}`: `acceptedTermsVersion`, `acceptedPrivacyVersion`, `lastLegalAcceptanceAt`
  - `legalAcceptanceEvents/{eventId}`: immutable per `schemas/legal-acceptance-event.schema.json`
- Fire `terms_accepted` analytics event.
- After effective date, send reminder email at T+7 to users who have not yet logged in.

---

## Checkout moment

If terms affect billing, require acceptance at checkout **even if accepted at signup**.
- Show clear "By completing this purchase you agree to [Terms URL] and [Refund Policy URL]" checkbox — explicit tick, not pre-ticked
- FTC Negative Option Rule (US users): disclose recurring billing BEFORE collecting billing info
- UK CRA 2015 (UK users): terms must be prominent and transparent

---

## Cookie consent (separate system)

- Manage separately from Terms/Privacy acceptance
- Store granular preferences: `strictlyNecessary` (always true), `analytics` (opt-in), `marketing` (opt-in), `personalisation` (opt-in)
- Default state: all non-essential OFF until user opts in
- Do NOT set non-essential cookies before consent fires
- DUAA 2025 note: ICO is finalising guidance on analytics cookie exceptions — DO NOT remove the analytics consent requirement until ICO update lands
- Re-prompt cookie consent if new cookie types are added (new vendor in `legal-inventory.json` triggers this)

---

## Evidence log schema (Firestore)

- `users/{uid}`: `acceptedTermsVersion`, `acceptedPrivacyVersion`, `acceptedCookieVersion`, `lastLegalAcceptanceAt`, `pendingJurisdictionReview` (bool)
- `legalAcceptanceEvents/{eventId}`: `uid`, `appId`, `documentType`, `version`, `documentHash`, `acceptanceMethod`, `summaryShown`, `acceptedAt`, `ipHash` (optional), `userAgent` (optional), `countryCode` (optional)

`legalAcceptanceEvents` is append-only and immutable. Firestore rules must deny update/delete on this collection.

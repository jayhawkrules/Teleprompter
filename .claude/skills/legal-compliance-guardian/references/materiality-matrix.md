# Materiality Matrix — What Triggers Email vs Banner vs Forced Clickwrap

This file defines when each type of user notice is required for a legal-document change.

Courts (Sifuentes v. Dropbox, N.D. Cal.) have ruled that **email-only notice of amended terms is insufficient to bind a user who did not affirmatively click to accept.** Best practice: require a checkbox + button click (clickwrap) for any material change, and store an electronic record of the acceptance with document hash.

---

## TIER 1 — Email or Banner Only (non-material changes)

**Applies to:**
- Typos, formatting, grammar fixes
- Company address or contact-detail changes
- Clearer wording with no rights/data/payment impact
- Adding an optional new feature with no new data collection
- New support email

**Action:** Send email or show in-app banner. Do NOT block access. Do NOT require acceptance click. Bump `lastUpdated`; do NOT bump major version.

---

## TIER 2 — In-App Banner + Notification (moderate changes)

**Applies to:**
- New optional feature that collects minimal additional data
- Adding a new vendor that does NOT change user-facing data rights
- Minor structural rewriting of clauses with no substantive change
- New jurisdictional disclosure added (e.g. a US state privacy law section)

**Action:** Show persistent dismissible banner for 30 days. Send email. Update version date. No forced popup required. Log the update with materiality=tier_2.

---

## TIER 3 — Forced Clickwrap Re-Acceptance (material — block access until accepted)

**Always material, no exceptions:**

- Any new personal data category collected
- Any new third-party data sharing introduced
- New vendor that shares or processes user personal data (subprocessor change)
- Any new analytics or tracking tool (also triggers separate cookie-consent update)
- AI-assisted profiling, scoring, ranking, or casting evaluation introduced or changed (UK GDPR / EU GDPR Art. 22 — automated decisioning)
- Payment terms changed (price, billing cadence, refund policy, cancellation policy)
- Subscription auto-renewal terms added or changed
- Free trial to paid conversion terms added
- Arbitration clause added or changed (**Sifuentes warning: email alone WILL NOT bind user**)
- Class-action waiver added
- Limitation of liability changed
- Governing law or jurisdiction changed
- Age eligibility or minors language changed
- Children's data handling added (COPPA US / Children's Code UK)
- Multi-tenant or client-data separation terms added (BacklotHub)
- Marketplace/seller terms added (The Production Shelf)
- Contest/awards eligibility changed (ARTAS)
- New jurisdiction added to controller scope (a country that wasn't covered before)

**Action — Forced Clickwrap:** On next login after effective date, show a blocking popup. Popup must:
- Display a plain-English change summary (max 150 words)
- Link to the full updated document (opens new tab)
- Require a checkbox tick AND an "I Agree" button press
- Store acceptance in two places:
  - `users/{uid}`: `acceptedTermsVersion`, `acceptedPrivacyVersion`, `lastLegalAcceptanceAt`
  - `legalAcceptanceEvents/{eventId}`: immutable log per `schemas/legal-acceptance-event.schema.json`
- Block access to the app until accepted
- Fire `terms_accepted` analytics event (per `analytics-event-map`)
- Send reminder email at T+7 to users who have not yet logged in and accepted

---

## Checkout Moment Rule

If terms affect billing, require acceptance at checkout **even if the user already accepted at signup**. This covers price changes, subscription upgrades, and new billing model introductions.

- Required by FTC Negative Option / Click-to-Cancel Rule (US users) — effective July 2025
- Required by UK Consumer Rights Act 2015 (UK users) — transparent + prominent
- Pre-ticked boxes are NOT consent under UK GDPR / EU GDPR / CCPA-CPRA

---

## Jurisdiction-Coverage-Gap Rule (new — 2026-05-11)

If a user signs up from a country not listed in the app's `legal-inventory.json#jurisdictions`:
- Treat as a Tier 3 PENDING event for the **portfolio**, not the individual user
- App must still serve the signup (do not block legitimate users)
- App fires `repository_dispatch` event `jurisdiction_coverage_gap` with payload `{ appId, countryCode, signupAt }`
- The cron audit runs an out-of-cycle review and either (a) confirms existing language covers the jurisdiction, or (b) queues a 🔧 manual task to add the jurisdiction
- Until resolved, no annual email is sent for that app (Hard Rule 6)

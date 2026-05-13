# Terms Re-Acceptance Popup — Copy Template

Used for **Tier 3 material changes only**. This is a blocking modal — user cannot dismiss or bypass. Access to the app is blocked until accepted.

---

## Headline
We've updated our Terms

## Body (max 150 words)

We've made important changes to our [Terms of Service / Privacy Policy] for [App Name], effective [DATE].

**What's changed:**
- [Change 1 — plain English]
- [Change 2 — plain English]

Please read the full updated [Terms / Privacy Policy] before continuing:
→ [Link — opens in new tab]

## Checkbox (required before button activates)
"I have read and agree to the updated Terms of Service and Privacy Policy."

## Button
"I Agree — Continue to [App Name]"

## Footer (small text under button)
"By clicking I Agree, you confirm you have read and accept the updated terms, effective [DATE]. If you do not agree, you may close this window and contact us at [email] to request account deletion."

---

## Implementation requirements

- Modal cannot be dismissed by clicking outside, pressing Esc, or refreshing — only by accepting OR by signing out
- On accept: write `users/{uid}` fields AND append immutable `legalAcceptanceEvents/{eventId}` (per `schemas/legal-acceptance-event.schema.json`)
- Fire `terms_accepted` analytics event (per `analytics-event-map`)
- Document hash (SHA-256 of the document text at time of acceptance) MUST be stored alongside the version string — this protects against document silently changing post-acceptance

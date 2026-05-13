# Cookie Consent Banner — Copy Template

This is a **SEPARATE system** from Terms/Privacy acceptance. Manage cookie consent independently. Default all non-essential cookies OFF. Do NOT bundle with the Terms acceptance popup.

---

## Banner headline
We use cookies

## Banner body
We use strictly necessary cookies to run [App Name]. With your permission, we also use analytics cookies to understand how you use the app so we can improve it. We do not use advertising cookies.

[Manage preferences] [Accept analytics] [Accept necessary only]

## Manage preferences panel

| Category | Label | State |
|---|---|---|
| Strictly necessary | "Required for the app to work. Cannot be turned off." | Always on |
| Analytics | "Helps us understand usage patterns. We use [PostHog / GA4]. Off by default." | Opt-in |
| Marketing | "Used for targeted ads. We do not currently use these." | Off / N/A |
| Personalisation | "Remembers your preferences (theme, language)." | Opt-in |

## Re-prompt rule
Show banner again if new cookie types are added to the app (triggered by `legal-inventory.json#vendors` change adding a new cookie-setting vendor).

## Storage
Store granular preferences in `localStorage` (key `cookiePrefs_v1`) AND in `users/{uid}/cookiePreferences` if user is logged in.

## DUAA 2025 note
ICO is finalising guidance on analytics-cookie exceptions under DUAA s.112. Until ICO publishes final guidance, treat analytics as requiring consent (do NOT remove the analytics opt-in).

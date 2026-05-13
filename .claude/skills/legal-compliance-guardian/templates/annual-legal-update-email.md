# Annual Legal Update Email — Template

**Send once per year per app, 14 days before the new effective date.** Send via Resend or SendGrid, segmented by `acceptedTermsVersion` to include users who never accepted current terms. ONLY send after all RED findings from the pre-send deep dive are resolved.

---

## Subject line
Important update to our Terms of Service — effective [DATE]

## Body

Hi [First Name],

We've updated our Terms of Service and Privacy Policy for [App Name].

**What's changed:**
- [Change 1 — plain English, max 20 words]
- [Change 2 — plain English, max 20 words]
- _If no material changes:_ "No changes to how we handle your data or your rights. This is our annual review."

The new terms take effect on **[DATE — must be at least 14 days from send date]**.

**Read the full documents:**
- Terms of Service: [URL]
- Privacy Policy: [URL]

If you have questions, reply to this email or contact us at [legal@domain.com].

— The [App Name] Team
Controller of record: Toronado Entertainment, LLC _(or Producing Hollywood, per app)_

---

## 45-day pre-send deep dive checklist

| When | Task |
|---|---|
| **T-45** | Run full Lane A drift audit. Resolve all RED findings. Coverage-gap queue empty. |
| **T-30** | Review all features shipped in the past 12 months. New data? New vendors? Pricing changes? |
| **T-21** | Git-diff current live document against last year's version. Draft plain-English change summary. |
| **T-14** | If any material changes (Tier 3): flag for Andrew; if warranted, solicitor review. Publish new pages with future effective date. Send email. |
| **T-7** | Set forced popup flag in app config if Tier 3 changes apply. |
| **T-0** | Effective date. Forced popup now active for material-change apps. |
| **T+7** | Send reminder email to users who have not yet logged in and accepted. |

# UI copy - locked

Product copy for the Talent Insights / Pre-Casting Research feature. Version: **v1-2026-05**.

Every string below is locked. The casting team admin cannot override it via workspace branding. The dev team cannot edit it without sign-off from `legal-compliance-guardian`.

## Feature naming

- **Primary product name:** "AI Talent Research"
- **Acceptable alternates (legacy / contextual):** "Talent Insights", "Pre-Casting Research", "Public Footprint Brief"
- **Internal codename:** "research-brief" (engineering only, never user-facing)
- **Styling:** "AI" without periods. Never "A.I.", "ai", or "Ai" in user-facing copy. Marketing pages may capitalise as "AI Talent Research™" if/when the mark is registered.

## Entry-point CTA (talent profile page, casting-team view)

Button label: **"Run AI Talent Research"**
Helper text (under the button): "Public-internet research only. Not a background check."

For workspaces below the gated plan tier, the button renders disabled with a `Pro` (or current paid-tier) badge and the helper text becomes the upsell copy below.

## Plan gating (paywall copy)

This feature consumes real AI tokens and paid third-party API calls per run — it is **gated to the paid casting-team tier** (current name: "Casting Pro" — confirm with billing). Free / trial workspaces see the entry point but cannot run a brief.

### Locked-state CTA (free / trial workspace)

Inline soft paywall on the entry-point button:

> **AI Talent Research** is part of Casting Pro.
> Get research briefs on talent profiles in 30 seconds — backed by AI summarisation of press, public social presence, sanctions watchlists, and public court references.
>
> [Upgrade to Casting Pro →]   [See a sample brief]

### At-limit copy (paid workspace, brief allowance used)

> You've used **{n} of {limit}** AI Talent Research briefs this month.
>
> [Get more briefs →]   (or, if at hard cap: "Resets on {date}.")

### Per-brief usage indicator (paid workspace)

Shown in the brief view footer, subtle:

> Brief {n} of {limit} this month · [Manage plan]

## Generation states

| State | Copy |
|---|---|
| Queued | "Queued - we'll have your brief in about 30 seconds." |
| Running | "Gathering public signals…" |
| Ready | "Brief ready" |
| Insufficient signal | "No reliable public signal found for this profile. This isn't unusual for emerging talent. Consider a regulated check if needed. [Learn more]" |
| Failed | "Something went wrong generating this brief. [Try again]" |

## The locked banner (top of every brief view)

> **Public-internet research only.** This is not a background check, consumer report, or screening tool. The information here was gathered from publicly available sources and may be incomplete, outdated, or refer to a different individual. For employment, housing, credit, or insurance decisions, use a regulated background check.
>
> [Run a regulated check →]

The banner is `position: sticky` to the top of the brief view. It cannot be dismissed.

## The partner-CRA CTA (always present, multiple positions)

- Above the narrative: `[Run a regulated check via Checkr →]` (or current partner)
- After the bullets: `Need to make an employment decision? [Run a regulated check]`
- In the export footer (if export ships in v1.1): same as above
- Email footer (if email-share ships): same as above

If no partner is contracted yet, link routes to a Mythie-hosted explainer: `/help/regulated-background-checks` which lists recommended providers with neutral descriptions.

## Confidence labels

User-facing labels for `confidence` field:

| Value | Label | Helper |
|---|---|---|
| high | **High match** | "Most signals strongly match this profile." |
| medium | **Partial match** | "Some signals match; others are uncertain." |
| low | **Low match** | "Most signals are uncertain. Consider a regulated check." |
| insufficient | **Insufficient public signal** | "We couldn't find enough public information to summarise. This isn't unusual for emerging talent." |

## Signal labels (per source tier)

| Tier | Section header | Per-signal label |
|---|---|---|
| A (identity & sanctions) | "Identity & sanctions" | "OpenSanctions / OFAC reference" |
| B (press & news) | "Press mentions" | "{outlet} - {date}" |
| C (public court references) | "Public court references" | "Possible court record reference - verify before relying" |
| D (social presence) | "Public social presence" | "{platform} - public profile" |

Each signal card shows: source, retrieval date, identity-match band, and a "View source" link to the originating URL (opens in new tab with `rel="noopener"`).

## Talent-side notification (in-app, on subject's account)

> A casting team ran AI Talent Research on your profile.
> [Your privacy settings] · [Learn what's in a brief]

Goes to the talent's inbox per `error-tracking-system`-style notification patterns. The talent can:
- See which casting orgs (not individual users) have viewed briefs about them
- See the count over the last 30 days
- Toggle `privacy.allowResearch` off, which immediately purges cached briefs

## Talent-side privacy panel

In the talent's account settings, an "AI Talent Research" section:

> **AI Talent Research**
>
> Mythie may run AI Talent Research on your profile when a casting team on a paid plan views you. Each run summarises publicly-available information (press mentions, public social profiles, sanctions watchlists, and public court records) and is shown only to the requesting casting team. AI Talent Research is not a background check.
>
> **Allow research briefs** [toggle, default ON]
>
> Turning this off:
> - Stops new briefs being generated about you immediately.
> - Purges any cached briefs within 24 hours.
> - May reduce visibility of your profile to some casting teams who use research briefs as part of their workflow.

## Empty / error / edge states

Per `ui-design-web-apps` (state matrix section), every screen needs all states. For this feature:

- **Empty (first use by a casting team):** "Run your first AI Talent Research brief on a talent profile to see how it works. [Try with a sample profile]"
- **Empty (post-search no signal):** Use the "Insufficient public signal" copy above.
- **Loading:** Skeleton matching the brief layout (banner skeleton, narrative skeleton, bullets skeleton).
- **Error:** "We couldn't generate the brief - one of our research sources is unavailable. [Try again]"
- **Offline:** Banner: "You're offline - generated briefs are unavailable until you reconnect."

## Admin UI (Mythie internal admin only)

Admin-only `/admin/research-briefs` page shows:
- Volume by org / day / week
- Signal-source health (OpenSanctions, NewsAPI, etc. — green / yellow / red)
- Talents-opted-out count
- Subject-complaint queue (if a talent flags a brief as inaccurate)

This panel is `default-deny` and accessible only to roles with `admin:research_briefs`.

## Things this feature MUST NOT include

- A "Share brief" button (would invite ToS violation)
- A PDF export with the Mythie logo as the primary brand (could be mistaken for an authorised report)
- A "score" or numeric "grade" of the subject
- Any "thumbs up / thumbs down" UI on a subject
- Any "saved researches" persistent shelf - only briefs in the last 30 days are visible
- Any cross-talent comparison view ("compare these 3 candidates by brief")

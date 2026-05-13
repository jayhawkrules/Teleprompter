# Adoption configuration

Integration contract any portfolio app must satisfy to adopt this skill. Source of truth is this hub; consuming apps (CastHub1, others) sync from here. CastHub1 is the reference implementation.

## 1. Required env vars

Set these in the adopting app's deploy environment (Firebase Functions config, Cloud Run env, etc.). Defaults shown for Mythie / CastHub1.

```bash
# Product theming
RESEARCH_BRIEF_PRODUCT_NAME="AI Talent Research"
RESEARCH_BRIEF_SUBJECT_KIND="talent"             # singular, lowercase, role-name-friendly
RESEARCH_BRIEF_SUBJECT_KIND_PLURAL="talent"      # only differs in some app domains

# Storage
RESEARCH_BRIEF_COLLECTION_PREFIX=""              # e.g. "casthub_" in shared projects; empty in single-tenant
RESEARCH_BRIEF_NOTIFICATIONS_COLLECTION="talentNotifications"
RESEARCH_BRIEF_ANALYTICS_COLLECTION="analyticsEvents"

# Plan gating
RESEARCH_BRIEF_MIN_TIER="casting_pro"
RESEARCH_BRIEF_PLAN_TIERS='{"free":0,"trial":0,"casting_starter":1,"casting_pro":2,"casting_enterprise":3}'

# Partner-CRA CTA
RESEARCH_BRIEF_PARTNER_CRA_LABEL="Run a regulated check"
RESEARCH_BRIEF_PARTNER_CRA_URL="https://mythie.app/help/regulated-background-checks"

# AI
ANTHROPIC_API_KEY="..."
RESEARCH_BRIEF_MODEL="claude-haiku-4-5-20251001"
# Only the first sentence of the Claude system prompt is configurable.
# Other apps substitute their own product description here. Absolute
# rules, closing sentence, and banned-phrase validator are universal.
RESEARCH_BRIEF_PROMPT_PREAMBLE="You are a research assistant for Mythie, a reality-TV casting platform. You are summarising a \"research brief\" - an aggregation of publicly-available information about a talent profile - for a casting team that is considering the talent for a project."

# Source API keys (per references/data-sources.md)
OPENSANCTIONS_API_KEY="..."
GOOGLE_PSE_API_KEY="..."
GOOGLE_PSE_CX="..."
NEWSAPI_KEY="..."          # optional - shared with seo-aeo-optimizer
COURTLISTENER_API_KEY="..."
```

## 2. Required Firestore field shape on subject profiles

Whatever the adopting app calls its subject docs (`talents/`, `creators/`, `applicants/`), the doc must expose these fields. Field names are not negotiable; only the parent collection name is app-owned.

```ts
type ResearchableSubject = {
  // Identity (required for identity-match scoring)
  name: string;            // Full display name
  dateOfBirth?: string;    // ISO date - omitted disables age gate (NOT recommended)
  city?: string;           // Helps disambiguation
  profession?: string;     // Helps disambiguation in press/social

  // Privacy (required for opt-out enforcement)
  privacy: {
    allowResearch: boolean;  // defaults true; user-controlled toggle
  };
};
```

The skill never reads other fields on the subject doc.

## 3. Required user / requester shape

The requesting user passed to `gather_signals.py` must expose:

```ts
type ResearchRequester = {
  uid: string;
  orgId: string;             // workspace / org / tenant ID
  roles: string[];           // must include `{subject_kind}_research:read` to be allowed
  workspacePlanTier: string; // a key in RESEARCH_BRIEF_PLAN_TIERS
};
```

## 4. Required Firestore rules

Both `{prefix}researchBriefs` and `{prefix}researchBriefAuditLog` collections must use:

- **Read:** `default-deny + role-gated` - the requesting user must have `{subject_kind}_research:read` and belong to the `requestedByOrg`.
- **Write:** admin-only (the skill writes via `firebase-admin`, never via client SDK).

Use `firestore-rbac-helpers` patterns. Reference rule snippet:

```javascript
match /researchBriefs/{briefId} {
  allow read: if isSignedIn()
    && hasRole(request.auth.uid, 'talent_research:read')
    && belongsToOrg(request.auth.uid, resource.data.requestedByOrg);
  allow write: if false;  // admin SDK only
}
match /researchBriefAuditLog/{rowId} {
  allow read: if isAdmin(request.auth.uid);
  allow write: if false;  // admin SDK only
}
```

## 5. Required UI surfaces (per `ui-design-web-apps`)

The adopting app must implement these surfaces using its design system; the skill provides locked copy strings and rules:

| Surface | Required behaviour |
|---|---|
| Subject profile page → entry-point CTA | Visible on every subject profile to users with the role. Disabled state with upsell copy for below-tier workspaces. Never hidden. |
| Brief view | Locked banner sticky top, partner-CRA CTA above narrative + after bullets, sourced signals listed with originating URLs |
| Subject's privacy panel | Toggle `subject.privacy.allowResearch` with the locked copy from `ui-copy.md` |
| Subject's inbox | Notification on every brief create/refresh |
| Workspace admin → research-briefs admin page | Volume, source-health, opt-outs, complaint queue |

## 6. ToS clauses required at adopting app

Two ToS clauses must be live in the adopting app before any brief is generated (see `references/legal-language.md` for the canonical text):

- **Subject-side consent clause** in the subject sign-up flow (default ON, opt-out anytime, immediate cache purge).
- **Requester-side acceptable-use clause** at the workspace level - no eligibility decisions, no export/resale, no harassment.

Both clauses are subject to version-pinning (`legalBannerVersion`).

## 7. Example mappings for other portfolio apps

These are non-binding examples to show the shape:

| Adopting app (example) | `RESEARCH_BRIEF_PRODUCT_NAME` | `RESEARCH_BRIEF_SUBJECT_KIND` | `RESEARCH_BRIEF_MIN_TIER` |
|---|---|---|---|
| CastHub1 (Mythie) — reference | `AI Talent Research` | `talent` | `casting_pro` |
| A creator-marketplace app | `AI Creator Research` | `creator` | `creator_pro` |
| A pre-hire screening adjacent app | `AI Pre-Hire Research` | `applicant` | `hire_pro` |
| A high-end matchmaking app | `AI Match Research` | `member` | `match_pro` |

The product name in any adopting app **must** avoid the banned terms in `references/legal-language.md` (no "Background Check", "Screening", "Vetting", "Verified", etc.) regardless of vertical.

## 8. Adoption checklist for a new app

1. Set the env vars in section 1.
2. Confirm the subject doc shape in section 2.
3. Add the user-role and workspace-tier fields in section 3.
4. Write firestore.rules per section 4 using `firestore-rbac-helpers`.
5. Build the UI surfaces in section 5 using `ui-design-web-apps` patterns.
6. Add the two ToS clauses per section 6.
7. Add per-app themed copy (product name swaps, banner CTA copy, notification text) - never alter the locked legal banner text itself.
8. Run `vendor-consolidation-policy` over each source API the app will use.
9. Add the regression test corpus run to the app's CI gate per `references/prompt-templates.md`.
10. Open a coordinated PR pair: app PR + a `casting-research-brief` version bump if any portable change is needed.

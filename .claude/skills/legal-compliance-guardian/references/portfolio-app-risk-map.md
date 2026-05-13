# Portfolio App Legal Risk Map

Each app has a different legal risk profile. This file defines the elevated-risk items per app so the audit focuses where it matters most.

**Ownership convention:** "Legal owner of record" is the entity named in the controller / contracting fields of the live legal documents. "Beneficial owner" is the underlying individual or entity that owns the app (informational — used for internal book-keeping only, not surfaced on live legal pages).

| App | Repo name | Legal owner of record | Beneficial owner | Primary risk class |
|---|---|---|---|---|
| Mythie / CastHub | `CastHub1` | Toronado Entertainment, LLC | Toronado Entertainment, LLC | High — biometrics, minors potential, AI scoring |
| BacklotHub | `BacklotHub` | Toronado Entertainment, LLC | Andrew Ward | High — multi-tenant processor obligations |
| CueHound | `run-of-show` | Toronado Entertainment, LLC | Toronado Entertainment, LLC | Medium — event-staff PII |
| Aclamos (incl. Ballotis feature) | `Awardssubmission` | Toronado Entertainment, LLC | Toronado Entertainment, LLC | High — multi-tenant B2B awards platform |
| Ballotis (future standalone) | _spin-out from `Awardssubmission`_ | Toronado Entertainment, LLC | Toronado Entertainment, LLC | High — voting integrity + multi-tenant |
| The Production Shelf | `the-production-shelf` | Toronado Entertainment, LLC | Andrew Ward | Medium-high — digital goods refunds, affiliate disclosure |
| ARTAS | `ARTAS` | Toronado Entertainment, LLC | Toronado Entertainment, LLC | High — contest law, public display rights |
| CRM-Ai | `CRM-ai` | Toronado Entertainment, LLC | Toronado Entertainment, LLC | High — live subprocessor for other portfolio apps; future B2B SaaS |
| Noelly | `holiday-lights` | Toronado Entertainment, LLC | Toronado Entertainment, LLC | Unknown — pending first audit |
| Teleprompter App | `teleprompter` | Toronado Entertainment, LLC | Andrew Ward | Medium — TikTok integration |
| Producing Hollywood | `producing-hollywood` | Producing Hollywood | Producing Hollywood | Low — informational, contact form only |

> **Note:** Personally-held apps (BacklotHub, The Production Shelf, Teleprompter) currently use Toronado Entertainment, LLC as the legal owner of record per Andrew's instruction. Revisit at next portfolio legal review if any of these are migrated to a different controlling entity.

---

## MYTHIE / CASTHUB (casting platform, Stack A)

**Legal pages needed:** `/privacy`, `/terms`, `/cookies`
**Legal owner of record:** Toronado Entertainment, LLC

**Elevated risk items:**
- Profile photos and video submissions (image/likeness rights clause required)
- Casting application answers (potentially special-category data: ethnicity, age, health, disability) — needs explicit Art. 9 GDPR legal basis
- AI-assisted scoring or ranking of applications (UK GDPR / EU GDPR Art. 22 automated-decisioning rights)
- Producer/client access to applicant submissions (third-party disclosure must be explicit)
- Age verification / minors — reality TV casting often involves under-18s; parental consent mechanism required
- Talent agent / manager data if added

**Terms must cover:** submission ownership, usage rights for submitted media, right to remove profile, producer access scope, minors consent flow.

---

## BACKLOTHUB (production company backend, multi-tenant)

**Legal pages needed:** `/privacy`, `/terms` (platform terms + client/tenant DPA)
**Legal owner of record:** Toronado Entertainment, LLC
**Beneficial owner:** Andrew Ward

**Elevated risk items:**
- Multi-tenant client data separation (client A cannot access client B's data)
- Crew personal information (name, contact, bank details if payroll added)
- Call sheets / schedules (contain crew location and schedule data)
- Job postings (employment data)
- Client/licensee terms if BacklotHub is licensed to external production companies

**Terms must cover:** data processor obligations (DPA-style), client onboarding terms, data deletion on contract end, subprocessor list with notice obligation.

---

## THE PRODUCTION SHELF (digital product marketplace)

**Legal pages needed:** `/privacy`, `/terms`, `/refund-policy`, `/cookies`
**Legal owner of record:** Toronado Entertainment, LLC
**Beneficial owner:** Andrew Ward

**Elevated risk items:**
- Digital goods refund policy — UK Consumer Rights Act: digital content must be as described; no automatic right to refund once download started **if user acknowledged this before purchase**
- Licence terms for templates, LUTs, assets (permitted uses, resale restrictions)
- Affiliate link disclosure (Amazon Associates, FilmStage, Gumroad — FTC 16 CFR Part 255 + UK CAP Code require clear disclosure)
- Creator marketplace terms if third-party sellers added later (becomes a marketplace platform, separate liability regime)

**Terms must cover:** licence grant, permitted uses, no-resale clause, affiliate disclosure, digital goods refund policy with pre-purchase acknowledgement.

---

## ARTAS — American Reality Television Awards (awards / voting)

**Legal pages needed:** `/privacy`, `/terms`, `/contest-rules` (separate page)
**Legal owner of record:** Toronado Entertainment, LLC

**Elevated risk items:**
- Contest/awards eligibility rules (who can be nominated, who can win)
- Voting integrity / no purchase necessary statement (US state law varies)
- Use of submitted logos, clips, show images (rights clearance)
- Public nomination display (permission to display nominee names and assets)
- No-guarantee language (submission ≠ winning)
- Judging panel disclosure

**Terms must cover:** contest rules, eligibility, use of submitted content, winner announcement process, governing-law sweepstakes carve-out.

---

## CUEHOUND (live event management — repo: `run-of-show`)

**Legal pages needed:** `/privacy`, `/terms`
**Legal owner of record:** Toronado Entertainment, LLC

> **Naming note:** Brand name is **CueHound**. Repo name is `run-of-show`. Always reference CueHound on live legal pages and user-facing copy; the repo name is internal only.

**Elevated risk items:**
- Event staff and crew personal data
- Client event data if licensed to external event producers
- Multi-tenant data separation if multiple events/clients run simultaneously

**Terms must cover:** client data handling, event deletion after contract end, multi-tenant separation guarantees.

---

## ACLAMOS — AWARDS SUBMISSION (repo: `Awardssubmission`)

**Legal pages needed:** `/privacy`, `/terms` (platform terms + tenant DPA), `/cookies`, `/contest-rules-template`
**Legal owner of record:** Toronado Entertainment, LLC

> **Naming note:** Repo name is `Awardssubmission`; brand on live pages is **Aclamos**. Ballotis is a feature within Aclamos today and may spin out as a standalone product later.

**Elevated risk items:**
- Multi-tenant B2B: each tenant is an awards organization running their own submissions process
- Submitter PII (names, contact, payment if entry fees collected)
- Submitted creative content (image/likeness, copyright clearance, rights to display)
- Tenant-tenant data separation guarantees
- Payment processing for entry fees — FTC Click-to-Cancel applies if recurring
- Minors handling if under-18 nominees allowed (parental consent)
- Judging panel disclosure templates per tenant
- ARTAS will be a tenant — arm's-length terms required even though both sides are Toronado

**Terms must cover:** tenant onboarding DPA, subprocessor list, entry-fee refund policy, content licence grant, contest-rules template that tenants extend per-contest, deletion on contract end.

---

## BALLOTIS (voting / balloting — feature today within `Awardssubmission`, future standalone)

**Legal pages needed (today):** covered under the Aclamos platform legal docs
**Legal pages needed (post spin-out):** separate `/privacy`, `/terms`, `/cookies`
**Legal owner of record:** Toronado Entertainment, LLC

**Elevated risk items:**
- Voter PII (email, identity for one-voter-one-vote enforcement)
- Vote integrity, no-purchase-necessary statements (US state sweepstakes law)
- Tenant configurability of voting rules vs. minimum legal floor
- Audit trail integrity (votes are evidence in any post-event dispute)
- When spun out: tenant onboarding DPA mirroring Aclamos

**Terms must cover:** voting eligibility, vote-integrity language, no-purchase-necessary, audit retention, post-event data deletion.

---

## TELEPROMPTER APP (TikTok-integrated)

**Legal pages needed:** `/privacy`, `/terms`, `/cookies`
**Legal owner of record:** Toronado Entertainment, LLC
**Beneficial owner:** Andrew Ward

**Elevated risk items:**
- TikTok API integration (must name TikTok as a third-party integration in Privacy Policy + reference TikTok's own data practices)
- Creator content stored in the app (ownership, deletion rights)
- TikTok data flows (what data TikTok receives, cross-border transfer disclosure)

**Terms must cover:** content ownership, TikTok integration disclosure, data deletion on account close.

---

## CRM-AI (internal + future B2B SaaS — repo: `CRM-ai`)

**Legal pages needed (internal phase):** internal `/privacy` notice for employees, internal `/terms` / acceptable use
**Legal pages needed (external phase):** full `/privacy`, `/terms` with DPA, `/cookies`, subprocessor list
**Legal owner of record:** Toronado Entertainment, LLC

**Critical note — CRM-Ai is ALREADY a subprocessor.** Real customer data from Mythie, BacklotHub, The Production Shelf, ARTAS, and Aclamos flows into CRM-Ai for sales and issue tracking. Therefore CRM-Ai must be disclosed as a third-party vendor in the Privacy Policy of every source app **today** — not at "phase 2 external launch."

**Elevated risk items:**
- Customer-of-customer data ingestion (PII originating from end users of other portfolio apps)
- AI inference on customer data — Art. 22 automated-decisioning rights if any scoring/ranking/recommendation happens
- Email-account integration scope (read/send) must be disclosed
- Cross-app data linkage (combining records from multiple source apps = new processing purpose requiring its own legal basis)
- Future multi-tenant separation for external clients
- Data export and deletion on contract end (external phase)

**Terms must cover:** scope of data ingested per source app, retention, AI/automated-decisioning disclosure, employee acceptable use (internal), and (pre-external launch) full DPA + subprocessor obligations.

---

## NOELLY (holiday lights — repo: `holiday-lights`)

**Legal pages needed:** _pending inspection_
**Legal owner of record:** Toronado Entertainment, LLC

> **Naming note:** Brand name is **Noelly**. Repo name is `holiday-lights`. Always reference Noelly on live legal pages and user-facing copy.

**Status:** Risk class UNKNOWN until first audit. Likely a seasonal consumer-facing product; first inspection pass should determine: is there a user account system? payment? location data (light show registry)? UGC? This section will be filled by Step A of the portfolio rollout audit and a follow-up edit to this file.

---

## PRODUCING HOLLYWOOD (main producer site)

**Legal pages needed:** `/privacy`, `/terms`
**Legal owner of record:** Producing Hollywood (NOT Toronado Entertainment, LLC)

**Elevated risk items:** Low — primarily informational; no payment, no user accounts beyond contact form.
**Watch item:** Contact form data retention period must be disclosed; named controller must be Producing Hollywood, not Toronado.

# PH Invoicing
⚠️ LAST UPDATED: 2026-05-10 — verify against live app before using in training

## Identity
- **Repo:** https://github.com/jayhawkrules/Producing-Hollywood-Invoicing
- **Live URL:** https://invoices.producinghollywood.com
- **Stack:** A (React + Vite + Firebase)
- **Brand owner:** Andrew Ward
- **10 Lives branded:** No
- **Status:** Live

## What it is (one paragraph)
TBC — PH Invoicing is an invoicing tool for production finance, line producers, and freelance crew working on independent and unscripted productions. Confirm exact product positioning, target buyer, and Stripe integration scope with Andrew before using in staff training or sales conversations.

## Who uses it
| Role | What they do |
|------|-------------|
| TBC | TBC |

## Feature Inventory
| Feature | Status | Notes |
|---------|--------|-------|
| **PUBLIC SURFACES** | | |
| Landing page (logged-out) | ✅ Live | |
| Public invoice view (`/invoice/:id`) | ✅ Live | No-auth share link; recipients can forward without an account |
| **ADMIN UI** *(single-admin tool — Andrew is sole operator; future multi-tenant on roadmap)* | | |
| Invoice Dashboard (list + status) | ✅ Live | Routes: `/` and `/invoices` |
| Editable Invoice Form (new + edit) | ✅ Live | `/new` and `/edit/:id` |
| Projects Registry | ✅ Live | `/projects` |
| Clients Registry + Client Detail | ✅ Live | `/clients`, `/clients/:id` |
| Settings (live Firestore-backed company + payment config) | ✅ Live | `/settings`; live config without redeploy via `useCompanySettings` hook |
| Audit Log viewer (append-only `adminAuditLog`) | ✅ Live | `/audit-log` (PR #32) |
| **INVOICE OUTPUT** | | |
| Branded PDF invoice generation | ✅ Live | Firebase Functions Gen 2 / Node 22 |
| Clickable "Pay Online" link + wire/handles section in PDF | ✅ Live | PR #27 |
| Invoice + receipt email send (SMTP2GO) | ✅ Live | BCC admin on every send + email_id logging + delivery log panel (PR #42) |
| Bulk PDF zip export | ✅ Live | Admin-only (PR #34) |
| Reports — per-client + per-invoice annual + CSV export | ✅ Live | `/reports` (PR #33) |
| External income tracking (payroll stubs, royalties, PDF upload) | ✅ Live | `/income` (PR #37); attachments live in Firebase Storage |
| **PAYMENTS** | | |
| Stripe Checkout (card + ACH) | ✅ Live | Cloud Run `/api/stripe/create-checkout` + webhook |
| Manual payment methods (wire / Zelle / Venmo / check) | ✅ Live | Bank wire details + handles in `CompanySettings` |
| Stripe fees passthrough on invoice | ✅ Live | `src/lib/stripeFees.ts` |
| Interest charges on overdue invoices | ✅ Live | `src/lib/interest.ts` |
| Credit notes / overpayment handling | ✅ Live | WAVE credit-note reconciliation |
| **CLIENT-FACING PAYMENT FLOW** | | |
| Payment Claim self-report form (client → admin) | ✅ Live | "I paid via Zelle" intake → admin approves (PR #25) |
| Payment Claims admin dashboard (approve / reject / request-info + bell) | ✅ Live | `/payment-claims` (PR #26) |
| Per-invoice Payment Claims panel | ✅ Live | PR #28 |
| **EMAIL TRACKING & ACTIVITY** | | |
| Open tracking (transparent pixel) | ✅ Live | |
| Click tracking | ✅ Live | |
| Page-view tracking on public invoice | ✅ Live | PR #23 |
| Activity timeline (client-only panel) | ✅ Live | PR #23 |
| **SCHEDULED JOBS** | | |
| Overdue invoice check (daily) | ✅ Live | + manual trigger endpoint |
| Recurring invoice generation (scheduled) | ✅ Live | + manual trigger endpoint |
| Scheduled-send dispatcher (delay outbound mail) | ✅ Live | PR #41; + manual trigger endpoint |
| **AUTH / ACCESS CONTROL** | | |
| Firebase Auth — Google sign-in (single admin) | ✅ Live | |
| Admin gate via `ADMIN_EMAIL` env or `admin` custom claim | ✅ Live | Enforced in Firestore rules |
| `authedFetch` helper for client→server API calls | ✅ Live | |
| **INFRASTRUCTURE** | | |
| Cloud Run public API (Express, europe-west1) | ✅ Live | Stripe + payment-claim + tracking endpoints |
| Firebase Functions Gen 2 (Node 22) | ✅ Live | Email send, PDF generation, scheduled jobs |
| Firebase Hosting fronts SPA + `/api/**` rewrites | ✅ Live | |
| Firebase Storage (PDF attachment store) | ✅ Live | Payroll stubs, 1099s, etc. |
| Helmet + express-rate-limit security headers | ✅ Live | |
| Cache-Control: no-store on all API responses | ✅ Live | Anti-CDN-cache hardening |
| GitHub Actions auto-deploy on push to `main` | ✅ Live | One-step `firebase deploy` |
| **INTERNAL DATA TOOLS** *(operator-only, not customer-facing)* | | |
| WAVE V2 / V3 data correction migration scripts | ✅ Live | One-off historical reconciliation. Run via `npm run wave-v2:apply` / `wave-v3:apply`. **Do not run without Andrew's approval** |

## Pricing & Entitlements
| Plan | Price | Limits | Key Features |
|------|-------|--------|-------------|
| TBC | TBC | TBC | TBC |

## Key Workflows
TBC

## Navigation Map
TBC

## Known Issues / Limitations
TBC

## FAQ
TBC

## Changelog
| Date | Change |
|------|--------|
| 2026-05-10 | Reference file created; all sections marked TBC pending feature audit |
| 2026-05-10 | Feature audit completed; Inventory populated from Producing-Hollywood-Invoicing codebase |

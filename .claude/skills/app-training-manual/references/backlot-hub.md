# Backlot Hub
⚠️ LAST UPDATED: 2026-05-10 — verify against live app before using in training

## Identity
- **Repo:** https://github.com/jayhawkrules/backlothub
- **Live URL:** TBC (no public vanity URL yet; deploys via Firebase Hosting on an internal endpoint)
- **Stack:** A (React 19 + Vite + TypeScript + Firebase Hosting + Firestore + Functions; Leaflet for maps; xlsx for spreadsheet I/O; Google Gemini for AI features)
- **Brand owner:** Andrew Ward
- **10 Lives branded:** No (started as a 10 Lives internal tool; pivoting to multi-tenant SaaS where 10 Lives will be one customer alongside others)
- **Status:** Active dev — internal tooling in daily production use at 10 Lives Studios; public marketplace MVP code-complete but not yet exposed publicly

## What it is (one paragraph)
Backlot Hub is a back-office operations platform for production companies, covering asset and hard-drive management, project tracking with versioned files, crew/employee workflow (saturation, edit-bay scheduling, time-off, feedback), financials and expenses (with Expensify integration), and a public marketplace surface. Currently in internal production use at 10 Lives Studios (the founding customer); being prepared for a multi-tenant SaaS subscription rollout where 10 Lives will be one of many production-company customers. The public marketplace MVP (Sprint 1, BLOT-101..110, PR #2) is code-complete but not yet exposed at a public URL.

## Who uses it
| Role | What they do |
|------|-------------|
| TBC | TBC |

## Feature Inventory
| Feature | Status | Notes |
|---------|--------|-------|
| **ASSET / HARD-DRIVE MANAGEMENT** | | |
| Asset CRUD + storage capacity monitoring + status/location tracking | ✅ Live | Internal use at 10 Lives |
| Drive Type Selection (9 types — Portable SSD, RAID, Legacy, NVMe, SD Card, USB, Network, etc.) | ✅ Live | |
| Media Type classification (Proxies / Raw Media / Both) | ✅ Live | |
| Drive Content Indexing (real folder scan, file inventory, AI-powered analysis + summaries) | ✅ Live | `DriveIndexer.tsx` + `DRIVE_INDEXING_*.md` docs |
| Drive Transfer (move/copy between drives, merge or replace mode, deduplication, safety validation) | ✅ Live | `DriveTransferModal.tsx` |
| Bulk Asset Import (CSV / JSON / text + smart column mapping) | ✅ Live | `AssetBulkImport.tsx` + xlsx parser |
| Asset Map (geolocation visualization) | ✅ Live | `AssetMap.tsx` + Leaflet |
| **PROJECT TRACKING** | | |
| Project list + project file versions (v1/v2/v3 + current-version flag + version notes + history) | ✅ Live | `ProjectsView` |
| Cloud-storage download links (Google Drive / Dropbox / OneDrive / any URL) | ✅ Live | |
| **CREW / EMPLOYEE MANAGEMENT** | | |
| Employees list + detail view + edit + rehire | ✅ Live | `EmployeesList.tsx`, `EmployeeDetailView.tsx`, `EditEmployeeModal.tsx` |
| Crew Portal (self-service for crew) | ✅ Live | `CrewPortal.tsx` |
| Crew Registration + Approval Queue (SUPER_ADMIN-only) | ✅ Live | `CrewRegistrationForm.tsx`, `CrewApprovalQueue.tsx`, `RegistrationApprovals` |
| Crew Feedback System | ✅ Live | `CrewFeedbackForm.tsx` |
| Bulk Crew Import | ✅ Live | `BulkCrewImport.tsx` |
| Extended Profile Editor | ✅ Live | `ExtendedProfileEditor.tsx` |
| **WORKFLOW MANAGEMENT** | | |
| Saturation tracking (project assignments) | ✅ Live | |
| Work day management + Edit bay scheduling | ✅ Live | |
| Production Calendar with time-off requests | ✅ Live | `ProductionCalendar` view |
| Checklist View (per-record onboarding/offboarding) | ✅ Live | `ChecklistView.tsx` |
| Asana sync (per-checklist) | ✅ Live | `onSyncToAsana` hook in `App.tsx` |
| **FINANCIALS** | | |
| Expense View + Employee Expense Submission | ✅ Live | `ExpenseView.tsx`, `EmployeeExpenseSubmission.tsx` |
| Budget View | ✅ Live | `BudgetView.tsx` |
| Financial Report (per-employee) | ✅ Live | `FinancialReport` view |
| Expensify integration | ✅ Live | `EXPENSIFY_INTEGRATION_GUIDE.md` |
| **PRODUCTION TOOLING** | | |
| Call Sheet Builder | ✅ Live | `CallSheetBuilder.tsx` |
| Public Call Sheet Viewer (recipient-facing) | ✅ Live | `PublicCallSheetViewer.tsx` |
| Public Submission form (recipient-facing) | ✅ Live | `PublicSubmission.tsx` |
| Vendor List | ✅ Live | `VendorList` view |
| Equipment Rental Catalog | ✅ Live | `EquipmentRentalCatalog.tsx` |
| **AI FEATURES** *(Google Gemini — `@google/genai` + `@google/generative-ai`)* | | |
| AI Crew Search | ✅ Live | `AICrewSearch.tsx` |
| AI Document Import | ✅ Live | `AIDocumentImport.tsx` |
| AI Profile Assistant | ✅ Live | `AIProfileAssistant.tsx` |
| Assignment Notes AI | ✅ Live | `AssignmentNotesAI.tsx` |
| AI-powered drive content analysis + summaries | ✅ Live | Inside `DriveIndexer` |
| **AUTH / RBAC / SECURITY** | | |
| Firebase Auth + Domain Restriction | ✅ Live | `DOMAIN_RESTRICTION_2FA.md` |
| 2FA enforcement | ✅ Live | `AUTH_SYSTEM_GUIDE.md` |
| SUPER_ADMIN role + per-role gating | ✅ Live | |
| Admin Password Reset | ✅ Live | `AdminPasswordReset.tsx` |
| Audit Log Viewer | ✅ Live | `AuditLogViewer.tsx` |
| **DATA SAFETY** | | |
| Backup System + Restore | ✅ Live | `BackupRestore.tsx`, `BACKUP_SYSTEM.md` |
| Data Recovery Panel | ✅ Live | `DataRecoveryPanel.tsx` |
| Data Protection Guide (operator runbook) | ✅ Live | `DATA_PROTECTION_GUIDE.md` |
| **ADMIN OPS** | | |
| Admin Bulk Tools | ✅ Live | `AdminBulkTools.tsx` |
| Feature Requests Manager | ✅ Live | `FeatureRequestsManager.tsx` |
| Settings + onboarding flow | ✅ Live | `new-onboarding` view |
| **PUBLIC MARKETPLACE MVP** *(Sprint 1, BLOT-101..110, PR #2)* | | |
| Marketplace Shell + Home + Login | 🚧 In dev | `components/marketplace/MarketplaceShell.tsx` + `MarketplaceHome.tsx` + `MarketplaceLogin.tsx` |
| Marketplace auth (separate from internal Firebase Auth) | 🚧 In dev | `services/marketplace/marketplaceAuth.ts` |
| Marketplace Cloud Function | 🚧 In dev | `functions/src/marketplace.ts` |
| Public marketplace exposure at a vanity URL | ❌ Not yet | No vanity URL; not exposed publicly per Andrew |
| **INFRASTRUCTURE** | | |
| Firebase Hosting deploy via `firebase deploy` | ✅ Live | `npm run deploy` (full) / `deploy:hosting` / `deploy:rules` |
| Firestore rules deploy script | ✅ Live | |
| React 19 + Vite 6 + TypeScript | ✅ Live | |

## Pricing & Entitlements
| Plan | Price | Limits | Key Features |
|------|-------|--------|-------------|
| TBC | TBC | TBC | TBC |

## Key Workflows
TBC

## Navigation Map
TBC

## Known Issues / Limitations
- Live URL not yet published — TBC
- Active development; expect frequent feature changes
- Do not promise launch dates or feature availability

## FAQ
TBC

## Changelog
| Date | Change |
|------|--------|
| 2026-05-10 | Reference file created; all sections marked TBC pending feature audit |
| 2026-05-10 | Stack corrected B → A (firebase.json + Firebase deps confirm Stack A). Live URL noted as TBC (no vanity URL yet). 10 Lives branded confirmed "No" — Andrew is repositioning Backlot Hub as a multi-tenant SaaS where 10 Lives is one customer. "What it is" rewritten from `CLAUDE.md` + `COMPLETE_SYSTEM_STATUS.md`. |
| 2026-05-10 | Feature audit completed; Inventory populated from `jayhawkrules/backlothub` codebase + `COMPLETE_SYSTEM_STATUS.md` + components/ directory (~50 rows across 11 surface groups). Internal admin tooling marked ✅ Live (in daily 10 Lives production use); Public Marketplace MVP marked 🚧 In dev (Sprint 1 code shipped via PR #2, not yet publicly exposed). |

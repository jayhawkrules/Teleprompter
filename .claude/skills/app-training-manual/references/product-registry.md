# Product Registry — Canonical App List

⚠️ LAST UPDATED: 2026-05-10 — verify against live apps before using in training

This is the single source of truth for which apps exist in Andrew Ward's portfolio, who owns the brand, and whether they carry the "10 Lives Studios" mark.

## Stack classes

- **A** — React + Vite + Firebase
- **B** — TypeScript (Next.js, Express, Supabase, etc.) — not Stack A
- **C** — Static HTML
- **D** — PHP / WordPress
- **E** — Cron-driven JS scripts via GitHub Actions

## Apps

| App | Repo | Live URL | Stack | Brand Owner | 10 Lives Branded? | Status |
|-----|------|----------|-------|-------------|-------------------|--------|
| Mythie (CastHub) | jayhawkrules/CastHub1 | casthub--casthub-1d833.us-east4.hosted.app | A | Andrew Ward | No | Live |
| Teleprompter | jayhawkrules/Teleprompter | teleprompter.producinghollywood.com | A/B | Andrew Ward | No | Live |
| CueHound (Run of Show) | jayhawkrules/RunOfShow | cuehound.com | B | Andrew Ward · Producing Hollywood | No | Pre-alpha |
| The Production Shelf | jayhawkrules/theproductionshelf | theproductionshelf.com | C | Andrew Ward | No | Live |
| PH Invoicing | jayhawkrules/Producing-Hollywood-Invoicing | invoices.producinghollywood.com | A | Andrew Ward | No | Live |
| Aclamos | jayhawkrules/awardssubmission | aclamos.app | B | Andrew Ward | No | Live |
| Ballotis | jayhawkrules/awardssubmission (sub-product of Aclamos; same codebase) | aclamos.app/ballotis | B | Andrew Ward | No | Live |
| Backlot Hub | jayhawkrules/backlothub | TBC | A | Andrew Ward | No | Active dev |

## Notes

- Any app NOT in this table should not be discussed as a portfolio app — confirm with Andrew first.
- The "10 Lives Branded?" column governs whether marketing/training materials may attach the 10 Lives Studios name to the app. See `policy/brand-rules.md`.
- `TBC` in any column = ask Andrew before stating it. Do not guess.
- When a new app is added, follow `templates/new-app-template.md` to create its reference file, then add a row here.

## Reference files

Each app has a reference file in this folder:

- `mythie.md` — Mythie (CastHub)
- `teleprompter.md` — Teleprompter
- `cuehound.md` — CueHound (Run of Show)
- `production-shelf.md` — The Production Shelf
- `ph-invoicing.md` — PH Invoicing
- `aclamos.md` — Aclamos
- `ballotis.md` — Ballotis (sub-product of Aclamos; shared codebase at `jayhawkrules/awardssubmission`)
- `backlot-hub.md` — Backlot Hub

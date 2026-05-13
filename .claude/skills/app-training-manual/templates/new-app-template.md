# [APP NAME]
⚠️ LAST UPDATED: [FILL IN DATE] — verify against live app before using in training

## Identity
- **Repo:** [FILL IN GITHUB REPO URL]
- **Live URL:** [FILL IN LIVE URL OR TBC]
- **Stack:** [FILL IN: A / B / C / D / E]
- **Brand owner:** Andrew Ward
- **10 Lives branded:** [FILL IN: Yes / No — see policy/brand-rules.md]
- **Status:** [FILL IN: Live / Active dev / Paused]

## What it is (one paragraph)
[FILL IN — one clear paragraph that any new staff member can read aloud to a customer. Include: what it does, who it's for, what makes it distinct. Do NOT include unconfirmed claims.]

## Who uses it
| Role | What they do |
|------|-------------|
| [FILL IN ROLE] | [FILL IN WHAT THEY DO IN THE APP] |
| [FILL IN ROLE] | [FILL IN WHAT THEY DO IN THE APP] |

## Feature Inventory
| Feature | Status | Notes |
|---------|--------|-------|
| [FILL IN FEATURE] | [✅ Live / 🚧 In dev / ❌ Removed] | [FILL IN ANY CAVEATS] |
| [FILL IN FEATURE] | [✅ Live / 🚧 In dev / ❌ Removed] | [FILL IN ANY CAVEATS] |

## Pricing & Entitlements
| Plan | Price | Limits | Key Features |
|------|-------|--------|-------------|
| [FILL IN PLAN NAME OR TBC] | [FILL IN PRICE OR TBC] | [FILL IN LIMITS OR TBC] | [FILL IN FEATURES OR TBC] |

## Key Workflows
[FILL IN — step-by-step for each primary user workflow. Example:

### Workflow 1 — [name]
1. [Step]
2. [Step]
3. [Step]
]

## Navigation Map
[FILL IN — where to find each key feature in the UI. Example:
- **Settings** — top-right gear icon → "Settings"
- **Billing** — Settings → "Billing & plan"
- **Team management** — Settings → "Team"
]

## Known Issues / Limitations
[FILL IN — anything that's broken, partial, or about to change. If nothing, write "None at time of last audit ([date])".]

## FAQ
[FILL IN — common questions new staff or users ask. Example:
**Q: Can I export my data?**
A: [Answer based on Feature Inventory]
]

## Changelog
| Date | Change |
|------|--------|
| [FILL IN DATE] | Reference file created |

---

## Scaffolding instructions for Claude

When asked to add a new app, walk through these questions in order:

1. **App name** — what's it called? Any internal vs external name distinction?
2. **Repo URL** — full GitHub URL
3. **Live URL** — or `TBC` if not published
4. **Stack class** — A/B/C/D/E (run `safe-edit-policy` Step 2 inspection on the repo if unsure)
5. **10 Lives branded?** — Yes only if Andrew explicitly confirms; default No
6. **Status** — Live / Active dev / Paused
7. **One-paragraph description** — Andrew dictates; do not invent
8. **Roles** — who uses it; what each role does
9. **Feature inventory** — run `scripts/feature-audit.md` against the repo to populate from the codebase, then have Andrew confirm
10. **Pricing** — Andrew dictates; mark TBC if not confirmed; never invent
11. **Workflows** — list each primary workflow step-by-step
12. **Navigation map** — where each feature lives in the UI
13. **Known issues** — Andrew dictates
14. **FAQ** — start empty; populate as questions come in from staff or users

After populating:
- Save the file as `references/[app-slug].md`
- Add a row to `references/product-registry.md`
- Update `references/product-registry.md` reference list at the bottom
- Surface a 🔧 manual task: "Run feature-audit on [app] to verify Feature Inventory before using in training"

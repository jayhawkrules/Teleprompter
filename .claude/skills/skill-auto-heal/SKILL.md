---
name: skill-auto-heal
description: Monthly audit of every skill in this hub for staleness — expired dates, dead vendor refs (Sentry, Heroku, LogRocket), outdated Claude model names, broken related-skill links, schema drift in stack_pinned_to versions. Outputs a ranked red/yellow/green table per skill. Produces a report only — NEVER edits a skill without Andrew's explicit confirmation. Runs first Monday of each month, after major npm updates, and after vendor migrations. Keywords: skill audit, drift detection, self-healing, staleness check, vendor migration, model migration, expires, stack_pinned_to, skill registry hygiene.
version: 1.0.0
last_reviewed: 2026-05-10
expires: 2026-11-10
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Grep, Glob, Bash]
trigger_cadence:
  - first_monday_each_month
  - after_major_npm_update
  - after_vendor_migration
  - on_demand_via_portfolio_health_audit
---

# Skill Auto-Heal

> **Hard rule — read first:** This skill NEVER edits a skill file without Andrew's explicit confirmation. It produces an audit report. Edits are surfaced as 🔧 manual tasks per `safe-edit-policy`.

A monthly check that the 25+ skills in this hub aren't rotting silently. Skills drift the moment a vendor migrates, a model is retired, or an npm major lands. Without an auditor, future-Claude follows stale guidance and ships broken work.

Always load `safe-edit-policy` first. Composes with `portfolio-health-audit` (this skill's report becomes a section of the Monday rollup), `vendor-consolidation-policy` (its allowed-vendor list is a positive filter), `error-tracking-system` (which carries the `drift_sentinels` / `auto_heal_checks` schema this skill audits against).

## When to use

- First Monday of each month — scheduled audit
- After any major npm update across the portfolio (e.g., React 18 → 19)
- After any vendor migration (e.g., Sentry → error-tracking-system)
- After retiring a Claude model (e.g., when `claude-3-*` becomes deprecated)
- On demand from `portfolio-health-audit`

## When NOT to use

- Mid-feature work in a single repo — this is a hub-level audit
- During a fresh skill authoring session (it audits, it doesn't co-author)
- As an excuse to delete or rewrite a skill — it never edits

## The five checks

Run every check against every skill folder in the hub. A skill folder is any sibling directory of this one containing a `SKILL.md`.

### Check 1 — `check_expires_date`

Parse frontmatter. If `expires:` is present and `today >= expires` → **RED**. If `expires` is missing on a skill that should have one (any skill with `last_reviewed` set, or any skill in category `observability`) → **YELLOW**. If `expires` is within 30 days of today → **YELLOW** (warning).

### Check 2 — `check_stale_vendor_refs`

Grep each skill body for retired-vendor names. The retired list (as of 2026-05-10):

| Vendor | Status | Severity |
|---|---|---|
| `Sentry` | being replaced by `error-tracking-system` | YELLOW (expected during migration window), RED after 2026-08-01 |
| `LogRocket` | never adopted | RED if mentioned as active |
| `Heroku` | retired, migrated to Cloud Run / Railway | RED if mentioned as active |
| `Auth0` | not in house stack | YELLOW if mentioned as recommendation |

Allow-list: mentions inside an explicit "migration history", "retired", "Sentry migration checklist", or fenced `<!-- archived -->` block do not trigger.

Cross-check against `vendor-consolidation-policy` for the current allowed-vendor list. That skill is the source of truth.

### Check 3 — `check_stale_model_names`

Grep for retired Claude / OpenAI model strings:

| Pattern | Status | Severity |
|---|---|---|
| `claude-1`, `claude-2`, `claude-instant` | retired | RED |
| `claude-3-` | being retired (4.x is current) | YELLOW |
| `gpt-3.5`, `text-davinci`, `gpt-4-0613` | retired | RED |
| `claude-3-5-sonnet-20240620` and similar pinned-old IDs | retired | RED |

Current canonical model IDs (2026-05-10): `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`. Anything else is suspect.

### Check 4 — `check_dead_related_links`

For each skill's frontmatter or registry entry `related: [...]`, verify every name corresponds to an existing folder in the hub. Missing folder → **RED**. Folder exists but its `SKILL.md` is missing → **RED**.

Also check `skills-registry.json` and `SKILLS_REGISTRY.md` for names not present on disk → **RED**.

### Check 5 — `check_schema_drift`

For each skill that declares `stack_pinned_to:`, compare each pinned package against the version installed in the most-adopting repo (default: CastHub1). Use `npm view <pkg> version` only with offline-cache fallback (no live network required during the audit; stale local cache is acceptable and noted).

| Drift | Severity |
|---|---|
| Patch difference | GREEN (informational) |
| Minor difference | YELLOW |
| Major difference | RED |
| Pinned package not installed at all | RED |

## Output format

A single markdown report at `~/portfolio-health-audit/skill-audit-YYYY-MM-DD.md`, plus a concise terminal summary.

### Ranked table (terminal + report header)

```
SKILL AUTO-HEAL REPORT — 2026-MM-DD

| Skill                          | last_reviewed | expires    | Status | Top finding                                |
|--------------------------------|---------------|------------|--------|--------------------------------------------|
| error-tracking-system          | 2026-05-10    | 2026-11-10 | GREEN  | All sentinels pass                         |
| production-error-to-regression | 2026-05-10    | (none)     | YELLOW | Frontmatter mentions Sentry post-migration |
| skill-auto-heal                | 2026-05-10    | 2026-11-10 | GREEN  | Self-check pass                            |
| ...                            |               |            |        |                                            |

LEGEND
  GREEN  — no findings, or only informational
  YELLOW — drift detected, review recommended within 30 days
  RED    — stale guidance shipping; action required

TOTALS
  GREEN: N    YELLOW: N    RED: N
```

### Per-skill detail (report body)

For each non-green skill, include:

```
### {skill-name} — {STATUS}

last_reviewed: ...        expires: ...
Findings:
  - [check_id] severity — evidence (file:line)
Suggested fix:
  - [exact line edit, or "ask Andrew before changing"]
```

## Hard rules

1. **Never edit a skill file.** Surface every suggestion as a 🔧 manual task. Andrew approves each one individually.
2. **Never delete a skill or registry entry.** Even if a skill is RED on every check, deletion requires explicit confirmation.
3. **Never bump `stack_pinned_to` versions.** Those are pinned for a reason. Surface drift; let Andrew decide.
4. **Never auto-extend `expires`.** An expired skill must be re-reviewed, not silently revived.
5. **Never widen the retired-vendor allow-list.** New vendor migrations route through `vendor-consolidation-policy`.

## Trigger cadence

| Trigger | Cadence | Output goes to |
|---|---|---|
| First Monday each month | Monthly | `~/portfolio-health-audit/skill-audit-YYYY-MM-DD.md`, plus a section in the Monday `portfolio-health-audit` rollup |
| After major npm update | Event-driven | Same report path, dated to the day of the update |
| After vendor migration | Event-driven | Same report path; expect YELLOW/RED on the migrated-from vendor for 30 days |
| On demand | Any time | Terminal-only summary acceptable |

## Composition

- **`portfolio-health-audit`** — embeds this skill's GREEN/YELLOW/RED rollup as one row of the Monday cross-portfolio table.
- **`vendor-consolidation-policy`** — provides the allowed-vendor list used by Check 2.
- **`error-tracking-system`** — first skill to declare `drift_sentinels:` and `auto_heal_checks:`. This skill enumerates them at audit time.
- **`safe-edit-policy`** — defines the manual-task format used to surface every finding.

## Output format (skill self-summary)

```
SKILL-AUTO-HEAL RUN — [date]

SCANNED
  N skill folders, N registry entries

RESULTS
  GREEN: N    YELLOW: N    RED: N

TOP-3 RED FINDINGS
  1. [skill] — [check] — [evidence]
  2. ...
  3. ...

REPORT
  Path: ~/portfolio-health-audit/skill-audit-YYYY-MM-DD.md

🔧 MANUAL TASKS FOR ANDREW: [per safe-edit-policy Step 8]
  - [skill] — [proposed exact edit] — [check that flagged it]
```

## Common mistakes

1. **Editing a skill because the audit said so.** Audit produces report. Andrew approves edits. No exceptions.
2. **Treating YELLOW as urgent.** YELLOW is "review within 30 days". Only RED needs same-week action.
3. **Running this skill mid-feature.** It's a hub-level audit; it doesn't compose with single-repo work.
4. **Skipping the registry cross-check.** A skill folder without a registry entry (or vice versa) is a RED finding even if both files are otherwise healthy.
5. **Pretending offline npm cache is live.** When the cache is stale, mark the schema-drift findings as "cache-aged N days" rather than passing them silently.

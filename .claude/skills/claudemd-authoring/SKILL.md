---
name: claudemd-authoring
description: Use when writing, tightening, or auditing CLAUDE.md files in any portfolio repo. CLAUDE.md is loaded into context at the start of every session — if it's bloated, every prompt pays a tax; if it's empty, Claude has no shared team context. This skill teaches the hygiene rules (keep under ~100 lines), what belongs (bash commands, MCP tools, key files, style notes, parallel-session policy), what does NOT belong (long architecture docs, history, drift-prone vendor details), the nested-CLAUDE.md pattern for subdirectories, the local-not-checked-in variant for personal preferences, and the `/memory` workflow for editing. Keywords - CLAUDE.md, claude memory file, project context, bloated CLAUDE.md, nested claude.md, memory file, shared context, /memory, # remember.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep]
---

# CLAUDE.md Authoring

CLAUDE.md is the single most leveraged piece of prompt engineering in a repo. It's loaded automatically at the start of every session — Claude Code, Cowork-via-kickoff-prompt, GitHub Action runs via `claude -p`, all of them. A 50-line good CLAUDE.md beats a 500-line bloated one every time, because the bloated one (a) burns context budget, (b) buries the parts Claude actually needs, and (c) drifts so fast it becomes lies.

This skill governs what goes in, what stays out, and how to keep it tight.

## When to use

- Writing CLAUDE.md for a new repo (called by `new-repo-quality-bootstrap`)
- Sweeping an existing repo whose CLAUDE.md has grown past ~150 lines
- A teammate or Cowork session keeps making the same mistake — encode the lesson in CLAUDE.md
- Quarterly audit (pairs with `repo-health-audit`)
- Adding a new MCP server, bash workflow, or parallel-session policy to a repo

## When NOT to use

- For personal preferences across all repos — those go in `~/.claude/CLAUDE.md`, not the repo's CLAUDE.md
- For a one-time task — note it in the conversation, don't pollute CLAUDE.md
- For something that belongs in a real doc (`docs/architecture/*.md`, `docs/strategy/*.md`) — CLAUDE.md should *link* to docs, not duplicate them

## The seven sections of a good CLAUDE.md

Not every repo needs every section. Use this as a template, prune what doesn't apply.

```markdown
# CLAUDE.md — <Repo Name>

> One-sentence product description. Stack class (A/B/C/D/E). Production URL if any.

## Bash commands

- `npm run dev` — start dev server (Vite on :5173)
- `npm run typecheck` — TS check, run before commit
- `npm test` — Vitest (unit + integration)
- `npm run build` — production build, also catches type errors
- `firebase emulators:start --only firestore,auth` — local emulators

## MCP servers

This repo checks in `.mcp.json`. On first run, Claude will prompt to install:
- Puppeteer — for UI iteration loops
- Firebase — for Firestore/Auth admin

## Key files

- `src/App.tsx` — top-level routes + auth gates
- `firestore.rules` — RBAC, see `firestore-rbac-helpers` skill
- `backend/clientErrorRoutes.js` — error-tracking ingestion
- `docs/architecture/` — deeper system docs (link, don't duplicate)

## Style + conventions

- TypeScript strict mode; no `any` without a comment
- Tailwind classes, no inline styles
- File naming: PascalCase components, kebab-case routes
- Tests live next to source as `*.test.ts`

## Parallel session policy

(only if Cowork runs against this repo)

- Claude Code works from `~/GitHub/<repo>`
- Cowork works from `~/GitHub/<repo>-worktrees/cowork`
- Cowork branches prefixed `cowork/`
- See `parallel-claude-worktrees` skill for recovery if a hijack occurs.

## What NOT to touch without asking

- `firestore.rules` immutable-role fields (see [[feedback_custom_claims_over_email_allowlist]])
- Stripe webhook handlers — pair with `payment-webhook-safety`
- Any file under `src/legal/` — pair with `legal-compliance-guardian`

## See also

- `docs/architecture/` for system design
- `docs/strategy/` for product roadmap
- `~/GitHub/claude-skills/` for portfolio-wide skills
```

## Hard rules

1. **Cap at ~100 lines.** If you're over, the first cut is "what can move to `docs/`?" CLAUDE.md is a pointer hub, not a wiki.
2. **No history.** "We used to use X, then migrated to Y in 2024" belongs in a commit message or ADR. CLAUDE.md describes the *present*.
3. **No long architecture explanations.** Link to `docs/architecture/*.md`. CLAUDE.md says "auth flow lives in src/auth, see docs/architecture/auth.md" — that's it.
4. **No vendor pricing or dashboard URLs that rot.** Those drift faster than the repo does. Put them in `docs/` or `.env.example` comments.
5. **No secrets, no API keys, no PII.** CLAUDE.md is committed.
6. **Every "do this" should be actionable.** "Be careful with auth" is not actionable. "Run `npm run test:auth` after any change in `src/auth/`" is.

## Nested CLAUDE.md pattern

For large repos, you can drop CLAUDE.md files in subdirectories. Claude auto-loads them when working in that directory:

```
<repo>/
├── CLAUDE.md              ← always loaded
├── src/
│   └── payments/
│       └── CLAUDE.md      ← loaded when Claude works in src/payments/
└── backend/
    └── CLAUDE.md          ← loaded when Claude works in backend/
```

Use nested CLAUDE.mds for surface-specific rules that don't apply repo-wide:
- `src/payments/CLAUDE.md` → idempotency rules, Stripe-specific conventions
- `backend/CLAUDE.md` → secret-handling, env-var conventions
- `src/legal/CLAUDE.md` → "any edit here triggers legal review"

Each nested CLAUDE.md should be even shorter than the root — 20-50 lines, surface-specific only.

## Local CLAUDE.md (not checked in)

`CLAUDE.local.md` (or `.claude/CLAUDE.md`) is for personal preferences that shouldn't ship to the team. Boris uses this pattern for himself. Examples:
- Your preferred dictation phrasing
- Personal scratchpad of "Claude keeps doing X, remind it not to"

Add to `.gitignore`:
```
CLAUDE.local.md
.claude/CLAUDE.md
```

## User-global CLAUDE.md

`~/.claude/CLAUDE.md` is read on every Claude Code session regardless of repo. Andrew's portfolio uses this for cross-repo facts:
- Andrew is a reality TV producer / Toronado Entertainment
- Portfolio classification A/B/C/D/E/F
- Memory-system pointers

Don't duplicate repo-specific content there.

## Enterprise / org-level CLAUDE.md

(Boris mentioned this; not currently used in Andrew's portfolio.) Lives outside the repo, applied by org policy. Use when a rule must hold across every repo every employee touches.

## `/memory` workflow

Inside Claude Code:
- `/memory` — list all memory files being loaded for the current session, in priority order
- `/memory` then pick a file — open it for editing
- Type `#` then your note + Enter — Claude proposes which memory file to add it to (root CLAUDE.md, nested CLAUDE.md, or `~/.claude/CLAUDE.md`)

The `#` shortcut is the lowest-friction way to keep CLAUDE.md current. When Claude misbehaves the same way twice, `#` the correction.

## Anti-patterns seen in the portfolio

(From the CastHub1 adoption-pack pass and other sweeps.)

1. **The 400-line CLAUDE.md** — usually has architecture, history, vendor dashboards, and three "do not" sections. Cut to 100, move the rest to `docs/`.
2. **The empty CLAUDE.md** — just a title and "TODO". Worse than no file; signals to Claude "no shared context exists, infer from scratch every time".
3. **The stale CLAUDE.md** — references files that were moved or vendors that were swapped. Run `repo-health-audit` quarterly to catch this.
4. **The duplicated CLAUDE.md** — root and nested both restate the same conventions. Nested should be *additive*, not duplicate.
5. **The TODO list disguised as CLAUDE.md** — "We still need to do X, Y, Z." That's `MANUAL_TASKS.md`, not CLAUDE.md.

## Audit procedure

To tighten an existing CLAUDE.md:

```bash
wc -l CLAUDE.md   # over 150? definitely audit. over 100? probably audit.
```

Then for each section, ask:
1. **Is this actionable?** ("Be careful" → cut. "Run X after touching Y" → keep.)
2. **Is this still true?** (Cross-check vendor names, file paths, npm scripts.)
3. **Does this belong in `docs/` instead?** (Architecture, history, ADRs — move out.)
4. **Will the team actually read this every session?** (If only relevant to one feature, move to nested CLAUDE.md.)

Target: every line either changes Claude's behavior or saves Claude a search.

## Per-repo priority for the portfolio

Repos most likely to benefit from a CLAUDE.md sweep right now (based on observed bloat and active Claude/Cowork use):

1. **CastHub1** — has adoption pack landed (PR #520-523), but APP_PROFILE has ~12 [TODO: confirm] markers per [[project_casthub1_adoption_pack]]. Sweep CLAUDE.md to point at confirmed sections.
2. **awardssubmission** (Aclamos) — active Cowork, add parallel-session policy.
3. **CRM-ai** — cross-portfolio integration; add nested CLAUDE.md for `webhooks/` (HMAC signing rules).
4. **holiday-lights** (Noelly) — canonical repo per [[project_noelly_canonical_repo]]; CLAUDE.md should note "noelly-app turborepo was deleted".
5. Remaining Stack A/B repos — opportunistic, when next worked on.

## Related skills

- [[safe-edit-policy]] — every CLAUDE.md should reference this contract
- [[new-repo-quality-bootstrap]] — generates the initial CLAUDE.md for new repos
- [[repo-health-audit]] — flags stale CLAUDE.md as part of quarterly audit
- [[parallel-claude-worktrees]] — provides the parallel-session policy snippet
- [[fresh-chat-handoff]] / [[cowork-kickoff]] — both read CLAUDE.md as priority context

## Source of truth

- Reference example: `~/GitHub/CastHub1/CLAUDE.md` (post-adoption-pack)
- Andrew's user-global: `~/.claude/CLAUDE.md`
- Boris Cherny, Code with Claude 2026 — "Claude MD" segment (~9:00)

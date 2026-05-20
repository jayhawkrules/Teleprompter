---
name: slash-commands-authoring
description: Use when authoring custom slash commands for a portfolio repo (`.claude/commands/<name>.md`) or for the user-global library (`~/.claude/commands/<name>.md`). Slash commands are reusable prompts that any session can invoke via `/<name>`. They're how recurring workflows get baked in — `/triage-issues`, `/release-notes`, `/regression-test-from-sentry`, `/commit-push-pr`, `/scout`, etc. This skill covers the file format (frontmatter + body + variable substitution), the project-vs-user scope decision, name collisions, $1/$ARGUMENTS substitution patterns, and the standard portfolio set worth shipping into every repo. Keywords - slash command, /command, .claude/commands, custom command, reusable prompt, command authoring, project commands, user commands, $ARGUMENTS, $1.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash]
---

# Slash Commands Authoring

A slash command is a markdown file Claude treats as a prompt template. Drop a file at `.claude/commands/triage.md` in a repo, and from then on every Claude session in that repo can type `/triage` to invoke it. Drop the same file at `~/.claude/commands/triage.md` and it's available in every Claude Code session, every repo.

Boris demoed Anthropic's `/label-github-issues` slash command in the Code with Claude 2026 talk — it's what powers their automatic issue labeling. Same pattern works for the portfolio.

This skill is the authoring guide.

## When to use

- A workflow has been done 3+ times by typing roughly the same prompt — encode it as a slash command
- Onboarding a teammate / Cowork session into a repo-specific workflow
- Building portfolio-standard commands every repo should have (`/triage-issues`, `/release-notes`)
- Want to invoke a workflow from `claude -p` headless (slash commands work there too: `claude -p /triage`)

## When NOT to use

- One-off prompts — don't pollute `.claude/commands/` with single-use stuff
- Anything that needs significant per-invocation customization — at that point it's a skill, not a command
- Secret-bearing prompts — `.claude/commands/` is checked in; don't inline API keys or tokens

## File format

Two valid forms.

### Plain markdown (simplest)

`.claude/commands/triage.md`:

```markdown
Triage all open GitHub issues in this repo. Read each, classify by:
- type (bug, feature, docs, infra, security)
- severity (P0/P1/P2/P3)
- area (auth, payments, ui, backend, ...)

Apply labels with `gh issue edit`. Skip issues that already have a "triaged" label.
Add a "triaged" label to each one you process.

Output: a markdown summary table of what you triaged.
```

User invokes: `/triage` — Claude executes the body as a prompt.

### With frontmatter (when you need metadata)

```markdown
---
description: Triage all open GitHub issues, apply labels, summarize
allowed-tools: [Bash, Read]
---

Triage all open GitHub issues in this repo...
```

Frontmatter fields:
- `description` — short, shows in `/` autocomplete
- `allowed-tools` — restricts what Claude can use during this command (optional, defaults to all tools the session has)

## Variable substitution

Slash commands accept arguments. Two patterns:

### `$ARGUMENTS` — everything after the command name

`.claude/commands/regression-from-sentry.md`:

```markdown
Convert this Sentry alert into a permanent regression test:

$ARGUMENTS

Use the production-error-to-regression skill. Write the test, run it to confirm it fails against current code, then implement the fix.
```

Invoked as: `/regression-from-sentry TypeError: Cannot read property 'uid' of null at AuthGuard.tsx:42`

### `$1`, `$2`, etc. — positional

`.claude/commands/release-notes.md`:

```markdown
Generate release notes for the version $1 release.

Pull commits from $2..HEAD via `git log`, group by theme, write user-facing summaries.
Output as markdown to RELEASE_NOTES_$1.md.
```

Invoked as: `/release-notes v1.4.2 v1.4.1`

## Project vs user scope

| Location | Scope | When to use |
|---|---|---|
| `.claude/commands/*.md` in repo | Project — only available in this repo's Claude sessions | Repo-specific workflows: deploy commands, repo's own test runner, that repo's release-notes format |
| `~/.claude/commands/*.md` | User — available in every Claude Code session on this machine | Cross-repo workflows: `/commit-push-pr`, `/regression-from-sentry`, personal preferences |
| Plugin / enterprise commands | Organization-wide | Not currently used in Andrew's portfolio |

Naming collisions: project-scoped wins. If both `.claude/commands/release-notes.md` (repo) and `~/.claude/commands/release-notes.md` (user) exist, the repo version is used inside that repo.

## Portfolio-standard command set

These are worth shipping into every Stack A/B repo. Most live in `~/.claude/commands/` (user-scope, since they're cross-repo); a few are repo-specific.

### User-scope (in `~/.claude/commands/`)

| Command | Purpose | Body sketch |
|---|---|---|
| `/commit-push-pr` | Branch, commit, push, open PR — Boris's example incantation | "Make a feature branch from main, stage relevant files, commit with a message summarizing changes, push, open a draft PR" |
| `/regression-from-sentry` | Bug-to-test pipeline | Uses [[production-error-to-regression]] skill |
| `/triage-issues` | Label + classify open issues | Uses [[claude-sdk-in-ci]] pattern |
| `/release-notes` | Generate release notes from git log | Uses git log + `claude -p` style summary |
| `/inspect` | Run the safe-edit-policy inspection pass | "Per safe-edit-policy, read CLAUDE.md, run git status, identify stack, summarize state" |
| `/cowork-handoff` | Generate the Cowork kickoff doc for today | Uses [[cowork-kickoff]] skill |

### Project-scope (in each repo's `.claude/commands/`)

| Command | Purpose |
|---|---|
| `/deploy` | This repo's deploy command (Firebase, Railway, etc.) — wraps the right CLI calls |
| `/seed` | Reset + seed dev database |
| `/scout` (CastHub1 only) | Run the casting-call scrape — uses [[reality-casting-scout]] |
| `/health` | Run the repo-specific health check (per [[repo-health-audit]]) |

## Composition with skills

Slash commands and skills overlap intentionally. The split:

- **Skill** = teaches Claude HOW to do something. Multi-section, with policy, examples, anti-patterns. Often loaded automatically based on context.
- **Slash command** = a TRIGGER to do that something now. Short. Names the skill if relevant.

Pattern: a slash command's body often says "Use the X skill on $ARGUMENTS." That's the right shape — the skill holds the knowledge, the slash command is the keyboard shortcut.

Example — `.claude/commands/99it.md`:

```markdown
---
description: Run /99it audit-and-marathon on $ARGUMENTS
---

Use the 99it skill to audit and marathon-ship $ARGUMENTS to 99/100.
```

## Discovery

Inside Claude Code:
- Type `/` — autocomplete shows all available commands with their `description` frontmatter
- Both project and user scope show together
- Built-in commands (`/help`, `/memory`, `/theme`, `/terminal-setup`) also show — don't reuse those names

## Common mistakes

1. **Vague prompts** — "Triage issues" doesn't tell Claude what taxonomy to use. Spell out the schema in the command body.
2. **No stop condition** — "Keep going until everything's done" loops forever. Specify "max N items" or "stop when X."
3. **Hardcoded paths that drift** — `/release-notes` referencing `v1.0.0` becomes wrong by `v1.0.1`. Use `$1` or `git describe`.
4. **Project commands that should be user commands** — if 5 repos all have `.claude/commands/regression.md` with identical content, move to `~/.claude/commands/`.
5. **User commands that reference repo-specific files** — `~/.claude/commands/X.md` cannot assume any specific file structure. If it needs to, scope it to the repo.
6. **Forgetting allowed-tools** — commands meant to be safe in `claude -p` should restrict tools.

## Per-repo adoption priority

1. **CastHub1** — has the most distinct workflows; add `/scout`, `/deploy`, `/seed`, `/cowork-handoff`. Plus user-scope set if not already present.
2. **awardssubmission** — `/deploy` (Railway), `/seed`, `/release-notes` for Aclamos. Cowork uses these too.
3. **CRM-ai** — `/deploy`, `/sync-events` for the inbound webhook pipeline.
4. **Mythie marketing / toronadoentertainment.com** — `/lighthouse`, `/seo-audit` via [[seo-aeo-optimizer]].
5. User-scope set (`~/.claude/commands/`) — add once, benefits every repo. Highest leverage.

## Authoring checklist

When writing a new slash command:

- [ ] Name uses kebab-case (`commit-push-pr`, not `commitPushPR`)
- [ ] Frontmatter `description` is one line, what it does
- [ ] Body opens with the goal, not the steps ("Generate release notes for $1" not "Run `git log`...")
- [ ] Variables (`$ARGUMENTS`, `$1`) are documented in the body if used
- [ ] Stop conditions are explicit if it's a multi-step / multi-item command
- [ ] If it composes with a skill, names the skill
- [ ] If it's repo-specific, lives in `.claude/commands/` of that repo (not user-scope)
- [ ] No secrets, no PII, no machine-specific paths

## Related skills

- [[claudemd-authoring]] — CLAUDE.md should list the repo's commands
- [[claude-sdk-in-ci]] — slash commands work in `claude -p` for CI
- [[fresh-chat-handoff]] / [[cowork-kickoff]] — kickoff prompts can reference repo-standard commands
- [[safe-edit-policy]] — `/inspect` command should embody this

## Source of truth

- Boris Cherny, Code with Claude 2026 — "Slash commands" segment (~13:00)
- Reference example: Anthropic's `/label-github-issues` (mentioned in talk; not Andrew's repo)
- Spec: <https://docs.anthropic.com/claude-code/slash-commands>

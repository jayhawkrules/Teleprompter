---
name: mcp-team-setup
description: Use when adding MCP (Model Context Protocol) servers to any portfolio repo. Checks in `.mcp.json` at the repo root so every Claude Code or Cowork session opening that repo gets auto-prompted to install the team's standard MCP stack — instead of every developer / every fresh chat re-discovering them ad hoc. Provides the house MCP set (Puppeteer/Playwright for UI iteration, Firebase admin, Stripe, GitHub, filesystem), per-stack defaults (A gets Firebase + Puppeteer; B gets Postgres + Playwright; C gets static-server preview), the auto-approve pattern via settings.json, and the security guardrails (never check secrets, scope filesystem MCP to repo root). Keywords - .mcp.json, MCP server, team MCP, Puppeteer MCP, Playwright MCP, Firebase MCP, Stripe MCP, repo-scoped MCP, shared MCP, auto-install MCP.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash]
---

# MCP Team Setup

MCP servers extend Claude Code with tool access — browsing, databases, APIs. The problem: in most portfolio repos today, MCP servers are installed *per developer* (or per fresh chat), so the experience differs between Andrew's primary Mac Claude Code session, a Cowork run, and a `claude -p` CI invocation. The fix: check `.mcp.json` into the repo. Boris's example from the Code with Claude talk: Anthropic's apps repo ships Puppeteer MCP in `.mcp.json` so every engineer iterates against the live UI without setup.

This skill defines the house MCP set per stack, the `.mcp.json` format, the auto-approve pattern, and the security rules.

## When to use

- Bootstrapping a new repo (called by `new-repo-quality-bootstrap`)
- Adding a new automated workflow that needs a tool (UI iteration → Puppeteer; DB inspection → Firebase admin)
- Audit pass: a repo where Cowork can't iterate UI because no Puppeteer access
- A teammate or fresh chat keeps asking "how do I set up X" — encode it once via `.mcp.json`

## When NOT to use

- Personal MCP setup across all repos — those go in `~/.claude/mcp.json` or `~/.claude/settings.json`, NOT a repo's `.mcp.json`
- One-off exploration session — install ephemerally with `claude mcp add ...`, don't pollute the repo
- MCP servers that need PII / secrets at config time — gate via env vars referenced from `.mcp.json`, never inline

## The `.mcp.json` format

Lives at repo root. Same format as `~/.claude/mcp.json` but team-scoped:

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${WORKSPACE_ROOT}"]
    }
  }
}
```

On first session opening this repo, Claude Code prompts: *"This repo declares 2 MCP servers. Install?"* Once approved, they're available for the rest of the session.

## House MCP set per stack class

Different stacks need different defaults. These are the recommended starting sets.

### Stack A (Vite + React + Firebase) — CastHub1, Mythie, Aclamos, holiday-lights, etc.

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    },
    "firebase": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-firebase"],
      "env": {
        "FIREBASE_PROJECT_ID": "${FIREBASE_PROJECT_ID}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${WORKSPACE_ROOT}/src", "${WORKSPACE_ROOT}/backend"]
    }
  }
}
```

- **Puppeteer** — UI iteration loop, screenshot diffs against design mocks, the `agentic-feedback-loop` pattern
- **Firebase** — query Firestore in dev, inspect rules behavior, no need to fire up the Firestore console for every check
- **Filesystem** — explicit-scope read/write outside the standard Read/Edit tools (rarely needed; include only if the repo has automation that justifies it)

### Stack B (TS-other: Next.js, Express, etc.) — CRM-ai, theproductionshelf

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_URL": "${POSTGRES_URL_READONLY}"
      }
    }
  }
}
```

- **Playwright** for SSR-aware UI iteration (Next.js)
- **Postgres** read-only — never wire a write-capable connection to MCP

### Stack C (Static HTML / preview-only) — most marketing sites

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

Lighter footprint. Puppeteer only, for screenshot iteration on the static surface.

### Stack D (PHP / WordPress) — usually none, defer to `wpcom-mcp-*` claude.ai connectors

### Stack E (JS automation / scripts) — usually none, scripts run in CI

## Cross-portfolio MCP servers (not stack-conditional)

These work the same in any stack:

- **GitHub** (`@modelcontextprotocol/server-github`) — read issues, PRs, file contents. Useful in any repo, but Andrew already has the claude.ai GitHub connector at the user level — only add to `.mcp.json` if you need it in `claude -p` CI runs.
- **Sentry / error-tracking** — N/A, the portfolio has migrated to the in-house error-tracking-system per [[error-tracking-system]].
- **Stripe** — handled at the Anthropic side via `mcp__stripe__*` at the user level, NOT via `.mcp.json` (Stripe MCP requires per-user OAuth).

## Auto-approving MCP tools

Per-repo `.claude/settings.json` can pre-approve MCP tool calls so Claude doesn't prompt for every Puppeteer click:

```json
{
  "permissions": {
    "allow": [
      "mcp__puppeteer__*",
      "mcp__firebase__read_*",
      "mcp__filesystem__read_*"
    ],
    "deny": [
      "mcp__firebase__delete_*",
      "mcp__firebase__write_*"
    ]
  }
}
```

Rule of thumb:
- **Auto-allow** read tools (no state change)
- **Auto-allow** screenshot / browse tools (no harm)
- **Never auto-allow** delete / drop / destroy patterns
- **Never auto-allow** any tool that spends money or sends outbound messages

## Security rules

1. **No secrets in `.mcp.json`** — it's checked in. Use `${ENV_VAR}` interpolation; document the env var in `.env.example`.
2. **Scope filesystem MCP** — pass explicit paths (`src/`, `backend/`), not the whole `~`. Catches accidental writes to `~/Documents/` etc.
3. **Read-only DB connections** — give MCP a connection string with read-only privileges; never the migration credential.
4. **Pin server versions when stable** — `@modelcontextprotocol/server-puppeteer@0.x.y` instead of unpinned `npx -y ...` once you've validated a version. Prevents a midnight server upgrade breaking everyone's session.
5. **Audit on every CLAUDE.md sweep** — orphan MCP servers (declared, never used) bloat the install prompt; remove them.

## Per-repo adoption sequence

For a repo without `.mcp.json` today:

1. Pick the stack-conditional set from this skill.
2. Create `.mcp.json` at repo root.
3. Add the MCP section to CLAUDE.md (see `claudemd-authoring` template).
4. Add auto-approve patterns to `.claude/settings.json` (per `update-config` skill).
5. Document required env vars in `.env.example`.
6. Commit. First session opens it and gets prompted; accept once, persist for the team.

## Cowork-specific note

Cowork (cloud agent) does NOT auto-load `.mcp.json` the same way Claude Code does. Its tool set is fixed by the claude.ai-side connectors Andrew has approved. So:

- `.mcp.json` improvements help **Claude Code + `claude -p`** sessions
- For Cowork-equivalent tooling, the [[cowork-kickoff]] prompt has to reference any browser-side workflow steps explicitly
- Don't be surprised if a workflow that depends on Puppeteer MCP fails in Cowork — that's expected; Cowork uses claude.ai web-side connectors instead

## Per-repo adoption priority

1. **CastHub1** — biggest UI surface, Puppeteer would close the iterate-against-design-mock gap
2. **awardssubmission** (Aclamos) — Resend cleanup + UI work; Puppeteer + Firebase
3. **CRM-ai** — Stack B, Playwright + Postgres readonly
4. **holiday-lights** (Noelly) — Stack A canonical, same set as CastHub1
5. **toronadoentertainment.com / Mythie marketing** — Stack C, Puppeteer-only
6. Remaining portfolio — opportunistic on next session

## Verifying setup

After committing `.mcp.json`:

```bash
# In a fresh Claude Code session in the repo:
/mcp        # list installed MCP servers
```

Should show the servers declared in `.mcp.json`. If not, check that the file is at repo root (not in a subdirectory) and JSON-valid.

## Forbidden patterns

- Adding the `filesystem` MCP scoped to `${HOME}` or `/` — gives Claude write access to your whole machine
- Adding MCP servers that talk to production databases with write credentials
- Adding MCP servers whose `command` is a shell pipeline (`bash -c "..."`) — exec-injection surface
- Adding MCP servers from unverified npm packages — read the source first
- Checking in `.mcp.json` with secrets inlined instead of env-var interpolation

## Related skills

- [[claudemd-authoring]] — CLAUDE.md should reference the installed MCP set
- [[new-repo-quality-bootstrap]] — composes `.mcp.json` into the adoption pack
- [[agentic-feedback-loop]] — depends on Puppeteer/Playwright MCP being available
- [[update-config]] — for the `.claude/settings.json` auto-approve patterns
- [[parallel-claude-worktrees]] — Cowork worktree gets the same `.mcp.json` (it's checked in)

## Source of truth

- MCP spec: <https://modelcontextprotocol.io>
- Boris Cherny, Code with Claude 2026 — "MCP" segment (~15:00)
- Reference: Anthropic apps repo Puppeteer setup (mentioned in talk; not Andrew's repo)
- House LLM and tool stack: per [[feedback_vendor_consolidation]]

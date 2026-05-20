---
name: codebase-qa-onboarding
description: Use when a fresh Claude session, new contributor, or Cowork agent needs to come up to speed on a portfolio repo before editing. Provides the 20-question Q&A protocol Anthropic uses for technical onboarding (cut their onboarding from 2-3 weeks to 2-3 days). The pattern - ask Claude history-spelunking questions BEFORE editing ("how is X used", "why does this function have 15 arguments", "what shipped this week"). Boris Cherny's #1 recommendation - "start with code-based Q&A. Don't start by editing code." Includes the question template per stack class, the no-edit-during-Q&A rule, and how this composes with fresh-chat-handoff and safe-edit-policy. Keywords - onboarding, code Q&A, ask before editing, history spelunking, git blame, how does this work, repo orientation, new contributor, fresh chat orientation, Cowork orientation, 20 questions.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Bash, Grep, Glob]
---

# Codebase Q&A Onboarding

Boris Cherny's #1 recommendation in the Code with Claude 2026 talk: *"For people that have not used Claude Code before, if you're just showing it to someone for the first time, onboarding your team, the thing we definitely recommend is start with code-based Q&A. Don't start by using fancy tools. Don't start by editing code. Just start by asking questions about the code base, and that'll teach people how to prompt."*

At Anthropic this cut technical onboarding from 2-3 weeks to 2-3 days. This skill encodes the same protocol for Andrew's portfolio — for fresh Claude Code sessions, Cowork agents inheriting a repo, and human contributors.

## When to use

- Fresh Claude session on a repo it hasn't seen in this conversation
- Cowork starting work on a repo for the first time
- Human contributor (employee, contractor, advisor) being onboarded to a portfolio app
- Returning to a repo after 2+ weeks away (you have less repo state in your head than you think)
- Before touching anything non-trivial — especially auth, payments, or rules files

## When NOT to use

- A session that's already deep into a specific task — switching to Q&A mode mid-flight wastes context
- One-line trivial fixes (typo, copy edit) — overhead not warranted
- Read-only research already in flight — the Q&A loop IS what's happening, no need to invoke it explicitly

## The protocol — answer first, edit second

The hard rule: **no edits until at least 5 Q&A turns**. The point is to build a real mental model of how the repo works before changing anything. Editing is what teaches Claude the *wrong* thing — it commits to an interpretation before checking.

This is the inverse of the typical "let me dive in and edit" instinct. The 5-minute Q&A pays for itself 10x by avoiding wrong-shaped edits.

## The 20-question starter set

Organized roughly: orientation → architecture → recent activity → footguns. Adapt to the specific repo.

### Orientation (1-5)

1. What does this app do, in one sentence? (Confirm CLAUDE.md or README claims still match reality.)
2. What's the entry point and how does a request flow through the system?
3. What stack class is this? (A/B/C/D/E per [[safe-edit-policy]])
4. Where are the auth boundaries — what files gate authenticated vs anonymous access?
5. Where does the money flow? (Stripe, Payhip, EveryOrg, RevenueCat — name the files.)

### Architecture (6-10)

6. What's the database model — Firestore collections / Postgres tables / KV namespaces? Show me the schema in code, not docs.
7. How is state managed on the client? (Context, Redux, Zustand, server state via React Query, none?)
8. What's the testing posture? Any tests? Where? How are they invoked?
9. Where do environment variables come in, and which ones are required for dev?
10. What MCP servers does this repo expect? (Check `.mcp.json` per [[mcp-team-setup]].)

### Recent activity (11-15)

11. What shipped in the last 7 days? (`git log --since="7 days ago" --oneline`)
12. Who's been working on what — git blame the 3 most recently changed files.
13. Any open PRs or unmerged branches? What were they trying to do?
14. What does CI look like — does it pass? Which workflows are running?
15. Are there any `TODO`/`FIXME`/`HACK` comments concentrated in one area? That's where the pain is.

### Footguns (16-20)

16. Why does function `<one_obvious_candidate>` have so many arguments? (Boris's actual onboarding question — uses Git history.)
17. Are there `// removed` comments or `_unused` variables suggesting half-done refactors?
18. What's the parallel-session policy? (Per [[parallel-claude-worktrees]] — does Cowork run against this repo?)
19. What's in the CLAUDE.md "what NOT to touch" list?
20. What is the ONE thing that, if I broke it, would cost real money or make Andrew angry?

## Per-stack question adjustments

| Stack | Add these questions |
|---|---|
| A (Vite + React + Firebase) | "Show me firestore.rules. Which collections do client writes touch? Which require Custom Claims?" |
| B (Next.js / Express) | "What's the SSR vs CSR split? Which routes need server-only env vars?" |
| C (Static HTML / preview) | "Where's the build pipeline? Is it Vite, plain HTML, or a static generator?" |
| D (PHP / WordPress) | "What's the WP plugin/theme structure? Which custom post types?" |
| E (JS automation) | "What's the entry script? What does it cron against?" |

## What Claude should actually DO during Q&A

For each question, Claude:
1. **Reads code, not docs.** Docs lie; code is ground truth. CLAUDE.md is a starting hint, not the final answer.
2. **Cites file:line.** "Auth is gated at `src/AuthGuard.tsx:42-67`" beats "Auth is in the auth folder."
3. **Notes surprises.** If something contradicts CLAUDE.md or the README, flag it.
4. **Stays read-only.** No edits during the Q&A. If you find a bug, note it for after.
5. **Updates internal model, not the repo.** The output is a better Claude understanding, not new files.

## What this composes with

This skill is the *opening move* for several other skills:

- **[[fresh-chat-handoff]] / [[cowork-kickoff]]** — they generate the kickoff prompt; this skill is what the prompt CALLS once the session lands
- **[[safe-edit-policy]]** — the inspection step IS Q&A; this skill expands it from "look around" to "ask 20 specific things"
- **[[repo-health-audit]]** — the quarterly audit uses these same questions but writes a report instead of just internal model
- **[[claudemd-authoring]]** — Q&A surfaces what's missing from CLAUDE.md; feed those gaps back via `#` remember

## Useful Bash patterns

These are the commands the Q&A leans on. Auto-allow them in `.claude/settings.json`:

```bash
# What shipped this week
git log --since="7 days ago" --oneline --no-merges

# Who's been touching the auth surface
git log --follow --pretty=format:"%h %an %ad %s" --date=short src/auth/

# Most-changed files in the last 30 days (the active surface)
git log --since="30 days ago" --pretty=format: --name-only | sort | uniq -c | sort -rn | head -20

# Open PRs
gh pr list --state open

# Failing CI on current branch
gh run list --branch $(git branch --show-current) --limit 5

# Boris's question — why does this function have so many args?
git log -p --all -S 'functionName' -- path/to/file.ts | head -100
```

## The "what shipped this week" Monday ritual

Boris does this every Monday in standup. Andrew's portfolio has a similar weekly cadence per [[project_marathon_session_2026_05_17]]:

```bash
# In each active repo on Monday morning:
git log --since="7 days ago" --author="Andrew Ward" --pretty=format:"- %s" --no-merges
```

Or via Claude: *"Look at git log for the past 7 days. Summarize what shipped, grouped by theme."* That output becomes the standup or weekly digest entry. Pairs naturally with [[claude-sdk-in-ci]] (weekly cron) and [[portfolio-health-audit]] (Monday rollup).

## Anti-patterns

1. **Skipping Q&A on "small" repos** — every repo has 3-5 surprises. Find them at Q&A time, not at production-incident time.
2. **Reading CLAUDE.md and stopping** — CLAUDE.md is what someone *intended* to be true. Code is what IS true. Read both, trust code more.
3. **Q&A then immediate edit without thinking** — the point of Q&A is to update the mental model. If you Q&A then make the same edit you would've made without Q&A, you didn't actually integrate the answers. Take a beat.
4. **Generic questions** — "How does auth work?" gives you a 500-line essay. "Where is the boundary between anonymous and authenticated, and which collection writes does it gate?" gives you 3 file paths. Be specific.
5. **Treating Q&A as documentation generation** — don't write a "codebase overview" doc unless that IS the task. The output is an internal model, not a deliverable.

## Per-repo priority

Repos where Q&A pays off most when starting a session:

1. **CastHub1** — large surface, many features per [[project_casthub1_adoption_pack]]; Q&A every 2+ weeks
2. **CRM-ai** — cross-portfolio integration with HMAC + Next.js + Supabase; many footguns
3. **awardssubmission** (Aclamos) — active Cowork work, schema in flux
4. **holiday-lights** (Noelly) — Stack A with EveryOrg + Stripe Connect; payments surface
5. **theproductionshelf** — Payhip integration; revenue path

For repos that are small + dormant (most Stack C marketing sites), 5-question Q&A is enough; the 20-question version is overkill.

## Source of truth

- Boris Cherny, Code with Claude 2026 — "code-based Q&A first" segment (~7:00)
- Anthropic onboarding pattern (referenced in talk, not Andrew's repo)
- Composes with: [[safe-edit-policy]], [[fresh-chat-handoff]], [[cowork-kickoff]], [[claudemd-authoring]], [[claude-sdk-in-ci]]

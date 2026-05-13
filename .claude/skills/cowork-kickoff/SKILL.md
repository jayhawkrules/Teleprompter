---
name: cowork-kickoff
description: Use when starting a Claude Cowork (cloud agent on claude.ai) session against any repo and want a structured kickoff prompt. Generates a kickoff document with CONTEXT-TO-LOAD ordering, DO-vs-TRACK split, prioritized queue, STOP-AND-ASK list, and ground rules. Especially relevant for repos with frequent manual queues or sales/legal sensitive work. Keywords: Cowork, Claude Cowork, claude.ai, kickoff prompt, daily queue, manual tasks, DO TRACK split, stop and ask, GitHub connector.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash]
---

# Cowork Kickoff Prompt Generator

> **Cowork (claude.ai cloud agent) does NOT auto-load `~/.claude/skills/`** — those are local to Claude Code on Andrew's Mac. This skill therefore produces a kickoff prompt that **embeds** the safe-edit-policy contract, manual-task format, and no-fake-completion rule inline. The Cowork session won't have the hub available, so the rules must travel with the prompt.
>
> Sister skill `fresh-chat-handoff` does the same job for cold Claude Code sessions on Andrew's Mac (where the hub IS auto-loaded — that prompt only references the skills, doesn't embed them).

Generate a Cowork kickoff prompt tailored to a repo. The structure is invariant across apps — only the context files, queue items, and ground rules change. This skill produces a ready-to-paste prompt and (optionally) commits it to `docs/operations/cowork-kickoff-YYYY-MM-DD.md`.

**Every generated kickoff MUST include**, regardless of repo:
- The safe-edit-policy core rules (inspection-before-edit, stack detection, no-fake-completion phrasing, forbidden operations list)
- The 🔧 MANUAL TASKS format from `safe-edit-policy` Step 8
- The "monetization is technical" framing if the repo touches revenue (Stripe / Payhip / RevenueCat / EveryOrg)
- A "product/monetization review mode" toggle when the queue includes revenue-related work — flips Cowork into `monetization-readiness-review` posture

## When to use
- Starting a Cowork session for any repo and you want a tight, scoped prompt instead of typing freeform
- The repo has a daily / weekly manual queue that needs to be worked through with Cowork acting as project manager
- Some items in the queue require browser-side actions only the human can do (vendor signups, sending emails) — the DO/TRACK split keeps both honest
- You want stop-and-ask gates before irreversible actions

## When NOT to use
- One-off questions or quick fixes — use a freeform prompt, the kickoff structure is overhead
- Long-running async work where Cowork operates without supervision — this skill assumes a synchronous co-working session

## The 5-section structure (invariant)

Every kickoff has the same 5 sections. Fill in the bracketed parts:

```
You are working with me on [PROJECT NAME] today ([YYYY-MM-DD]).
My GitHub is [USER]; the repo is [USER]/[REPO]. [One-line product description.]

CONTEXT TO LOAD FIRST (read in this order from main, not whatever branch your sandbox is on):
1. [path/to/most-recent-changelog.md] — recap of recent shipped work
2. [path/to/MANUAL_TASKS.md or equivalent queue]
3. [path/to/CLAUDE.md and any brand/voice doc]
4. [path/to/strategy or roadmap doc]

Confirm you have all [N] before continuing.

HOW WE WORK TOGETHER TODAY

Treat every item as either DO or TRACK:

DO — you do it directly using your tools. File edits, drafting copy, walking me through a decision, generating a final email I can send.

TRACK — anything that requires MY browser session (vendor account creation, sending email from my inbox, signing legal docs, paying with my card, SaaS dashboard clicks). For these:
- Give steps in order, ONE STEP AT A TIME
- Wait for me to say "done" before next step
- If I'm stuck, give the alternate path
- Keep the item in your live todo list as "in progress" until I confirm complete

MAINTAIN A LIVE TODO LIST. Use the structured todo view, not inline text.

STOP AND ASK BEFORE:
- [item-specific stop list — e.g., publishing X, sending email Y, spending money, merging a PR]

TODAY'S QUEUE (priority order — do them in this order unless I redirect)

[Numbered list of items. Each tagged DO or TRACK. Include file paths, goals, and outputs.]

═══ DO NOT TOUCH WITHOUT EXPLICIT ASK ═══
- [exclusion list — categories of work that aren't for today]

GROUND RULES
- [voice/brand constraints — banned words, tone target, locked decisions]
- [non-negotiables — public guarantees, legal constraints]
- [escalation rule — "when in doubt, ASK"]

START
When you've read the [N] context files, confirm. Then open the queue as a structured todo list and start with item 1.
```

## Critical guardrails to include every time

1. **"Read from main, not whatever branch your sandbox is on"** — Cowork's sandbox often lands on a feature branch with stale or missing files. Force it to read main via the GitHub connector.
2. **STOP before pushing to main** — Cowork should always work via branch + PR, never direct push.
3. **STOP before sending outbound to a real human** — emails to clients/partners are one-way.
4. **STOP before spending money** — vendor paid plans, Stripe charges, SMS fees.
5. **STOP before publishing legal-sensitive content** — anything that needs counsel review.

## Generating the kickoff

When invoked, this skill should:

1. Ask the user (or read from context) for: the date, the queue items, any sensitive items needing stop-gates.
2. Read the repo's `CLAUDE.md` and `docs/` to extract context-file paths and ground rules automatically.
3. Output the prompt in a single ```` ``` ```` code block ready to paste.
4. Optionally write to `docs/operations/cowork-kickoff-YYYY-MM-DD.md` if the user wants a record.

## Reusing across days

The CONTEXT TO LOAD, HOW WE WORK, and GROUND RULES sections rarely change. Only update:
- Date in line 1
- Today's queue
- Stop-and-ask list (if today's items add new sensitivities)

## Source of truth

- `~/GitHub/CastHub1/docs/operations/cowork-kickoff-today.md` — canonical example, dated 2026-05-05

## Common mistakes

1. **Skipping the "read from main" guard** — Cowork lands on the wrong branch and reports files missing that exist on main. Always include the guard.
2. **No DO/TRACK tagging** — Cowork either tries to do browser-only work itself (and fails) or hands off DO items it could have completed.
3. **Vague stop-and-ask list** — "be careful" is not a guardrail. List specific actions.
4. **Pasting too much context** — Cowork reads from the GitHub connector; you don't need to paste file contents inline. Just give it paths.

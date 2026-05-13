---
name: fresh-chat-handoff
description: Use to generate a self-contained kickoff prompt for a new AI chat (Claude Code session, Cowork session, or fresh Claude.ai conversation) with zero memory of prior work. Bakes in safe-edit-policy, manual-task surfacing, no-fake-completion, and stack-aware inspection. Output is a single copy-pasteable prompt. Keywords: handoff, fresh chat, new session, kickoff prompt, cold start, zero memory, context bootstrap.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Fresh Chat Handoff

Generate a perfect kickoff prompt for a new AI chat. The prompt makes the new session immediately productive without requiring it to first re-discover the portfolio, the rules, and the safety policy.

Always load `safe-edit-policy` first.

## When to use

- Starting a new Claude Code session in a repo where you want strict safety baseline
- Starting a Cowork session on claude.ai (a different surface — no `~/.claude/skills/` available there)
- Sharing context with a collaborator's AI session
- Resuming work after `/compact` or context reset

## When NOT to use

- A continuing session — you already have the context. Fresh handoff is for cold starts only.

## What the prompt must include

Eight sections, in this order. Skipping any section produces an unsafe session.

### 1. Identity + portfolio context

Who Andrew is, what the portfolio is, where things live.

### 2. The skill hub (location + how to use)

Path + the canonical skills the new session should load. For a Claude Code session on Andrew's Mac, the hub is at `~/.claude/skills/`. For Cowork (claude.ai), the hub is not auto-loaded — paste the relevant skills inline.

### 3. The target repo

Which repo to work on, full path, brief stack signal.

### 4. Safe inspection rules

Don't claim anything before reading. Run the inspection commands. Detect the stack.

### 5. No fake completion contract

The required phrasing. Tests run vs not run. "VERIFICATION NOT PERFORMED" rule.

### 6. Manual task format

The 🔧 block, verbatim.

### 7. Forbidden behaviors

Stack-incorrect edits. Forbidden file list. No `git push` without approval. No deploys.

### 8. The actual ask

The thing the new session is supposed to do.

## The handoff prompt template

```markdown
# Kickoff: [date] — [repo] — [task in one line]

You are continuing work on Andrew Ward's app portfolio. Andrew is a reality TV producer
running 23 software apps under Toronado Entertainment, LLC. Repos live at `~/GitHub/`.

## Skill hub

Andrew's shared skills are at `~/.claude/skills/` (auto-loaded by Claude Code on his Mac).
Source repo: https://github.com/jayhawkrules/claude-skills.

Before doing anything else, **load `safe-edit-policy`**. It's the foundation contract:
inspection-before-edit, stack detection, forbidden operations, no fake completion, manual
task format, definition of done. Every other skill assumes it's loaded.

If you're in Cowork (claude.ai) where the hub isn't auto-loaded, the policy text is at:
`~/GitHub/claude-skills/safe-edit-policy/SKILL.md`. Read it now.

## Your target

Repo: `~/GitHub/{{repo}}`
Stack: {{stack_class}}  ({{stack_signal_summary}})
Live URL: {{primary_url or "pre-launch"}}
Revenue model: {{revenue_model or "pre-revenue"}}

Read these to ground yourself (in this order):
1. `CLAUDE.md` (the repo's auto-loaded contract)
2. `README.md` (orientation)
3. `package.json` (stack + scripts)
4. `MANUAL_TASKS.md` if it exists
5. `.env.example` (what vendors are wired)
6. Recent 5 commits: `git log --oneline -5`

Do NOT proceed to edits before reading all of the above.

## Stack-aware behavior

This repo is Stack {{stack_class}}. Per `safe-edit-policy`:
- Stack A skills (Firebase, firestore-rbac-helpers, firebase-hosting-security): {{applies or "DO NOT apply"}}
- Stack B/C/D/E behaviors: {{stack-specific notes}}

If you're unsure of the stack, run more inspection. Do NOT guess.

## No fake completion

You may not claim "done", "complete", "verified", "fixed", or "working" unless you
have run a command that proves it and showed the output. If verification is impossible,
the required phrasing is:

> **VERIFICATION NOT PERFORMED:** [specific reason]

## Manual task format (mandatory)

If any external step is needed (Andrew clicks a button somewhere, sets an env var, etc.),
surface it in this exact format:

```
🔧 MANUAL TASKS FOR ANDREW:

1. [Platform: GitHub / Firebase Console / Stripe / etc.]
   Task: [exact action]
   Why it matters: [one sentence]
   Config/value needed: [specific value or UNKNOWN]
   How to verify: [one clear step]
   Follow-up Claude Code prompt: "[exact prompt to paste after]"
```

Never bury manual tasks in prose.

## Forbidden in this session

- `git push` without explicit approval
- Any deploy command (`firebase deploy`, `vercel deploy`, `wrangler deploy`, etc.)
- `git reset --hard`, `git push --force`, branch deletion
- `npm audit fix --force`
- Reading `.env`, `.env.production`, service-account JSON
- Editing `firestore.rules`, `firebase.json`, `.env`, payment code, auth code without approval
- Modifying any file outside `~/GitHub/{{repo}}`
- "Best-guessing" the stack instead of inspecting

## Your task

{{the_actual_ask}}

When you finish (or pause), end with the SESSION SUMMARY block per `safe-edit-policy` Step 11.
```

## How to generate a handoff prompt

When invoked, this skill:

1. Asks: which repo, what's the task in one line?
2. Reads the repo's `CLAUDE.md`, `package.json`, recent commits to fill in `{{stack_class}}`, `{{stack_signal_summary}}`, `{{primary_url}}`, `{{revenue_model}}`, `{{vendors}}`
3. Detects which Stack A-only skills apply or do not apply
4. Outputs the filled-in template, ready to paste

## Stack-conditional notes (auto-fill rules)

For each stack class, the "Stack-aware behavior" section gets these auto-fills:

| Stack | Filling |
|---|---|
| **A** | "All Stack A skills apply: firestore-rbac-helpers, firebase-hosting-security, firebase-actions-deploy. Capacitor smoke test required if app has `capacitor.config.ts`." |
| **B** | "Stack A Firebase skills DO NOT APPLY. Use the equivalent for {{Next.js / Supabase / Express / Hono}} per `qa-hardening` and `ci-gate-builder` Stack B sections." |
| **C** | "Pure HTML/static. Use linkinator + html-validate + Lighthouse-CI per `qa-hardening` Stack C. No Vitest, no Playwright." |
| **D** | "PHP/WordPress backup target. Validate via `qa-hardening` Stack D. No app code editing." |
| **E** | "JS automation via GitHub Actions cron. Use dry-run + fixture comparison per `qa-hardening` Stack E." |
| **F** | "Empty/placeholder. STOP and ask Andrew before any edits." |

## Output format

Two artifacts:
1. The filled-in handoff prompt (markdown, ready to paste)
2. A short summary in conversation:

```
HANDOFF PROMPT GENERATED — [repo]

Stack detected: [A/B/C/D/E/F]
Primary URL: [...]
Vendors: [...]
Skills auto-applied: [...]
Skills explicitly excluded: [...]

🔧 MANUAL TASKS FOR ANDREW:
1. Paste the prompt above into your fresh Claude Code or Cowork session.
2. Confirm the AI loaded `safe-edit-policy` before requesting any edits.
```

## Common mistakes

1. **Forgetting the safe-edit-policy load step** — without it, the new session re-invents everything. Always include the explicit "load safe-edit-policy first" instruction.
2. **Over-stuffing the prompt** — if it's longer than 800 lines, the new session won't read all of it. Keep it tight; reference skill files for depth.
3. **Hardcoding stack assumptions in the template** — the auto-fill table above keeps it stack-aware. Don't paste a Stack A handoff into a Stack B repo.
4. **Skipping the actual ask** — a generic handoff with no task is just a policy lecture. Always end with the specific thing to do.
5. **Missing the `~/GitHub/` path** — the new session may not know where the repo lives. Always full-path it.

## Source of truth in this portfolio

- This skill is one of two in the "session bootstrapping" pair: `cowork-kickoff` (existing) generates Cowork-specific kickoff with DO/TRACK split; this one generates Claude Code session kickoff with safe-edit baseline. Both are valid — use the one that matches the surface.
- Sibling skill: `cowork-kickoff` for Cowork-specific structure
- All filled-in handoff prompts should be saved to `~/GitHub/{{repo}}/.claude/handoffs/[date]-[task].md` for replay

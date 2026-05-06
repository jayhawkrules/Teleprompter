# Teleprompter — Project Context for Claude Code

**Repo:** `jayhawkrules/Teleprompter`
**Owner:** Andrew Ward (andrewpward@gmail.com)

## What this is

A standalone teleprompter app — originally bootstrapped from Google AI Studio (`https://ai.studio/apps/32f14b01-7ae8-457a-94aa-c441675e9a77`). Focused, single-purpose: browser-based teleprompter with script history. Distinct from the larger CueHound (`RunOfShow`) production platform, which has its own native mobile teleprompter — this is the standalone web app.

## Stack

Vite + React + TypeScript + Tailwind + Radix (`components.json`). Express dev server in `server.ts`. Uses Google Gemini API for AI features (`GEMINI_API_KEY` in `.env.local`). Local script history via `historyStore.ts`.

## Key files

| File | Purpose |
|------|---------|
| `src/` | React app |
| `components/` | Radix-based UI components |
| `historyStore.ts` | Local script history |
| `server.ts` | Local dev Express |
| `lib/` | Utilities |

## Locked decisions (do not change without conversation)

- **Standalone app, scope-limited** — don't merge with CueHound. Different product, different audience.
- **Gemini API for AI** — not Anthropic (kept lightweight; if Anthropic is needed, run the integration through a metered proxy)

## Stop and ask before

- Adding Firebase / multi-user features (this is single-user by design)
- Hooking it into CueHound's cue engine (different products)
- Publishing to App Store (no commitment yet — that's a CueHound mobile decision)

## Claude Code Skills (cross-repo, cross-machine)

Shared user-level skills are versioned at **[jayhawkrules/claude-skills](https://github.com/jayhawkrules/claude-skills)** (private). Once cloned to `~/.claude/skills/` on a Mac, they auto-load in every project on that machine.

Available: `new-app-starter`, `firebase-hosting-security`, `firestore-rbac-helpers`, `firebase-actions-deploy`, `vendor-onboarding-walkthrough`, `cowork-kickoff`, `feature-scaffold`, `repo-health-audit`.

To bring a new Mac to parity:
```bash
git clone git@github.com:jayhawkrules/claude-skills.git ~/.claude/skills
```

> **Stack note:** Vite/React/TS aligns with the portfolio default. Firebase-specific skills don't apply (no Firebase here yet). `feature-scaffold`, `vendor-onboarding-walkthrough`, `repo-health-audit`, and `cowork-kickoff` are most relevant.

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

- **Standalone app, scope-limited** — don't merge with CueHound. Different product, different audience. Mythie consumes the deployed URL via `?script=` deep-link only; no code merger.
- **Gemini API for AI** — not Anthropic (kept lightweight; if Anthropic is needed, run the integration through a metered proxy)
- **Repo is PUBLIC as of 2026-05-14** — source visible. LICENSE is proprietary all-rights-reserved. No copyleft / open-source obligations.
- **Product name is "Teleprompter"** (renamed from TeleVibe 2026-05-14). One-time localStorage migration in `src/hooks/useAI.ts` preserves user history across the rename.

## Integration consumers

- **Mythie** (CastHub1 repo, private) — Social Amplification Coach Phase 1 deep-links via `?script=&caption=&speed=&font=&return=&source=mythie`. Producer reads the AI-drafted casting-call script aloud, records via the camera, posts to TikTok (or saves locally), returns to Mythie. Spec: `docs/strategy/social-amplification-coach-spec.md` in CastHub1.
- **CueHound** (RunOfShow repo) — has its own native mobile teleprompter; doesn't consume this one today. If a use case emerges, deep-link via the same `?script=` contract.

The deep-link contract is documented in `README.md` under "Deep-link integration mode". Adding a new param? Add it to the `readDeepLinkParams()` function in `src/App.tsx` AND the README's param table — both must stay in sync.

## Stop and ask before

- Adding Firebase Auth / multi-user features (this is single-user by design)
- Hooking it into CueHound's cue engine (different products)
- Publishing to App Store (no commitment yet — that's a CueHound mobile decision)
- Adding a build-time secret to the bundle (the repo is public; secrets in the bundle are public)

## Claude Code Skills (cross-repo, cross-machine)

Shared user-level skills are versioned at **[jayhawkrules/claude-skills](https://github.com/jayhawkrules/claude-skills)** (private). Once cloned to `~/.claude/skills/` on a Mac, they auto-load in every project on that machine.

Available: `new-app-starter`, `firebase-hosting-security`, `firestore-rbac-helpers`, `firebase-actions-deploy`, `vendor-onboarding-walkthrough`, `cowork-kickoff`, `feature-scaffold`, `repo-health-audit`.

To bring a new Mac to parity:
```bash
git clone git@github.com:jayhawkrules/claude-skills.git ~/.claude/skills
```

> **Stack note:** Vite/React/TS aligns with the portfolio default. Firebase-specific skills don't apply (no Firebase here yet). `feature-scaffold`, `vendor-onboarding-walkthrough`, `repo-health-audit`, and `cowork-kickoff` are most relevant.

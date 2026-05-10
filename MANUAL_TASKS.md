# Teleprompter — Manual Tasks

Operator + AI follow-up checklist for this repo. Tasks here are deferred work that needs Andrew's input or a future session.

---

## 🔧 Install portfolio error-tracking system

**Status:** Deferred — needs prerequisites first.

**What:** Install the portfolio's self-hosted error-tracking system. Replaces Sentry across the portfolio with a system that captures browser errors, deduplicates by fingerprint, detects regressions, ratchets severity, and (where supported) routes to GitHub Issues.

**Reference implementation:** `jayhawkrules/CastHub1` — see `services/errorReporter.ts` and `backend/clientErrorRoutes.js`.

**Skill:** `error-tracking-system` in `~/.claude/skills/error-tracking-system/SKILL.md` (auto-loaded by Claude Code on Andrew's Mac).

### APP_ID for this repo

`APP_ID = "teleprompter"`

### Prerequisites this repo currently lacks

Per inspection 2026-05-10, this repo does NOT have:
- ❌ A separated `backend/` or `server/` or `api/` directory (Express likely runs colocated; needs verification)
- ❌ An `/admin` routes surface
- ❌ Any existing `BugReport` component
- ❌ Firebase / Firestore (uses session-based storage; the reference impl writes to a `clientErrors` Firestore collection)
- ❌ Anthropic API key in `.env.example` (uses Gemini only)
- ❌ `GITHUB_PAT` in env

### What this means for adoption

Three options, in order of effort:

**Option A — minimal client-only capture (recommended first step):**
- Add `services/errorReporter.ts` adapted for this app
- `APP_ID = "teleprompter"`
- Capture: `window.onerror`, `unhandledrejection`, optional `console.error` wrap, `fetch` failures (own backend only), breadcrumbs, session ID, offline suppression, stale-chunk reload
- POST captured errors to a shared portfolio endpoint OR write to a sessionless local log for now
- Skip backend route, admin dashboard, GitHub bridge — defer until backend layer exists

**Option B — add a thin Express route (medium):**
- Express is in `package.json`, so a route can be added
- Add `POST /api/admin/log-client-error` with fingerprint dedup, regression reopening, severity ratcheting
- Requires choosing a storage backend (Firestore would mean adding Firebase to this repo, which it currently lacks; alternative: SQLite or a small Postgres if Express is already storing data)
- Add `POST /api/admin/resolve-client-error` (admin-only) — needs admin auth pattern, currently nonexistent here

**Option C — full reference implementation (largest):**
- Add Firestore + admin auth pattern + admin route guards
- Add `/admin/errors` dashboard
- Add `BugReportModal` smart-context capture (TikTok session state + script content)
- Add `POST /api/admin/suggest-error-fix` (Anthropic) — would require adding Anthropic alongside Gemini
- Add `POST /api/admin/promote-error-to-github` if `GITHUB_PAT` is added
- Add Firestore rules (show diff, don't overwrite)

### Safety rules

- **Do not remove existing code.**
- **Do not introduce Sentry.** The portfolio's policy is in-house error tracking per `~/.claude/skills/vendor-consolidation-policy/SKILL.md`.
- **Do not overwrite Firebase rules without showing diff** (and this repo doesn't have any yet — adding Firestore is itself a decision).
- **Inspect first, plan second, implement third** per `~/.claude/skills/safe-edit-policy/SKILL.md`.

### Cowork prompt (when ready)

> "Adopt the portfolio error-tracking system in `~/GitHub/Teleprompter`. Use the skill at `~/.claude/skills/error-tracking-system/SKILL.md`. Reference impl: `jayhawkrules/CastHub1`. APP_ID = `teleprompter`. Start with **Option A** (client-only capture) per `MANUAL_TASKS.md`. Stop and ask before adding Firestore or new vendors."

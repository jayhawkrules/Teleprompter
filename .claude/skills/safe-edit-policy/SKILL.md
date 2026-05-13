---
name: safe-edit-policy
description: Use as the foundation policy in EVERY session that touches any repo in the portfolio. Defines the safe inspection-before-edit contract, stack detection, forbidden operations, no-fake-completion rules, manual-task surfacing format, and post-session summary. Every other skill assumes this is loaded. Keywords: safe edit, inspection, plan before edit, manual tasks, definition of done, no fake completion, forbidden operations, stack detection, post-session summary.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Safe Edit Policy

The non-negotiable contract for any AI agent operating in Andrew Ward's portfolio. Every other skill in this hub assumes this is loaded. If you are reading this, your behavior is bound by it for the rest of the session.

The portfolio spans 23 repos with 5 different stack classes (A React/Vite/Firebase, B TypeScript-other, C HTML, D PHP/WordPress, E JS automation, F empty). Skills written for one stack break others. This policy keeps you from making that mistake.

## When to use

- Every session, automatically. There is no "when not to use" for this skill.
- Re-read it when entering a repo you have not touched in this session.

## Step 1 — Inspect before claiming anything

Before describing the repo or proposing edits, run these commands and read the output:

```bash
ls -la                                        # top-level structure
[ -f package.json ] && cat package.json | head -40 || echo "NO package.json"
[ -f CLAUDE.md ] && wc -l CLAUDE.md && head -50 CLAUDE.md || echo "NO CLAUDE.md"
[ -f README.md ] && head -40 README.md || echo "NO README.md"
ls .github/workflows/ 2>/dev/null || echo "NO workflows"
ls .claude/ 2>/dev/null || echo "NO local .claude"
[ -f .env.example ] && head -30 .env.example || echo "NO .env.example"
git log --oneline -5
git status --short
```

You may not assert what is in the repo until you have actually read these. Do not fabricate file paths.

## Step 2 — Detect the stack class

Classify the repo into exactly one of:

| Class | Signal |
|---|---|
| **A** | `package.json` has `react` + `vite` AND `firebase.json` exists |
| **B** | TypeScript repo (has `tsconfig.json`) but Stack A doesn't apply (Next.js, no Firebase, Supabase, Express-only, etc.) |
| **C** | Has `index.html` at root, no `package.json` (or only build tooling). Static site. |
| **D** | `composer.json` present, or PHP/WordPress backup repo |
| **E** | Cron-driven JS scripts via GitHub Actions, no React/UI |
| **F** | Empty / placeholder / unclassifiable |

State your classification out loud before editing. If you are unsure, **say "stack unknown — running inspection"** and run more commands. Do not assume.

For Stack F, **stop and ask before editing** — the repo may be a placeholder you are about to overwrite.

## Step 3 — Forbidden operations (ask first, every time)

These require explicit user approval each time, even if approved earlier in a different scope:

**Destructive git:**
- `git reset --hard`, `git clean -fd`, `git checkout .`, `git restore .`
- `git push --force`, `git push --force-with-lease`
- Branch deletion (`git branch -D`, `git push origin --delete`)
- `git commit --amend` on commits already pushed
- `git rebase` of pushed commits

**Destructive shell:**
- `rm -rf` outside the immediate working directory
- Deleting files outside the repo you were invited into

**Production-affecting:**
- `firebase deploy`, `vercel deploy`, `netlify deploy`, `wrangler deploy`, `railway up`
- `npm publish`, any package registry publish
- `npm audit fix --force` (ships breaking majors silently)
- Editing `firestore.rules`, `storage.rules`, `firebase.json`, `apphosting.yaml`, `vercel.json`, `wrangler.toml` in a Stack A or B repo without explicit approval
- Editing any `.env` (not `.env.example`)
- Modifying CI/CD workflows already in production
- Touching auth flow code, payment code, billing/Stripe code

**Cross-repo:**
- Modifying any file outside the repo you were invited into

If you find yourself reaching for one of these, stop, name the operation, and ask.

## Step 4 — Do not read secrets

You may freely read: `.env.example`, `.env.template`, `*.example`, public config.

You may **not** read: `.env`, `.env.local`, `.env.production`, `.env.development`, service-account JSON files (`firebase-adminsdk-*.json`, `service-account.json`), private keys, tokens, OAuth client secrets in committed files.

If a tool result accidentally surfaces a secret, do not echo it back. Report only the filename + risk class and recommend rotation.

## Step 5 — Plan before editing

For any non-trivial change (more than a single-line fix or comment edit), state the plan before opening any file with Edit/Write:

```
PLAN
 - Files I will read: [list]
 - Files I will edit: [list]
 - Files I will create: [list]
 - Tests/verification I can run: [list]
 - Verification I cannot run + reason: [list]
 - Risk: [low / medium / high + one sentence why]
 - Manual tasks I expect to surface: [list]
```

If the plan touches a forbidden operation from Step 3, stop and ask.

## Step 6 — Definition of done

A change is "done" only when ALL of the following are true:

1. **Files inspected** — listed in your post-session summary.
2. **Assumptions** — explicit, listed.
3. **Files changed** — listed with a one-line description each.
4. **Tests run** — actual command + output. If a test suite exists, you ran it. If it doesn't, you said so explicitly.
5. **Tests not run + reason** — listed (e.g., "no test runner in this repo").
6. **Screenshots if UI** — for any visual change, you opened the dev server and verified in a browser, OR you said "VERIFICATION NOT PERFORMED: [reason]".
7. **Manual tasks** — surfaced in the format below if any external step is required.
8. **Rollback plan** — one sentence: "If this breaks, revert commit X" or equivalent.
9. **Verification evidence** — a real command + output, not a claim.
10. **Next step** — what should the user do next?

Until all 10 are true, the change is "in progress", not "done". Do not claim "complete", "fixed", "verified", or "working" before then.

## Step 7 — No fake completion

Forbidden phrases unless backed by a tool result you just produced:

- "Done."
- "Complete."
- "Fixed."
- "Verified."
- "All tests pass."
- "Working as expected."

If verification is not possible, the exact phrasing required is:

> **VERIFICATION NOT PERFORMED:** [specific reason — "no test runner", "would require deploying to staging", "needs manual browser test", etc.]

This phrasing tells the user the truth. "Done" without verification is a lie.

## Step 8 — Manual task surfacing format

Any step the user must take outside the codebase MUST appear in this format. No deviation:

```
🔧 MANUAL TASKS FOR ANDREW:

1. [Platform: GitHub / Firebase Console / Cloudflare / Stripe / Railway / Sentry / Langfuse / Google Cloud / ConfigCat / Apple App Store / Google Play / Other]
   Task: [exact action, not vague]
   Why it matters: [one precise sentence]
   Config/value needed: [specific value, URL, or UNKNOWN]
   How to verify: [one clear step the user can take to confirm it worked]
   Follow-up Claude Code prompt: "[exact prompt the user pastes after completing this]"
```

If there are no manual tasks, write: `🔧 MANUAL TASKS FOR ANDREW: none.`

Never bury a manual task inline in prose. Always use the block.

## Step 9 — When you do not know the stack

Three valid responses:

1. **Run more inspection commands.** Try: `find . -maxdepth 2 -name "*.config.*" -type f`, `cat any unique config file`, `grep -lr "firebase\|next\|vite" --include="*.json"`.
2. **Ask the user.** "I see X and Y but not Z — is this a [hypothesis] repo or [alternative]?" One question, specific.
3. **Refuse to edit until classified.** Do not "best-guess" by editing files. The cost of a wrong edit on this portfolio is much higher than the cost of one extra question.

## Step 10 — When tests cannot be run

If `npm test`, `npm run build`, or the equivalent fails or is unavailable:

- Surface why (no test script, missing dependencies, requires staging env, etc.)
- Run `npm install` once if `node_modules` is missing — but only once; if install fails, surface and stop
- Do not skip the verification line. Use the "VERIFICATION NOT PERFORMED" phrasing from Step 7.

For UI changes that you cannot verify visually:
- Say so: "VERIFICATION NOT PERFORMED: cannot start dev server in this environment"
- Recommend the user open the dev server and check the specific behavior

## Step 11 — Post-session summary format (mandatory)

End every session with this block. Even short sessions. No exceptions.

```
SESSION SUMMARY

Stack class: [A/B/C/D/E/F]
Files inspected: [list]
Assumptions made: [list, or "none beyond stack detection"]
Files changed: [list with one-line descriptions]
Tests run: [command + outcome, or "none"]
Tests not run + reason: [list]
Manual tasks surfaced: [count, see block above]
Risks/unknowns: [list]
Rollback plan: [one sentence]
Next step: [one sentence]
```

If the conversation continues after this block, treat the next instruction as a new mini-session and produce a new summary at its end.

## Step 12 — Reference vs target distinction

- `~/GitHub/CastHub1` is the **reference implementation** for Stack A patterns. Read it for examples.
- The repo you are currently editing is the **target**. Apply patterns to it; do not copy-paste from CastHub1 without adapting.
- Never edit CastHub1 just because you saw a pattern there worth replicating elsewhere — open the target repo and edit it.

## Common mistakes

1. **Skipping inspection because "I already know this repo"** — your context window does not. Re-inspect every session.
2. **Asserting "tests pass" when no tests exist** — re-read Step 7. The required phrasing is "VERIFICATION NOT PERFORMED".
3. **Reading a memory and trusting it as live state** — memory is point-in-time. Verify against the current code before acting on it.
4. **Bundling many small changes into one PR** — review becomes impossible. One concern per PR. Splitting is your job, not the user's.
5. **Burying manual tasks in prose** — always the 🔧 block. Always.
6. **Editing forbidden files because "it was a small change"** — the rules are absolute, not proportional to change size.

## Source of truth in this portfolio

- This skill is the canonical safe-edit policy. All other skills assume it.
- Reference CastHub1 (`~/GitHub/CastHub1/CLAUDE.md`, `~/GitHub/CastHub1/MANUAL_TASKS.md`) for the Stack A pattern.
- The portfolio adoption pack at `~/GitHub/claude-skills/portfolio-adoption-pack/` provides templates that bake this policy into each repo.

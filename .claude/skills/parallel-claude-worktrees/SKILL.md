---
name: parallel-claude-worktrees
description: Use whenever more than one Claude session (Claude Code + Cowork, or two Claude Code instances, or any combination) will touch the same repo concurrently. Establishes Git worktree isolation so sessions cannot hijack each other's working tree mid-edit. Directly addresses the documented CastHub1 + Aclamos Cowork shared-tree hazard. Provides setup commands, branch-naming convention, recovery flow when the tree gets hijacked, and the cleanup pattern. Keywords - parallel Claude, Cowork collision, worktree, git worktree, shared working tree, branch hijack, concurrent sessions, multi-Claude, two Claudes one repo, Cowork plus Claude Code, isolated checkout.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash]
---

# Parallel Claude Worktrees

> **The hazard, in one sentence:** Cowork (claude.ai cloud agent) and Claude Code (local) both operate on the SAME `~/GitHub/<repo>` working tree on Andrew's Mac. If both are active on the same repo, whichever one runs `git checkout` last wins — and the other session's commit can land on the wrong branch, or its uncommitted edits can vanish.

This skill installs a worktree-per-session discipline so that parallel Claude sessions on a single repo cannot collide. It is the antidote to [[feedback_casthub1_cowork_shared_tree]].

## When to use

- Cowork is actively producing PRs against a repo AND Claude Code will also touch that repo today
- Two Claude Code terminals will work on the same repo at the same time (e.g., one on a feature branch, one on a hotfix)
- A long-running Claude Code session is on a feature branch and you want to spawn a quick second session without disturbing it
- Following Boris's pattern from the Code with Claude talk: "have a bunch of checkouts of the same repo so that they can run a bunch of Claudes in parallel"

## When NOT to use

- Single Claude session, no Cowork — overhead not justified
- Pure read-only Q&A session that won't run `git checkout` or commit
- One-off task taking <5 minutes where the collision window is small (still risky, but the tradeoff may not be worth setup)

## The setup (one-time per repo)

Create a dedicated worktree directory next to the main clone. Convention across the portfolio:

```
~/GitHub/
├── <repo>/              ← primary working tree (Claude Code uses this)
└── <repo>-worktrees/    ← sibling directory holding parallel worktrees
    ├── cowork/          ← Cowork session lives here
    ├── hotfix/          ← short-lived hotfix worktree
    └── exp-<topic>/     ← exploration worktrees
```

Initial setup:

```bash
cd ~/GitHub/<repo>
mkdir -p ~/GitHub/<repo>-worktrees

# Dedicated Cowork worktree, pinned to main
git worktree add ~/GitHub/<repo>-worktrees/cowork main

# Verify
git worktree list
```

Each worktree has its own `HEAD` and its own checked-out branch. `git checkout` in one worktree does NOT affect the others. That is the entire point.

## Cowork session pattern

When kicking off a Cowork day on a repo with a primary clone Claude Code uses:

1. **Tell Cowork to operate from the worktree path**, not the primary clone:
   ```
   Work from ~/GitHub/<repo>-worktrees/cowork (NOT ~/GitHub/<repo>).
   That directory is reserved for you. The primary path is shared with my local Claude Code.
   ```
2. **Cowork still branches off main and PRs as normal** — it just does so inside its own working tree.
3. **At end of session**, leave the worktree on its feature branch. Don't `git checkout main` there — there's no need, and it just wastes the next session's first action.

Update the repo's `cowork-kickoff-YYYY-MM-DD.md` (per `cowork-kickoff` skill) to reference the worktree path explicitly in the CONTEXT TO LOAD section.

## Claude Code session pattern

Claude Code stays in `~/GitHub/<repo>` (the primary clone). No change for the user.

If Claude Code needs to spawn a parallel exploration:

```bash
git worktree add ~/GitHub/<repo>-worktrees/exp-<topic> -b exp-<topic>
cd ~/GitHub/<repo>-worktrees/exp-<topic>
# start a second `claude` session here
```

When the exploration is done:

```bash
cd ~/GitHub/<repo>
git worktree remove ~/GitHub/<repo>-worktrees/exp-<topic>
# branch survives, can be merged or deleted normally
```

## Recovery — when the tree got hijacked anyway

This procedure (from the existing hazard memory) applies when you discover Cowork or another session has flipped the primary clone's branch mid-edit:

1. **Don't panic and don't `git checkout` to "fix it"** — that compounds the loss.
2. **Stash any uncommitted work immediately:**
   ```bash
   git stash push -u -m "rescue-$(date +%Y%m%d-%H%M)"
   ```
3. **Branch from main, not from wherever HEAD landed:**
   ```bash
   git fetch origin
   git checkout -b rescue/<topic> origin/main
   ```
4. **Stage by exact path, never `git add .`** — the wrong-branch state may have stray files:
   ```bash
   git add path/to/file1 path/to/file2
   git commit -m "..."
   ```
5. **If your work was already committed on the wrong branch, cherry-pick it back:**
   ```bash
   git log <wrong-branch> --oneline -10   # find the SHA
   git cherry-pick <sha>
   ```
6. **Restore the other session's WIP** when you're done — if you stashed something that belonged to Cowork, `git stash list` and apply it back in Cowork's worktree.

## Branch-naming convention (avoids worktree conflicts)

`git worktree` refuses to check out the same branch in two worktrees. Use prefixes so branches stay distinct:

- Cowork: `cowork/<feature-name>`
- Claude Code primary: `<feature-name>` or `feat/<feature-name>` (whatever the repo already uses)
- Exploration: `exp-<topic>`
- Rescue: `rescue/<topic>`

Cowork should be told this convention in its kickoff: "All your branches start with `cowork/`."

## Per-repo install steps

To adopt this on a repo:

1. Add the worktrees directory next to the clone (commands above).
2. Add a section to the repo's `CLAUDE.md`:
   ```markdown
   ## Parallel session policy

   This repo runs both Claude Code (local) and Cowork (cloud) concurrently. To prevent
   working-tree collisions:
   - Claude Code works from `~/GitHub/<repo>`
   - Cowork works from `~/GitHub/<repo>-worktrees/cowork`
   - Cowork branches are prefixed `cowork/`
   - See parallel-claude-worktrees skill for recovery if a hijack occurs.
   ```
3. Update the repo's `cowork-kickoff-*.md` template (if it has one) to set the working path.
4. Add `*-worktrees/` to `.gitignore` IF the worktrees dir is created INSIDE the repo (it shouldn't be — keep it sibling).

## Repos to adopt first (priority order)

1. **CastHub1** — documented active hazard, Cowork producing daily, Claude Code in same tree
2. **awardssubmission** (Aclamos) — Cowork actively producing per [[project_awardssubmission_cowork_velocity]]
3. **CRM-ai** — cross-portfolio integration work, multi-session likely
4. **holiday-lights** (Noelly), **CueHound**, **Ballotis** — adopt when Cowork starts on them
5. Other portfolio repos — adopt on first Cowork session, not before

## Verifying the setup

```bash
# All worktrees for this repo
git worktree list

# Which branch is checked out where
git worktree list --porcelain

# Prune deleted worktrees (cleanup after `rm -rf`)
git worktree prune
```

## Common mistakes

1. **Putting the worktrees inside the repo** (e.g., `~/GitHub/<repo>/worktrees/`) — Git can handle it but tooling, IDEs, and search become noisy. Keep sibling.
2. **Letting both sessions check out `main`** — `git worktree` refuses; pick a feature branch in the worktree before starting work.
3. **Forgetting to tell Cowork the path** — Cowork defaults to the primary clone if not told otherwise. The kickoff prompt MUST set the working directory.
4. **`git worktree remove` on a worktree with uncommitted work** — Git refuses unless `--force`. Commit or stash first.
5. **Pruning before recovery** — if you `git worktree prune` after a hijack but before cherry-picking, you may lose the reflog reference. Recover first, prune last.

## Related skills

- [[cowork-kickoff]] — kickoff prompt must reference the worktree path
- [[fresh-chat-handoff]] — local Claude Code kickoff; mention the worktree convention if applicable
- [[safe-edit-policy]] — inspection-before-edit applies inside each worktree independently
- [[phased-shipping]] — phased PRs work the same in a worktree

## Source of truth

- Hazard memory: `~/.claude/projects/-Users-andrewward/memory/feedback_casthub1_cowork_shared_tree.md`
- Cowork velocity memory: `~/.claude/projects/-Users-andrewward/memory/project_awardssubmission_cowork_velocity.md`
- Reference workflow: Boris Cherny, Code with Claude 2026 — "parallel sessions" segment

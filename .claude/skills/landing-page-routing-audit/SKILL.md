---
name: landing-page-routing-audit
description: Use to audit which surface a visitor lands on at the public root URL, every hash route (#casting, #talent, #pricing, #demo, etc.), and every entry-point combination of (auth state × URL). Catches the four classic bugs — auto-sign-in on root, AudienceChooser-vs-LandingPage default mismatch, WorkspaceSetup leaking onto public URLs, demo-flow over-matching empty hash. Battle-tested in CastHub1 (PRs #677-#679 chain). Outputs a URL × auth × role matrix + a decision tree + a list of "trap doors" (states where a visitor can land in an authed gate without intending to). Stack-conditional. Keywords - routing audit, landing page, hash routes, AudienceChooser, parseDemoHash, WorkspaceSetup, public marketing, signed-out gate, auto sign-in trap, incognito test, decision tree.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Landing-Page Routing Audit

Quarterly (or after-incident) audit of every URL × auth-state × role → rendered surface in any portfolio app. Catches the four classic routing traps that make incognito visitors land on signed-in gates instead of marketing pages.

Always load `safe-edit-policy` first. Composes with `repo-health-audit` (called from there for the routing slice), `qa-hardening` (the audit results inform regression test priorities), and `human-simulation-testing` (the "first-time visitor" persona).

## When to use

- After any change to top-level routing (App.tsx, hash effects, auth gates)
- Before a TikTok / Instagram / app-store reviewer touches the site (the reviewer IS the cold-start visitor)
- When a user reports landing on a signed-in gate from a public URL ("incognito should never see WorkspaceSetup")
- Quarterly per repo with a public marketing surface
- Triggered by `portfolio-health-audit`'s "public-routing" check

## When NOT to use

- Inside a single feature build that doesn't touch top-level routing
- Internal-only tools (admin dashboards, CRM apps) — no public marketing surface to audit
- During an active incident — fix first, audit after

## The four classic traps

These are the bugs this skill is designed to catch. They've all happened in CastHub1 in the same week (2026-05-14 → 2026-05-15) and share a pattern: **a logged-out visitor at a public URL ends up on a logged-in gate**.

### Trap 1: Demo flow over-matches empty hash
A `parseDemoHash(hash)` (or equivalent route classifier) accidentally matches the empty string as a demo URL. Every fresh visit to the root auto-signs the visitor in to a shared demo account, then redirects them somewhere — potentially into an authed gate.

```js
// CastHub1 reference bug (PR #679):
if (trimmed === 'demo' || trimmed === '') return 'default';  // ← '' MUST not match
```

**Detection:** grep for `=== ''` or `=== "demo"` in any URL/hash classifier; verify the empty case explicitly.

### Trap 2: AudienceChooser-vs-LandingPage default mismatch
The product team disagrees with itself about whether the root URL shows a "which side are you on?" splash or jumps straight to one side's marketing page. Each side argues a different default; shipping both at once breaks SEO + bookmarks.

**Detection:** in App.tsx (or equivalent root-route file), find the `if (!audienceRoute)` branch — check what it renders. Confirm with the product owner what the agreed default is. Document in a comment so the next AI session doesn't flip it back.

### Trap 3: WorkspaceSetup / OnboardingGate leaks to public URLs
A signed-in gate (workspace creation, pending-approval screen, onboarding tour) renders for a visitor who shouldn't see it because the gate's pre-conditions silently became true (auto-sign-in, stale localStorage, race condition between `useAuth` and `useOrg`).

**Detection:** every signed-in gate must have at least three guards:
1. `isLoggedIn === true`
2. The actual condition that should trigger it (e.g. `!currentOrg`)
3. A negative guard against state-races (e.g. `allOrgs.length === 0` not just `!currentOrg`)

If any of those is missing, race conditions can fire the gate.

### Trap 4: Hash-route classifier matches subset of intended routes
A route string match accidentally accepts a longer prefix (`#casting-demo` matches `#casting`) or a substring. Result: the wrong renderer fires for a related URL.

**Detection:** search for `.startsWith(` and `.includes(` calls on hashes. Confirm each is intentional — startsWith with a slash-terminator (`#demo/`) is usually correct; bare `.startsWith('#demo')` would also match `#demo123`.

## The audit playbook

### Phase 1: Build the URL × auth matrix

Read the root routing file (App.tsx in CastHub1; main.tsx + Layout in some other repos) and extract every conditional render branch. Produce a table:

```markdown
| URL | Logged-out | Logged-in (any role) | Logged-in (super-admin) |
|---|---|---|---|
| `/` | ??? | ??? | ??? |
| `/#casting` | ??? | ??? | ??? |
| `/#talent` | ??? | ??? | ??? |
| `/#demo` | ??? | ??? | ??? |
| `/#pricing` | ??? | ??? | ??? |
| ... every documented hash | ... | ... | ... |
| `/#unknown-junk` | ??? | ??? | ??? |
```

The unknown-junk row matters — visitors paste broken links from social media all the time.

### Phase 2: Trace every entry into a signed-in gate

For each gate (WorkspaceSetup, PendingApproval, OnboardingTour, etc.), find the `if (...) return <Gate />` line. Document the exact condition. Verify all three guard layers are present:

```js
// Good — three guards, race-safe:
if (isLoggedIn
    && !isLoadingOrg
    && !currentOrg
    && (!allOrgs || allOrgs.length === 0)
    && !isSuperAdminByEmail) {
    return <WorkspaceSetup />;
}

// Bad — one guard, race-prone:
if (!currentOrg) return <WorkspaceSetup />;
```

### Phase 3: Audit auto-sign-in paths

Find every place in the code that signs the visitor in WITHOUT them clicking a button. In CastHub1 these are:
- Public demo (`startAndSignInPublicDemo` in publicDemoService.ts) — fired by `parseDemoHash(hash) !== null`
- Magic-link claim (`#claim` handler) — fired by `audienceRoute === 'claim'`
- (any anonymous Firebase Auth fallback if present)

For each: confirm the trigger condition is **specific** (matches only the URLs intended), not loose. The empty-hash bug is the canonical example of a loose trigger.

### Phase 4: Cross-check subdomain + path forwarding

If the app uses subdomain routing (`casting.mythie.app`, `talent.mythie.app`), trace the full chain:
- DNS → hosting provider → SPA boot → hash auto-set
- Confirm subdomains map to the right hash and don't accidentally trigger sign-in

### Phase 5: Test the cold-start matrix manually

For each row in the URL × auth matrix, open a fresh incognito window and verify the actual rendered surface. The matrix is a **specification**; this step is the **verification**. Don't skip — production behavior diverges from code more often than you'd expect (service workers, CDN caches, stale build artifacts).

Recommended test set (cover the bug classes):
1. `/` in fresh incognito → ??? (verify against agreed default)
2. `/#casting` in fresh incognito → ???
3. `/#talent` in fresh incognito → ???
4. `/#unknown` in fresh incognito → ??? (must NOT be a 404 or signed-in gate)
5. `/#demo` in fresh incognito → demo auto-sign-in (only this one)
6. `/#casting` in already-logged-in window → ???
7. Sign out, refresh `/#casting` → must drop back to step 2

## Output format

Write the audit to `docs/strategy/routing-audit-{YYYY-MM-DD}.md` in the audited repo, with this structure:

```markdown
# {repo} routing audit — {date}

> Triggered by: {what kicked off this audit}
> Source of truth: {file path + line range covering the routing logic}

## URL × auth × role matrix
[the table from Phase 1, fully populated]

## Signed-in gates audit
[for each gate: location, conditions, race-safety verdict]

## Auto-sign-in paths audit
[for each: trigger, scope, risk verdict]

## Subdomain + path forwarding chain
[if applicable]

## Cold-start manual test results
[the test set above with actual observed renders]

## Findings
- 🟢 [what's working correctly]
- 🟡 [opportunities for improvement]
- 🔴 [bugs requiring immediate fix]

## Recommended fixes (with PR scope estimates)
[ranked by risk × user impact]

## Phase 2 routing improvements
[non-urgent quality-of-life polish — chooser shortcuts for returning users, AuthLoading timeouts, etc.]
```

## Hard rules

1. **Never edit routing without explicit user sign-off if you're not 100% sure of the intended behavior.** Routing is a product decision more than a code decision; the user will tell you what should happen, you implement.
2. **Always test the cold-start matrix manually after a routing change.** Code review doesn't catch service-worker / CDN cache / stale-build divergence.
3. **Document the agreed default at the routing decision site.** The next AI session won't have your conversation context; an inline comment ("`mythie.app` → AudienceChooser per Andrew 2026-05-15") prevents flip-flopping.
4. **A signed-in gate that fires for an unauthenticated user is a P0 bug.** Drop everything else and fix it. Public marketing surfaces are the front door; gates leaking onto them break SEO, app-store review, and first-impression conversion all at once.
5. **Empty-hash matching is forbidden in any URL classifier.** `if (hash === '' || hash === 'demo')` is a guaranteed bug. Match exact strings only.

## Composition

- `safe-edit-policy` — foundation contract; routing edits are sensitive
- `repo-health-audit` — quarterly per-repo audit calls this skill for the routing slice
- `qa-hardening` — the audit's manual test set should become a Playwright spec (use this skill for the spec scaffold)
- `human-simulation-testing` — the "first-time visitor" persona is exactly the user this skill protects
- `phased-shipping` — when fixes touch >1 file, use phased-shipping to land them safely
- `shipping-efficiency-budget` — bundle related routing fixes into one PR per the decision tree

## Reference: CastHub1 routing PR series (the worked example)

This skill was distilled from this exact week of CastHub1 work:

| PR | Bug | Fix |
|---|---|---|
| #677 | Logged-out visitor saw AudienceChooser; Andrew wanted LandingPage | Defaulted to LandingPage. **Wrong** — over-corrected. |
| #678 | (over-correction) lost the AudienceChooser entirely; mobile WorkspaceSetup couldn't scroll | Restored AudienceChooser at root + fixed scroll + demo PENDING bypass + routing audit doc |
| #679 | Incognito root visit auto-signed visitor into demo → landed on WorkspaceSetup | Removed empty-hash match in `parseDemoHash` (one-character fix) |
| #680 | (separate but adjacent) Admin badges out of sync, self-heal silent failure, etc. | Bundled 4 admin bugs |

The pattern: each fix uncovered the next layer. The audit doc this skill produces would have caught all four in one pass.

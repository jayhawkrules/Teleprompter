# Feature Audit Workflow

Step-by-step procedure when asked to "scrub", "audit", or "verify features for" any app in the portfolio.

## When to run this

- Quarterly per app (per the `expires` field on `app-training-manual` SKILL.md)
- Before any major customer-facing announcement (deck, sales call, marketing push)
- After a release that touches the user-facing surface
- When staff ask "is feature X still in [app]?" and the reference file is older than 30 days

## The procedure

### Step 1 — Read the current reference file

```bash
# Example for Mythie
cat ~/.claude/skills/app-training-manual/references/mythie.md
```

Extract every feature listed in the **Feature Inventory** table. Note the current status (✅ / 🚧 / ❌) for each.

### Step 2 — Inspect the app's repo

Open the repo from `references/product-registry.md` (or `cd` into the local clone). Run the Step 1 inspection from `safe-edit-policy`:

```bash
ls -la
[ -f package.json ] && cat package.json | head -40 || echo "NO package.json"
[ -f CLAUDE.md ] && head -50 CLAUDE.md || echo "NO CLAUDE.md"
[ -f README.md ] && head -40 README.md || echo "NO README.md"
git log --oneline -20
```

Then look specifically for:
- **Routes / pages** — `src/App.tsx`, `src/routes/*`, `pages/*`, `app/*` for Next.js
- **Feature flags** — search `featureFlags`, `FLAGS`, `enabled:` in code
- **Pricing tiers / entitlements** — search `tier`, `plan`, `entitlement`, `Stripe.products`
- **Recent additions** — `git log --since="3 months ago" --oneline` for new features
- **Removed code** — `git log --diff-filter=D --since="3 months ago"` for deletions

### Step 3 — Compare and classify

For each feature, classify as:

| Classification | Meaning |
|---|---|
| ✅ **Confirmed** | Reference file matches code; status is correct |
| ➕ **Added** | Feature exists in code but not in the reference file |
| 🔄 **Changed** | Feature exists in both but status (✅/🚧/❌), pricing tier, or scope has shifted |
| ➖ **Removed** | Reference file lists it but the code no longer contains it |
| ❓ **To Confirm** | Cannot tell from code alone — needs Andrew's input (e.g., feature is gated by a flag whose default state is unclear) |

### Step 4 — Output the diff table

Format the audit result as:

```markdown
# Feature Audit: [App Name] — [date]

| Feature | Reference status | Observed in code | Classification | Notes |
|---------|------------------|------------------|----------------|-------|
| [feature] | ✅ Live | ✅ Present at src/components/X.tsx | ✅ Confirmed | |
| [feature] | 🚧 In dev | ✅ Present and routed at /feature | 🔄 Changed | Should be promoted to ✅ Live |
| [feature] | ✅ Live | ❌ No matching code found | ➖ Removed OR ❓ To Confirm | Verify with Andrew before changing reference |
| [feature] | (not listed) | ✅ Present at src/components/Y.tsx | ➕ Added | New feature — needs reference file row |
```

### Step 5 — Surface conflicts

For any classification that requires human judgment, surface as ⚠️ CONFLICT:

```
⚠️ CONFLICT — [feature name]
Reference says: [status]
Code shows: [observation]
Why this is ambiguous: [reason]
Recommended action: [confirm with Andrew / check live app / etc.]
```

### Step 6 — Do NOT auto-update the reference file

This is the hard rule. Never edit `references/[app].md` based on an audit without explicit approval from Andrew.

Instead, surface every change as a 🔧 MANUAL TASK in the post-session summary:

```
🔧 MANUAL TASKS FOR ANDREW:

1. Platform: app-training-manual reference file
   Task: Update references/[app].md based on the audit table above
   Why it matters: Reference file is currently inconsistent with [app] codebase; staff trained on stale info will give wrong answers
   Config/value needed: Confirm each ⚠️ CONFLICT and ❓ To Confirm row in the audit
   How to verify: After update, re-run feature-audit and confirm all rows show ✅ Confirmed
   Follow-up Claude Code prompt: "Update references/[app].md per the audit dated [date] — apply all confirmed changes only"
```

## Why this is read-only by design

Reference files drive what staff say to customers. An auto-update introduces the risk of:
- Promoting a 🚧 feature to ✅ when the code is present but the feature is intentionally hidden behind a flag
- Removing a feature from the reference file because the audit didn't find it (when the audit just missed it)
- Silently changing pricing because a Stripe product was renamed

Audits diagnose. Andrew decides. That's the contract.

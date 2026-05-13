---
name: database-link-and-permissions-audit
description: Use to verify that every database item (Firestore collection, Realtime DB path, Supabase/Postgres table, KV namespace, R2 bucket, D1 table) referenced by an app is actually wired end-to-end — schema defined, read paths matched, write paths matched, security rules / RLS / IAM aligned with real usage, indexes present, no orphans. Catches the "user paid but no doc was created", "collection works locally but rule denies in prod", "table exists but is world-readable", and "rule allows what code never writes" classes of bug. Keywords audit, database wiring, orphan collection, missing rule, RLS, IAM, permissions drift, schema mismatch, Firestore, Realtime Database, Supabase, Postgres, KV, R2, D1.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Database Link & Permissions Audit

End-to-end audit that proves every database item is reachable, used, and guarded. Inventories what the code actually touches, then cross-checks that against schema/rules/IAM/indexes. Flags four failure modes:

1. **Orphan in code** — code reads/writes a collection or table that has no rule, no schema, no migration, no index.
2. **Orphan in rules** — security rule / RLS policy / IAM grant exists for a path the code never touches (stale surface area, attacker bonus).
3. **Permission mismatch** — code writes a field the rule disallows (silent failure), or the rule allows a write the code never makes (lateral-write risk).
4. **Cross-DB drift** — the same logical entity exists in two systems (e.g., Firestore `users` + Supabase `auth.users` + Stripe customer) and IDs don't line up.

Always load `safe-edit-policy` first. Pairs with `firestore-rbac-helpers` (rule helpers), `firebase-actions-deploy` (rules deploy), and `monetization-readiness-review` (revenue paths).

## When to use

- Before launching any new app — last-mile check that the data layer is consistent.
- After adding a new collection / table / KV / R2 / D1 surface to an existing app.
- After a "user did X but no record exists" or "writes silently fail in prod" bug.
- During quarterly `repo-health-audit` — pulls this in as Step 4.
- Before granting a new role / claim / service account that touches the DB.
- After deleting a feature — verifies you removed the rules/indexes too, not just the UI.

## When NOT to use

- Apps with no persistent storage (pure static marketing — Stack C without a form backend).
- A single-line code change that doesn't touch any DB surface.
- During incident response when the priority is rollback first, audit second.

## Stack scope

| Stack | Primary DBs covered | Where rules/permissions live |
|-------|---------------------|------------------------------|
| A (Vite + Firebase) | Firestore, Realtime DB, Cloud Storage | `firestore.rules`, `database.rules.json`, `storage.rules`, `firestore.indexes.json` |
| B (Next.js + Supabase) | Postgres via Supabase | RLS policies in migrations, `supabase/migrations/*.sql` |
| B (Hono/Express + Postgres) | Postgres via Prisma/Drizzle | Schema files + middleware-enforced authz |
| B (Cloudflare Workers) | D1, KV, R2, Durable Objects | `wrangler.toml` bindings + Worker authz |
| D (WordPress) | MySQL | Roles & capabilities in code; out of scope for code-level audit |
| E (JS automation) | usually none | n/a |

If the repo uses something not in this table, stop and ask before improvising.

## The 6-step audit workflow

### Step 1 — Stack & DB detection

Don't trust assumptions; inspect:

```bash
# Stack A — Firebase
test -f firebase.json && cat firebase.json | jq '.firestore, .database, .storage, .hosting'
test -f firestore.rules && wc -l firestore.rules
test -f firestore.indexes.json && jq '.indexes | length' firestore.indexes.json
test -f database.rules.json && jq 'keys' database.rules.json
test -f storage.rules && wc -l storage.rules

# Stack B — Supabase
ls supabase/migrations/ 2>/dev/null | tail
grep -rEn 'create (policy|table|index)' supabase/migrations/ 2>/dev/null | head -50

# Stack B — Prisma / Drizzle
test -f prisma/schema.prisma && grep -E '^(model|enum) ' prisma/schema.prisma
ls drizzle/ 2>/dev/null

# Cloudflare — Workers
test -f wrangler.toml && grep -E '^\[\[(d1_databases|kv_namespaces|r2_buckets|durable_objects)' wrangler.toml
```

Record what surfaces actually exist before listing what the code uses.

### Step 2 — Inventory: what the code actually touches

**Firestore (client + admin SDK):**

```bash
# Client SDK — collection / doc paths
grep -rEn "(collection|doc)\(['\"\`]([^'\"\`]+)" src/ functions/src/ 2>/dev/null
# Modular API
grep -rEn "collection\(db,\s*['\"\`]([^'\"\`]+)" src/ 2>/dev/null
# Admin SDK
grep -rEn "(firestore|admin\.firestore)\(\)\.collection\(['\"\`]([^'\"\`]+)" functions/src/ 2>/dev/null
```

**Realtime Database:**

```bash
grep -rEn "(ref|child)\(['\"\`]([^'\"\`]+)" src/ functions/src/ 2>/dev/null
```

**Cloud Storage:**

```bash
grep -rEn "ref\(storage,\s*['\"\`]([^'\"\`]+)" src/ 2>/dev/null
grep -rEn "storage\(\)\.bucket\(" functions/src/ 2>/dev/null
```

**Supabase:**

```bash
grep -rEn "\.from\(['\"\`]([^'\"\`]+)" src/ 2>/dev/null
grep -rEn "rpc\(['\"\`]([^'\"\`]+)" src/ 2>/dev/null
```

**Prisma:**

```bash
grep -rEn "prisma\.(\w+)\.(findUnique|findFirst|findMany|create|update|delete|upsert)" src/ 2>/dev/null
```

**Cloudflare bindings:**

```bash
grep -rEn "env\.(DB|KV|BUCKET|[A-Z_]+)\.(prepare|get|put|delete|list)" src/ 2>/dev/null
```

Produce a deduped list. This is the **code surface**.

### Step 3 — Inventory: what rules / migrations / IAM define

**Firestore rules:**

```bash
grep -nE "match\s+/([^{]+)" firestore.rules
```

**Firestore indexes:**

```bash
jq '.indexes[] | "\(.collectionGroup) \(.fields | map(.fieldPath) | join(","))"' firestore.indexes.json
```

**Realtime DB:**

```bash
jq 'paths(scalars) | map(tostring) | join("/")' database.rules.json
```

**Supabase RLS:**

```bash
grep -rEn "create policy|alter policy|enable row level security" supabase/migrations/
```

**Prisma:**

```bash
grep -E '^model ' prisma/schema.prisma | awk '{print $2}'
```

This is the **declared surface**.

### Step 4 — Diff (code surface ⨯ declared surface)

For every entry in either set, classify:

| In code | In rules/schema | Verdict |
|---------|-----------------|---------|
| ✅ | ✅ | OK — proceed to Step 5 |
| ✅ | ❌ | **🚨 Orphan in code** — write the missing rule/schema, or remove the code |
| ❌ | ✅ | **⚠️ Orphan in rules** — confirm intentional (planned use?) or delete |
| ❌ | ❌ | not in scope |

Special case: **subcollection paths**. `orgs/{orgId}/projects/{projectId}/tasks` may be referenced as `tasks` in client code if it's pulled from a parent `doc(...)` chain. Trace the chain before flagging.

### Step 5 — Permission mismatch check (per "OK" entry)

For each path that exists in both code and rules, verify the rule actually allows what the code does:

1. **Read path** — does the code `getDoc`, `getDocs`, `onSnapshot`? Does the rule have a matching `allow read`?
2. **Write paths** — for every `setDoc`, `updateDoc`, `addDoc`, `deleteDoc`, find the corresponding `allow create/update/delete`. Check that:
   - The fields the code writes are not blocked by a `fieldUnchanged(...)` in `update` rules.
   - The caller identity expected by the rule (uid match, role, org member, custom claim) is actually authenticated at the call site.
   - Default values the rule pins (e.g., `request.resource.data.role == 'member'`) are actually set by the code on `create`.
3. **Index match** — every `where(...).orderBy(...)` query has a matching composite index in `firestore.indexes.json`. Missing indexes throw at runtime in prod, work in emulator (which auto-creates them).
4. **Privilege fields** — for every privilege/billing field the code writes (`role`, `orgIds`, `stripeCustomerId`, `entitlements`, `flags.*`), confirm the rule either denies user-side writes or pins it.

Emit each mismatch as a row in the report (Step 6).

### Step 6 — Cross-DB consistency (when more than one persistence layer)

For any entity that lives in multiple stores, verify the join key matches:

- Firebase Auth `uid` ↔ Firestore `users/{uid}` (or Supabase `auth.users.id` ↔ Postgres `profiles.id`)
- Firestore `users/{uid}.stripeCustomerId` ↔ Stripe `customer.metadata.firebaseUid`
- Cloudflare KV cache key ↔ source-of-truth DB primary key
- D1 `bookings.user_id` ↔ Firestore `users/{uid}` (if dual-stack)

A drift here causes "I paid but my account doesn't show it" — a silent revenue leak. Use `monetization-readiness-review` for the deeper audit; this skill only flags the join.

## Worked example — Firestore mini-audit

Input: `src/lib/userRepo.ts` calls `getDoc(doc(db, 'users', uid))` and `updateDoc(doc(db, 'users', uid), { displayName, stripeCustomerId })`.

Audit walks through:

1. **Step 2** — code surface: `users/{uid}`, fields `displayName`, `stripeCustomerId`.
2. **Step 3** — `firestore.rules` has `match /users/{userId}` with `allow update: if uid() == userId && fieldUnchanged('role')`.
3. **Step 5** — `stripeCustomerId` is not pinned. Code can write it from the client. **🚨 Privilege field exposure** — a malicious client could overwrite another user's `stripeCustomerId` and intercept billing events. Fix: move the write to a Cloud Function (admin SDK) and add `fieldUnchanged('stripeCustomerId')` to the rule.

## Common pitfalls

1. **`get()` recursion in rules** — `userDoc()` helper reads `users/{uid}`; if you call it inside the rule for `users/{uid}` itself, you can hit infinite recursion or denied-on-create. Use `request.auth.token.role` (Custom Claim) for the user's own doc.
2. **Subcollection rules don't inherit** — a rule on `/orgs/{orgId}` does NOT cover `/orgs/{orgId}/projects/{projectId}`. Each level needs its own `match` block.
3. **Missing composite index** — `where('orgId', '==', x).orderBy('createdAt', 'desc')` requires a composite index. Local emulator silently builds it; prod returns `FAILED_PRECONDITION` with a one-click create link in the error.
4. **RLS not enabled** — Supabase tables ship with RLS **off** by default. A `create policy` statement without `alter table … enable row level security` does nothing. Audit must check both.
5. **Service-role keys in client bundles** — Supabase `SERVICE_ROLE_KEY` or Firebase Admin SDK service account in `import.meta.env.VITE_*` bypasses every rule. Grep client bundle for `SERVICE_ROLE`, `service_account`, `private_key`.
6. **Storage rules forgotten** — `firestore.rules` is locked down but `storage.rules` still has the default `if request.auth != null` blanket allow. Treat storage as a first-class DB surface.
7. **Cloudflare KV / R2 has no rules engine** — authz lives entirely in your Worker code. If the Worker fronts the binding without an auth check, the binding is effectively public.
8. **Realtime DB paths are deep** — rules cascade by default (a parent allow opens all children). Always end with a deny at root unless you know cascade is intentional.
9. **Migration order** — a new RLS policy referencing a column added in a later migration will silently allow nothing. Run migrations against a clean DB to surface ordering bugs.

## Output format

```
DB LINK & PERMISSIONS AUDIT — [repo] — [date]

STACK: [A / B / B+Cloudflare / D / E]
SURFACES DETECTED: [Firestore / Realtime DB / Storage / Supabase / Prisma-PG / D1 / KV / R2]

INVENTORY
  Code surface (paths/tables touched by code):
    - users (read, write[displayName, stripeCustomerId])
    - orgs/{orgId}/projects (read, write[name, ownerUid])
    - webhookEvents (write[id, type, receivedAt] — admin only path)
    ...
  Declared surface (rules/schema/migrations):
    - users (rule present, allow read/update self)
    - orgs (rule present)
    - orgs/{orgId}/projects (rule present)
    - publicShows (rule present)
    ...

DIFF
  🚨 Orphan in code:
    - webhookEvents — no rule, but Cloud Function writes to it. Confirm admin-only intent; add explicit deny for client.
  ⚠️ Orphan in rules:
    - publicShows — no code reference. Was this deleted? Remove the rule or restore the read path.

PERMISSION MISMATCHES
  🚨 users.stripeCustomerId — client can write; rule does not pin field. Move write to Cloud Function or add fieldUnchanged.
  ⚠️ orgs/{orgId}/projects — query orderBy('createdAt') has no composite index in firestore.indexes.json. Will fail in prod.

CROSS-DB JOIN KEYS
  ✅ Firebase uid ↔ Firestore users/{uid} ↔ Stripe customer.metadata.firebaseUid
  ⚠️ D1 bookings.user_id is a string but Firestore uid in client is read as `auth.currentUser.uid` without normalisation; case/space drift possible.

STORAGE / KV / R2
  - storage.rules — last reviewed [date]; still uses `if request.auth != null` blanket — tighten to per-uid prefix.
  - env.MEDIA (R2) — Worker route `/media/*` has no auth check; public-readable. Confirm intent.

🔧 MANUAL TASKS FOR ANDREW: [per safe-edit-policy Step 8 — listed inline above]

VERDICT: [Pass / Pass-with-fixes / Block-launch]
```

## Source of truth in this portfolio

- `~/GitHub/CastHub1` — most surfaces (Firestore + Storage + Realtime), best example of the full audit
- `~/GitHub/noelly-app` — Supabase RLS reference (Stack B)
- `~/GitHub/holiday-lights` — dual-stack (Firestore + Stripe Connect entitlements)
- `~/GitHub/Tribeca-Film-Festival-2026` — minimal Firestore baseline
- Related skills:
  - `firestore-rbac-helpers` — the rule helpers this audit checks for
  - `firebase-actions-deploy` — how rules ship; an audit pass should precede a rules deploy
  - `monetization-readiness-review` — deeper revenue-path consistency audit
  - `repo-health-audit` — pulls this in as a step
  - `payment-webhook-safety` — covers the admin-SDK write path that often bypasses rules

## Quick audit checklist

- [ ] Stack & DB surfaces enumerated from config (`firebase.json`, `wrangler.toml`, `supabase/migrations/`, `prisma/schema.prisma`)
- [ ] Code surface inventoried (collections / tables / KV / R2 / Storage / RPCs the code touches)
- [ ] Declared surface inventoried (rules / RLS policies / schema models)
- [ ] Diff produced; every orphan classified
- [ ] Each "OK" path has matching read AND write rule for what the code does
- [ ] Every composite query has a backing index
- [ ] Every privilege field (`role`, `orgIds`, `stripeCustomerId`, `entitlements`, flag fields) is either admin-SDK-only or pinned with `fieldUnchanged`
- [ ] Supabase tables that have policies also have RLS **enabled**
- [ ] No `SERVICE_ROLE` / `service_account` / `private_key` leaks into client bundle
- [ ] `storage.rules` reviewed (not left at default blanket allow)
- [ ] Cloudflare bindings have a Worker-level auth check before exposing the binding
- [ ] Cross-DB join keys verified (Firebase uid ↔ Stripe customer ↔ Supabase/Postgres profile)
- [ ] Manual tasks for Andrew listed in 🔧 format per `safe-edit-policy`

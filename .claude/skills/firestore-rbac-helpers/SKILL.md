---
name: firestore-rbac-helpers
description: Use when writing or auditing firestore.rules for any app in the portfolio. Provides reusable rule helper functions (isAuthed, isAdmin, isOrgMember, hasRole), immutable role pinning to prevent privilege escalation, default-deny posture, and the org-scoped multi-tenant pattern. Keywords: firestore.rules, security rules, RBAC, role-based access control, admin, multi-tenant, org-scoped, immutable role, privilege escalation, default deny.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash]
---

# Firestore RBAC Helpers

> **APPLIES TO: Stack A repos only** (React/Vite/TS + Firebase Firestore). If this repo has no `firestore.rules` and no plan to use Firestore, **stop** and use the appropriate authz pattern for the actual stack:
> - Stack B with Supabase (`noelly-app`) → Row Level Security (RLS) policies
> - Stack B with Postgres (Prisma/Drizzle) → middleware + DB-level role checks
> - Stack B with NextAuth → middleware-based route guards
> - Stack C/D/E → not applicable
>
> Always load `safe-edit-policy` first.

Reusable Firestore rule helpers and patterns for the apps in this portfolio. Three patterns repeat across CastHub1, Invoicing, and Tribeca: (1) helper-function-wrapped auth checks, (2) immutable role pinning, (3) super-admin gating via **Firebase Custom Claims** (not email allowlists — see deprecation note below). Use this skill to standardize.

## When to use
- Setting up `firestore.rules` for a new app
- Adding a new collection to an existing app and needing to scope its read/write
- Fixing a "I made a user admin and now anyone can be admin" type bug
- Migrating from a single-email admin gate to a real role system
- Adding multi-tenancy (org-scoped data) to an app

## When NOT to use
- Apps using Firebase Realtime Database (different rule syntax)
- Public-write collections (e.g., contact form inboxes) — those bypass auth intentionally; document the bypass with a comment

## Core helpers

Place these at the top of `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ─── Helpers ───────────────────────────────────────────
    function isAuthed() {
      return request.auth != null;
    }

    function uid() {
      return request.auth.uid;
    }

    function userDoc() {
      return get(/databases/$(database)/documents/users/$(uid())).data;
    }

    function hasRole(role) {
      return isAuthed() && userDoc().role == role;
    }

    function isAdmin() {
      return hasRole('admin');
    }

    function isSuperAdminClaim() {
      // Owner-level access via Firebase Auth Custom Claim.
      // Grant with `scripts/setSuperAdmin.js` (Admin SDK one-shot per email).
      // CANONICAL pattern — see CastHub1 commit 7d9c67d (2026-05-10).
      return isAuthed() && request.auth.token.superAdmin == true;
    }

    // ⚠️ DEPRECATED — do not use in new rules. Kept for migration reference only.
    //
    //   function isSuperAdminEmail() {
    //     return isAuthed() && request.auth.token.email in ['andrewpward@gmail.com'];
    //   }
    //
    // Why removed (per CastHub1 PR #370, 2026-05-10):
    //  - GDPR/PII exposure: hardcodes a real email in a (potentially public) repo
    //  - Cannot revoke without a deploy + rules push
    //  - No audit trail; no rotation; no per-environment override
    // Migrate by:
    //  1. Set the Custom Claim via setSuperAdmin.js for each owner email
    //  2. Replace every isSuperAdminEmail() call site with isSuperAdminClaim()
    //  3. Re-deploy rules

    function isOrgMember(orgId) {
      return isAuthed() && orgId in userDoc().orgIds;
    }

    function fieldUnchanged(field) {
      return request.resource.data[field] == resource.data[field];
    }
```

## Pattern 1: Default-deny

End every `firestore.rules` with a catch-all deny so any unscoped collection is locked down.

```
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Pattern 2: Immutable role pinning

Users must never be able to write their own `role` field — that's the whole point of RBAC.

```
match /users/{userId} {
  allow read: if isAuthed() && (uid() == userId || isAdmin());
  allow create: if isAuthed() && uid() == userId
                && request.resource.data.role == 'member';  // pinned default
  allow update: if isAuthed()
                && uid() == userId
                && fieldUnchanged('role')
                && fieldUnchanged('orgIds')
                && fieldUnchanged('createdAt');
  allow delete: if isSuperAdminClaim();
}
```

Only an admin (or a Cloud Function with admin SDK) can change `role`.

## Pattern 3: Org-scoped multi-tenant

Every tenant-scoped collection should require the caller to be a member of the requested org.

```
match /orgs/{orgId} {
  allow read: if isOrgMember(orgId) || isAdmin();
  allow write: if isAdmin();

  match /projects/{projectId} {
    allow read: if isOrgMember(orgId) || isAdmin();
    allow write: if (isOrgMember(orgId) && hasRole('producer')) || isAdmin();
  }
}
```

## Pattern 4: Public-read, admin-write

Common for public-facing content (curated show pages, blog posts).

```
match /publicShows/{showId} {
  allow read: if true;
  allow write: if isAdmin();
}
```

## Common mistakes

1. **Inline auth checks instead of helpers** — symptom: rules drift, some collections require email, others UID. Fix: only use `isAuthed()`, `isAdmin()`, etc. — never raw `request.auth != null` after this skill is applied.
2. **Forgetting `fieldUnchanged('role')` on `update`** — symptom: any logged-in user can `PATCH` themselves to admin. Fix: pin every privilege field with `fieldUnchanged`.
3. **No default-deny** — symptom: a new collection ships open. Fix: catch-all at the bottom.
4. **`get()` cost** — every helper that reads `userDoc()` is a billable read inside the rule. For high-traffic apps, consider custom claims (`request.auth.token.role`) instead.

## Testing

Use `@firebase/rules-unit-testing` and `firebase emulators:start --only firestore`:

```js
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

const env = await initializeTestEnvironment({
  projectId: 'demo-rbac',
  firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') }
});

const alice = env.authenticatedContext('alice', { email: 'alice@x.com' });
await assertFails(alice.firestore().doc('users/bob').get());
```

## Source of truth in this portfolio

- `~/GitHub/CastHub1/firestore.rules` — most complete (helper functions, super-admin, immutable roles, org-scoped)
- `~/GitHub/Producing-Hollywood-Invoicing/firestore.rules` — simpler single-email admin gate
- `~/GitHub/Tribeca-Film-Festival-2026/firestore.rules` — minimal baseline

## Quick audit checklist
- [ ] All auth checks go through helpers
- [ ] Catch-all default-deny at the bottom
- [ ] Every `update` rule pins privilege fields with `fieldUnchanged`
- [ ] No `isSuperAdminEmail()` or hardcoded email allowlist in `firestore.rules` — use `isSuperAdminClaim()` (Custom Claim) instead. Grant claims via the Admin SDK script (e.g. CastHub1's `scripts/setSuperAdmin.js`).
- [ ] Billing / subscription / Stripe-customer-ID collections (`/subscriptions/{userId}`, etc.) are scoped to the owning uid + super-admin only — not readable by any authed user. Reference: CastHub1 commit 7d9c67d.
- [ ] No `if true` rules unless the collection is intentionally public
- [ ] Tested with rules-unit-testing for at least the user/admin matrix

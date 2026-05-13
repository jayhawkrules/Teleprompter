---
name: feature-scaffold
description: Use when adding a new feature to any app in the portfolio. Scaffolds the feature consistently across stack layers (Firestore collection, security rules, service, hook, component, route, test, observability hooks, PR description) so feature shape is uniform across all repos. Keywords: feature, scaffold, new feature, service layer, hook, component, route, Firestore collection, test scaffold, PR template, stack layers.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Feature Scaffold

> **Always load `safe-edit-policy` first.** This skill creates ~9 files in one pass; without the safety contract, edits land in the wrong places.
>
> **Stack-conditional:** the 12-layer scaffold is the **Stack A** path (React/Vite/TS + Firebase). For other stacks, use the reduced path at the end of this file.

Add a new feature in a way that touches every layer of the stack consistently — so two different features added by two different sessions end up with the same shape. Reduces "where is the X for this feature?" hunting.

## When to use
- Adding any new user-facing feature (e.g., "talent badges", "show favorites", "invoice approvals")
- Adding any new domain object that has its own Firestore collection
- Adding a new admin-only tool or report
- Refactoring an existing feature that's spread across files inconsistently — re-scaffold to standard

## When NOT to use
- Pure UI tweaks (color, copy, layout) — no scaffold needed
- Bug fixes — fix in place, don't reorganize
- Performance work — different methodology

## The 12-layer scaffold

For a Stack A feature called `[feature]` (kebab-case for files, camelCase for symbols), produce all 12:

### 1. Firestore collection
- Name: pluralized camelCase (e.g., `talentBadges`, `showFavorites`)
- Required fields: `id`, `createdAt: Timestamp`, `updatedAt: Timestamp`, `createdBy: uid`
- Document the shape in a TypeScript interface, not in `data/[feature].ts` only

### 2. firestore.rules update
- Add a `match /[collection]/{id}` block
- Use helpers from `firestore-rbac-helpers` skill — never raw auth checks
- Read/write/delete each justified separately
- Pin immutable fields (`createdAt`, `createdBy`) on update

### 3. TypeScript types
- File: `types/[feature].ts`
- Export the document interface, any DTO variants, and Zod schemas if the feature accepts user input

```ts
export interface TalentBadge {
  id: string;
  name: string;
  earnedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 4. Service layer
- File: `services/[feature]Service.ts`
- Export functions: `getX`, `listX`, `createX`, `updateX`, `deleteX`
- Each function takes raw inputs and returns typed results
- No React imports here — this is the data boundary
- Wrap each Firestore call in a `try/catch` that logs to Sentry

```ts
export async function getTalentBadge(id: string): Promise<TalentBadge | null> {
  try {
    const snap = await getDoc(doc(db, 'talentBadges', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as TalentBadge) : null;
  } catch (err) {
    Sentry.captureException(err, { tags: { service: 'talentBadgeService', op: 'get' } });
    throw err;
  }
}
```

### 5. React hook (if frontend)
- File: `hooks/use[Feature].ts`
- Owns subscription/loading state — components don't call Firestore directly
- Returns `{ data, loading, error, refetch }`
- Use `onSnapshot` for live data; bare `getDoc` only for one-shot reads

### 6. Component(s)
- Folder: `components/[feature]/`
- Files: `[Feature]List.tsx`, `[Feature]Detail.tsx`, `[Feature]Form.tsx` (as applicable)
- Each component is presentational — gets data from a hook, doesn't fetch directly
- Wrap in `<ErrorBoundary>` from `@sentry/react` at the route level

### 7. Route
- Add to the central router in `App.tsx` or `routes.tsx`
- Pattern: `/[feature]` for list, `/[feature]/:id` for detail, `/[feature]/new` for form
- Lazy-load with `React.lazy` for code-splitting
- Add to nav if user-facing

### 8. Tests (unit + integration)
- Service tests: `__tests__/services/[feature]Service.test.ts` — use `@firebase/rules-unit-testing` for the Firestore part
- Hook tests: `__tests__/hooks/use[Feature].test.tsx` — `@testing-library/react-hooks`
- Skip component snapshot tests — too brittle, low value
- See `qa-hardening` for the test-bar setup if not yet installed in this repo

### 9. E2E smoke test (Playwright)
- File: `e2e/[feature].spec.ts`
- One smoke test per critical user journey for this feature: open the page, do the primary action, assert the success state
- See `human-simulation-testing` for which personas × this journey to also cover (typically: first-time, distracted, slow-network, malicious)
- Don't write 20 E2E tests for one feature; one solid smoke test plus persona-specific extensions

### 10. Human simulation matrix update
- Open `testing/human-simulation-matrix.md`
- Add a column for this feature
- Mark each persona × this feature as Pass / Gap / Fail (initially mostly Gap)
- This becomes the test-coverage backlog for the feature; close gaps over the next sprint
- See `human-simulation-testing` for the persona definitions

### 11. Analytics / telemetry events
- For any feature touching revenue, signup, conversion, or admin action: fire the canonical events from `analytics-event-map`
- At minimum: `feature_used` with `{ feature_id: '[feature]', user_id }`
- Revenue events (checkout, subscription, payment_failed) MUST follow the canonical taxonomy
- Wire via the centralized `track()` helper at `services/analytics.ts`, never call provider SDKs directly from components

### 12. PR description
Use this template:

```markdown
## What
[one sentence]

## Why
[link to issue / decision doc]

## Layers touched
- [ ] Firestore collection: `[name]`
- [ ] firestore.rules
- [ ] Types: `types/[name].ts`
- [ ] Service: `services/[name]Service.ts`
- [ ] Hook: `hooks/use[Name].ts`
- [ ] Components: `components/[name]/`
- [ ] Route: `[path]`
- [ ] Tests: [coverage summary]

## Test plan
- [ ] [Manual test 1]
- [ ] [Manual test 2]
- [ ] CI green

## Out of scope
[list anything explicitly deferred]
```

## Run the scaffold

When invoked, this skill:
1. Asks for the feature name and one-line purpose
2. Asks: is this user-facing, admin-only, or backend-only?
3. Generates each of the 12 files (or stubs) at the right paths (Stack A) — or fewer for other stacks per the reduced path below
4. Updates `firestore.rules` in place with the new collection block
5. Updates the central router
6. Outputs the PR description template ready to paste

## Reduced path for non-Stack-A repos

The 12-layer scaffold above assumes Firestore + Firebase Auth + Sentry. For other stacks, drop the Firebase-specific layers and substitute equivalents.

### Stack B — Next.js / Hono / Express (no Firebase)

Skip layers 1, 2, 4 (Firestore/rules-specific). Replace with:
- **1'. Database table/model**: Prisma schema entry, Drizzle table, or Supabase migration. Use migrations, not manual schema edits.
- **2'. Authz check**: Next.js middleware or Hono/Express route guard. NOT Firestore rules.
- **4'. Service layer**: same intent as Stack A, but the data boundary uses your DB client (Prisma, Drizzle, Supabase) instead of Firestore. Wrap errors in Sentry.

Layers 3, 5, 6, 7, 8, 9, 10, 11, 12 apply unchanged.

### Stack C — HTML/static

Most layers don't apply — there's no router, no service, no DB. Reduced to:
- **3'. Page (HTML file)**: add to root or a subfolder
- **7'. Link from home/nav**: add href
- **9'. Smoke test**: one Lighthouse run + linkinator pass
- **11'. Analytics event**: outbound link tracking if revenue-related (e.g., theproductionshelf → Payhip)
- **12'. PR description**: same template, scoped to the change

Skip layers 1, 2, 4, 5, 6, 8, 10. There's nothing to scaffold.

### Stack D — PHP/WordPress

Don't use this skill. Stack D in this portfolio is the WordPress backup repo, which has no "features" to scaffold.

### Stack E — JS automation

If adding a new automation script:
- **3'. Types**: optional, only if you have TS configured
- **4'. Script**: the cron-driven file under `scripts/`
- **8'. Smoke test**: dry-run with a fixture, snapshot the output structure
- **9'. Workflow update**: add to `.github/workflows/[name].yml` with a cron schedule
- **11'. Telemetry**: log success/failure rate to Sentry or a webhook
- **12'. PR description**: same template

Skip layers 1, 2, 5, 6, 7, 10. There's no UI or DB.

## Common mistakes

1. **Skipping the service layer** — components fetch directly from Firestore, coupling UI to data. When you swap backends, you re-write the UI. Always go through a service.
2. **No types file** — duck-typed objects flow through hooks and components, then break silently in production.
3. **Missing rules update** — feature works in dev (rules in test mode) and 403s in prod. Always update `firestore.rules` in the same PR.
4. **One mega-PR** — feature with 30 files, no review possible. Split: (a) data shape + rules + service, (b) hook + component, (c) route + tests.
5. **Forgetting Sentry tags** — when you debug a prod error, you can't filter by feature. Tag every service-layer error.

## Source of truth in this portfolio

- `~/GitHub/CastHub1/services/` — examples: `talentVerificationService.ts`, `successFeeService.ts`, `unicornService.ts`
- `~/GitHub/CastHub1/hooks/` — example hook patterns
- `~/GitHub/CastHub1/components/` — directory-per-feature convention

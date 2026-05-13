# Reality Casting Scout — Admin Queue Reference

> Schema, decision rules, and admin workflow for the Mythie casting moderation system.

## Firestore collections

### `castingCalls/{slug}`

Public-facing casting listings. Only `publicVisible: true` records surface on the Mythie frontend.

| Field | Type | Source | Notes |
|---|---|---|---|
| `slug` | string | normalise.py | doc id; deterministic from showTitle |
| `showTitle` | string | scrape | display title |
| `network` | string | scrape | "" if unknown |
| `castingCompany` | string | scrape | "" if unknown |
| `description` | string | scrape | full body |
| `applyUrl` | string | scrape | preferred over sourceUrl |
| `deadline` | string (ISO date) | normalise | "" if not parseable |
| `location` | string | scrape | city/region |
| `pay` | string | normalise | free-form, e.g. "$500/day" |
| `sourceUrl` | string | scrape | original listing URL |
| `sourceTier` | int (0-3) | scrape | 0 = unknown, 1 highest |
| `sourcesSeen` | string[] | normalise | every URL where this slug appeared in this run |
| `tags` | string[] | normalise | genre tags |
| `status` | string | score | `auto_approve` / `pending_admin_review` / `quarantined` / `approved` / `rejected` |
| `decision` | string | score | immutable verdict from scoring |
| `publicVisible` | bool | score / admin | THE gate — only true records render on Mythie |
| `adminApprovalRequired` | bool | score | false only when auto_approve |
| `trustScore` | int (0-100) | score | weighted sum |
| `trustTier` | string | score | high / medium / low / quarantined |
| `trustReasons` | string[] | score | positive signals |
| `redFlags` | string[] | score | matched hard-red-flag patterns |
| `buzzwordsMatched` | string[] | score | matched buzzword patterns |
| `moderatedAt` | string (ISO ts) | score | when decision was made |
| `createdAt` | timestamp | firestore | set once on insert |
| `updatedAt` | timestamp | firestore | server timestamp on every write |
| `lastRunId` | string | upload | links to scout_run_log.jsonl |

### `castingModerationLog/{auto-id}`

Immutable audit trail. Every scoring decision and every admin action appends one doc.

| Field | Type | Notes |
|---|---|---|
| `castingSlug` | string | FK to castingCalls.slug |
| `showTitle` | string | denormalised for log readability |
| `decision` | string | what was decided |
| `trustScore` | int | |
| `trustTier` | string | |
| `trustReasons` | string[] | |
| `redFlags` | string[] | |
| `isNew` | bool | true if this was the first time this slug appeared |
| `loggedAt` | timestamp | server timestamp |
| `runId` | string | groups every doc from a single scout run |
| `actor` | string | `reality-casting-scout` or `admin:<uid>` |

## Decision rules

| Score | Red flag matched | Source class | Decision | publicVisible |
|---|---|---|---|---|
| >= 85 | none | tier 1/2/3 | `auto_approve` | true |
| >= 85 | none | social-only | `pending_admin_review` | false |
| 60-84 | none | any | `pending_admin_review` | false |
| 0-59 | none | any | `pending_admin_review` | false (tier = low) |
| any | one or more | any | `quarantined` | false (permanent) |

Social-only listings have their score capped at 40 regardless of weighted-sum result, so they never trip the >= 85 threshold even if all other signals are perfect.

## Hard red flag patterns

These cause an immediate, permanent quarantine. Score is not even consulted.

```
pay.*fee
admin.*fee
secure your spot
registration.*cost
send.*money
upfront.*payment
headshot.*package.*required
pay to audition
pay.*apply
```

## Buzzword patterns (soft negative)

These deduct points but do not quarantine.

```
once[-\s]in[-\s]a[-\s]lifetime
life[-\s]changing opportunity
guaranteed (?:fame|stardom|exposure)
too good to (?:miss|be true)
exclusive offer just for you
```

## Scoring weights

| Signal | Weight | Direction |
|---|---|---|
| tier 1 domain | +45 | positive |
| tier 2 domain | +30 | positive |
| tier 3 domain | +15 | positive |
| network field populated | +10 | positive |
| casting company named | +8 | positive |
| applyUrl uses https | +5 | positive |
| applyUrl matches source tier | +10 | positive |
| deadline parsed | +5 | positive |
| pay disclosed | +5 | positive |
| description >= 80 chars | +5 | positive |
| buzzword present (per occurrence) | -10 | negative |
| social-only source | -25 | negative |
| corroborated across >= 2 distinct domains | +15 | positive |

Final score is clamped to `[0, 100]`. Social-only sources are then clamped to `[0, 40]`.

## Admin workflow

The admin UI lives at `/admin/casting-review` in the Mythie (CastHub1) app.

1. Admin lands on the queue, sees three tabs: **Pending** (decision == pending_admin_review), **Approved** (status == approved), **Blocked** (status == quarantined or rejected).
2. For each Pending row, admin sees: showTitle, network, castingCompany, description excerpt, applyUrl, trustScore, trustTier, trustReasons, redFlags, source list.
3. **Approve** button → writes `{ status: 'approved', publicVisible: true, approvedBy: uid, approvedAt: serverTs }` to `castingCalls/{slug}` AND appends `{ decision: 'admin_approved', actor: 'admin:<uid>' }` to `castingModerationLog`.
4. **Reject** button → writes `{ status: 'rejected', publicVisible: false, rejectedBy: uid, rejectedAt: serverTs, rejectionReason: <free text> }` AND appends `{ decision: 'admin_rejected', actor: 'admin:<uid>' }` to the log.
5. Quarantined records are visible in the Blocked tab but the Approve action is hidden. Admin can write a note explaining why, but cannot override the quarantine without manually editing the doc — by design.

## Firestore security rules sketch

```
match /castingCalls/{slug} {
  allow read: if resource.data.publicVisible == true
              || (request.auth != null && isAdmin(request.auth));
  allow write: if request.auth != null && isAdmin(request.auth);
}

match /castingModerationLog/{logId} {
  allow read:   if request.auth != null && isAdmin(request.auth);
  allow create: if request.auth != null && isAdmin(request.auth);
  allow update, delete: if false;   // immutable
}
```

(See `firestore-rbac-helpers` skill for `isAdmin()` helper.)

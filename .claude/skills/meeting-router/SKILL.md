---
name: meeting-router
description: >-
  Pull new meeting AI-notes from BOTH Zoom (Zoom for Claude MCP) and Granola
  (Granola MCP) plus signal from Gmail and Slack, then route each to four
  destinations: a local digest under ~/Documents/Claude/Projects/<Project>/meetings/,
  Asana task creates/updates in the matching project, durable decisions into Claude
  memory, and a daily proactive Slack self-DM digest. Use when Andrew says "route my
  meetings", "/meeting-router", "catch up my meeting notes", or as the local twin of
  the daily cloud routine "Meeting Router". Unifies sources, dedupes via a Drive
  manifest, folds the cloud Memory Inbox back into local memory, and PREVIEWS Asana
  writes before creating. Keywords: meeting notes, Zoom AI Companion, Granola, Slack,
  Gmail, transcript, action items, route to projects, Asana tasks, meeting digest.
---

# Meeting Router

Turns meeting/email/Slack signal into routed, actionable records. Built for Andrew
Ward / Toronado Entertainment + 10 Lives Studios. Has a **local** half (this skill,
full fidelity to disk + memory) and a **cloud** half (the daily claude.ai routine
`trig_01TioH7UVpB4U96FxRzYrVec`, which can't touch the Mac so it writes to Drive).

## STEP 0 — Fold the Memory Inbox back in (closes the loop)

The cloud routine appends durable facts it finds to Google Drive **"Memory Inbox.md"**
(id `1bqK6ksilF4pp4YOpIt3NsALjCHNlVwrE`, in the "Meeting Router" folder
`1XBnQs-F8Q5LGADrcocjS0Grj9RO0fTmy`) because it can't write local memory. EVERY local
run starts here: read that file; for each bullet, fold it into the right memory file
(new file or enrichment, deduping against existing). This is the only path cloud-found
facts reach real memory — don't skip it.

**Clear it race-safely — never blanket-truncate.** The cloud routine may append a new
bullet *between* your read and your clear; a blanket "reset to header" would silently
eat it. So: remember the exact bullet lines you read, then **re-read the file right
before clearing** and write back the header **plus any lines that appeared after your
snapshot** (fold those on the next run). Only delete bullets you actually folded.

## Sources (pull all each run)

**Lookback window (bound every pull).** Default `from` = the Drive manifest's `last_run`
minus 1 day (overlap absorbs DST/timezone edges); `to` = now. If `last_run` is missing
or older than 14 days, cap `from` at **14 days ago** so a stale gap can't trigger an
unbounded back-scan. The manifest's `routed` map dedups inside the window, so the 1-day
overlap re-checks but never re-routes. Stamp `last_run` only after the run completes.

1. **Zoom AI Companion** (`Zoom for Claude` MCP) — `search_meetings(from,to)` (know the
   timezone first: Andrew = US Central). Routable only if `has_summary`/`has_transcript`
   is true AND the matching `*_permission` is true; non-host attendee meetings return
   `has_summary_permission:false` — **skip + note**, don't fail. `get_meeting_assets`
   payloads are huge and spill to a file; read `meeting_summary.summary_plain_text` via
   jq. Do NOT read full transcripts unless asked for verbatim quotes.
2. **Granola** (`Granola` MCP) — often sparse (most calls are on Zoom; phone capture =
   Granola iOS app → same account). Empty is normal.
3. **Gmail** (work account andrew@10livescontent.com) — for task reconciliation +
   memory. Snippets only; **never `get_thread`** broadly (signatures blow context).
4. **Slack** (`10livesstudios`; Andrew `U086753QLQ6`) — `#tribeca` + active DMs/huddles.
   Snippets only; never expand threads. See [[reference-slack-workspace]].

## Dedup manifest — Drive is the SINGLE SOURCE OF TRUTH

Canonical ledger: Google Drive **"Meeting Router"/manifest.json** (id
`1iUzzkVL5lCBGAnYYvpeyeXotAHJaqcXu`). The cloud routine reads/writes only this. The
local run MUST also read this Drive manifest (not a separate local file) so the two
halves never double-route the same meeting. Skip any meeting id whose entry is fully
`routed`. (A local `~/Documents/Claude/Projects/.meeting-router/manifest.json` may exist
as a cache, but Drive wins on conflict.)

**Write-after-confirm (idempotency).** Add a meeting to the manifest only **after every
destination for it has succeeded** — never before. If a destination fails mid-run (Asana
5xx, connector drop), record the entry as `"status":"partial"` listing which
`destinations` completed; the next run reads `partial`, **skips the done destinations,
and finishes only the rest** — so a failure never strands a meeting as silently-routed
with no tasks, and a retry never double-creates. A meeting flips to fully routed (drop
`status` or set `"complete"`) only once all four destinations confirm.

## Routing map (topic / attendees → destinations)

| Meeting signal | Local folder | Asana project (gid) |
|---|---|---|
| Tribeca, Frampton premiere, producer seats, Katy Perry premiere | `Peter Frampton` | Tribeca 2026 Events `1209401875489995` |
| Frampton edit / post / doc cut | `Peter Frampton` | Frampton - Post Production `1209118453418298` |
| Hilary Duff (doc, budget, production) | `Toronado Entertainment` | Hilary Duff- Production `1214641273093737` |
| Katy Perry production/post | `Peter Frampton` | Katy Perry - Production `1209928249716268` |
| Staff Meeting, 10L ops, intern sync, decks | `Toronado Entertainment` | 10L - General Ops `1209042688644777` |
| Mythie / CastHub app, casting, scout | `CastHub` | 🚀 Mythie `1215081481096861` |
| ARTAS, awards, SMS/Telnyx | `ARTAS` | 🚀 ARTAS `1215081481096875` |
| Anything unmatched | `Toronado Entertainment` | Daily Triage Inbox (Andrew) `1215081481105339` |

A meeting may fan out across projects. Refresh the map with Asana `get_projects` +
`ls ~/Documents/Claude/Projects`.

**Pre-flight the gids (they drift).** Before routing, confirm each target project gid
still resolves (one Asana `get_projects` / `get_project` call, cached for the run). If a
gid 404s — project renamed or archived — **do not let the route vanish silently**: fall
back to the Daily Triage Inbox `1215081481105339`, and flag `⚠️ stale gid <gid> (<label>)`
in the run report so the map can be fixed.

## The destinations

### 1. Local digest file
`~/Documents/Claude/Projects/<Project>/meetings/YYYY-MM-DD-<slug>.md` — Quick recap,
Decisions, Action items (by owner), Topics. Safe/routine — write without asking.

### 2. Asana — **DEDUP, then create; PREVIEW on first run of a session**
Before creating tasks, fetch Andrew's existing OPEN tasks in the target project
(`search_tasks` assignee me, completed false). If an action item closely matches an
existing open task (**recurring meetings repeat the same items weekly**), do NOT create
a duplicate — add a brief comment with the new context instead. Otherwise create the
task assigned to Andrew (per [[reference-meeting-router]]: all tasks → Andrew so he
triages). Put meeting topic + date + a link to the digest in notes. First Asana write of
a session gets a preview/approval; once approved, batch the rest.

**Infer `due_on` — but only from explicit signal, never a guess.** If the action item
carries a concrete date ("by Friday", "before the Tribeca premiere", "EOD Tuesday",
"June 4"), resolve it against the meeting date (US Central) and set Asana `due_on`.
Relative weekdays resolve to the next such day after the meeting. Anchor phrases like
"before the premiere" resolve to a date only if it's in the routing context (e.g. a
known premiere date in memory); otherwise leave undated. **No date stated → no `due_on`**
— never invent one. Surface inferred due dates in the preview so Andrew can veto.

### 3. Memory (durable decisions only)
Write a memory file for DECISIONS / new partner-vendor-contact+role / commitments /
budgets / stated preferences. **NEVER write passwords, 2FA codes, or full card/bank
numbers** — redact to "(credential in password manager)". Skip pure logistics. Add the
MEMORY.md pointer.

### 4. Proactive digest (the cloud routine does this daily)
A Slack self-DM to `U086753QLQ6` summarizing the run (or a ⚠️ failure line if a
connector was down). Locally, just give Andrew the run report inline.

## Run report (always end with this)
```
Routed N (Zoom x / Granola y) | Skipped z (no-permission) | Memory Inbox folded: k
Asana: a created, b deduped-to-comment, c email/slack updates | Memory: d facts
Manifest (Drive) updated. Next cloud run: daily 7am Central.
```

## Operator runbook

- **Re-run / catch up:** "route my meetings" → does STEP 0 + full local pass; safe to
  run anytime (Drive manifest prevents double-routing).
- **Cloud routine failed (got a ⚠️ Slack DM):** run locally; the missing connector
  works in a live session. Inspect at https://claude.ai/code/routines/trig_01TioH7UVpB4U96FxRzYrVec
- **Memory feels stale:** run locally — STEP 0 folds the Drive Memory Inbox in.
- **DST drift (KNOWN):** cron is fixed UTC `0 12 * * *` = 7am Central in summer, **6am
  after US DST ends (early Nov)**. To hold 7am, update the cron to `0 13 * * *` in November.
- **Routing wrong:** edit the map table above + the gids in the cloud routine prompt.
- **Add a source:** add the connector to the routine (`RemoteTrigger` update) + a sweep
  step; mirror here.

## Safety
- Drive manifest is canonical — never double-route.
- Never put secrets in memory or digests.
- Skip (don't fail) permission-denied meetings.
- Honor [[autonomy-for-portfolio-work]]: local-folder + manifest writes are act-first;
  Asana + memory writes get the preview/dedup gate.

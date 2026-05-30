---
name: meeting-router
description: >-
  Pull new meeting AI-notes from BOTH Zoom (Zoom for Claude MCP) and Granola
  (Granola MCP), then route each meeting to three destinations: a local digest
  file under ~/Documents/Claude/Projects/<Project>/meetings/, Asana tasks for
  the action items in the matching Asana project, and durable decisions into
  Claude memory. Use when Andrew says "route my meetings", "/meeting-router",
  "catch up my meeting notes", "pull yesterday's meetings into projects", or as
  the body of the daily meeting-router routine. Unifies Zoom + Granola into one
  pass, dedupes via a manifest, and PREVIEWS Asana writes before creating them.
  Keywords: meeting notes, Zoom AI Companion, Granola, transcript, action items,
  route to projects, Asana tasks, meeting digest, standup, catch-up.
---

# Meeting Router

Single pass that turns meeting AI-notes into routed, actionable records across
three destinations. Built for Andrew Ward / Toronado Entertainment + 10 Lives
Studios.

## Sources (pull BOTH every run)

1. **Zoom AI Companion** — via the `Zoom for Claude` MCP.
   - `search_meetings(from, to)` to list meetings in the window. **You must know
     the timezone first** — Andrew is US Central (America/Chicago); convert his
     local window to UTC for the `from`/`to` args.
   - A meeting is routable only if `has_transcript: true` OR `has_summary: true`
     AND `has_summary_permission: true` / `has_transcript_permission: true`.
     Meetings where Andrew is a non-host attendee usually return
     `has_summary_permission: false` — **skip them and note them as "host-owned,
     not accessible"** rather than failing.
   - `get_meeting_assets(meeting_uuid)` returns the full payload. It is often
     huge (100K–250K chars) and gets spilled to a tool-results file. Read the
     summary with `jq -r '.meeting_summary.summary_plain_text'` and the action
     items from the same `summary_plain_text` (Zoom pre-splits "Next steps" by
     owner). Do NOT read the entire transcript unless asked for verbatim quotes.

2. **Granola** — via the `Granola` MCP.
   - `list_meetings(time_range)` or `query_granola_meetings` for the window, then
     `get_meeting_transcript` / `get_meetings` for content.
   - Granola is frequently sparse (Andrew runs most calls on Zoom). Empty is
     normal — report "0 from Granola" and move on, don't treat as an error.

## Dedup manifest (read FIRST, write LAST)

`~/Documents/Claude/Projects/.meeting-router/manifest.json`
```json
{ "routed": { "<meeting_uuid_or_granola_id>": { "topic": "...", "date": "...", "destinations": ["frampton-folder","asana:tribeca","memory"] } } }
```
Skip any meeting whose id is already in `routed`. After a successful route, add
it. If the file is missing, treat as empty and create it.

## Routing map (topic / attendees → destinations)

Classify each meeting by topic + attendee list. The map below is the current
truth; when a meeting clearly fits none, route action items to the Asana
**Daily Triage Inbox (Andrew)** (`1215081481105339`) and write the digest to
`Toronado Entertainment/` so nothing is lost.

| Meeting signal | Local folder | Asana project (gid) |
|---|---|---|
| Tribeca, Frampton premiere, producer seats, Katy Perry premiere | `Peter Frampton` | Tribeca 2026 Events and Hospitality `1209401875489995` |
| Frampton edit / post / doc cut | `Peter Frampton` | Frampton - Post Production `1209118453418298` |
| Hilary Duff (doc, budget, production) | `Toronado Entertainment` | Hilary Duff- Production `1214641273093737` |
| Katy Perry production/post | `Peter Frampton` | Katy Perry - Production `1209928249716268` |
| Staff Meeting, 10L ops, intern sync, decks | `Toronado Entertainment` | 10L - General Ops `1209042688644777` |
| Mythie / CastHub app, casting, scout | `CastHub` | 🚀 Mythie `1215081481096861` |
| ARTAS, awards, SMS/Telnyx | `ARTAS` | 🚀 ARTAS `1215081481096875` |
| Awards submission app | `Awards Submission App` | (Daily Triage Inbox catch-all) |
| Anything unmatched | `Toronado Entertainment` | Daily Triage Inbox (Andrew) `1215081481105339` |

A meeting may fan out to MORE than one Asana project (the Tribeca call touched
Frampton + Katy Perry + Hilary Duff). Put each action item under the project its
text implies; default the rest to the meeting's primary project.

To refresh the map, run `get_projects` (Asana) + `ls ~/Documents/Claude/Projects`.

## Owner → Asana assignee mapping

Zoom splits "Next steps" under owner names. Map names to Asana users via
`get_users` once, cache mentally for the run. Known: Andrew Ward, Daniel
Catullo, Madelyn Catullo, Leslie Atkins, Steve Moss, Lauren Gunn, Wyatt Kassin,
Meredith Turner. If a name can't be resolved, create the task **unassigned** and
note it — never guess an assignee.

## The three destinations

### 1. Local digest file
`~/Documents/Claude/Projects/<Project>/meetings/YYYY-MM-DD-<slug>.md`
```markdown
# <Topic> — <YYYY-MM-DD>
Source: Zoom AI Companion | Attendees: ... | uuid: ...

## Quick recap
<summary recap paragraph>

## Decisions
- <durable decision>

## Action items
- [ ] (Owner) <item>  → Asana: <project> #<task gid once created>

## Topics
<topic-by-topic summary>
```
This write is safe/routine — do it without asking.

### 2. Asana tasks  — **PREVIEW BEFORE CREATING**
Action items become tasks via `create_tasks`. Because these are team-visible,
on the FIRST run of a session present a compact preview table (item · owner ·
project) and get a go-ahead before writing. Once Andrew approves the pattern in
a session, batch the rest. Always:
- Put the meeting topic + date in the task `notes` and a link back to the local
  digest file.
- Set `assignee` from the owner map; leave unassigned if unresolved.
- Do NOT duplicate a task that already exists in the manifest for that meeting.

### 3. Memory (durable decisions only)
Only DECISIONS and durable context go to memory — never raw task lists. Write a
`project`-type memory file when a meeting locks a decision that future sessions
need (budget approved, vendor chosen, launch date set, scope changed). Add the
one-line pointer to `MEMORY.md`. Skip meetings that produced only logistics.

## Run report (always end with this)
```
Routed N meetings (Zoom: x, Granola: y) | Skipped: z (host-owned/no-permission)
- <topic> → folder ✓ · Asana <project> (k tasks) · memory ✓/—
Manifest updated. Next run picks up after <last meeting date>.
```

## Safety
- Never create Asana tasks without the first-run preview/approval.
- Never write a memory file for pure logistics.
- Skip, don't fail, on permission-denied meetings.
- Honor [[autonomy-for-portfolio-work]]: local-folder + manifest writes are act-
  first; Asana + memory writes get the preview gate.

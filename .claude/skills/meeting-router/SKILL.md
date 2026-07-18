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

## STEP 0 — Fold cloud-found memory in (closes the loop)

**The claude.ai Google Drive connector is CREATE-ONLY** — it can make new files but has
no update / append / delete (confirmed: the only Drive write tool exposed is
`create_file`). So the cloud routine CANNOT write or clear the canonical
"Memory Inbox.md"; instead it drops durable facts into dated
**`memory-append-YYYY-MM-DD.md`** files in the "Meeting Router" folder
(`1XBnQs-F8Q5LGADrcocjS0Grj9RO0fTmy`). Those append files are the cloud→local memory
bridge and the ONLY path cloud-found facts reach real memory — don't skip this.

EVERY local run starts here:
1. List `memory-append-*.md` **plus any legacy `Memory Inbox.md` variants** — there are
   several orphan copies (the canonical id `1bqK6ksilF4pp4YOpIt3NsALjCHNlVwrE` is an empty
   seed; the real facts live in `1Q35…`, `1zmI…`, and the `memory-append-*` files). Fold
   them all once.
2. Read the newest `memory-folded-through-YYYY-MM-DD.marker` sidecar (if any) — it records
   the latest date already folded. Skip append files dated ≤ that marker.
3. Fold each remaining bullet into the right local memory file (new or enrichment),
   **deduping** — the same fact repeats across days/files (e.g. the Trafalgar
   privacy-policy item appears on both 06-01 and 06-02).
4. **Do NOT try to clear or delete the Drive files — the connector can't, and a failed
   "clear" is exactly how the orphans multiplied.** Instead `create_file` a new
   `memory-folded-through-<today>.marker` (`{"folded_through":"<latest date folded>"}`).
   That tiny pointer is the durable "where I left off"; next run reads it and skips what's
   done. No clearing ever needed.

(A true Drive cleanup — collapsing the orphan Memory Inbox / run-log / manifest / sidecar
copies — needs a real write path: `rclone` or a Drive-API service account on the Mac. See
Operator runbook → "Drive cleanup".)

## Sources (pull all each run)

**Lookback window (bound every pull).** Default `from` = (the newest of the manifest
`last_run` and the newest `routed-*.json` sidecar date) minus 1 day (overlap absorbs
TZ/DST edges); `to` = now. If that anchor is missing or older than 14 days, cap `from` at
**14 days ago** so a stale gap can't trigger an unbounded back-scan. The merged `routed`
map (seed ∪ sidecars) dedups inside the window, so the overlap re-checks but never
re-routes. Because the connector is create-only, `last_run` is never restamped in place —
**the newest sidecar is the de-facto cursor.**

1. **Zoom AI Companion** (`Zoom for Claude` MCP) — `search_meetings(from,to)` (know the
   timezone first: Andrew is **London-based / works Pacific hours** — resolve each
   meeting's times against its own local zone). Routable only if `has_summary`/`has_transcript`
   is true AND the matching `*_permission` is true; non-host attendee meetings return
   `has_summary_permission:false` — **skip + note**, don't fail. `get_meeting_assets`
   payloads are huge and spill to a file; read `meeting_summary.summary_plain_text` via
   jq. Do NOT read full transcripts unless asked for verbatim quotes.
2. **Granola** (`Granola` MCP) — often sparse (most calls are on Zoom; phone capture =
   Granola iOS app → same account). Empty is normal.
3. **Gmail — TWO accounts.** (a) **Work** `andrew@10livescontent.com` (primary; all
   business signal) and (b) **Personal** `andrewpward@gmail.com` (connected as a 2nd
   source 2026-06-30, chiefly to carry the Google Voice text/voicemail stream — see #6).
   Both for task reconciliation + memory. Snippets only; **never `get_thread`** broadly
   (signatures blow context). On the personal account scope to GV mail + clearly-work
   threads; don't fold in personal life.
4. **Slack** (`10livesstudios`; Andrew `U086753QLQ6`) — `#tribeca` + active DMs/huddles.
   Snippets only; never expand threads. See [[reference-slack-workspace]].
5. **iMessage** (`scripts/imessage_pull.py`) — **LOCAL-ONLY** (chat.db is on-device; the
   cloud routine can't see it, so this source only runs on local passes). Reads
   `~/Library/Messages/chat.db` read-only, scoped to a work-contact **allowlist**
   (`~/Documents/Claude/Projects/.meeting-router/imessage-allowlist.json`), and INCLUDES
   group chats where any allowlisted coworker is a participant. Run:
   `python3 scripts/imessage_pull.py --allowlist <path> --since <last_run>` → JSON of
   chats+messages on stdout; extract task/fact signal from that and route like Gmail/Slack
   (preview before Asana). Needs **Full Disk Access** for Terminal (script prints the fix
   if missing). Privacy note: including coworker GROUP chats means non-coworker members'
   messages in those threads are also read — the allowlist is the only scoping control,
   so keep it tight. See [[reference-google-voice-line]] for the separate GV text stream.
6. **Google Voice** (number **913-963-2282**, on personal `andrewpward@gmail.com`; a 2nd
   GV number 213-425-4930 also exists on the account). Captured by reading the **personal
   Gmail source (#3b) directly** — GV emails texts + voicemails (with transcripts) into
   andrewpward@gmail.com via its own "Forward messages to email" / "Get voicemail via
   email" settings (both were found OFF and re-enabled 2026-06-30 — that was the break;
   GV signal had reached the pipeline for months). Match GV mail in that account on
   `from:(voice-noreply@google.com OR txt.voice.google.com)`. The real sender + body are
   inside the email (the `From` is Google). (Prior design auto-forwarded GV mail to the
   work account via a Gmail filter — replaced by reading the personal account directly so
   nothing depends on a fragile forward.) See [[reference-google-voice-line]].

## Dedup manifest — Drive is the SINGLE SOURCE OF TRUTH

Canonical ledger: Google Drive **"Meeting Router"/manifest.json** (id
`1iUzzkVL5lCBGAnYYvpeyeXotAHJaqcXu`). The cloud routine reads/writes only this. The
local run MUST also read this Drive manifest (not a separate local file) so the two
halves never double-route the same meeting. Skip any meeting id whose entry is fully
`routed`. (A local `~/Documents/Claude/Projects/.meeting-router/manifest.json` may exist
as a cache, but Drive wins on conflict.)

**KNOWN: the local Drive connector cannot UPDATE files in place.** The claude.ai Google
Drive connector exposes `create_file` (new file, new id) but no `files.update`, and the
cloud reads the manifest by fixed id — so a local run **cannot rewrite manifest.json**.
Local→cloud handoff therefore mirrors the Memory Inbox bridge in reverse, via a
**sidecar**:

- After a local run finishes routing, `create_file` a NEW file
  **`routed-YYYY-MM-DD.json`** in the Meeting Router folder
  (`1XBnQs-F8Q5LGADrcocjS0Grj9RO0fTmy`), `contentMimeType: application/json`,
  `disableConversionToGoogleType: true`. Body: `{ "local_run": "<date>", "routed": {
  "<meeting id>": {topic,date,source}, ... } }` — every id this run sent to its
  destinations. Also update the local cache manifest (above).
- The **cloud routine folds sidecars in** (see its prompt): on each cloud run it lists
  `routed-*.json` and merges their `routed` maps into its IN-MEMORY dedup set. It cannot
  rewrite `manifest.json` or delete the sidecars (create-only), so **the sidecars are
  never deleted — they ARE the append-only ledger.** Effective dedup set each run = the
  seed `manifest.json` ∪ every `routed-*.json` sidecar; effective `last_run` = the newest
  sidecar date (the frozen `manifest.json.last_run` is only the floor). A locally-routed
  meeting is in the dedup set the moment its sidecar exists, and never double-routes.
- Backstop if a sidecar is ever missed: the cloud routine's Asana-level dedup
  comment-skips on the already-created tasks rather than duplicating them.

**Write-after-confirm (idempotency).** Add a meeting to the manifest only **after every
destination for it has succeeded** — never before. If a destination fails mid-run (Asana
5xx, connector drop), record the entry as `"status":"partial"` listing which
`destinations` completed; the next run reads `partial`, **skips the done destinations,
and finishes only the rest** — so a failure never strands a meeting as silently-routed
with no tasks, and a retry never double-creates. A meeting flips to fully routed (drop
`status` or set `"complete"`) only once all four destinations confirm.

**Terminal skip — never defer a meeting you cannot access.** A meeting is *unroutable*
(terminal), not *pending* (retry), when `has_summary_permission` is false (Andrew was not
the host) OR both `has_summary` and `has_transcript` are false. `has_recording:true` does
**not** mean a summary is still generating — a non-host recording will never expose a
summary to this account, so retrying it daily is a bug. Write such a meeting to the
manifest **immediately** as `"status":"skipped"` with a one-line `reason` (e.g.
`non-host-no-summary`); that is a terminal dedup state and is never re-evaluated or
deferred on later runs. Only a genuine still-generating case — host meeting,
`has_summary_permission:true`, summary not yet ready — may defer, and **cap it at 2
attempts**, then flip to `"status":"skipped"`, `reason:"summary-never-arrived"`. These
count under **Skipped** in the digest, never "Deferred (attempt N)".

## Routing map (topic / attendees → destinations)

**Read `project-registry.json` (Drive id `1oHL9FLPUr1iaNgnTmqxvTifGLofs6ouW`) at run
start and attribute against its `projects[].aliases` + `learned_aliases` (learned wins on
conflict) — the SAME canonical map the cloud routine uses.** The table below is a
deliberately-abbreviated FALLBACK for when that file is unreadable; the registry carries
the full set (incl. 4000 Days, Hollywood Vampires, Godsmack, Verzuz, WVU, Trip of a
Lifetime, J Balvin). Registry is source of truth — keep the two in sync, don't let them
drift.

| Meeting signal | Local folder | Asana project (gid) |
|---|---|---|
| Tribeca, Frampton premiere, producer seats, Katy Perry premiere | `Peter Frampton` | Tribeca 2026 Events `1209401875489995` |
| Frampton edit / post / doc cut | `Peter Frampton` | Frampton - Post Production `1209118453418298` |
| Hilary Duff (doc, budget, production) | `Toronado Entertainment` | Hilary Duff- Production `1214641273093737` |
| Katy Perry production/post | `Peter Frampton` | Katy Perry - Production `1209928249716268` |
| Staff Meeting, 10L ops, intern sync, decks | `Toronado Entertainment` | 10L - General Ops `1209042688644777` |
| Mythie / CastHub app, casting, scout | `CastHub` | 🚀 Mythie `1215081481096861` |
| ARTAS, awards, SMS/Telnyx | `ARTAS` | 🚀 ARTAS `1215081481096875` |
| Anything unmatched | `Toronado Entertainment` | Daily Triage Inbox (Andrew) `1215081481105343` |

> ⚠️ **gid `1215081481105339` is BacklotHub — NOT a 10L bucket; never route there** (the
> registry flags it `never_use`). Unmatched items go to Daily Triage `1215081481105343`.

A meeting may fan out across projects. Refresh the map with Asana `get_projects` +
`ls ~/Documents/Claude/Projects`.

**Pre-flight the gids (they drift).** Before routing, confirm each target project gid
still resolves (one Asana `get_projects` / `get_project` call, cached for the run). If a
gid 404s — project renamed or archived — **do not let the route vanish silently**: fall
back to the Daily Triage Inbox `1215081481105343`, and flag `⚠️ stale gid <gid> (<label>)`
in the run report so the map can be fixed.

## The destinations

### 1. Local digest file
`~/Documents/Claude/Projects/<Project>/meetings/YYYY-MM-DD-<slug>.md` — Quick recap,
Decisions, Action items (by owner), Topics. Safe/routine — write without asking.

### 2. Asana — **DEDUP (two-stage, bias to MERGE); PREVIEW on first run of a session**
Andrew would rather one task gather context than see two near-identical tasks, so dedup
is **deterministic-first, then semantic, and merges when uncertain**:

**Stage 1 — stable key (deterministic).** Derive `mt-key = "<project-gid>:<3–6 word
normalized core deliverable>"` — lowercase, **strip dates, filenames, filler, and owner
names; key on the verb + object only** (e.g. `confirm-camera-imag-sync`,
`approve-ak-press-tip-sheet`). The SAME underlying ask MUST produce the SAME key on any
day, no matter how that day's meeting phrased it — this is the fix for "two meetings about
one thing → two tasks." Search the target project's open AND recently-completed (≤32d)
tasks for that exact tag (`search_tasks` text `[mt-key: <slug>]`); on a hit, **comment**
the new context instead of creating.

**Stage 2 — semantic (catches paraphrases AND your own manual tasks).** The `[mt-key:]`
tag only lives on tasks the routine created — **a task Andrew (or a teammate) makes by
hand has no tag, so Stage 1 can't see it.** So before it creates OR comments, pull the
target project's **FULL current open-task list — every task, not just `assignee me`, and
paginate to the end so nothing is truncated** — plus a text search on the 2–3 strongest
nouns of the action. Match the new item against **all** of them, treating
manually-created / untagged tasks as **first-class dedup targets**. Judge whether it's the
SAME underlying deliverable as any existing task *even if worded differently*; treat
paraphrases, a sub-step of an existing deliverable, and the same deliverable resurfacing on
a later day as **duplicates → comment on the existing task, don't create a parallel one**.
Only create when it's a genuinely DISTINCT deliverable. **When uncertain, MERGE.**

**Recurrence exception.** A truly periodic obligation (weekly status, monthly report)
whose prior instance is completed and whose cadence window (≤8d weekly, ≤32d monthly) has
elapsed IS a new task — create it. Never recreate a task Andrew manually completed/closed.

Stamp every created task's notes with its stable `[mt-key: <slug>]` so future runs match
deterministically. First Asana write of a session gets a preview/approval; once approved,
batch the rest.

All created tasks are assigned to Andrew (per [[reference-meeting-router]]: all tasks →
Andrew so he triages); put meeting topic + date + a digest link in the notes alongside
the `[mt-key:]`.

**Infer `due_on` — but only from explicit signal, never a guess.** If the action item
carries a concrete date ("by Friday", "before the Tribeca premiere", "EOD Tuesday",
"June 4"), resolve it against the meeting's own local date and set Asana `due_on`.
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
Local cache + Drive sidecar written (cloud folds into dedup set next run).
memory-folded-through marker written. Next cloud run: daily 7am London.
```

## Operator runbook

- **Re-run / catch up:** "route my meetings" → does STEP 0 + full local pass; safe to
  run anytime (Drive manifest prevents double-routing).
- **Cloud routine failed (got a ⚠️ Slack DM):** run locally; the missing connector
  works in a live session. Inspect at https://claude.ai/code/routines/trig_01TioH7UVpB4U96FxRzYrVec
- **Memory feels stale:** run locally — STEP 0 folds the Drive Memory Inbox in.
- **Cron / DST (KNOWN):** live cron is `0 6 * * *` **UTC** = **7am London during BST**
  (summer) and **6am London after UK clocks fall back (late Oct)**. To hold 7am
  year-round, change the cron to `0 7 * * *` for the GMT months. (The old "7am US Central
  / `0 12`" note was v1 cruft — the routine anchors to London now.)
- **Drive cleanup (orphan files):** the connector is create-only, so orphan copies
  (`manifest.json`×2, `Memory Inbox.md`×3, `run-log.md`×3, old sidecars) can't be deleted
  in-session. To actually collapse them, use `rclone` (`rclone delete`/`rclone deletefile`
  on the Mac) or a Drive-API service account. Until then they're harmless (dedup folds are
  idempotent) but they accumulate — schedule a periodic rclone sweep.
- **Local reconcile is stale:** if the canonical Memory Inbox is still the empty seed or
  the newest `memory-folded-through-*.marker` is several days old, durable facts are
  stranded in Drive and not in local memory — run locally to fold (STEP 0).
- **Routing wrong:** edit the map table above + the gids in the cloud routine prompt.
- **Add a source:** add the connector to the routine (`RemoteTrigger` update) + a sweep
  step; mirror here.

## Safety
- Drive manifest is canonical — never double-route.
- Never put secrets in memory or digests.
- Skip (don't fail) permission-denied meetings.
- Honor [[autonomy-for-portfolio-work]]: local-folder + manifest writes are act-first;
  Asana + memory writes get the preview/dedup gate.

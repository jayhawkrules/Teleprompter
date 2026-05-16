---
name: gamified-quiz-design
description: Use when building, auditing, or upgrading any personality / archetype / onboarding quiz across the portfolio (Mythie Reality DNA, future Aclamos voter taste, BacklotHub crew-fit). Captures the doctrine that turns a "100-question form" into a sharable game-loop product. Eight pillars - cascade-reveal (never end-of-quiz dump), branded-asset pipeline (illustration > emoji, video > static, real > generic), share-back loop (the viral mechanic), replay-bait (track result drift over time + compare to past self), social proof (cohort breakdown, rare-archetype signal), post-result discovery (rival / ally / complement next-step), daily micro-loop (one question a day to refine), and progression-not-completion (every screen pays off, no "finish to see your reward"). Triggers - "gamify the quiz", "make the quiz more fun", "the result feels flat", "share-back loop", "archetype reveal", "quiz feels like a form", "use our branded images / videos for the quiz", "quiz pre-launch audit". Distinct from `ui-design-web-apps` (general UI grammar) and `premium-product-demo` (one-shot demo visuals) - this is specifically the game-loop layer on TOP of a question/answer surface.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Grep, Glob, Bash]
---

# gamified-quiz-design — the game-loop layer on top of a quiz

> **The frame.** A quiz is a sequence of questions. A *gamified quiz* is a product. Same screens, but every interaction is a moment that pays off and every result is a node in a social graph. The difference between "I took a quiz" and "I sent this quiz to 4 people" lives in 8 specific decisions captured below.

Always load `safe-edit-policy` first. Composes with `ui-design-web-apps` (visual grammar), `premium-product-demo` (when you're building a marketing-side demo of the reveal moment), `analytics-event-map` (every pillar below needs its event), `asset-aware-creative-pipeline` (the branded-asset doctrine), `video-export-remotion` (the reveal video).

## When to invoke

- Building a new quiz / archetype / onboarding flow from scratch (compose all 8 pillars from day one)
- Auditing an existing quiz that "feels flat" (probably has the questions, missing pillars 3–7)
- The user says variants of "gamify it", "make it more fun", "use our branded images", "the result feels flat", "the share rate is low"
- Pre-launch QA pass on any personality / archetype / onboarding product
- A new product wants a quiz at the top of the funnel (lead capture, onboarding, talent discovery)

## When NOT to invoke

- Pure form fills (checkout, settings, account info) — those are forms, not quizzes; don't gamify them
- Internal tools / admin queues — staff don't need archetype reveals
- A/B tests where one variant is intentionally vanilla
- The quiz is shipping in 24h and you don't have brand assets — pillars 2 + 7 will land empty; defer

---

## The 8 pillars

### Pillar 1 — Cascade reveal (never end-of-quiz dump)

**Anti-pattern.** Quiz → "Calculating…" → big card with your result.

**Right pattern.** Each milestone reveals ONE thing. By the time the user sees their full archetype card, they've seen 6 small reveals and earned each one:

| Milestone | What reveals |
|---|---|
| Q1–Q5 | "I see what you are…" — vague but personal teaser ("You answer fast under pressure") |
| Q10 | First trait, named — *"Direct. We see you."* Card flips, badge unlocks, sound effect |
| Q25 | A second adjacent trait + early candidate archetypes ("you're trending toward Strategist OR Wildcard") |
| Q50 | A "if you stopped now, you'd be X" preview + the keep-going hook ("but 50 more questions and the picture sharpens") |
| Q75 | Archetype locked + one rival archetype shown ("your kryptonite is The Sweetheart's likability") |
| Q100 | Full reveal with paragraph + video + ally / rival / complement chips |

**Why it works.** Variable-ratio reward schedule. The Skinner box is the moment of named recognition, not the final card. Players who quit at Q50 still got 3 reveals; they share THOSE.

**Failure mode.** Tempting to gate all reveals behind paywall. Don't — paywall the depth (the paragraph, the share asset, the producer-side trait breakdown), not the basic archetype name.

### Pillar 2 — Branded-asset pipeline (illustration > emoji, video > static, real > generic)

The result card is the moment the brand is most visible — it's what gets screenshotted and shared. If the result is *"🦄 You are The Strategist (text-only)"*, you've lost the shot.

**Required assets per archetype, in priority order:**

1. **Vertical 9:16 illustration** (1080×1920) — the share-card hero. Branded, distinctive, talent-can-screenshot-and-paste-on-their-IG-story without editing. Style coherent across all archetypes (same illustrator, same palette range). This is the single highest-leverage asset.
2. **Horizontal 16:9 illustration** (1920×1080) — for the in-app reveal card + OG image when shared as a link.
3. **Square 1:1 illustration** (1080×1080) — feed-post variant.
4. **Animated reveal video** (5–8s, MP4 + GIF, vertical 9:16) — Remotion composition that animates from "?" to the archetype name with a particle/glow effect. This is the TikTok/Reels asset.
5. **Archetype color token** (already exists in `personalityArchetypes.ts.chipCls`) — every other asset honors this palette.
6. **One sentence of voice copy per archetype** — already exists as `oneLiner`; use as the share-card headline.

**The asset manifest pattern** (per `asset-aware-creative-pipeline` skill):

```ts
// services/archetypeAssets.ts
export const ARCHETYPE_ASSETS: Record<ArchetypeId, ArchetypeAssetBundle> = {
    villain: {
        illustrationVertical:   '/assets/archetypes/villain-9x16.png',
        illustrationHorizontal: '/assets/archetypes/villain-16x9.png',
        illustrationSquare:     '/assets/archetypes/villain-1x1.png',
        revealVideoMp4:         '/assets/archetypes/villain-reveal.mp4',
        revealVideoGif:         '/assets/archetypes/villain-reveal.gif',
        revealVideoPoster:      '/assets/archetypes/villain-poster.jpg',
    },
    // ... 11 more
};
```

**Validation gate.** A regression test asserts every `ArchetypeId` has a matching `ARCHETYPE_ASSETS` entry with all 6 fields populated AND that each path exists in `public/`. Missing assets fail CI, NOT prod silently.

**The video reveal pipeline** (compose with `video-export-remotion`):
- One Remotion composition per archetype, ~6 seconds
- Stages: `?` glitch (1s) → archetype name fade-in (1.5s) → one-liner type-in (1.5s) → branded outro (1s) → loop hook (1s)
- Auto-exported on build via `remotion render`; outputs land in `public/assets/archetypes/<id>-reveal.{mp4,gif}`
- Cron-friendly: re-render on `personalityArchetypes.ts` content change

**Failure modes — what NOT to do:**

- Don't use AI image gen for shipping assets unless brand has signed off on the specific outputs — the talent screen-grabs become part of the brand. Branded illustration > Midjourney run.
- Don't ship with 5 archetypes done + 7 placeholders. Hold the launch or hide the 7 until all 12 are done. Half-finished brand = unbranded brand.
- Don't put the archetype name in the asset file (`assets/the-strategist.png`) — names change, assets get orphaned. Use the stable `ArchetypeId` (`strategist`) as the filename key.

### Pillar 3 — Share-back loop (the viral mechanic)

The result moment must end with ONE clear action: get someone you know to take it too.

**Mechanic:** *"Send this to a friend and unlock their archetype next to yours — see who you're a natural ally or rival of."*

- Result screen: prominent "share to a friend" CTA (above retake / below paragraph). Pre-fills a message: *"Took this. Apparently I'm a Wildcard. Take it and we'll see what you are: <link>"*. One-tap to Messages / Whatsapp / Twitter / copy-link.
- Sharer's link carries a `?from=<archetypeId>` param.
- Recipient lands on a primed landing page: *"Your friend is a Wildcard. Find out what you are."* (uses Pillar 2's branded illustration for the friend's archetype as the hero).
- After recipient completes, BOTH parties see a pair-card: *"You and Andrew: Strategist × Wildcard — a chaotic-good combo."* (See Pillar 6 for the pair logic.)
- Persist `inviteSentBy` on the recipient's profile so the original sharer can be notified ("your friend just finished").

**Why one share = many.** Every recipient gets a new "send to YOUR friends" prompt with the same mechanic. The fan-out coefficient should be > 1.0 to trend; pre-fill the share message + the recipient's archetype illustration in the post and you're typically at 1.3–2.1× per branch.

**Failure modes:**

- Don't gate the share. Free + paid users share equally; paywall the depth (paragraph, producer notes), not the social hook.
- Don't make it a generic share button. Generic shares get ~3% CTR. Pre-filled message + archetype-specific image bumps it to 15–30%.
- Don't require the recipient to sign in to see the prime. The "your friend is a Wildcard" landing renders public; sign-in is for taking the quiz.

### Pillar 4 — Replay-bait (track drift, compare to past self)

Most "retake quiz" buttons are dead pixels. Retake is the highest-quality data source you have — a re-tester is engaged. Reward it.

**Mechanic:**
- On every completion, store the full profile snapshot to `personalityHistory/{uid}/{snapshotId}` (already shipping in CastHub1 — keep 3 versions).
- Result card shows *"Last time you took this: 4 months ago, you were The Sweetheart. Now: The Strategist."* with a small delta-arrow chip.
- Annual re-take prompt via email: *"Your reality DNA from a year ago. Take it again — see what's changed."*
- Producer-side (different surface, same data): "talent's archetype has drifted 2x in the last 6 months — read the new room."

**Why it works.** People love the meta-question "have I changed?" The answer is almost always yes (small effects), and the chart is shareable too.

**Failure modes:**

- Don't show drift when N < 2 snapshots. Empty state should tease the future drift, not show a flatline.
- Don't surface day-over-day drift — too much noise. Quarterly is the right grain.

### Pillar 5 — Social proof (cohort breakdown, rare-archetype signal)

Numbers are quiz-content too. "10% of users got this archetype" is a sharable line.

**Mechanic:**
- Backend nightly cron computes archetype distribution across all completions; writes to `archetypeStats/{archetypeId}.percentage`.
- Result card shows *"You're in the rarest 9% of takers"* (for sub-10% archetypes) or *"You and 31% of takers — the most common reading"* (for common ones). Both are share-bait.
- Rare archetype gets a special "Rare" badge in the share asset — costs nothing, drives sharing.

**Why it works.** Rarity = identity-signaling currency. Commonality = "I'm normal, this is fun" sharing. Both directions convert.

**Failure modes:**

- Don't fake the numbers. If you don't have 1000+ completions, hide the stat instead of hardcoding "you're in the top 12%." Users notice the lie.
- Don't show the FULL distribution publicly. Producers see it (talent-pool composition matters); talent only see their own rarity stat. Asymmetric reveal.

### Pillar 6 — Post-result discovery (rival, ally, complement)

The single card with your archetype is a dead-end. The graph of relationships is a product.

**Mechanic, three chips below the result:**
- **Natural ally** — "Sweetheart × Strategist: the season's most-protected alliance"
- **Natural rival** — "Strategist × Wildcard: the season's best villain arc"
- **Surprise complement** — "Strategist × Confessional: the audience-favorite pairing"

Each chip is tappable and goes to a short copy block (1 paragraph) explaining the pairing. Each chip carries a `?pair=<a>-<b>` deep link — sharing the pairing is its own share-back loop.

For each pairing, define this in a single `services/archetypePairings.ts` map — static content, no AI needed.

**Why it works.** Once a user sees the graph, they want to know where their friends sit. That's Pillar 3's traffic source.

**Failure modes:**

- Don't auto-generate pairings via AI — they sound generic. Hand-written one-liner per pairing or skip the pairing entirely.
- 12 archetypes × 12 = 144 pairings is too many to write. Define only the 36 most-shipped (top-3 ally, top-3 rival, top-3 complement per archetype) and surface only the relevant 3.

### Pillar 7 — Daily micro-loop (one question a day refines your profile)

Quizzes that take 20 minutes die at 95% completion. Quizzes that take 2 minutes/day for 50 days have 30%+ retention.

**Mechanic:**
- After initial completion, opt-in to "Daily Question." Push notification / in-app dot.
- One question per day, deepening the profile (resolves ambiguities — between the top-3 candidate archetypes, asks a tie-breaker).
- After 10 daily questions, surface a "your archetype confidence is now 87% vs 64% from the original quiz" stat.
- After 30, offer a "secondary archetype" reveal — the second-most-you. Now there's pair-of-yourself dynamics.

**Why it works.** Habit loop. Each day's question is 15 seconds; the running ROI is enormous (more accurate matching for casting teams; more identity-richness for talent).

**Failure modes:**

- Don't push the prompt at the same time of day for every user. Use last-quiz-completion-hour as the personalised "your question" hour.
- Don't break the streak on a missed day. Reality TV's tone is forgiving — a 3-day-missed shouldn't punish the user back to 0. Keep showing them their progress chart.

### Pillar 8 — Progression-not-completion (every screen pays off; no "finish to see your reward")

The trap: gating every reward behind "complete all 100 questions."

The doctrine: every screen is its own moment. Q7 is its own moment. The bucket transition between OCEAN and attachment is its own moment. The streak chip appearing at Q3 is its own moment.

**Concrete patterns:**

- **AnswerReaction badge** per tap — already shipping in CastHub1 (`AnswerReaction.tsx`). Each tap fires a brand-voice micro-reaction ("ooh, locked in," "controversial — noted") so every interaction lands.
- **Bucket transitions** — already shipping. 1.1s named interstitial when crossing OCEAN → Attachment etc.
- **Streak chip from 3+ in a row** — already shipping.
- **Unicorn stamp every 10th question** — already shipping. Already a milestone reveal — extend it to also land the Pillar-1 cascade reveal.
- **No "Calculating your result…" screen.** The scoring is instant; if Claude is generating the paragraph, stream it. Spinner screens are dignity-destroyers in 2026.

**Failure modes:**

- Don't compound milestone reveals. If Q10 already shows the unicorn stamp + bucket transition + first trait reveal + streak chip, you're stacking 4 moments — the user can only feel 1 at a time. Pick the dominant moment (the first trait reveal) and demote the others to brief acknowledgements.

---

## Stack-conditional sharpening

### Stack A (Vite + React + Firebase — Mythie, future Aclamos quiz)
- `motion/react` is the animation primitive — `MYTHIE_SPRING` exists, use it
- Remotion for video reveals — pre-rendered server-side, served from `public/assets/archetypes/`
- Firestore `archetypeStats/{id}` for cohort breakdown — nightly cron writes
- `personalityHistory/{uid}/{snapshotId}` for replay-bait drift tracking
- `services/archetypeAssets.ts` + regression test asserting every ID has a populated bundle

### Stack B (Next.js — CueHound, Aclamos producer-side)
- Server actions for the share-back fetch (pre-populate recipient landing with sharer's archetype)
- Edge caching for archetype illustrations (immutable assets — long TTL)
- ISR for the `?pair=<a>-<b>` deep-link pages (static-generate on demand)

### Stack C (static HTML — theproductionshelf, awards-marketing)
- Pre-built static result pages per archetype (`/archetype/strategist`)
- No server-side scoring → store the score keys client-side, decode on the result page
- Share-back loop via plain `mailto:` + Twitter intent URLs

---

## Pre-launch checklist (run before any quiz ships publicly)

A quiz that ships without these 12 is going to land flat and you'll be retrofitting them under fire:

- [ ] Every archetype has all 6 assets per Pillar 2 (regression test passes)
- [ ] Result card has cascade reveals across at least 4 milestones (Q10, Q25, Q50, Q100)
- [ ] Result card has a Pillar-3 share-back CTA with pre-filled message
- [ ] Sharer link carries `?from=<archetypeId>` and the landing primes off it
- [ ] Pillar-6 ally/rival/complement chips on the result card
- [ ] At least 36 pairings written (top-3 each direction × 12 archetypes)
- [ ] Pillar-5 cohort stat with N >= 1000 completions OR hidden until that threshold
- [ ] Replay-bait drift surface (Pillar 4) — even if the data is empty
- [ ] Daily-question opt-in surface exists (Pillar 7) — push wiring is acceptable to ship later
- [ ] No "Calculating your result…" spinner screen (Pillar 8)
- [ ] Analytics events fired for every milestone reveal, share click, retake (per `analytics-event-map` skill)
- [ ] OG image + Twitter card meta on the result share-link URLs (Pillar 2 horizontal illustration)

---

## Worked example — applying to Mythie's existing quiz (#447)

Reference state as of 2026-05-16 (CastHub1 PRs #453–#458 shipped):

**Already there (good):**
- 12 archetypes with color tokens + one-liners + Claude-generated paragraphs (Pillar 8 partial)
- AnswerReaction micro-feedback per tap (Pillar 8)
- BucketTransition between dimensions (Pillar 8)
- Unicorn stamp every 10th Q + streak chip from 3+ (Pillar 8)
- Resume-anywhere persistence + welcome-back-after-6h (Pillar 8 retention)
- `personalityHistory` collection capped at 3 versions (Pillar 4 data layer ready)

**Missing (the gap):**
- Cascade reveal (Pillar 1) — all reveal happens at Q100, nothing at Q10/Q25/Q50/Q75
- Branded assets (Pillar 2) — 0 of 6 per archetype; ResultCard.tsx is 63 lines of text-only
- Share-back loop (Pillar 3) — no share CTA at all; retake button is the only action
- Replay-bait (Pillar 4) — data layer exists, no surface in ResultCard
- Social proof (Pillar 5) — no `archetypeStats` collection yet
- Post-result discovery (Pillar 6) — no `archetypePairings.ts`
- Daily micro-loop (Pillar 7) — not started
- Video reveal (Pillar 2 / Remotion) — not started

**Phased PR plan** (per `phased-shipping` skill):

| Phase | PR | What | Andrew-input needed? |
|---|---|---|---|
| 1 | Mechanics: cascade + discovery + replay | Pillars 1, 4, 6 — pure code, no new assets. Cascade-reveal milestones rewired into QuizFlow; ResultCard gets pairing chips + drift chip; `archetypePairings.ts` written | No (uses existing one-liner + color tokens) |
| 2 | Cohort stats | Pillar 5 — backend cron + `archetypeStats` collection + ResultCard chip | No |
| 3 | Share-back loop | Pillar 3 — pre-filled share message + landing prime + pair-card on second completion | No (text-only first; video-share comes with Pillar 2) |
| 4 | Branded illustrations | Pillar 2 fields 1–3 (still + horizontal + square per archetype) | **Yes** — 12 archetype illustrations needed |
| 5 | Reveal video pipeline | Pillar 2 fields 4–5 (Remotion composition + render + CDN serve) | **Yes** — brand-approved animation style + outro |
| 6 | Daily question opt-in | Pillar 7 — opt-in surface + per-user-time-of-day push wiring | No (defer if no push infra ready) |

Phases 1–3 + 6 are pure engineering. Phases 4–5 gate on Andrew's brand-asset production.

---

## Anti-patterns to call out by name

- **The "Generated by AI" voice on archetypes.** If your one-liner sounds like ChatGPT wrote it, the share rate drops 60%. Brand voice = unique-sounding. The Mythie one-liners ("You make the season worth watching." / "Three moves ahead, always.") are correctly voicy. Don't let a refresh round revert them to "You are a strategic thinker."
- **Paywalling the result.** The user invested 8 minutes — pay them back with the result. Paywall the depth (the paragraph, the producer-side breakdown, the export, the API access), never the basic archetype name.
- **The "Calculating your unique personality…" loading spinner.** Spinner screens are the inverse of game-feel. Stream the paragraph; don't fake-calculate.
- **The retake-from-scratch button.** Retake should preserve the previous snapshot (Pillar 4). "Start fresh" is the WRONG primary action; "see how I've changed" is.
- **Generic share buttons.** "Share to Twitter" with no pre-fill = ~3% CTR. Pre-filled message + archetype-specific image = 15–30%.
- **Hiding rare-archetype rarity from the user.** "9% of users got this" is a gift — never the producer's exclusive.
- **One archetype gets a real illustration; the others are emoji.** Half-finished brand = unbranded brand. Hold the launch or hide the gap.

---

## Operating notes

- **Time budget.** A full audit of an existing quiz using this skill = 30–60 min of model time + reading. Don't pretend it's a 5-minute pass.
- **Asset gating is a manual-TODO output.** When Pillars 2 (illustrations + video) gate on artwork the user hasn't made yet, surface that as a manual TODO list per `safe-edit-policy` — don't try to AI-generate placeholders that will become "the brand" if they ship.
- **Always run the pre-launch checklist before declaring done.** 12 items, ~10 min, catches the predictable gaps.
- **The cascade-reveal milestones (Pillar 1) are the highest-leverage single change.** If you only ship one thing from this skill, ship the cascade. It changes the quiz from a form into a game.

---

## Related skills
- [[safe-edit-policy]] — foundation
- [[ui-design-web-apps]] — the visual grammar this composes on top of
- [[premium-product-demo]] — for marketing-side reveal demos
- [[asset-aware-creative-pipeline]] — branded-asset doctrine + manifest pattern
- [[video-export-remotion]] — Pillar 2's video reveal pipeline
- [[analytics-event-map]] — every pillar needs its event
- [[tighten]] — sister review skill; invoke `tighten` first to identify which pillars are missing
- [[phased-shipping]] — for landing the 6-phase PR sequence in the worked example

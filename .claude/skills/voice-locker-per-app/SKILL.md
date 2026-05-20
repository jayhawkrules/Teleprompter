---
name: voice-locker-per-app
description: Use when writing copy, marketing content, in-app strings, push notifications, emails, landing pages, App Store descriptions, or social posts for any portfolio app. Locks the app-specific brand voice so Claude doesn't fall into "polished AI assistant" tone. Each of Andrew's 23 apps has its own audience and voice — Mythie talks differently than Aclamos talks differently than Noelly. This skill captures the per-app voice fingerprint (sentence rhythm, vocabulary, what we never say, the one phrase that makes it unmistakable) and applies it to every output. Adapted from Sairahul's Voice Locker concept; portfolio-fitted via per-app `voice.md` manifests under each repo's assets. Keywords - brand voice, app voice, tone of voice, copy, marketing copy, App Store description, push notifications, email copy, landing page copy, in-app strings, voice lock, voice fingerprint, write like us, sound like us.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep]
---

# Voice Locker — Per-App

A polished AI tone is the same in every output: warm, helpful, balanced, slightly corporate. Andrew's portfolio cannot ship that voice. Mythie is for reality-TV-curious 20-somethings; Aclamos is for film-festival submitters who care about awards; Noelly is for families decorating for the holidays. Three different voices. None of them sound like ChatGPT.

This skill locks each app's voice so every output — landing page copy, push notification, App Store description, email — sounds unmistakably like THAT app, not like a generic AI helper.

Adapted from Sairahul Jonnalagadda's "Voice Locker" concept (Aug 2026 article: *20 Claude Skills Most Builders Don't Know Exist*) and portfolio-fitted by pinning voices to per-app manifests.

## When to use

- Writing or auditing any user-facing copy in any portfolio app
- Generating App Store / Google Play descriptions
- Drafting marketing emails, push notifications, in-app onboarding strings
- Writing landing page hero copy or feature blurbs
- Posting to social on behalf of an app (organic post or paid ad copy)
- Onboarding a new contractor / Cowork agent who'll be writing copy

## When NOT to use

- Internal docs, ADRs, technical READMEs — those use the engineering-doc voice, not the brand voice
- Legal language — that's governed by [[legal-compliance-guardian]], not brand voice
- One-off internal Slack messages
- Voice work that needs to deliberately break the brand voice (e.g., a special-edition campaign with a different tone — call that out explicitly)

## The per-app voice manifest

Each app keeps a `voice.md` at a known path. Standard location: `assets/voice.md` (or `docs/brand/voice.md`). The manifest is short — 60-100 lines — and pins:

```markdown
# <App Name> Brand Voice

## Audience
One sentence describing who we're talking to. Specific. Not "users."

## Voice in one line
The single line that, if a copywriter read only this, they'd write 80% on-brand.

## Sentence structure
- Average length, target rhythm
- When we use fragments
- When we use long sentences

## Vocabulary we favor
- 10-20 specific words / phrases we use a lot
- Why these (one line each)

## Vocabulary we never use
- 10-20 specific words / phrases that immediately break the voice
- Why these are forbidden (one line each)

## Openings
- How we start emails / push notifications / landing sections
- 3-5 example openings

## Closings
- How we end pieces
- 3-5 example closings

## What we never do
- 3-5 specific constructions we avoid
- (e.g., "we never use 'unlock' as a verb"; "we never say 'game-changer'")

## Tone with the reader
- Are we their friend, their coach, their producer, their service provider?
- How direct? How vulnerable? How playful?

## The fingerprint
The one stylistic thing that makes our copy immediately recognizable as US.

## 3 sample paragraphs in-voice
Paste 3 real examples of on-brand copy from the app's actual published surface.
This is the ground truth Claude calibrates against.
```

## Per-app voice differences (sketch)

These are the rough voice axes across the portfolio. The actual `voice.md` manifests are authored per app.

| App | Audience | Voice in one line |
|---|---|---|
| Mythie (CastHub1) | Reality-TV-curious 20-somethings + producers | Insider energy. Casting-call-as-game-loop. Confident, never desperate. |
| Aclamos | Festival submitters who already think they're winners | Quietly authoritative. We treat your work as already serious. |
| Noelly (holiday-lights) | Families decorating for Christmas | Warm, neighborly, low-tech-friendly. Never "magical" or "enchanting." |
| theproductionshelf | Working film producers | Crew-room voice. Practical, time-respecting, no fluff. |
| Ballotis | Awards voters | Discreet, fair-minded, never partisan. |
| CueHound | Casting + crew searching for projects | Hustle-respecting. Direct. Cue-the-action energy. |
| BacklotHub | Indie production teams (Tribeca tier) | "10 Lives Studios" framing per [[feedback_10_lives_only_tribeca]] |
| CRM-ai | Portfolio operators (Andrew + ops team) | Internal-only — no brand voice; engineering-doc voice |
| toronadoentertainment.com | Press, partners, future hires | Corporate, calm, ambitious. Toronado Entertainment, LLC framing. |

The rest of the 23 apps need voice manifests authored — flag as TODO when first writing copy for them.

## The protocol

When asked to write copy for an app:

1. **Read the app's `voice.md`** first. If it doesn't exist, STOP and surface a 🔧 MANUAL TASK to Andrew to author one (or ask 3-5 targeted questions to draft it).
2. **Echo the voice fingerprint** at the top of the response — one line. ("Writing in Mythie voice: insider energy, casting-call-as-game-loop, never desperate.") This catches drift before output.
3. **Draft the copy.**
4. **Self-audit** against the manifest's "never" list. If any flagged word/construction made it in, rewrite.
5. **Surface assumptions** — if the manifest doesn't fully cover a specific decision (e.g., "use first or second person here?"), note it and pick a default, don't silently choose.

## The Voice Lock prompt (for new manifests)

When an app needs a `voice.md` written from scratch, ask Andrew (or whoever owns the app's brand) for 3-5 samples of writing that nail the voice. Then run:

```
You are a linguist and ghostwriter.

I'm giving you 3-5 samples of <App>'s on-brand voice. Analyze and produce
the voice.md manifest:

1. Sentence structure (rhythm, length, fragments)
2. Favored vocabulary (10-20 specific words)
3. Forbidden vocabulary (10-20 specific words, with one-line reasons)
4. How openings work
5. How closings work
6. What we never do (3-5 constructions)
7. Tone with the reader (relationship, directness, playfulness)
8. The fingerprint (the ONE recognizable thing)

After analysis, write a one-paragraph voice brief that any future Claude
session can paste in to instantly calibrate. Then write 3 fresh paragraphs
in-voice on a topic I'll give you.

SAMPLES:
<paste 3-5 samples>
```

Save the output to `assets/voice.md` in the app's repo. Commit it. Reference it from CLAUDE.md ("Brand voice: see assets/voice.md").

## Cross-app voice composition

When writing cross-portfolio content (toronadoentertainment.com pages that mention multiple apps, a press release that covers two apps, etc.):

- Default to the **Toronado Entertainment corporate voice** as the wrapper
- Quote individual apps in their own voice
- Don't blend voices — keep them distinct, even within one document

## Anti-patterns

1. **"Polished AI" leak** — if a Mythie push notification ever uses "unlock," "supercharge," "game-changer," or "leverage," it's broken. Reject and rewrite.
2. **Mixing voices** — writing Mythie copy in Aclamos voice (or vice versa) is the most common drift. Always read the right manifest first.
3. **Voice creep over time** — copy slowly trends toward AI-default-friendly. Quarterly audit (paired with [[repo-health-audit]]) catches this.
4. **Brand voice ≠ inclusive design** — voice locks tone, NOT accessibility / readability standards. Both apply. The manifest doesn't override readability (Hemingway score caps, screen-reader friendliness).
5. **One-off "we're trying a new voice this week"** — if a campaign needs a different voice, fork the manifest temporarily; don't pollute the main one.

## Per-app adoption priority

1. **Mythie (CastHub1)** — biggest copy surface (landing page, App Store, in-app, social, casting-call descriptions). Highest leverage.
2. **Aclamos (awardssubmission)** — Stripe entry-fee + email-heavy. Drift here costs conversion.
3. **Noelly (holiday-lights)** — family-facing, hardest to get tonally right; needs manifest soon.
4. **toronadoentertainment.com** — corporate wrapper; sets the umbrella voice.
5. **theproductionshelf** — Payhip-driven; needs producer-voice manifest before next launch push.
6. Remaining apps — author manifest first time copy work hits them.

## What this composes with

- [[asset-aware-creative-pipeline]] — visual assets live alongside `voice.md`; both pull from the app's asset manifest
- [[premium-product-demo]] — demo copy uses the app voice; this skill governs what voice
- [[ui-design-web-apps]] — UI strings (button labels, empty states) follow this voice
- [[seo-aeo-optimizer]] — SEO meta descriptions need to be voice-locked too
- [[gamified-quiz-design]] — quiz copy is the most voice-sensitive surface; pair these two
- [[app-training-manual]] — staff training references the voice manifests
- [[legal-compliance-guardian]] — legal pages have a DIFFERENT, locked voice (compliance, not brand)

## Source

- Sairahul Jonnalagadda, *20 Claude Skills Most Builders Don't Know Exist* (2026) — Voice Locker concept (skill #02)
- Portfolio adaptation: per-app `voice.md` manifests, voice fingerprints, and the corporate wrapper for cross-app content

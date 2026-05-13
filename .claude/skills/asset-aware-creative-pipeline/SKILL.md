---
name: asset-aware-creative-pipeline
description: |
  Use when generating any visual, demo, landing page, social graphic, or exported video 
  for an Andrew Ward / Toronado Entertainment app. This skill ensures Claude uses real, 
  approved brand assets (images, screenshots, voice files, copy blocks, logos, colour tokens) 
  rather than generic placeholders. It governs how to discover, validate, and consume 
  assets from each app's asset manifest.
triggers:
  - "use my images"
  - "use my photos"
  - "use my voice"
  - "use real screenshots"
  - "use brand assets"
  - "check the asset manifest"
  - "what assets do we have"
  - "personalise the demo"
  - "use our real content"
author: Andrew Ward (jayhawkrules)
version: 1.0.0
---

# Asset-Aware Creative Pipeline Skill

This skill governs how Claude discovers, validates, and uses real media assets when building demos, landing pages, social content, or exported videos for any app in the portfolio.

---

## 1. Asset Manifest Standard

Every app that uses shared creative skills SHOULD maintain an `asset-manifest.json` at the repo root (or in `public/assets/`). If this file does not exist, Claude must create a skeleton and ask the user to populate it before proceeding with asset-dependent work.

### Schema

```json
{
  "app": "noelly",
  "version": "1.0.0",
  "lastUpdated": "2026-05-09",
  "brand": {
    "name": "Noelly",
    "tagline": "Find the best holiday lights near you",
    "accentColor": "#F59E0B",
    "darkBg": "#0a0f1e",
    "fontFamily": "Inter, system-ui, sans-serif",
    "logoFile": "public/assets/brand/logo.svg",
    "logoLockupFile": "public/assets/brand/logo-lockup.png"
  },
  "images": [
    {
      "id": "hero-screenshot",
      "file": "public/assets/screenshots/hero.png",
      "description": "Main app map view with holiday light pins",
      "approved": true,
      "channels": ["landing-page", "app-store", "social"]
    },
    {
      "id": "feature-route",
      "file": "public/assets/screenshots/route-planning.png",
      "description": "Route planning screen showing optimised path",
      "approved": true,
      "channels": ["landing-page", "investor"]
    }
  ],
  "voice": [
    {
      "id": "founder-vo",
      "file": "public/assets/voice/founder-voiceover.mp3",
      "description": "Founder voiceover for app store preview",
      "approved": true,
      "elevenLabsVoiceId": null
    }
  ],
  "copy": [
    {
      "id": "hero-headline",
      "text": "Find the most magical holiday lights near you",
      "channel": "landing-page",
      "approved": true
    },
    {
      "id": "app-store-description",
      "text": "Discover, save, and route to the best holiday light displays in your neighbourhood.",
      "channel": "app-store",
      "approved": true
    }
  ],
  "videos": [
    {
      "id": "screen-recording-v1",
      "file": "public/assets/video/screen-recording-v1.mp4",
      "description": "Raw screen recording of map + pin interaction",
      "approved": true,
      "channels": ["social", "app-store"]
    }
  ]
}
```

---

## 2. Asset Discovery Workflow

When this skill is active, Claude MUST follow this order before using any placeholder content:

```
1. Check for asset-manifest.json in repo root or public/assets/
2. If found → read it, list available assets to the user
3. If not found → create skeleton manifest, pause and ask user to add asset paths
4. For each required asset type (image / voice / copy / video):
   a. Look up matching entries in manifest where approved: true
   b. Filter by channel relevance
   c. Use the file path or URL directly in the generated component
5. Only fall back to placeholder if no approved asset exists for that type
6. Log which assets were used vs. placeholder in a TODO comment
```

---

## 3. Image Usage Rules

- Always prefer `approved: true` images over any generated placeholder
- Use the exact `file` path from the manifest — never guess or construct paths
- For phone mockup screens: use `channels` including `"landing-page"` first
- For social content: use `channels` including `"social"` first
- For App Store: use `channels` including `"app-store"` only
- If an image exists but `approved: false`, flag it with a TODO and use placeholder

```tsx
// Example: load hero screenshot from manifest
import heroScreenshot from '/assets/screenshots/hero.png';

<img
  src={heroScreenshot}
  alt="Noelly app showing holiday light pins on a map"
  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
/>
```

---

## 4. Voice & Audio Usage Rules

Voice files can come from two sources:

### 4a. Local Audio Files
If the manifest has a voice entry with a local `file` path:
```tsx
<audio src="/assets/voice/founder-voiceover.mp3" autoPlay={false} controls />
// Or in Remotion:
import { Audio } from 'remotion';
<Audio src={staticFile('assets/voice/founder-voiceover.mp3')} />
```

### 4b. ElevenLabs API (Voice Cloning)
If `elevenLabsVoiceId` is set in the manifest, use the ElevenLabs API to generate TTS:

```typescript
// Voice generation utility
async function generateVoiceover(text: string, voiceId: string): Promise<Blob> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  return response.blob();
}
```

Store the `ELEVENLABS_API_KEY` in Firebase environment config — never commit it.

---

## 5. Photo Manipulation Guidelines

When the user provides photos (founder headshots, product photos, event photos):

| Use Case | Approach |
|----------|---------|
| Hero background | CSS `background-image` with `filter: brightness(0.4) saturate(1.2)` overlay |
| Testimonial avatar | Circular crop, `object-fit: cover`, border matching accent colour |
| App screenshot in phone | `object-fit: cover` inside phone screen area |
| Social proof strip | Grayscale logos: `filter: grayscale(1) opacity(0.6)`, hover restores colour |
| Founder/team photo | Subtle dark vignette overlay, keep subject sharp |

---

## 6. Copy Prioritisation

When generating any text in demos or landing pages:

1. **First**: Use approved copy from `copy` array in manifest matching the channel
2. **Second**: Extract copy from existing app UI (check `src/` for button labels, page titles)
3. **Third**: Use the brand `tagline` from the manifest
4. **Last resort**: Generate copy, but mark with `// TODO: replace with approved copy`

Never invent value propositions or feature claims that don't exist in the actual app.

---

## 7. Asset Manifest CLI (for Claude Code Terminal)

When running in Claude Code terminal with repo access, Claude can auto-populate the manifest skeleton:

```bash
# Scan for common asset locations
find . -path './node_modules' -prune -o -name '*.png' -print
find . -path './node_modules' -prune -o -name '*.jpg' -print
find . -path './node_modules' -prune -o -name '*.mp4' -print
find . -path './node_modules' -prune -o -name '*.mp3' -print
```

Use the found paths to pre-populate the manifest, then ask the user to review and set `approved: true` on each asset they want used.

---

## 8. Rights & Privacy Checklist

Before using any asset in a public-facing demo, confirm:

- [ ] Image: no third-party copyright, no faces without consent, no branded content without licence
- [ ] Voice: recorded by the authorised person, not cloned from third parties
- [ ] Video: no background music without licence (use royalty-free or app sound effects only)
- [ ] Copy: no claims that can't be substantiated, no competitor names without legal review
- [ ] App Store: content appropriate for all ages, no seasonal references that will age badly

If any item is unchecked, do not use that asset and flag it to the user.

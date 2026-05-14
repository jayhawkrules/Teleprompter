# Teleprompter

Browser-based vertical teleprompter with voice-activated auto-scroll, camera recording, and direct TikTok posting. Standalone web app — open in a browser, paste or type your script, hit play.

Part of the [Toronado Entertainment, LLC](https://mythie.app) app portfolio. Built and maintained by Andrew Ward.

## What it does

- **Vertical teleprompter** — adjustable speed, font size, opacity. Voice-activated mode pauses scrolling when you stop speaking; auto-scroll otherwise.
- **Camera recording** — captures your read directly in the browser. Save the video locally or share it out.
- **Direct TikTok posting** — OAuth-connect a TikTok account and post the recorded video without leaving the app.
- **AI script assist** — connect a [Google Gemini](https://ai.google.dev) API key in `.env.local` to generate scripts from a topic prompt.
- **Local history** — every generated/edited script is saved to browser localStorage. Optional server-backed history when signed in.

## Deep-link integration mode

Other apps in the Toronado portfolio (Mythie / CueHound) deep-link to this teleprompter via URL query parameters. When any of the parameters below are present at load time, the app pre-loads the script and adapts the UX accordingly. Standalone usage (no params) is unaffected.

| Param | Type | Purpose |
|---|---|---|
| `script` | base64-encoded UTF-8 string | Pre-loads the teleprompter script. URL-safe base64 (`-`, `_`) is decoded; standard base64 also works. Long scripts must be base64'd to fit URL length limits. |
| `caption` | URL-encoded string | Pre-fills the social caption (Script tab → Caption field). |
| `speed` | integer 5-100 | Initial scroll speed. Clamped. |
| `font` | integer 16-72 | Initial font size in px. Clamped. |
| `return` | HTTPS URL | When present, shows a fixed "Return to [Source]" pill in the top-right. Producer can return to the calling app any time without losing their recording. Non-HTTPS URLs are rejected (defensive against open-redirect abuse). |
| `source` | free text | Used in the return-pill label (e.g. `?source=mythie` → "Return to Mythie"). |

Example:

```
https://teleprompter.toronado.app/
  ?script=SGVsbG8gd29ybGQ%3D
  &caption=Check%20out%20my%20new%20show
  &speed=80
  &return=https%3A%2F%2Fmythie.app%2F%23project%2Fabc123
  &source=mythie
```

The Mythie Social Amplification Coach (spec: [`docs/strategy/social-amplification-coach-spec.md`](https://github.com/jayhawkrules/CastHub1/blob/main/docs/strategy/social-amplification-coach-spec.md) in the CastHub1 repo, private) is the primary integration consumer today.

## Run locally

**Prerequisites:** Node.js 18+.

```bash
npm install
cp .env.example .env.local       # only needed for AI + TikTok features
# Edit .env.local: set GEMINI_API_KEY, TIKTOK_CLIENT_KEY, etc. (see .env.example)
npm run dev
```

The app starts at `http://localhost:5173` (or whatever port Vite picks). The Express dev server (`server.ts`) handles OAuth callbacks + history persistence.

## Stack

- Vite + React 19 + TypeScript
- Tailwind v4 + Radix UI (`components.json` Shadcn-style components)
- Express dev server (`server.ts`) for TikTok OAuth callback + server-backed history
- Google Gemini API (`@google/genai`) for AI script generation
- TikTok For Developers OAuth + Content Posting API

## Deploy to Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

Project ID is set in [`.firebaserc`](.firebaserc) (`toronado-teleprompter`). First-time deploy from a new machine:

```bash
firebase login
firebase use --add   # pick the toronado-teleprompter project
```

Hosting config in [`firebase.json`](firebase.json) — single-page-app rewrite, asset cache headers, security headers (HSTS, CSP-compatible, Permissions-Policy locking camera/mic to self).

## License

Copyright (c) 2026 Toronado Entertainment, LLC. All rights reserved. See [LICENSE](LICENSE).

For licensing inquiries: hello@mythie.app

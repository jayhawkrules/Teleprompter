---
name: video-export-remotion
description: |
  Use when exporting any React demo component, phone mockup, or product walkthrough as 
  an MP4 video for App Store previews, social media promos, investor decks, or archive. 
  This skill wraps Remotion (remotion.dev) — a React-based programmatic video framework — 
  and provides ready-to-run composition templates for each Andrew Ward / Toronado app channel.
triggers:
  - "export as video"
  - "make an mp4"
  - "create an app store preview video"
  - "render a social promo"
  - "export for TikTok"
  - "make an investor demo video"
  - "record the demo"
  - "generate a preview video"
author: Andrew Ward (jayhawkrules)
version: 1.0.0
---

# Video Export — Remotion Skill

This skill converts your existing React demo components (built with `premium-product-demo`) into proper MP4 video files using [Remotion](https://remotion.dev). No screen recording, no manual editing — the component IS the video.

---

## 1. Why Remotion

- Written in React — reuses your existing components and design tokens exactly
- Renders frame-by-frame to real MP4 (not a screen recording)
- Parameterisable — pass different assets, copy, or configs per channel
- Renders locally, on Lambda, or via GitHub Actions
- Supports audio tracks (narration, music) natively
- Output: MP4, WebM, or WebP stills

---

## 2. Installation

```bash
npx create-video@latest
# or add to existing repo:
npm install remotion @remotion/player @remotion/renderer
```

For App Store / social exports, add the CLI:
```bash
npm install -D @remotion/cli
```

---

## 3. Channel Composition Templates

### 3a. App Store Preview (Portrait, 30s max)

```tsx
// src/remotion/AppStorePreview.tsx
import { Composition } from 'remotion';
import { AppStoreComposition } from './compositions/AppStoreComposition';

export const RemotionRoot = () => (
  <>
    <Composition
      id="AppStorePreview"
      component={AppStoreComposition}
      durationInFrames={750}  // 25s at 30fps — leave buffer under 30s limit
      fps={30}
      width={1080}
      height={1920}  // Portrait 9:16
      defaultProps={{
        appName: 'Noelly',
        accentColor: '#F59E0B',
        darkBg: '#0a0f1e',
        scenes: [
          { durationFrames: 150, type: 'hero', headline: 'Discover holiday lights near you' },
          { durationFrames: 200, type: 'map-pins', headline: 'Thousands of displays mapped' },
          { durationFrames: 200, type: 'route', headline: 'Plan your perfect route' },
          { durationFrames: 200, type: 'cta', headline: 'Free to use this season' },
        ]
      }}
    />
  </>
);
```

```tsx
// src/remotion/compositions/AppStoreComposition.tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring, staticFile } from 'remotion';
import { Audio } from 'remotion';

interface Scene {
  durationFrames: number;
  type: 'hero' | 'map-pins' | 'route' | 'cta';
  headline: string;
}

interface AppStoreCompositionProps {
  appName: string;
  accentColor: string;
  darkBg: string;
  scenes: Scene[];
  voiceoverFile?: string; // path from asset manifest
}

export const AppStoreComposition = ({ appName, accentColor, darkBg, scenes, voiceoverFile }: AppStoreCompositionProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Determine which scene we're in
  let sceneStart = 0;
  let activeScene = scenes[0];
  for (const scene of scenes) {
    if (frame < sceneStart + scene.durationFrames) {
      activeScene = scene;
      break;
    }
    sceneStart += scene.durationFrames;
  }
  const sceneFrame = frame - sceneStart;

  // Fade in/out for each scene
  const opacity = interpolate(sceneFrame, [0, 10, activeScene.durationFrames - 10, activeScene.durationFrames], [0, 1, 1, 0]);

  return (
    <div style={{ width: '100%', height: '100%', background: darkBg, position: 'relative', overflow: 'hidden' }}>
      {/* Voiceover (if provided) */}
      {voiceoverFile && <Audio src={staticFile(voiceoverFile)} />}

      {/* Scene content */}
      <div style={{ opacity, transition: 'none', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px' }}>
        <h1 style={{ color: '#fff', fontSize: '56px', fontWeight: 800, textAlign: 'center', lineHeight: 1.1 }}>
          {activeScene.headline}
        </h1>
        <div style={{ marginTop: '24px', color: accentColor, fontSize: '24px', fontWeight: 600 }}>
          {appName}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, height: '4px',
        width: `${(frame / 750) * 100}%`,
        background: accentColor,
        transition: 'none',
      }} />
    </div>
  );
};
```

### 3b. Social Promo (Square or 9:16, 15–30s)

```tsx
<Composition
  id="SocialPromo"
  component={SocialPromoComposition}
  durationInFrames={450}  // 15s at 30fps
  fps={30}
  width={1080}
  height={1080}  // Square — change to 1920 for Reels/TikTok
  defaultProps={{
    appName: 'Noelly',
    accentColor: '#F59E0B',
    hook: 'Your neighbourhood has secret Christmas magic 🎄',
    body: 'Noelly maps every holiday light display near you.',
    cta: 'Free on App Store',
  }}
/>
```

### 3c. Investor Demo (Landscape, 60–90s)

```tsx
<Composition
  id="InvestorDemo"
  component={InvestorDemoComposition}
  durationInFrames={2700}  // 90s at 30fps
  fps={30}
  width={1920}
  height={1080}  // Landscape 16:9
  defaultProps={{
    appName: 'Noelly',
    accentColor: '#F59E0B',
    metrics: [
      { label: 'Displays mapped', value: '12,000+' },
      { label: 'UK cities covered', value: '47' },
      { label: 'Waitlist signups', value: '3,200' },
    ],
  }}
/>
```

---

## 4. Rendering

### Local Render
```bash
# Preview in browser (hot reload)
npx remotion studio

# Render to MP4
npx remotion render AppStorePreview out/app-store-preview.mp4
npx remotion render SocialPromo out/social-promo.mp4
npx remotion render InvestorDemo out/investor-demo.mp4
```

### GitHub Actions Render
```yaml
# .github/workflows/render-video.yml
name: Render Video
on:
  workflow_dispatch:
    inputs:
      composition:
        description: 'Composition ID to render'
        required: true
        default: 'AppStorePreview'
jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx remotion render ${{ github.event.inputs.composition }} out/video.mp4
      - uses: actions/upload-artifact@v4
        with:
          name: rendered-video
          path: out/video.mp4
```

---

## 5. Framer Motion → Remotion Translation

Components built with `premium-product-demo` use Framer Motion. For Remotion, translate like this:

| Framer Motion | Remotion equivalent |
|---------------|--------------------|
| `initial` / `animate` | `interpolate(frame, [0, 20], [startVal, endVal])` |
| `transition: spring` | `spring({ frame, fps, config: { stiffness: 300, damping: 25 } })` |
| `delay` (seconds) | Offset the frame range: `interpolate(frame, [delayFrames, delayFrames+20], ...)` |
| `AnimatePresence` | Conditional render based on frame range |
| `whileInView` | Always on (Remotion renders all frames) |

---

## 6. Asset Integration

This skill works directly with `asset-aware-creative-pipeline`:

```tsx
import { staticFile } from 'remotion';
// Images from asset manifest:
<Img src={staticFile('assets/screenshots/hero.png')} />
// Audio from manifest:
<Audio src={staticFile('assets/voice/founder-voiceover.mp3')} />
// Video clip from manifest:
<Video src={staticFile('assets/video/screen-recording-v1.mp4')} />
```

All asset paths come from `asset-manifest.json` — never hardcode.

---

## 7. App Store Technical Requirements

Follow Apple's guidelines when rendering `AppStorePreview`:

- Max 30 seconds
- Only show real in-app footage (use screenshots from `asset-manifest.json`)
- No device frame inside the video
- Use app sound effects or royalty-free music; no third-party tracks
- No prices, no seasonal references that age badly
- Portrait (1080×1920) preferred for iPhone listing
- Text must be legible and remain on screen long enough to read
- Use simple transitions: dissolves, fades — not zoom/spin that implies missing features
- Render poster frame (first frame) carefully — it shows when autoplay is off

---

## 8. Porting to a New App

To create video exports for a different app:

1. Check `asset-manifest.json` in that app's repo for approved `voiceoverFile` and screen recordings
2. Update `defaultProps`: `appName`, `accentColor`, `darkBg`
3. Update scene `headline` values from that app's approved `copy` in the manifest
4. Run `npx remotion render` with the new composition ID
5. Check output against the Demo Quality Rubric in `premium-product-demo`

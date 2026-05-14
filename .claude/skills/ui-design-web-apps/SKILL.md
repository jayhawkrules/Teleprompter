---
name: ui-design-web-apps
version: 3
description: A comprehensive Claude skill for designing production-grade web application UIs. Grounded in UX research, cognitive science, Apple HIG, and real-world product best practices. Use this skill whenever designing interfaces, component systems, flows, or screen layouts for web apps. Covers flow design, Apple-grade materials, the no-chrome doctrine, component standards, navigation at scale, state design, accessibility, motion-as-language, responsiveness, SaaS-specific patterns, and a full pre-ship checklist.
---

# Web App UI Design Skill
## Apple-Grade. Research-Grounded. Flow-First.

This skill encodes the best available UX research, cognitive psychology, Apple HIG, and real-world product design principles for web application interfaces. Every rule traces back to a behavioural pattern, usability study, or validated design system from a leading product team.

**Use this skill when:** designing screens, flows, components, navigation, forms, onboarding, empty states, error handling, notifications, SaaS upgrade paths, or any interactive UI element for a web application.

**Reference products to study**: Linear (speed, keyboard-first, command palette), Apple HIG (materials, hierarchy via weight, motion as language), Vercel (developer UX, density, no-chrome), Stripe Dashboard (data clarity, conditional nav), Notion (flexibility, empty states), Raycast (palette doctrine), Figma (canvas UI, collaboration states).

**v3.0 changes (2026-05-14)** — added Apple-grade material/translucency cookbook (§2.5), the no-chrome doctrine (§5.5), navigation-at-scale playbook (§4.5), hierarchy-via-weight typography rewrite, motion verb test. Killed: 1.6 line-height default, 600ms count animations, 4px backdrop-blur, dated shimmer recipe.

---

## 1. How People Actually Use Web Apps

### Attention & Scanning
- Users scan in **F-patterns** (NNGroup, 2017) for list/text-heavy pages and **Z-patterns** for sparse layouts. Place the most critical element at the start of the reading path — top-left on LTR layouts.
- **Foveal vision** covers only ~2° of the visual field. Users build a mental model through rapid eye movements (saccades), not a full-page read. Visual hierarchy must guide the eye, not compete with it.
- **Hick's Law**: Decision time increases logarithmically with choices. Every additional option on screen costs cognitive time. Aim for ≤5 primary choices per view. Every option that can be hidden behind "Advanced" or "More" should be.
- **The 5-second rule**: If a user cannot identify what a screen does in 5 seconds, the layout has failed. Test every screen against this constraint.

### Memory & Cognition
- **Miller's Law**: Working memory holds 7 ± 2 items. Never present more than 7 primary navigation items. Group related items into labelled chunks.
- **Recognition over recall** (Nielsen): Users remember better when prompted than when recalling unaided. Always show options — dropdowns, autocomplete, filter chips — rather than asking users to type from memory.
- **Cognitive load types**: Intrinsic (task complexity — unavoidable), extraneous (bad UI — eliminate entirely), germane (learning — support it). Your job is to eliminate every source of extraneous load. Never add a step the task doesn't require.
- **Change blindness**: Users miss changes that happen without visual transition. Always animate state changes — a 150ms fade is enough to signal that something happened.

### Behaviour & Interaction
- **Fitts's Law**: Acquisition time = log₂(2D/W). Make important elements large and close to the likely cursor/thumb position. Primary CTAs belong large and centred on mobile, top-right on desktop (proximity to cursor end position).
- **The 44×44px touch target rule** (Apple HIG): Minimum touch target on mobile for all interactive elements — buttons, links, form controls, toggles, icon buttons.
- **Error recovery over error prevention** (Nielsen heuristic #5): Users make mistakes. Design for recovery — undo, confirm, inline correction — not for blocking every possible path with validation walls.
- **The peak-end rule** (Kahneman): Users judge experiences by the peak moment and the final moment, not the average. Onboarding and task completions are the two moments most worth investing in.
- **The Zeigarnik effect**: People remember incomplete tasks better than complete ones. Use progress indicators and checklists in onboarding — partial completion creates motivation to finish.

### Trust & Credibility
- **The halo effect**: A polished, professional UI signals product reliability. Visual quality is a proxy for product quality in users' minds.
- **Progressive disclosure builds trust**: Asking for too much upfront (long forms, permission requests without context) breaks trust. Collect data incrementally as users engage with value.
- **Reciprocity**: Give value before asking for something. Show the product working before gating it. Offer a free trial, a free tier, or a demo mode — then ask for payment or registration.

---

## 2. Visual Hierarchy & Density

Getting visual weight right is the difference between a UI that feels clear and one that feels overwhelming. Every element on screen has a weight. The sum of all weights must create a clear reading order.

### The Five Levels of Visual Weight
1. **Highest**: Primary CTA — filled accent colour, largest button, most padding
2. **High**: Page title, section headings — `--text-xl` max in web apps, heavier weight
3. **Medium**: Body content, card titles — `--text-base`, standard weight
4. **Low**: Metadata, labels, secondary text — `--text-xs` / `--text-sm`, muted colour
5. **Lowest**: Dividers, borders, empty containers — barely perceptible surface separation

**Rule**: If two elements feel the same weight, one of them needs to change. Visual hierarchy only works through contrast.

### The 4/8 Spacing Grid (Apple/Vercel-aligned)

Every spacing value in the app must be a multiple of 4, with multiples of 8 strongly preferred. **Off-grid values (10px, 13px, 15px, 18px, 22px) are forbidden.** The eye registers irregular spacing as "amateur" even when the brain can't name it. This is a lint-able rule.

```css
:root {
  /* 8pt grid. 4px is the half-step for icon micro-adjustments only. */
  --space-0:    0;
  --space-0-5:  2px;   /* icon nudge only */
  --space-1:    4px;   /* icon-to-text gap, dense table cells */
  --space-2:    8px;   /* base unit — tight inline spacing */
  --space-3:    12px;  /* button padding-y, compact stack gap */
  --space-4:    16px;  /* DEFAULT card padding, form field gap */
  --space-5:    20px;  /* button padding-x, section heading gap */
  --space-6:    24px;  /* card-to-card gap, comfortable form gap */
  --space-8:    32px;  /* section-internal gap */
  --space-10:   40px;  /* section-to-section gap, page header bottom */
  --space-12:   48px;  /* major section break */
  --space-16:   64px;  /* page-level vertical rhythm */
  --space-24:   96px;  /* hero/marketing only — not for app chrome */
  --space-32:   128px; /* hero/marketing only */

  /* Line-heights — TIGHTER than legacy web defaults. Apps are not blogs. */
  --leading-tight:    1.15;  /* display headings */
  --leading-snug:     1.25;  /* page titles, section headings */
  --leading-normal:   1.45;  /* body in apps (was 1.6 in legacy skill) */
  --leading-relaxed:  1.6;   /* long-form prose only — never app chrome */

  /* Letter-spacing — Apple/Geist-style negative tracking on display */
  --tracking-tighter: -0.025em;  /* --text-3xl and up */
  --tracking-tight:   -0.015em;  /* --text-xl, --text-2xl */
  --tracking-normal:  0;         /* body */
  --tracking-wide:    0.04em;    /* uppercase eyebrow/label */
}
```

**When to use which spacing token:**

| Token | Use for |
|---|---|
| `--space-1` (4px) | Icon-to-text gap inside a button, dense table-cell padding |
| `--space-2` (8px) | Inline chip/tag padding, dense table row padding |
| `--space-3` (12px) | Button padding-y (default size), compact form field gap |
| `--space-4` (16px) | **DEFAULT card padding**, form field vertical gap, list item padding |
| `--space-5` (20px) | Button padding-x, gap between heading and content below |
| `--space-6` (24px) | Card-to-card grid gap, comfortable form field gap |
| `--space-8` (32px) | Section-internal vertical gap (above a fieldset legend) |
| `--space-10` (40px) | Section-to-section vertical gap |
| `--space-12` (48px) | Major page section break |
| `--space-16` (64px) | Page top/bottom padding on desktop |

**Internal padding ≤ external margin.** A card with `padding: 16px` should sit in a grid with ≥ `24px` gaps. Violating this makes elements feel cramped and merged.

### Density modes (legacy reference)

The grid above replaces the old "Comfortable / Compact / Dense" triplet. If you must classify, the new defaults are: web app body line-height `1.45`, button height `36px`, default card padding `16px`. Never mix densities within a single view.

### Colour in UI (The Restraint Rule)
Colour in a web app UI is not decoration — it is a signal. Use it only to:
- **Indicate state**: success (green), error (red), warning (amber), info (blue)
- **Draw attention to a single primary action** (accent colour on primary button only)
- **Encode data** in charts and visualisations

**Do not use colour to:**
- Make sections "feel different" from each other
- Decorate backgrounds or cards without semantic meaning
- Create visual interest where good typography and spacing would serve better

**The one-accent rule**: In any single viewport, only ONE non-neutral accent colour should appear in UI chrome (buttons, active states, badges). Additional colours are reserved for status signals and data visualisation only.

### Typography in Web Apps (Apple-grade, weight-driven)

Web apps cap display type at `--text-xl` (24px). There are no heroes, no splash text, no editorial moments — just functional hierarchy. **Hierarchy is carried by weight, not size.** Apple's iOS Headline (17pt Semibold) and Body (17pt Regular) are the *same size* — only weight differs. This is the single biggest "amateur web vs Apple-grade" tell, and the easiest fix.

```
Page title        --text-xl  (24px), weight 600, leading-snug    One per page. The "where am I" anchor.
Section heading   --text-base (16px), weight 600, leading-snug    Groups of related content.
Card title        --text-base (16px), weight 600, leading-snug    Same size as body — weight is the signal.
Body              --text-base (16px), weight 400, leading-normal  All descriptive content.
UI chrome         --text-sm  (14px), weight 500, leading-snug     Buttons, nav links, labels.
Metadata          --text-xs  (12px), weight 400, leading-snug     Timestamps, counts, secondary labels.
Eyebrow / label   --text-xs  (12px), weight 600, tracking-wide    Uppercase section markers.
```

- **Hierarchy via weight, not size.** A `font-weight: 600` `--text-base` card title and a `font-weight: 400` `--text-base` body read as different levels without a size jump. Reserve size jumps for true page-level hierarchy (h1 only).
- **Never use more than TWO distinct font sizes on a single screen** — the page title and everything else.
- **Letter-spacing tightens at display sizes** (Apple SF Pro auto-adjusts, Geist hand-crafts):
  - `--text-2xl` and up → `letter-spacing: -0.025em`
  - `--text-xl` → `letter-spacing: -0.015em`
  - Body (`--text-base` and below) → `letter-spacing: 0`
  - Uppercase eyebrow labels → `letter-spacing: 0.04em`
- **Line-height tight, not loose** — apps aren't blogs (see Density Modes below). `1.45` for body, `1.25` for headings. `1.6` is reserved for long-form prose only.
- **Muted colour for secondary text**: `--color-text-muted` for metadata, timestamps, and helper text. `--color-text-faint` only for decorative/placeholder text.

---

## 2.5 Apple-Grade Materials & Surface Layers

Apple Liquid Glass (iOS 26 / macOS 26) made translucent materials a first-class layering tool. They are NOT decoration. Used right, they communicate "this surface floats above content"; used wrong, they look amateur and break accessibility.

### When to use translucent materials

- **Top navigation bar** (sticky over scrolling content) — the canonical Apple/iOS use case
- **Sticky toolbars** (filter bar, bulk-actions bar)
- **Command palette / Cmd+K overlay**
- **Modal/drawer backdrops** (the dimming layer behind, not the modal surface itself)
- **Floating popovers / tooltips over content**

### When to NEVER use translucent materials

- Cards in a grid
- Form fields, inputs, selects
- Body content surfaces (the page background)
- Inside another translucent surface (no nesting — Apple's explicit Liquid Glass rule)
- Over video or animated backgrounds (refraction creates visual chaos)
- On surfaces persistent < 200ms (toasts, transient indicators — the GPU cost isn't earned)

### Production CSS — Top nav (Apple recipe)

```css
.app-nav {
  position: sticky;
  top: 0;
  z-index: 50;

  /* Translucent floor — meets 4.5:1 contrast post-blur */
  background-color: color-mix(in srgb, var(--color-surface) 72%, transparent);

  /* The blur — Apple "regular material" equivalent */
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);

  /* Hairline divider, not a shadow */
  border-bottom: 1px solid var(--color-border-subtle);

  /* Fallback for browsers without backdrop-filter */
  @supports not (backdrop-filter: blur(20px)) {
    background-color: var(--color-surface);
  }
}
```

`saturate(180%)` is the Apple trick that keeps blurred wallpaper vibrant rather than washed-out.

### Production CSS — Modal backdrop

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(8px);                /* never less than 8px — below that the GPU cost isn't earned */
  -webkit-backdrop-filter: blur(8px);
}

.modal-surface {
  /* The modal itself is OPAQUE — translucency only on the backdrop */
  background-color: var(--color-surface-elevated);
  border-radius: var(--radius-lg);           /* 12px */
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 16px 48px rgba(0, 0, 0, 0.12);
}
```

### Translucency reference table

| Use case | `blur()` | `saturate()` | Floor opacity |
|---|---|---|---|
| Top nav bar | 20px | 180% | 72% |
| Bottom tab bar (mobile) | 24px | 180% | 70% |
| Command palette | 32px | 180% | 80% |
| Modal backdrop | 8px | — | 32% black |
| Sticky filter toolbar | 16px | 160% | 75% |
| Floating popover | 24px | 180% | 80% |

### The 4.5:1 contrast floor

Translucent surfaces still need to meet WCAG AA contrast (4.5:1 for body text) **after the blur is applied**. This means a `background-color` floor (e.g., `rgba(255,255,255,0.72)` light / `rgba(20,20,22,0.72)` dark) is not optional — pure transparency fails accessibility on busy content.

### Honor `prefers-reduced-transparency`

```css
@media (prefers-reduced-transparency: reduce) {
  .app-nav,
  .modal-backdrop,
  .command-palette {
    backdrop-filter: none;
    background-color: var(--color-surface);
  }
}
```

---

## 3. Flow Design Principles

### Task Flow Architecture: The Non-Negotiables
Every user task has a **start → progress → completion** arc. Design all three states explicitly.

```
START              PROGRESS              COMPLETION
─────────────────────────────────────────────────────
Empty state        Loading skeleton      Success state
Onboarding step    In-progress form      Confirmation
Entry point        Validation feedback   Undo window
Error landing      Retry prompt          Next-step CTA
```

**Never create a dead end.** Every screen needs a clear next action AND a clear escape route (back, cancel, close). If a user is confused about what to do next, the design has failed.

### The Primary Action Rule
One primary action per screen. When all buttons look equally important, none of them are.

| Button type | Visual | Count | Position |
|---|---|---|---|
| **Primary** | Filled accent colour | 1 per screen | Top-right of header, or bottom-right of form |
| **Secondary** | Outlined or ghost | 2–3 max | Adjacent to primary |
| **Destructive** | `--color-error` background | 1 | Separated from primary by space |
| **Tertiary** | Text-only link | Any | Inline or footer area |

**Do this, not that:**
- ✅ `[Cancel]  [Save changes]` — secondary left, primary right
- ❌ `[Save changes]  [Delete]  [Cancel]  [Preview]` — four equal-weight actions

### Progressive Disclosure
Never front-load complexity. Reveal depth as users need it:
- Show only what's needed for the current step
- Advanced settings → collapsible section, "Advanced options ▾" toggle
- Long forms → multi-step wizard (max 4 fields per step)
- Secondary filters → "More filters" slide-out drawer
- Dangerous actions → behind a confirmation step or requires typing to confirm

**Research basis**: Nielsen (1994) — users are overwhelmed by too many simultaneous options. Show the minimum viable set first; earn the right to show more.

### Onboarding Flow
The first 3 minutes determine 30-day retention (Mixpanel, 2023). Onboarding is a product feature, not a form.

1. **Value demonstration first** — show the product working before asking for data (interactive demo, pre-populated state)
2. **Minimise time to first value** — the fastest path from signup to "aha moment"
3. **Checklist-driven progression** — persistent "3 of 5 steps complete" tracker exploits the Zeigarnik effect
4. **Skip is always available** — never force optional setup to completion
5. **Empty state = invitation** — first view must explain what goes here and invite action with a CTA
6. **Contextual tips over tooltips** — embed guidance inside the UI (inline help text, subtle callouts) rather than a separate tutorial overlay

---

## 4. Navigation Architecture

### Which Pattern to Use

| Pattern | Use when | Avoid when |
|---|---|---|
| **Left sidebar** | 5+ primary sections, complex hierarchy, frequent section switching | Simple 2–4 section apps |
| **Top navigation** | Marketing pages within the app, fewer than 5 sections | Deep hierarchies, data-dense dashboards |
| **Bottom tab bar (mobile)** | 3–5 primary sections | More than 5 sections |
| **Hamburger drawer (mobile)** | Many secondary navigation items | Primary navigation needing constant visibility |
| **Contextual toolbar** | Tool-based apps (canvas, editor) | General navigation |

### Sidebar Best Practices
- **Sticky at all times** — never let the sidebar scroll with page content
- **Collapsible to icon-only** at 56–64px wide, preserving navigation without blocking space
- **Active state**: Background fill + left accent bar OR filled pill — never colour alone (accessibility)
- **Section labels**: Group with uppercase 11px labels and dividers (`Team`, `Projects`, `Settings`)
- **Badge counts**: Show unread/pending counts on items. Red badge = alert, neutral badge = count
- **Width**: 220–260px expanded. Always specify `min-width` to prevent collapse on resize
- **User avatar + name**: Bottom of sidebar for quick access to account/settings

### Information Architecture Levels
```
Level 1: Sidebar section (Projects, Team, Billing)
Level 2: Page within section (All Projects, Archived)
Level 3: Record/item (Project "Apollo")
Level 4: Sub-tab within record (Overview, Activity, Settings)
```

Breadcrumbs are mandatory at Level 3+. Format: `Projects > Apollo > Settings` — ancestors are links, current page is plain text.

### Command Palette (Cmd+K / Ctrl+K)
Expected in any app with 10+ actions. Power users will reach for it immediately.

Structure:
- Top: Recent actions and frequently used items
- Grouped by category: `Go to...`, `Create...`, `Search...`, `Settings`
- Keyboard-navigable: Arrow keys + Enter to select, Escape to dismiss
- Fuzzy search across all actions, routes, and records
- Keyboard shortcut shown next to common actions

---

## 4.5 Navigation at Scale (12+ Features)

When an app passes ~9 primary nav items, the sidebar stops being a navigation aid and starts being a wall of words. The cure is not "make it scrollable" — the cure is structural. Below is the playbook used by Linear, Notion, Stripe, Slack, and macOS System Settings.

### The 9-item rule

Once the primary sidebar reaches ~9 items, **stop adding** and start restructuring. Restructure via one of:

1. **Group by mental model.** Cluster items into sections with a header (`WORK` / `GROW` / `ADMIN`). Sections become the unit of navigation. Slack and Notion do this; the header itself is collapsible.
2. **Promote object hierarchy out of features.** If your sidebar has both "Projects" (a feature) and a project tree below it (objects), the tree replaces the feature. Linear's `Teams > Team A > Projects/Issues/Cycles` is one expandable tree, not three nav items.
3. **Split workspaces.** Daily-work surfaces and configuration surfaces should not share a sidebar. Move Settings to a full-screen separate surface launched via gear icon, not a sidebar tab.
4. **Merge twins.** Two adjacent items with similar verbs ("Search talent" + "Search internet") should be one page with a tab toggle, not two nav items.

### Section visibility rules

| Section type | Default state | Example |
|---|---|---|
| Daily-touch surfaces (>1×/session) | Always visible | Inbox, Tasks, primary Work pages |
| Object trees that grow over time | Collapsible, expanded | Projects, Teamspaces, Boards |
| Role/plan-gated items | Conditionally rendered (hidden if not entitled) | Admin tools, Studio-only features |
| <1×/week destinations | Hidden in "More" overflow or moved out of sidebar | Reports, Audit log, Feedback |

### Conditional rendering, not greying

Plan-gated features should **not appear at all** for users without entitlement. Greyed-out items teach users the app is full of locked doors and erode trust. The only globally-visible upsell entrypoint should be a single "Compare plans" link in the bottom utilities. Discovery of locked features happens contextually — when the user hits the wall, the paywall modal lists every higher-tier feature they'd unlock. Linear, Stripe, and Notion all do conditional, never greyed.

### Command palette: supplementary, never primary

A `Cmd+K` palette is the right secondary door for power users. It is never the only door. Assume <50% of paying B2B-non-developer users will discover it. Always ship a visible sidebar even if the palette is great. Make it discoverable with a header pill that shows the keyboard hint (`Search anything ⌘K`).

### Settings is its own app

Once Settings has more than ~5 sub-pages, it becomes its own app inside your app:
- Launch it from a gear icon in the bottom-left or avatar menu, **not** as a sidebar tab.
- Inside Settings, use its own left-rail nav with **groups** (Account / Workspace / Integrations / Data / Advanced).
- Each group has its own landing page summarising what's inside — not a "pick a sub-tab" blank screen.
- A search box at the top filters across all settings (macOS Sequoia pattern). For 30+ entries, search beats hierarchy.
- Order groups by frequency, not alphabetical. Account first, Advanced last.
- Persist last-visited sub-tab so a user who lives in "Members & roles" lands there on next open.
- Closing Settings returns the user to where they were, not Home.

### Default landing — action queue, not stats dashboard

Returning users land on a personalised, action-oriented surface (`Inbox` / `My Work` / `Triage`). Never on a chrome-heavy "Dashboard" full of vanity metrics. The morning question is "what do I do next?" not "how is the business doing?" — Linear's Inbox is the gold standard here.

First-time users get a Dashboard for orientation. Returning users get the Inbox.

### Anti-patterns to avoid

- **Flat tab strip with >7 tabs** — wraps awkwardly, hides items behind a "more" chevron, kills mental model. Replace with grouped sub-nav.
- **"Recent" in the primary sidebar** — adds noise, position changes day-to-day, breaks muscle memory. Recents belong inside Cmd+K and on the Home surface, not in the nav.
- **Greyed-out plan-gated items** — always conditionally render; never grey.
- **Default-landing on a stats Dashboard** — default to an action queue.
- **Sidebar item with sub-tabs that change the page header** — pick one level of hierarchy per click.
- **"Feedback" and "Help" in the primary sidebar** — both belong in the avatar menu or a `?` icon in the header. Real users hit them <1×/month.

### Decision tree

```
Q1: Is this surface visited by the median user >1×/session?
    YES → Primary sidebar, top, always visible.
    NO  → continue.

Q2: Is it a "do work" or a "configure" surface?
    DO WORK     → Primary sidebar, mid, possibly inside a collapsible group.
    CONFIGURE   → Settings hub. Not in sidebar.

Q3: Is it gated by a plan or role?
    YES → Conditionally render only when entitled. Do NOT grey out.
    NO  → continue.

Q4: Is it actually a leaf of an existing object?
    YES (e.g. Estimates is per-project) → Move into the parent's detail view.
    NO  → continue.

Q5: Is it used <1×/week by most users?
    YES → Collapsible group "More" or move to header utilities.
    NO  → Primary sidebar.
```

### When to redesign

Trigger a sidebar redesign when:
- Primary item count crosses 9.
- A new feature ships and you cannot articulate which existing item it sits "next to."
- A user-research session shows >1 user asking "wait, which one is this?"
- Two adjacent items share a verb (Search-this vs Search-that, View-this vs View-that).

### Linear's Command Palette — gold-standard spec

The reference implementation. Copy these specifics directly when building Cmd+K:

**Trigger:** `Cmd+K` (Mac) / `Ctrl+K` (Win/Linux). Captured globally — works from any view.

**Visual:**
- Centered, **640px wide**, max-height 480px, positioned at **20vh from top** (Apple-style "weight to upper third" — not center)
- Translucent surface — `backdrop-filter: blur(32px) saturate(180%)`, background `rgba(255,255,255,0.80)` light / `rgba(20,20,22,0.80)` dark
- Border-radius: `var(--radius-lg)` (12px)
- Shadow: `0 4px 8px rgba(0,0,0,0.04), 0 24px 64px rgba(0,0,0,0.16)`
- Search input: 48px tall, no border, font-size **16px** (prevents iOS zoom), placeholder "Type a command or search..."
- Results: **36px row height**, 12px horizontal padding, icon-left-label-right, keyboard shortcut shown right-aligned in `--text-xs` muted
- Active row: `background: var(--color-surface-dynamic)` — no border, no fill change

**Behavior:**
- Opens with focus on input, last query NOT pre-filled (clean slate)
- Fuzzy match via [`command-score`](https://github.com/farzher/fuzzysort) — Superhuman threshold > 0.0015
- Group order: `Recent` (top, max 3) → `Go to...` → `Create...` → `Actions` → `Settings`
- Arrow keys navigate, Enter executes, Escape dismisses, Tab does nothing (don't compete with browser focus)
- Aliases: each command has `aliases: string[]` — "Archive" matches "Mark Done", "Delete" matches "Trash"
- Recent commands ranked by usage frequency, decayed weekly
- **Context-aware boost** — when viewing a casting call, top results include "Apply to this call" — context commands get `score * 1.5` boost

**Performance:**
- Open animation: **150ms** `cubic-bezier(0.16, 1, 0.3, 1)` — scale from 0.96 → 1.0 + opacity 0 → 1
- Backdrop fade: 100ms ease-out
- Results render < 16ms (one frame); debounce typing only if command list > 500 items
- Keyboard navigation must register within 50ms

**Accessibility:**
- `role="combobox"` on input, `role="listbox"` on results, `role="option"` on each row
- `aria-activedescendant` updates on arrow keys
- Screen reader announces "Command palette open. 12 results."
- Reduced-motion: skip the scale animation, just fade

---

## 5. Component Design Standards

### Buttons

```
Size       Height   H-Padding    Font          Use case
────────────────────────────────────────────────────────
Large      44px     20px         --text-sm     Mobile primary, modal CTA
Default    36px     16px         --text-sm     Standard desktop
Small      28px     10px         --text-xs     Table actions, dense toolbars
Icon-only  36×36px  8px all      N/A           Toolbars — requires aria-label + tooltip
```

States every button must have:
- **Default**: Base fill/outline
- **Hover**: Lightened/darkened variant of fill (`--color-primary-hover`)
- **Active/pressed**: Deeper variant (`--color-primary-active`) — 80ms transition
- **Focus-visible**: 2px ring, 3px offset, `--color-primary`
- **Loading**: Spinner replaces icon (not label) + label becomes "Saving..." — button stays enabled width
- **Success**: Brief checkmark animation (500–700ms) then returns to default
- **Disabled**: 40% opacity, `cursor: not-allowed`, `aria-disabled="true"` — always provide a tooltip explaining why

### Form Design
**Research basis**: Baymard Institute (2023) — form errors are the single largest cause of task abandonment in web apps. These rules are all evidence-based.

**Labels**
- Always above the input — never inside (placeholder disappears on type, fails WCAG 2.1)
- Use sentence case ("First name", not "FIRST NAME")
- Required fields: no asterisk in the label — instead, mark optional fields with "(optional)"
- Helper text: below the label in `--color-text-muted`, before input focus — not inside placeholder

**Validation**
- Validate on `blur` (field loses focus), not on `input` (keystroke) — keystroke validation is anxious and disruptive
- Exception: password strength meters update on input (expected, not anxious)
- Error message goes directly below the field, in `--color-error`, with an error icon
- Error message must say what to do, not what went wrong: "Enter a valid email (e.g. name@example.com)" not "Invalid email"
- On form submission failure: scroll to and focus the first invalid field, announce errors to screen readers via `aria-live="assertive"`

**Layout**
- Single column for most forms — two-column only for clearly paired short fields (First name / Last name)
- Group related fields with `<fieldset>` + `<legend>`: address block, payment details, personal info
- Autofocus the first field on load (reduces time-to-start)
- Show/hide password toggle on all password inputs
- Input type correctness: `type="email"`, `type="tel"`, `type="number"`, `type="url"` — triggers correct mobile keyboards and browser autofill
- Character counters on length-limited fields (textarea, bio, title)

**Multi-step forms**
- Show a persistent step indicator at the top: `Step 2 of 4: Payment details`
- Progress bar (or numbered steps) so user knows how much remains
- Validate each step before advancing — don't surface step 3 errors on step 1
- "Back" never loses the user's entered data

### Tables
Tables are where complex apps win or lose users.

- **Sticky column headers**: Always. Users lose context when the header scrolls away.
- **Row selection**: Checkbox in first column. On selection, a contextual bulk-actions toolbar appears above the table.
- **Sortable columns**: Click column header to sort. Arrow indicator shows direction. Sorted column has a subtle background tint.
- **Row hover**: Subtle highlight (`--color-surface-dynamic`) revealing contextual action buttons on the right
- **Row actions**: Icon buttons (edit, duplicate, delete) appear on hover. Never always-visible unless there's only one action.
- **Bulk actions toolbar**: Appears when ≥1 row selected. Contains the most common multi-row actions. Shows count: "3 items selected".
- **Pagination**: For navigable data. Show: `← Previous  Page 3 of 12  Next →` + rows-per-page selector.
- **Infinite scroll**: For feeds and activity logs where position doesn't matter.
- **Column resizing**: Expected in dense data apps — provide drag handles on column borders.
- **Empty state**: Never blank. "No results for 'apollo'. [Clear search]" with the query shown.
- **Numeric data**: Right-align. `font-variant-numeric: tabular-nums` for decimal alignment.
- **Date/time columns**: Relative for recent ("3 hours ago"), absolute for older ("12 Apr 2026") — use a tooltip to show the other format on hover.

### Cards

- **Consistent row height**: Use `align-items: stretch` in grid containers so cards in the same row always align.
- **Clickable cards**: Wrap entire card in `<a>`. Hover: `box-shadow` elevation step up (`--shadow-sm` → `--shadow-md`).
- **Internal hierarchy**:
  - Eyebrow/label: `--text-xs`, `--color-text-muted`
  - Title: `--text-base` to `--text-lg`, `font-weight: 600`
  - Metadata row: `--text-xs`, `--color-text-muted`, icons at 14px
  - Body: `--text-base`, `--color-text`, max 3 lines with `line-clamp`
  - Actions: bottom-right or revealed on hover
- **Status indication**: Use a small coloured dot, a badge, or a background tint — never a thick coloured left border.
- **Bento grid**: For dashboards and feature showcases, vary card sizes (1-wide, 2-wide, tall) to create rhythm. All cards share the same border-radius and surface level.

### Modals & Drawers

| Type | Width | Use for |
|---|---|---|
| **Confirmation modal** | 400px | "Are you sure?" — 2 actions max |
| **Form modal** | 480–560px | Short forms (≤5 fields) |
| **Detail modal** | 640–720px | Record preview, image viewer |
| **Right drawer** | 400–480px | Longer forms, filters, detail panels |
| **Full-screen sheet** | 100% | Mobile full-screen forms, deep editing |

**Universal requirements for all overlays:**
- Visible × close button (top-right)
- Close on Escape key
- Close on backdrop click (modals only, not drawers — accidental tap risk)
- Trap focus inside while open
- Return focus to trigger element on close
- Backdrop: `background: oklch(0 0 0 / 0.32)` + `backdrop-filter: blur(8px)` (see §2.5 — never less than 8px; below that the GPU cost isn't earned and the blur isn't perceptible)
- Never nest modals — if an action inside a modal opens another modal, restructure the flow

### Tooltips & Popovers

| Type | Trigger | Max content | Use for |
|---|---|---|---|
| **Tooltip** | Hover + long-press | 80 chars | Label for icon buttons, short clarifications |
| **Popover** | Click/tap | Any | Rich content, forms, menus, colour pickers |

Tooltip rules:
- 300ms delay before show (prevents flicker during cursor movement)
- Arrow pointing to trigger element
- Never put critical information in a tooltip — screen readers may not announce it
- On mobile: tooltip → popover (hover doesn't exist)

### Notifications & Toasts

A notification is NOT a toast. Keep these patterns distinct:

**Toast** (temporary, bottom or top-right, auto-dismisses in 4–6s):
- For: background confirmations, system status updates, non-critical feedback
- "Project saved", "Link copied", "Import complete"
- Never use for errors that require action — they disappear before users respond
- Always include a manual dismiss button
- Stack up to 3 toasts; newer stacks on top

**Inline success/error** (permanent until user acts):
- For: form submission results, validation errors
- Replaces the form on success — don't navigate away if the user might want to make another change

**Notification centre** (bell icon, persistent log):
- For: team events, system alerts, activity that happened while user was away
- Badge count on bell icon (dot for any unread, number when >1)
- Mark all as read action
- Notification anatomy: avatar/icon + action summary + relative timestamp + deep link

**Banner** (full-width, dismissible, persists until dismissed):
- For: degraded service, offline status, billing warnings, important announcements
- Position: below the top nav, above page content
- One banner maximum at a time. If two compete, show the higher severity one.

---

## 5.5 The "No Chrome" Doctrine

Web apps over-decorate. Apple under-decorates. Naming the doctrine makes it enforceable in PR review.

### One accent color per viewport

In any single viewport, exactly ONE non-status accent colour appears in UI chrome (buttons, active states, badges). Status colours (success/warning/error) don't count and are reserved for state. If a screen has two accent colours, kill one. Vercel proves the doctrine — the dashboard is literally pure black + white + one functional blue.

### Hairline borders only

```css
:root {
  --color-border-hairline: color-mix(in srgb, currentColor 6%, transparent);   /* light mode */
  --color-border-strong:   color-mix(in srgb, currentColor 12%, transparent);  /* hover/active state */
}
```

- All resting borders are `1px` at ~6% opacity.
- Hover/active states bump to ~12% opacity, never thicker.
- **2px borders are forbidden** in app chrome. The only legitimate 2px is the focus ring.

### Two shadow tokens. Total.

```css
:root {
  /* The only two shadow tokens in the system. */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);                                  /* resting elevation */
  --shadow-lg: 0 1px 2px rgba(0, 0, 0, 0.04), 0 16px 48px rgba(0, 0, 0, 0.12); /* floating (modals, popovers) */
}
```

Mid-shadows (`--shadow-md`) and coloured/coloured-blur shadows are killed. Heavy shadows date a UI to circa-2018 Material Design.

### Four radius tokens. Total.

```css
:root {
  --radius-sm:   6px;   /* inline chips, badges */
  --radius-md:   8px;   /* buttons, inputs */
  --radius-lg:   12px;  /* cards, modals */
  --radius-full: 9999px;/* pills, avatars */
}
```

Random radii (5px button, 7px card, 9px modal) read as careless. Pick from the four. Forbid arbitrary values.

### No always-on dividers between sections

Cards in a grid don't need horizontal lines between rows. Sections don't need `<hr>` between them. Let `gap` and whitespace do the work. A divider should only appear if visual grouping fails without it (rare).

### Optical alignment beats geometric alignment

- Icons next to text: `vertical-align: -0.125em` (or `display: inline-flex; align-items: center`)
- Buttons with leading icons: extra trailing padding (`pr-3` not `pr-2`) to balance the icon's leftward weight
- Centered text in a circular avatar: optically centered (often `transform: translateY(-1px)`) since cap-height isn't visually centered in the circle

### Cards inherit no chrome

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-hairline);
  border-radius: var(--radius-lg);             /* 12px */
  padding: var(--space-4);                     /* 16px */
  /* NO shadow at rest. Shadow appears ONLY on hover for clickable cards. */
  transition: border-color 120ms ease-out, box-shadow 120ms ease-out;
}

.card.is-clickable:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.card-title {
  font-size: var(--text-base);                 /* 16px — same as body */
  font-weight: 600;                            /* WEIGHT carries hierarchy */
  line-height: var(--leading-snug);            /* 1.25 */
  letter-spacing: var(--tracking-tight);       /* -0.015em */
  margin: 0 0 var(--space-1) 0;                /* 4px */
}

.card-body {
  font-size: var(--text-sm);                   /* 14px */
  line-height: var(--leading-normal);          /* 1.45 */
  color: var(--color-text-muted);
  margin: 0;
}
```

This is the Vercel-style reference card. Note: card title is the SAME size as body. Hierarchy via weight. No shadow at rest. Hairline border. Predictable radius.

### Status badges — semantic only, never categorical

Three variants. Period. No theme decoration, no brand-color badges.

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);              /* 6px */
  font-size: var(--text-xs);                    /* 12px */
  font-weight: 500;
  border: 1px solid currentColor;
  background-color: color-mix(in srgb, currentColor 10%, transparent);
}
.badge--neutral { color: var(--color-text-muted); }
.badge--success { color: var(--color-success); }   /* green */
.badge--warning { color: var(--color-warning); }   /* amber */
.badge--danger  { color: var(--color-error); }     /* red */

/* Optional dot indicator — Apple Mail / Linear pattern */
.badge::before {
  content: ""; width: 6px; height: 6px; border-radius: 50%;
  background: currentColor; opacity: 0.9;
}
```

Every badge is the same shape and size. Color is the only differentiator. Color always means a state (never a category). For "feature badge" or "tier badge" needs, use a neutral chip with text label — not a coloured badge.

---

## 6. SaaS-Specific Patterns

These patterns are unique to SaaS and subscription products and deserve explicit treatment.

### Upgrade & Paywall Patterns
The moment a user hits a limit is a conversion moment — handle it with care, not aggression.

- **Soft paywalls** outperform hard blocks: show the locked feature, blur it, and offer upgrade inline
- **Contextual upgrade CTAs**: Upgrade prompt appears at the exact moment of value — "You've used 3 of 5 projects. Upgrade for unlimited." — not in the nav or footer
- **Feature gates**: Show locked features in navigation (greyed, with a lock icon or "Pro" badge) — users should see what they're missing
- **Usage meters**: Show consumption progress visually — "7 of 10 team members used ████████░░ 70%" — near the relevant feature
- **Trial expiration**: Countdown banner ("Your trial ends in 3 days") — not a modal blocker. Offer upgrade, not just a warning.
- **Downgrade protection**: When a user tries to downgrade, show what they'll lose concretely — not a generic "are you sure?" modal

### Team & Permissions
- **Role hierarchy**: Owner > Admin > Member > Viewer — never more than 4 levels
- **Permission indicators**: Show what each role can do in a simple matrix table
- **Invite flow**: Email input → role selector → optional message → Send invite. Show pending invites separately from active members.
- **Access denied**: Explain clearly what is blocked and who to contact (not just "403 Forbidden")
- **Audit log**: Every settings change is logged with actor, timestamp, and what changed

### Billing & Plans
- **Current plan highlight**: In pricing tables, the user's current plan has a distinct visual treatment (bordered, labelled "Current plan")
- **Annual vs monthly toggle**: Annual should be the default selection (show savings: "Save 20%")
- **Invoice history**: Table of past invoices, each downloadable as PDF, with status (Paid/Failed)
- **Payment method**: Card brand logo + last 4 digits + expiry. "Update payment method" link prominent when failing.
- **Cancellation flow**: Never a single click. Multi-step: ask why → offer a pause or downgrade → confirm → send confirmation email. The goal is retention, not obstruction.

---

## 7. State Design (The Full Spectrum)

Every component exists in multiple states. Design all of them — the happy path is only one of many.

### The Complete State Matrix
For any data-loading component, design these states:

```
State          When                        What to show
──────────────────────────────────────────────────────────────
Loading        Waiting for data            Skeleton loader
Empty (first)  No data, never had any      Invitation + CTA
Empty (search) No results for query        Query shown + clear filters
Error          Request failed              Friendly message + retry
Partial        Some data loaded            Show what loaded, skeleton rest
Success        Data loaded                 The designed happy path
Stale          Data may be outdated        Refresh indicator (subtle)
Offline        No network connection       Offline banner + cached data
```

### Loading States
- **Skeleton loaders over spinners** for all content that takes >200ms
- Skeleton exactly mirrors the component shape (circular for avatars, varying-width bars for text, full-width rectangle for images)
- Skeleton fill: solid `var(--color-surface-offset)` with a *subtle* opacity pulse (`opacity: 0.6 → 1.0 → 0.6` over 2s, `ease-in-out`). Apple-grade restraint. The 2018-era shimmer wash (linear-gradient sweep) is killed — busy and dated.
- **Optimistic updates**: Update UI immediately on user action, confirm/rollback from server. Users perceive instant response even when the server takes 300ms.
- Full-page loading: skeleton the entire layout (header, sidebar, content area) — never a centred spinner on white

### Empty States
Empty states are first impressions. Design them as carefully as the hero feature.

**Anatomy:**
1. **Visual**: icon at 48px, or a small illustration — not a stock photo
2. **Headline**: specific and warm — "No projects yet" not "Nothing here"
3. **Body**: 1–2 lines explaining what goes here
4. **CTA**: the primary action to resolve the emptiness

**Empty state types:**
- **First use** (user has never created anything): Invitation tone. "Create your first project to get started."
- **Post-filter/search** (no results for current query): Show the query. "No results for 'apollo'." + "Clear filters" link
- **Error empty** (data failed to load): "We couldn't load your projects." + retry button + "If this keeps happening, [contact support]"
- **Completed state** (inbox zero, all tasks done): Celebrate it! "You're all caught up ✓"

### Error States

| Error type | Where | Pattern |
|---|---|---|
| Form validation | Inline, below field | `--color-error` + icon + specific message. Appears on blur. |
| Network / server | Toast + inline retry | "Something went wrong. [Try again]" — never just "Error" |
| 404 / not found | Full-page state | Explain what happened. Link back to safe location. |
| Permission denied | Full-page or inline | Explain what's blocked. "Contact your admin to request access." |
| Offline | Persistent top banner | "You're offline — changes will sync when reconnected." Banner, not modal. |
| Rate limited | Inline | "You've reached the limit. Upgrade to continue." or show when limit resets. |
| Session expired | Modal (non-closeable) | "Your session expired. Please sign in again." Preserve their unsaved context. |

**Error message formula**: `[What happened] + [Why, if helpful] + [What to do]`
- ❌ "Error 422"
- ❌ "Something went wrong"
- ✅ "We couldn't save your changes — your session expired. [Sign in again] — your work is preserved."

### Success States
- **Inline success** for forms: Replace form with checkmark + "Changes saved" message. After 3s, restore form in its new state.
- **Toast** for background operations: "Export ready — [Download]"
- **Theatrical celebration** for key milestones: first project, first payment, plan upgrade — confetti, animated checkmark, custom illustration. This is the peak moment (peak-end rule).
- **Undo window**: For destructive actions, show a toast with an undo option for 5–8 seconds before the action is committed. "Project deleted. [Undo]"

---

## 8. Accessibility as UX

Accessibility is not a separate concern — it is a dimension of quality. These rules make the app better for everyone.

- **Keyboard navigation**: Tab order must follow visual reading order. Interactive elements: Tab to reach, Enter/Space to activate, Escape to dismiss.
- **Focus indicators**: Always visible via `:focus-visible`. 2px solid `--color-primary` + 3px offset. Never remove the outline without a designed replacement.
- **Colour is never the only signal**: Error/success/warning/info states must have an icon OR text label in addition to colour. Approximately 8% of men are colour-blind and cannot reliably distinguish red from green.
- **ARIA only when native HTML won't do it**: `<button>` is always better than `<div role="button">`. Prefer semantic elements — they come with behaviour built in.
- **Live region announcements**: `aria-live="polite"` for dynamic content updates (search results appearing, loading complete). `aria-live="assertive"` for error messages that require immediate attention.
- **Icon-only buttons**: Always require an `aria-label` and a tooltip. "Close", "Edit", "Delete" — never assume the icon alone communicates.
- **Contrast minimums**: Body text 4.5:1 (WCAG AA), large text 3:1. `--color-text-muted` must still meet 4.5:1 — it often doesn't in default palettes, check it.
- **Skip link**: "Skip to main content" as the first focusable element on every page. Visually hidden until focused.
- **Reduced motion**: Wrap all non-essential animations in `prefers-reduced-motion: reduce` — base.css handles this globally, but verify animation-heavy components.
- **Form labels**: Every `<input>` must have an associated `<label>` (using `for`/`id` or `aria-labelledby`). Never rely on placeholder text as a substitute.

---

## 9. Micro-Interactions & Motion

**Research basis**: MIT Media Lab (1997) — animations between 100–500ms feel instantaneous and purposeful. Above 1000ms, users perceive waiting. Animations must communicate, not decorate.

### Motion Principles
1. **Motion communicates**: every animation tells the user something — "this appeared", "this moved here", "this is loading", "you succeeded"
2. **Elements move from somewhere to somewhere**: modals don't appear from nothing, they scale up from a point. Drawers slide from an edge. Toasts enter from the corner they'll occupy.
3. **Nothing teleports**: instant state changes are jarring. Even a 100ms opacity transition grounds the user.

### The Verb Test (Apple HIG)

Every animation must have a target verb. If you can't name what the animation tells the user (*arrives*, *departs*, *replaces*, *expands*, *settles*), delete it. Decorative motion is a tell that the static composition wasn't trusted.

**Animation kill list — these have no verb and must be removed:**
- Fade-in-on-scroll without a spatial origin (the element doesn't *come from* anywhere)
- Hover gradient shifts on backgrounds
- Parallax on body content
- Decorative pulse/glow/breathe loops
- Hero text typewriter effects in app chrome
- Background "ambient" particle systems
- Auto-playing carousel transitions

If you find yourself writing an `@keyframes` for the visual interest, you're decorating. Stop.

### Timing Reference

| Interaction | Duration | Easing |
|---|---|---|
| Button hover state | 120ms | `ease-out` |
| Button active/press | 80ms | `ease-in` |
| Dropdown / menu open | 150ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Modal open | 200ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Modal close | 150ms | `ease-in` |
| Drawer open | 250ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Toast enter | 250ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Toast exit | 200ms | `ease-in` |
| Page / route transition | 180ms | `ease-in-out` |
| Skeleton → content reveal | 300ms | `ease-out` |
| Tab switch | 200ms | `ease-in-out` |
| Number count animation | 400ms | `cubic-bezier(0.16, 1, 0.3, 1)` |

**The spring easing `cubic-bezier(0.16, 1, 0.3, 1)`** feels physical and deliberate — slightly overshooting and settling. Use for all elements entering the screen.

### Animate vs. Don't Animate

**Always animate:**
- Modals, drawers, dropdowns entering/exiting
- Toast notifications
- Skeleton → content transitions (fade + slight upward shift)
- Number and count changes
- Tab switches (sliding indicator)
- Accordion open/close
- Progress bar fills

**Never animate:**
- Hover colour transitions above 180ms (feels sluggish)
- Content that loads in <50ms (animation would be slower than the load)
- Background decorative elements that draw the eye from content
- Loading spinners on buttons (use skeleton or inline indicator instead)

**Respect `prefers-reduced-motion`:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. Responsiveness for Web Apps

### Breakpoint Architecture
```
375px   — Mobile S (iPhone SE, baseline mobile design target)
390px   — Mobile M (iPhone 14 / 15)
430px   — Mobile L (iPhone 14 Plus, la
rger Android)
768px   — Tablet (iPad portrait)
1024px  — Desktop S (13" laptop)
1280px  — Desktop M (standard monitor, primary design target)
1440px+ — Desktop L (large/wide monitor)
```

**Design mobile-first**, then expand. A complete mobile experience forces discipline that improves the desktop version.

### Layout Transformations

| Desktop pattern | Mobile equivalent |
|---|---|
| Left sidebar nav | Bottom tab bar (≤5 items) or hamburger drawer |
| Multi-column card grid | Single-column stacked cards |
| Data table | Card-based list OR horizontal scroll with scroll indicator |
| Side-by-side comparison | Tabbed interface |
| Persistent filter sidebar | Slide-up filter sheet (triggered by "Filters" button) |
| Hover-revealed row actions | `...` context menu button per row (always visible) |
| Inline short form | Full-screen form overlay |
| Multi-panel master/detail | Single panel — list navigates to full detail screen |
| Tooltip on hover | Long-press popover or always-visible label |

### Mobile-Specific Rules
- **Touch targets**: 44×44px minimum. Padding counts toward the target — small icons can be small visually but large in their hit area.
- **Thumb zones**: Primary actions must be reachable by thumb. Bottom-anchored CTAs on forms. Bottom tab bar for primary nav.
- **`:active` states are mandatory**: Every tappable element needs a visible `:active` state (darker background, slight scale reduction). Without it, users think their tap didn't register.
- **Never rely on hover**: Any UI that requires hover to discover or activate must have a tap alternative.
- **Bottom sheet / slide-up**: Preferred over modals on mobile for forms, filters, and confirmations. Slides up from bottom with drag handle. Dismissible with downward swipe.
- **Prevent iOS input zoom**: Inputs must have `font-size: 16px` minimum — iOS zooms in when font size is smaller.
- **Swipe gestures**: Swipe-to-delete and swipe-to-archive are expected patterns on mobile list items. Always show a confirmation or an undo toast.

---

## 11. Performance as UX

**Research basis**: Google (2018) — a 1-second delay reduces conversions by 7%. Amazon found a 100ms delay costs 1% of revenue. Performance is a UX feature.

### Perceived Performance (More Controllable Than Actual Performance)
Users perceive performance based on feedback, not raw timing. These techniques make apps feel faster than they are:

- **Optimistic updates**: Apply the UI change immediately on user action; confirm/rollback from server in background. Linear.app built its entire reputation on this.
- **Skeleton screens**: Show structural layout before data arrives. Users perceive skeleton load time as 20% shorter than equivalent spinner load time (NNGroup).
- **Progressive content loading**: Render above-fold content first. Defer charts, activity feeds, and secondary panels.
- **Prefetch on hover**: On navigation link hover, begin prefetching the route. Adds ~300ms of head start before the click.
- **Instant feedback**: Every tap/click must produce a visual response within 100ms — even if that's just a button active state. Silence = broken.
- **Avoid layout shifts**: Set explicit `width` and `height` on all images and media. Reserve space for async content with skeleton placeholders.

### Core Web Vitals Targets for Web Apps
- **LCP (Largest Contentful Paint)**: < 2.0s — the main content area must be visible
- **INP (Interaction to Next Paint)**: < 150ms — every interaction should produce visible feedback fast
- **CLS (Cumulative Layout Shift)**: < 0.05 — nothing should jump around as the page loads

---

## 12. Designing for Trust & Adoption

### Patterns That Build Trust
- **Transparency on limits**: Show users exactly where they stand — storage used, API calls remaining, plan limits, team member count. Uncertainty about limits breeds anxiety.
- **Data ownership**: Export options visible and easy to find. "Your data is yours" messaging near billing settings.
- **Activity history / audit log**: Let users see what changed, when, and by whom. This is especially important in team apps.
- **Contextual permission requests**: Ask for permissions at the moment they're needed, with explanation. "To send notifications, we need permission. [Allow]" — not on first launch.
- **Social proof in context**: Usage counts, testimonials, and case studies near the decision point (inside the upgrade flow) — not only on the marketing landing page.
- **Sync status indicator**: "All changes saved" / "Saving..." / "Last saved 3 min ago" — users need to know their work is safe.

### Patterns That Destroy Trust
- Irreversible operations without warning or undo
- Dark patterns: pre-checked opt-ins, misleading button placement, confusing cancellation flows
- Unexplained data requests ("We'd like access to your contacts" — why?)
- Silent failures: user takes an action, nothing happens, no feedback
- Inconsistent behaviour: same component behaves differently in different sections
- Surprise charges or plan changes not communicated in advance
- "Are you sure?" without explaining the consequence

---

## 13. The 10 Nielsen Heuristics — Applied to Web Apps

| # | Heuristic | Web App Application |
|---|---|---|
| 1 | **Visibility of system status** | Sync status ("Saved 2m ago"), loading skeletons, progress bars, upload progress, CI/CD status indicators |
| 2 | **Match the real world** | Domain language, not technical jargon. Dates in natural language ("3 days ago", not "2026-05-09T14:32:00Z"). Familiar icons before labels. |
| 3 | **User control & freedom** | Undo everywhere possible. Cancel in every flow. Back button never breaks. Escape dismisses overlays. |
| 4 | **Consistency & standards** | Same component = same behaviour everywhere. Platform conventions honoured (Cmd+S saves, Cmd+Z undoes, Cmd+K opens palette). |
| 5 | **Error prevention** | Confirm before destructive actions. Disable submit until required fields valid. Warn on unsaved changes before navigating away. |
| 6 | **Recognition > recall** | Labels on icon buttons. Show applied filters as removable chips. Remember last used view/sort/filter. Autocomplete > free-text. |
| 7 | **Flexibility & efficiency** | Keyboard shortcuts for power users. Bulk actions. Command palette. Saved views. Customisable dashboard layouts. |
| 8 | **Aesthetic & minimal design** | Every element earns its place. No decorative chrome. Remove anything a user hasn't needed in a month of observation. |
| 9 | **Recognise & recover from errors** | Human language. Specific cause. Actionable resolution. Never error codes. Never "Something went wrong." |
| 10 | **Help & documentation** | Contextual help (empty state copy, inline tooltips, helper text). Search-first help centre. In-app guided tours for complex features. |

---

## 14. Design Decision Checklist

Use this before finalising any screen or shipping any feature.

### Flow & Structure
- [ ] Is there ONE clear primary action on this screen?
- [ ] Can the user see where they are in any multi-step flow?
- [ ] Is there always a clear escape route (back / cancel / close)?
- [ ] Have all states been designed: loading, empty (first-use), empty (no results), error, offline, success?
- [ ] Does every dead-end state offer a next action?

### Clarity & Hierarchy
- [ ] Can a new user identify what this screen does in 5 seconds?
- [ ] Are primary actions labelled with text (not icon-only)?
- [ ] Are error messages specific and actionable (not "Something went wrong")?
- [ ] Are no more than 4 distinct text styles used on this screen?
- [ ] Is the visual weight hierarchy clear — is it obvious what to look at first?

### Accessibility
- [ ] Do status signals use icon or text in addition to colour?
- [ ] Are all touch targets ≥ 44×44px?
- [ ] Is keyboard navigation complete and in visual order?
- [ ] Does colour contrast meet WCAG AA (4.5:1 for body, 3:1 for large text)?
- [ ] Do all icon-only buttons have `aria-label` and a tooltip?
- [ ] Does the focus ring appear correctly on all interactive elements?

### Motion & Feedback
- [ ] Does every action produce visible feedback within 100ms?
- [ ] Is a skeleton shown for content loading > 200ms?
- [ ] Are transitions animated at appropriate duration (150–300ms)?
- [ ] Does `prefers-reduced-motion` disable non-essential animations?

### Responsiveness & Mobile
- [ ] Does the layout function correctly at 375px?
- [ ] Do all interactive elements have `:active` states?
- [ ] Is primary navigation accessible without hover?
- [ ] Are inputs at least 16px font size (prevents iOS auto-zoom)?

### Typography & Colour
- [ ] Is no display-scale type used (web apps cap at `--text-xl`)?
- [ ] Is there a maximum of ONE accent colour in UI chrome per viewport?
- [ ] Is `--color-text-muted` passing 4.5:1 contrast on all surfaces it appears on?
- [ ] Is hierarchy carried by **weight, not size**, wherever possible? (card title and body at the same `--text-base`, weight `600` vs `400`)
- [ ] Are no more than TWO distinct font sizes used on a single screen?

### Apple-Grade (v3.0)
- [ ] Are all spacing values multiples of **4** (with **8** strongly preferred)? No `10px`, `13px`, `15px`, `18px`, `22px` allowed.
- [ ] Does any translucent surface meet **4.5:1 contrast** *after* the blur?
- [ ] Does every animation have a nameable verb (*arrives*, *replaces*, *expands*, *settles*)? Decorative motion deleted.
- [ ] Is shadow restraint honored? (Only `--shadow-sm` and `--shadow-lg` — no mid-shadows, no coloured shadows)
- [ ] Is border restraint honored? (1px hairlines at ~6% opacity at rest, ~12% on hover. No 2px borders in chrome.)
- [ ] Are all radii from the four-token system (6/8/12/full)? No arbitrary values.
- [ ] If translucent: is `prefers-reduced-transparency: reduce` falling back to opaque?

### Performance
- [ ] Are images lazy-loaded with explicit `width` and `height`?
- [ ] Is there no content that shifts position after load (CLS)?
- [ ] Is the initial page load under 2.0s LCP target?

### Dark Mode
- [ ] Does the design function in both light and dark mode?
- [ ] Are shadows appropriate for dark surfaces (may need `opacity` adjustment)?
- [ ] Do all surface layers remain visually distinct in dark mode?

---

## 15. Common Web App Flow Templates

### Settings Page
```
Layout:  Two-column — 220px left tab nav | flex-1 right content panel
Header:  Page title "Settings" + current section breadcrumb
Nav:     Vertical tab list: Account, Profile, Team, Billing, Notifications, Security, API, Danger Zone
Content: Section heading + 1-line description + form fields
Footer:  Sticky "Save changes" button anchored to bottom of content panel
Mobile:  Nav collapses to full-width section list; tap section → content (back arrow returns to list)
```

### Onboarding Flow
```
Step 0:  (before registration) Interactive demo or product tour — value first
Step 1:  Welcome screen — product name, one-line value prop, "Get started →"
Step 2:  1–2 essential setup fields (workspace name, role)
Step 3:  Create first item (guided, example pre-filled, easy to edit)
Step 4:  Invite teammates (skippable with prominent skip link)
Step 5:  Dashboard — now populated with their created item + checklist sidebar
Ongoing: Checklist widget in sidebar showing remaining setup steps
```

### List + Detail (Master / Detail)
```
Desktop: Left panel 320–400px (list, searchable, filterable) | Right panel (detail view, fills remaining)
         Selecting a list item updates the right panel without page navigation
Mobile:  List screen → tap row → full-screen detail view (back arrow at top-left)
         Detail view has a bottom action bar for primary actions
```

### Confirmation Modal (Destructive Action)
```
Title:   Specific ("Delete 'Apollo' project?") — never generic ("Confirm action")
Body:    Consequence in plain language: "This will permanently delete the project and all its data. This cannot be undone."
Input:   (For high-stakes actions) "Type 'Apollo' to confirm" — prevents accidental deletion
Actions: [Cancel] (ghost)  [Delete project] (--color-error fill)
         Cancel on left, destructive on right — both clearly labelled
```

### Auth Flow
```
Sign up:   Email + password → email verification → onboarding flow
Sign in:   Email + password. "Forgot password?" link below password field.
           Social login options (Google, GitHub) above the divider.
SSO:       "Sign in with SSO" link below. Enter company email → redirect.
MFA:       After password: "Enter the 6-digit code from your authenticator app"
           Backup code link below the input.
Reset:     Email input → "We've sent a reset link to [email]" → link → new password form
```

### Checkout / Upgrade Flow
```
Step 1:  Plan selection (current plan highlighted, upgrade plan pre-selected)
Step 2:  Billing period toggle (Annual pre-selected, show savings amount)
Step 3:  Payment details (card number, expiry, CVC, billing name)
         Show accepted card logos. Stripe Element for PCI compliance.
Step 4:  Order summary (plan, price, next billing date) → [Subscribe / Upgrade]
Success: Confirmation screen + "You're now on [Plan name]" + receipt email sent
```

### Notification Centre (Bell Icon Panel)
```
Header:  "Notifications" title | "Mark all as read" link
Filter:  All | Unread | Mentions | Team
Items:   Avatar + "[Actor] [action] in [context]" + relative time + blue dot (unread)
         Tap item → navigate to the relevant record, mark as read
Footer:  "View all activity" → full notification log page
Empty:   "You're all caught up" + subtle illustration
```
